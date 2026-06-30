import json, sys, os, subprocess, pathlib

# Resolve the lighthouse binary. Under cron's minimal PATH (no ~/.npm-global/bin),
# a bare "lighthouse" name fails to resolve, so honor LIGHTHOUSE_BIN passed in by
# the calling .sh (which resolves an absolute path). Fall back to bare name for
# interactive use where PATH includes the npm global bin.
LIGHTHOUSE_BIN = os.environ.get("LIGHTHOUSE_BIN") or "lighthouse"

base_url = sys.argv[1]
# Accept either:
#   prog base_url page run_dir results_file scores_file
#   prog base_url page1 page2 ... run_dir results_file scores_file
run_dir = sys.argv[-3]
results_file = sys.argv[-2]
scores_file = sys.argv[-1]
pages = [p for p in sys.argv[2:-3]]

pathlib.Path(run_dir).mkdir(parents=True, exist_ok=True)

results = []
scores = {}
for page in pages:
    if not page.startswith("http"):
        url = base_url.rstrip("/") + ("/" + page.lstrip("/") if page not in ("", "/") else "")
    else:
        url = page
    report_name = page.strip("/").replace("/", "__") or "root"
    report_path = pathlib.Path(run_dir) / f"{report_name}.json"
    cmd = [
        LIGHTHOUSE_BIN,
        url,
        "--output=json",
        f"--output-path={report_path}",
        "--chrome-flags=--headless --no-sandbox --disable-gpu",
        "--only-categories=performance,accessibility,best-practices,seo",
        "--quiet",
    ]
    result = {
        "url": url,
        "page": page,
        "report": None,
        "scores": None,
        "stdout": None,
        "stderr": None,
        "error": None,
    }
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
        result["stdout"] = proc.stdout or ""
        result["stderr"] = proc.stderr or ""
        if proc.returncode != 0:
            result["error"] = f"lighthouse_exit_code={proc.returncode}"
        elif not report_path.exists():
            result["error"] = "missing_report"
        elif report_path.stat().st_size == 0:
            result["error"] = "empty_report"
        else:
            data = json.loads(report_path.read_text())
            cats = data.get("categories", {})

            def score(key):
                cat = cats.get(key, {})
                s = cat.get("score")
                return int(round(float(s) * 100)) if s is not None else -1

            page_scores = {
                "performance": score("performance"),
                "accessibility": score("accessibility"),
                "best_practices": score("best-practices"),
                "seo": score("seo"),
            }
            result["report"] = {
                "performance": page_scores["performance"],
                "accessibility": page_scores["accessibility"],
                "best_practices": page_scores["best_practices"],
                "seo": page_scores["seo"],
            }
            result["scores"] = page_scores
            scores[page] = page_scores
    except FileNotFoundError:
        result["error"] = "lighthouse_binary_not_found"
        result["stderr"] = "lighthouse binary not found"
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {e}"
    results.append(result)

pathlib.Path(results_file).write_text(json.dumps(results, indent=2) + "\n")
pathlib.Path(scores_file).write_text(json.dumps(scores, indent=2) + "\n")
