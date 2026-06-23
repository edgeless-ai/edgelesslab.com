"""
swarmctl.telemetry — OTel span emission + digest formatter.

CONTRACT (see CONTRACT.md):
    emit_report(report: Report) -> None
        Emits one parent span "swarmctl.run", one child span "swarmctl.gateway"
        per gateway, and one child "swarmctl.fleet_status" summary span to the
        local OTLP gRPC collector at localhost:4317.
        Silently no-ops if opentelemetry-sdk is not installed or the collector
        is unreachable. Must never raise.
        Writes NOTHING to ~/.hermes or filesystem.

    format_digest(report: Report) -> str
        Returns a compact emoji status string suitable for Discord/Telegram.
        One line per gateway, plus a provider canary summary line.
        No secrets in output.
"""
from __future__ import annotations

import logging
from datetime import timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .types import Report

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy OTel import — the hermes venv does NOT ship opentelemetry-sdk.
# We degrade silently to no-op when unavailable.
# ---------------------------------------------------------------------------
try:
    from opentelemetry import trace as _otel_trace
    from opentelemetry.sdk.trace import TracerProvider as _TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor as _BatchSpanProcessor
    from opentelemetry.sdk.resources import Resource as _Resource
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
        OTLPSpanExporter as _OTLPSpanExporter,
    )
    _OTEL_AVAILABLE = True
except ImportError:
    _OTEL_AVAILABLE = False

# Sentinel so we only build the provider once per process lifetime.
_tracer: "object | None" = None
_provider_initialised = False

_OTLP_ENDPOINT = "localhost:4317"
# Short timeout so an offline collector never stalls the CLI.
_OTLP_TIMEOUT_S = 3


def _get_tracer() -> "object | None":
    """Return a configured tracer, or None if OTel is unavailable/unreachable."""
    global _tracer, _provider_initialised
    if not _OTEL_AVAILABLE:
        return None
    if _provider_initialised:
        return _tracer
    _provider_initialised = True
    try:
        resource = _Resource.create({"service.name": "swarmctl"})
        exporter = _OTLPSpanExporter(
            endpoint=_OTLP_ENDPOINT,
            insecure=True,
            timeout=_OTLP_TIMEOUT_S,
        )
        provider = _TracerProvider(resource=resource)
        provider.add_span_processor(_BatchSpanProcessor(exporter))
        _otel_trace.set_tracer_provider(provider)
        _tracer = _otel_trace.get_tracer("swarmctl", schema_url="https://opentelemetry.io/schemas/1.21.0")
        log.debug("telemetry: OTel tracer initialised → %s", _OTLP_ENDPOINT)
    except Exception as exc:  # noqa: BLE001
        log.debug("telemetry: failed to init OTel tracer (%s) — spans disabled", exc)
        _tracer = None
    return _tracer


# ---------------------------------------------------------------------------
# Public: emit_report
# ---------------------------------------------------------------------------

def emit_report(report: "Report") -> None:  # noqa: C901
    """
    Emit OTel spans for the given Report.

    Span structure:
        swarmctl.run               (parent)
            swarmctl.gateway       (one child per gateway in report.gateways)
            swarmctl.fleet_status  (one child with fleet-level summary attrs)

    All exceptions are caught so the CLI never crashes due to telemetry.
    """
    try:
        tracer = _get_tracer()
        if tracer is None:
            return

        from .types import GatewayState, ProviderState  # local import avoids circular

        ts_ns: "int | None" = None
        if report.generated_at is not None:
            ts = report.generated_at
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            ts_ns = int(ts.timestamp() * 1_000_000_000)

        with tracer.start_as_current_span(  # type: ignore[union-attr]
            "swarmctl.run",
            start_time=ts_ns,
        ) as run_span:
            run_span.set_attribute("venv_ok", report.venv_ok)
            run_span.set_attribute("gateway_count", len(report.gateways))
            run_span.set_attribute("provider_count", len(report.providers))
            if report.warnings:
                run_span.set_attribute("warning_count", len(report.warnings))

            # --- one child span per gateway ---
            for gw in report.gateways:
                with tracer.start_as_current_span(  # type: ignore[union-attr]
                    "swarmctl.gateway",
                    start_time=ts_ns,
                ) as gw_span:
                    gw_span.set_attribute("profile", gw.profile)
                    gw_span.set_attribute("launchd_label", gw.launchd_label)
                    gw_span.set_attribute("state", gw.state.value if gw.state else "unknown")
                    gw_span.set_attribute("pid", gw.pid if gw.pid is not None else -1)
                    gw_span.set_attribute("stale", gw.stale)
                    gw_span.set_attribute("config_valid", gw.config_valid)
                    gw_span.set_attribute("domain", gw.domain.value if gw.domain else "unknown")
                    if gw.config_errors:
                        gw_span.set_attribute("config_error_count", len(gw.config_errors))
                    if gw.platform_connected:
                        for platform, connected in gw.platform_connected.items():
                            gw_span.set_attribute(f"platform.{platform}", connected)

            # --- fleet-status summary child span ---
            with tracer.start_as_current_span(  # type: ignore[union-attr]
                "swarmctl.fleet_status",
                start_time=ts_ns,
            ) as fleet_span:
                up = sum(1 for g in report.gateways if g.state == GatewayState.UP)
                down = sum(1 for g in report.gateways if g.state == GatewayState.DOWN)
                stale = sum(1 for g in report.gateways if g.stale)
                live_prov = sum(1 for p in report.providers if p.state == ProviderState.LIVE)
                dead_prov = sum(1 for p in report.providers if p.state == ProviderState.DOWN)
                provider_canary_pass = dead_prov == 0

                fleet_span.set_attribute("gateways_up", up)
                fleet_span.set_attribute("gateways_down", down)
                fleet_span.set_attribute("gateways_stale", stale)
                fleet_span.set_attribute("providers_live", live_prov)
                fleet_span.set_attribute("providers_down", dead_prov)
                fleet_span.set_attribute("provider_canary_pass", provider_canary_pass)

                if report.system is not None:
                    fleet_span.set_attribute("load_per_cpu", report.system.load_per_cpu)
                    fleet_span.set_attribute("load_avg_1m", report.system.load_avg_1m)
                    fleet_span.set_attribute("swap_used_mb", report.system.swap_used_mb)
                    fleet_span.set_attribute("ram_free_mb", report.system.ram_free_mb)

    except Exception as exc:  # noqa: BLE001
        # Telemetry must NEVER crash the caller.
        log.debug("telemetry.emit_report: suppressed exception: %s", exc)


