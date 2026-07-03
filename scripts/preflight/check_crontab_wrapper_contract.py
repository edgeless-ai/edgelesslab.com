#!/usr/bin/env python3
"""Assert every crontab entry using cron-wrapper.sh satisfies its arg contract.

Added after the 2026-06-13 → 2026-07-01 incident: an untracked wrapper rewrite
introduced a `$# -lt 3` usage gate while 10 crontab entries passed only
2 args (JOB_NAME + command). The gate exited before any state write or
failure alert, so the jobs died silently for 18 days.

Run standalone or from smoke_test.py:
    python3 scripts/preflight/check_crontab_wrapper_contract.py
Exit 0 = all entries OK; exit 1 = violations listed on stderr.
"""
import re
import shlex
import subprocess
import sys

WRAPPER_RE = re.compile(r"cron-wrapper\.sh")
MIN_ARGS = 2  # JOB_NAME + command ("--" optional per wrapper parsing)


def main() -> int:
    try:
        out = subprocess.run(
            ["crontab", "-l"], capture_output=True, text=True, timeout=10
        ).stdout
    except Exception as exc:  # crontab unavailable (CI) — skip, don't fail
        print(f"SKIP: crontab -l unavailable ({exc})")
        return 0

    violations = []
    for line in out.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or not WRAPPER_RE.search(line):
            continue
        # Drop the 5 cron schedule fields (or @keyword) to get the command.
        fields = line.split(None, 5)
        cmd = fields[1] if line.startswith("@") else (fields[5] if len(fields) > 5 else "")
        try:
            tokens = shlex.split(cmd)
        except ValueError:
            violations.append((line, "unparseable quoting"))
            continue
        try:
            wi = next(i for i, t in enumerate(tokens) if WRAPPER_RE.search(t))
        except StopIteration:
            continue
        args = [t for t in tokens[wi + 1:] if t != "--"]
        # Stop at shell control operators; args to the wrapper end there.
        for stop in ("&&", "||", ";", "|", ">", ">>", "2>&1"):
            if stop in args:
                args = args[: args.index(stop)]
        if len(args) < MIN_ARGS:
            violations.append((line, f"only {len(args)} arg(s) to wrapper"))

    if violations:
        print("cron-wrapper contract violations:", file=sys.stderr)
        for line, why in violations:
            print(f"  [{why}] {line}", file=sys.stderr)
        return 1
    print("OK: all crontab cron-wrapper.sh entries satisfy the arg contract")
    return 0


if __name__ == "__main__":
    sys.exit(main())
