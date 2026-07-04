"""Full-pipeline test on fixtures: zero network, tmp data dir, fixed clock."""

from spine_test_utils import FIXED_NOW

from spine.criteria import BuyBox
from spine.pipeline import Paths, run_pipeline
from spine.route import load_candidates

BOX = BuyBox({
    "name": "lee-county-fl-default",
    "geo": {"states": ["FL"], "zips": ["339*"], "counties": ["LEE"]},
    "price_band": {"min": 60000, "max": 600000},
    "min_equity_pct": 0.2,
    "property_types": ["single_family", "duplex", "triplex", "quadplex", "mobile_home"],
    "min_signal_count": 2,
    "unknown_policy": "lenient",
})


def test_pipeline_end_to_end_and_idempotent(tmp_adapters_dir, tmp_path):
    paths = Paths(root=tmp_path, adapters_dir=tmp_adapters_dir,
                  data_dir=tmp_path / "data")

    result = run_pipeline(paths=paths, buybox=BOX, now=FIXED_NOW)

    # ingest: 13 fixture signals, all accepted
    assert result.ingest.total_written == 13
    assert result.ingest.total_invalid == 0
    assert result.ingest.failed_adapters == []

    # merge + route: 8 properties with the designed route split.
    # NOTE (adversarial review 2026-07-04, H2): Riverside (other+obituary)
    # was hot under the old distinct-count rule; the "other" bucket no longer
    # counts toward the hot stack, so it is now WARM — hot 3->2, warm 1->2.
    assert result.route_counts == {"hot": 2, "warm": 2, "watch": 3, "discard": 1}

    # outputs on disk
    assert paths.ledger.exists()
    assert result.candidates_path.exists()
    assert result.digest_path.exists()
    assert (paths.data_dir / "digest-latest.md").exists()

    # the hot tier is the stacked, in-the-box tier — 2+ live CLASSIFIED types
    hot = [c for c in result.candidates if c.route == "hot"]
    for c in hot:
        assert len(c.distinct_signal_types - {"other"}) >= 2
        assert c.distress_score >= 2.0
        assert not [m for m in c.criteria_matches["misses"] if not m.startswith("signals:")]
    hot_addrs = " | ".join(c.property.address.upper() for c in hot)
    assert "12TH TER" in hot_addrs or "TERRACE" in hot_addrs
    assert "PALM AVE" in hot_addrs or "PALM AVENUE" in hot_addrs
    # Riverside (other+obituary) demoted to warm by the H2 gate: "other" is
    # not a classified type, so its stack is 1 — still warm (in box, score>=1)
    warm_addrs = " | ".join(c.property.address.upper()
                            for c in result.candidates if c.route == "warm")
    assert "RIVERSIDE" in warm_addrs

    # the Ohio control property discards on geo
    discard = [c for c in result.candidates if c.route == "discard"]
    assert discard[0].property.state == "OH"

    # every candidate is explainable + consumable by underwriting
    for c in result.candidates:
        assert c.recommended_strategy
        assert abs(c.distress_score - sum(c.score_breakdown.components.values())) < 1e-6
        assert {"matched", "matches", "misses", "unknowns"} <= set(c.criteria_matches)

    # run 2: ledger idempotent, candidates snapshot identical size
    result2 = run_pipeline(paths=paths, buybox=BOX, now=FIXED_NOW)
    assert result2.ingest.total_written == 0
    assert result2.ingest.total_duplicates == 13
    assert len(load_candidates(paths.candidates)) == 8
    assert result2.route_counts == result.route_counts


def test_candidates_jsonl_is_valid_contract(tmp_adapters_dir, tmp_path):
    """What underwriting will actually do: read the file cold, parse rows."""
    import json

    from spine.schema import DealCandidate

    paths = Paths(root=tmp_path, adapters_dir=tmp_adapters_dir,
                  data_dir=tmp_path / "data")
    run_pipeline(paths=paths, buybox=BOX, now=FIXED_NOW)

    with paths.candidates.open() as f:
        rows = [json.loads(line) for line in f if line.strip()]
    assert len(rows) == 8
    for row in rows:
        cand = DealCandidate.from_dict(row)         # contract holds
        assert cand.property_key == row["property_key"]
        assert cand.route in ("hot", "warm", "watch", "discard")
        assert cand.to_dict() == row                # lossless