# ---------------------------------------------------------------------------
# Public: format_digest
# ---------------------------------------------------------------------------

_STATE_EMOJI = {
    "up": "✅",
    "down": "🔴",
    "stale": "⚠️",
    "unknown": "❓",
}

_PROV_STATE_EMOJI = {
    "live": "✅",
    "degraded": "🟡",
    "down": "🔴",
    "unknown": "❓",
    "unchecked": "⬜",
}


def format_digest(report: "Report") -> str:
    """
    Return a compact emoji-annotated status string for Discord/Telegram.

    Layout:
        [timestamp header]
        [one line per gateway: emoji profile state pid? stale?]
        [provider canary line: per-provider emoji name latency/status]
        [system line if available]
        [warning lines if any]

    No secrets in output. api_key_prefix is already sanitised in ProviderStatus.
    """
    from .types import GatewayState, ProviderState  # local import avoids circular

    lines: list[str] = []

    # Header
    ts = ""
    if report.generated_at is not None:
        ts = " " + report.generated_at.strftime("%H:%Mz")
    lines.append(f"**swarmctl**{ts}")

    # Gateway lines
    if report.gateways:
        for gw in sorted(report.gateways, key=lambda g: g.profile):
            emoji = _STATE_EMOJI.get(gw.state.value if gw.state else "unknown", "❓")
            parts = [emoji, gw.profile, gw.state.value.upper() if gw.state else "UNKNOWN"]
            if gw.pid is not None:
                parts.append(f"pid={gw.pid}")
            if gw.stale:
                parts.append("STALE")
            if not gw.config_valid:
                parts.append(f"cfg_err={len(gw.config_errors)}")
            if gw.platform_connected:
                connected = [k for k, v in gw.platform_connected.items() if v]
                if connected:
                    parts.append("+".join(connected))
            lines.append("  " + " ".join(parts))
    else:
        lines.append("  (no gateways discovered)")

    # Fleet summary line
    up = sum(1 for g in report.gateways if g.state == GatewayState.UP)
    total = len(report.gateways)
    stale_count = sum(1 for g in report.gateways if g.stale)
    summary_parts = [f"Fleet: {up}/{total} up"]
    if stale_count:
        summary_parts.append(f"{stale_count} stale")
    lines.append("  " + "  ".join(summary_parts))

    # Provider canary line — one entry per provider
    if report.providers:
        prov_parts: list[str] = []
        for prov in report.providers:
            emoji = _PROV_STATE_EMOJI.get(prov.state.value if prov.state else "unknown", "❓")
            name = prov.provider
            detail = ""
            if prov.latency_s is not None:
                detail = f"{prov.latency_s:.1f}s"
            elif prov.http_status is not None:
                detail = str(prov.http_status)
            elif prov.error_detail:
                # Truncate; never include key material (already sanitised in types)
                detail = prov.error_detail[:30]
            if prov.cached:
                detail = (detail + " cached") if detail else "cached"
            entry = f"{emoji}{name}"
            if detail:
                entry += f"({detail})"
            prov_parts.append(entry)
        lines.append("Providers: " + " | ".join(prov_parts))
    else:
        lines.append("Providers: (none probed)")

    # System line
    if report.system is not None:
        s = report.system
        swap_pct = (s.swap_used_mb / s.swap_total_mb * 100) if s.swap_total_mb else 0.0
        ram_pct = ((s.ram_total_mb - s.ram_free_mb) / s.ram_total_mb * 100) if s.ram_total_mb else 0.0
        load_indicator = "🔥" if s.load_per_cpu > 1.0 else ("⚠️" if s.load_per_cpu > 0.75 else "")
        lines.append(
            f"System: load {s.load_avg_1m:.1f}{load_indicator}"
            f"  swap {swap_pct:.0f}%"
            f"  ram {ram_pct:.0f}% used"
        )

    # Venv issues
    if not report.venv_ok:
        lines.append(f"⚠️ venv missing: {', '.join(report.venv_issues)}")

    # Warnings (cap at 3 + overflow count)
    for w in report.warnings[:3]:
        lines.append(f"⚠️ {w}")
    if len(report.warnings) > 3:
        lines.append(f"  … +{len(report.warnings) - 3} more warnings")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys
    from datetime import datetime, timezone

    # Build a synthetic Report to exercise both functions without touching ~/.hermes.
    try:
        from swarmctl.types import (
            AuthState,
            GatewayHealth,
            GatewayState,
            LaunchdDomain,
            ProviderState,
            ProviderStatus,
            Report,
            RoleStatus,
            SystemStatus,
        )
    except ImportError:
        # Fallback when run from inside the package directory.
        import sys, os
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from swarmctl.types import (
            AuthState,
            GatewayHealth,
            GatewayState,
            LaunchdDomain,
            ProviderState,
            ProviderStatus,
            Report,
            RoleStatus,
            SystemStatus,
        )

    now = datetime.now(tz=timezone.utc)

    gw_hive = GatewayHealth(
        launchd_label="ai.hermes.gateway-hive",
        profile="hive",
        domain=LaunchdDomain.GUI,
        pid=12345,
        state=GatewayState.UP,
        process_start=now,
        code_mtime=now,
        stale=False,
        config_valid=True,
        config_errors=[],
        roles=[
            RoleStatus(role="primary", model="meta/llama-3.3-70b-instruct", provider="nvidia",
                       base_url="https://integrate.api.nvidia.com/v1", auth_state=AuthState.VALID),
        ],
        platform_connected={"discord": True, "telegram": False},
    )

    gw_beau = GatewayHealth(
        launchd_label="ai.hermes.gateway-beau",
        profile="beau",
        domain=LaunchdDomain.GUI,
        pid=None,
        state=GatewayState.DOWN,
        process_start=None,
        code_mtime=now,
        stale=False,
        config_valid=False,
        config_errors=["model.provider missing"],
        roles=[],
        platform_connected=None,
    )

    gw_stale = GatewayHealth(
        launchd_label="ai.hermes.gateway-trader",
        profile="trader",
        domain=LaunchdDomain.USER,
        pid=55555,
        state=GatewayState.STALE,
        process_start=now,
        code_mtime=now,
        stale=True,
        config_valid=True,
        config_errors=[],
        roles=[],
        platform_connected={"telegram": True},
    )

    prov_nvidia = ProviderStatus(
        provider="nvidia",
        base_url="https://integrate.api.nvidia.com/v1",
        api_key_prefix="nvapi-XY",
        state=ProviderState.LIVE,
        latency_s=8.7,
        http_status=200,
        cached=False,
        probed_at=now,
    )

    prov_nous = ProviderStatus(
        provider="nous",
        base_url="https://inference-api.nousresearch.com/v1",
        api_key_prefix="<oauth>",
        state=ProviderState.DOWN,
        latency_s=None,
        http_status=401,
        error_detail="invalid_grant",
        cached=False,
        probed_at=now,
    )

    sys_status = SystemStatus(
        load_avg_1m=2.1,
        load_avg_5m=1.8,
        load_avg_15m=1.5,
        swap_used_mb=1024.0,
        swap_total_mb=4096.0,
        ram_free_mb=2048.0,
        ram_total_mb=16384.0,
        cpu_count=8,
        load_per_cpu=0.26,
        sampled_at=now,
    )

    report = Report(
        gateways=[gw_hive, gw_beau, gw_stale],
        providers=[prov_nvidia, prov_nous],
        system=sys_status,
        venv_ok=False,
        venv_issues=["python-telegram-bot"],
        generated_at=now,
        warnings=["Nous token expired — run hermes auth nous"],
    )

    print("=" * 60)
    print("format_digest output:")
    print("=" * 60)
    digest = format_digest(report)
    print(digest)

    print()
    print("=" * 60)
    print("emit_report (OTel available:", _OTEL_AVAILABLE, ")")
    print("=" * 60)
    emit_report(report)
    if _OTEL_AVAILABLE:
        print("  Spans queued for OTLP export (collector may not be running).")
    else:
        print("  opentelemetry-sdk not installed — silent no-op (expected in hermes venv).")

    print()
    print("Smoke test PASSED.")
    sys.exit(0)
