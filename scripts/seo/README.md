# SEO Monitoring (edgelesslab.com)

This folder contains the operational runbook + helper scripts for:
- Google Search Console verification (DNS TXT)
- Submitting sitemap.xml
- Weekly / monthly SEO review
- Incident logging for coverage/performance/manual actions

## Baseline

| Check | Status |
|-------|--------|
| Site live | PASS |
| HTTPS/TLS | PASS |
| Sitemap | https://edgelesslab.com/sitemap.xml |
| Robots | https://edgelesslab.com/robots.txt |
| GSC verification | BLOCKED (needs tenant access) |

## Weekly checklist

1. Open GSC Core Web Vitals
2. Review Coverage → ensure no spike in errors
3. Mobile Usability → check for new flags
4. Performance → note deltas in queries/pages/impressions/clicks
5. Security & Manual Actions → confirm clean
6. Update this repo log if anomalous findings appear

## Incident entry format

```text
## YYYY-MM-DD
- Severity: low / medium / high / critical
- Source: GSC / Bing / Analytics / Crawl
- Finding:
- Action taken:
```

Last reviewed: 2026-06-15
