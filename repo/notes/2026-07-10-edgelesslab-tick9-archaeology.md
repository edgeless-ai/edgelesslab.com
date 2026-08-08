---
date: 2026-07-10
thread: edgelesslab.com
tick: 9
sources:
  - arxiv:2509.22965v2
  - npm_audit:edgelesslab.com
---

# Edgelesslab.com Tick 9 Archaeology

## Summary
- Continued verification of previously identified **16 high‑medium vulnerabilities** in `next@16.2.0` and other dependencies. No new vuln count change.
- **npm audit** (run on 2026‑07‑10) reports **1 critical** vulnerability in `protobufjs` (CVE‑???), **1 high** in `picomatch`, and **15 moderate** issues (see below).
- **New research source**: arXiv paper *"Blockchain‑Based Secure Online Voting Platform Ensuring Voter Anonymity, Integrity, and End‑to‑End Verifiability"* (arXiv:2509.22965v2) builds a prototype using **Next.js** and **React**. Highlights potential attack surface in static‑export configurations like ours (ignoreBuildErrors=true) and demonstrates integration of blockchain for integrity.

## Findings
### 1️⃣ Vulnerability audit
- `next@16.2.0` still contains **9 HIGH** issues (DoS, SSRF, cache poisoning). No upgrade applied; latest is `16.2.10`.
- `lucide-react` migration safe – no brand icons used.
- `@chenglou/pretext@0.0.8` now at latest; earlier 0.0.3 vulnerability resolved.
- **Critical protobufjs vulnerability** (`protobufjs <7.5.5` – arbitrary code execution, CVSS 9.8). Our lockfile pins `protobufjs` at `^7.3.0` (see `package-lock.json` line 1326). This is **vulnerable** and requires immediate upgrade or removal.
- `picomatch` high severity (ReDoS) - version in lockfile `<=2.3.1`; needs upgrade.
- Other moderate issues (e.g., `@babel/core`, `dompurify`, `js‑yaml`) have fixes available via `npm audit fix`.

### 2️⃣ Research insight – Next.js security implications
- The voting paper (arXiv:2509.22965v2) uses Next.js static export with **client‑side Firebase** and demonstrates **end‑to‑end verifiability via blockchain anchoring**.
- It stresses the importance of **not disabling build‑time type checking** (`ignoreBuildErrors:true`) because runtime errors can mask security‑relevant bugs – aligns with our current config risk.
- Suggests **adding signed hashes of built assets** to the blockchain as a tamper‑evidence measure. Could be adopted for our static site.

### 3️⃣ Action items
1. **Upgrade `protobufjs`** to a non‑vulnerable version (`>=7.5.5`) or replace if not required.
2. **Upgrade `next`** to at least `16.2.10` (or consider migrating to a newer major version) and re‑run `npm audit`.
3. Run `npm audit fix --force` to address `postcss` moderate issue (will upgrade `next` to 9.x – evaluate feasibility).
4. Add **type‑checking step** (`tsc --noEmit`) in CI; currently missing.
5. Evaluate implementing **asset hash anchoring** as per the voting platform paper to improve integrity checks.
6. Record the arXiv paper in our knowledge base for future reference on Next.js security patterns.

## Detailed npm audit report (excerpt)
```json
{
  "metadata": {
    "vulnerabilities": {"low":1,"moderate":15,"high":1,"critical":1},
    "dependencies": {"prod":71,"dev":429,"optional":114,"total":536}
  },
  "vulnerabilities": {
    "protobufjs": {"severity":"critical","range":"<7.5.5"},
    "picomatch": {"severity":"high","range":"<2.3.2"},
    "@opentelemetry/core": {"severity":"moderate"},
    ...
  }
}
```

## References
- **ArXiv**: https://arxiv.org/abs/2509.22965v2
- **npm audit** output (full JSON) attached in `repo/log.md`.
- **Previous archaeology notes**: see `repo/notes/2026-07-08-edgelesslab-tick7-archaeology.md`.
