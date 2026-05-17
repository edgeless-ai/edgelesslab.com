---
id: task-115
title: Security review of Unbrowse for OpenClaw (POTENTIALLY HIGH RISK)
epic: 1-kernel
status: pending
priority: P3
depends_on: []
blocks: []
created: 2026-02-03
owner: david
estimated_effort: 2-3 hours (review only, installation conditional)
tags: [security-review, browser-extension, traffic-interception, HIGH-RISK]
---

# Task 115: Security Review of Unbrowse for OpenClaw

## ⚠️ HIGH RISK - SECURITY REVIEW REQUIRED

**DO NOT INSTALL WITHOUT COMPLETING FULL SECURITY REVIEW**

This tool intercepts browser traffic, captures authentication credentials, and requires Solana private key storage. Installation is **CONDITIONAL** on passing comprehensive security audit.

## Goal
Conduct thorough security and privacy review of Unbrowse for OpenClaw extension. Only proceed with installation if security assessment is favorable and risks are acceptable.

## Context: What This Tool Actually Does

**Marketing claim:** "Makes browsing 100x faster"

**Reality:** This is NOT a simple browsing accelerator. It's a complex system that:

1. **Intercepts ALL browser traffic** (HTTP/HTTPS API calls)
2. **Captures authentication headers and cookies** during normal browsing
3. **Auto-generates API wrappers** ("skills") from captured traffic
4. **Stores Solana private keys** for marketplace payments
5. **Publishes/downloads skills** from a marketplace (potential malicious code)
6. **Claims 100x speed** by calling APIs directly instead of via browser

### Technical Mechanism

**How it works:**
- Browser extension monitors HTTP/HTTPS requests
- Captures API endpoints, parameters, headers, authentication
- AI analyzes traffic to generate OpenAPI-style schemas
- Creates reusable "skills" for direct API access
- Uses Solana blockchain (x402 protocol) for monetization

**The "speed" claim:**
- Direct API calls vs browser automation (not browser vs browser)
- Example: Instead of loading Gmail UI, call Gmail API directly
- Legitimate use case, but NOT what most people expect from "faster browsing"

## Why This Matters (and Why It's Risky)

### Potential Benefits
- Direct API access without UI overhead
- Reusable API wrappers for automation
- Could accelerate data extraction workflows
- Marketplace for monetizing API discoveries

### Major Security Concerns

**🚨 Critical Risks:**

1. **Credential Exposure**
   - Captures authentication tokens, cookies, API keys
   - Could leak sensitive credentials to marketplace
   - No clear sanitization guarantees in documentation

2. **Private Key Storage**
   - Requires storing Solana wallet private keys
   - Payment signing happens locally
   - Key compromise = loss of funds

3. **Marketplace Trust**
   - Downloaded skills could contain malicious code
   - No verification mechanism detailed
   - Could execute arbitrary code with your credentials

4. **Data Sensitivity**
   - Recorded payloads may contain PII
   - Could capture proprietary business data
   - Unclear data retention/transmission policies

5. **Privacy Implications**
   - Optional proxy/stealth browsing features
   - Could mask identity (legal/ethical concerns)
   - Unclear what data is sent to external servers

6. **Supply Chain**
   - Dependencies on OpenClaw/Clawdbot/Moltbot
   - Docker containers (what's running inside?)
   - Node.js/TypeScript runtime (package vulnerabilities?)

## Step-by-Step Security Review

### Phase 1: Reconnaissance (READ-ONLY)

**DO NOT install anything yet. Only research.**

#### Step 1.1: Repository Analysis
```bash
# Clone repo for inspection (DO NOT run anything)
cd ~/security-reviews/
git clone https://github.com/lekt9/unbrowse-openclaw.git
cd unbrowse-openclaw

# Review file structure
tree -L 3

# Count lines of code
find . -name "*.ts" -o -name "*.js" | xargs wc -l

# Check for suspicious patterns
grep -r "eval\|exec\|child_process" .
grep -r "crypto\|private.*key\|secret" .
grep -r "fetch\|axios\|http" .
```

Document findings in research session.

#### Step 1.2: Dependency Audit
```bash
# Check package.json for dependencies
cat package.json | jq '.dependencies'

# Look for known vulnerabilities
npm audit --production

# Check for suspicious packages
# (packages with similar names to popular ones, recent updates to old packages, etc.)
```

#### Step 1.3: Code Review - Authentication Handling
Search for how credentials are captured and stored:

```bash
# Find credential capture code
grep -r "cookie\|authorization\|bearer\|token" . --include="*.ts" --include="*.js"

# Find storage mechanisms
grep -r "localStorage\|sessionStorage\|chrome.storage" .

# Find network transmission
grep -r "fetch\|axios\|websocket" .
```

**Critical questions:**
- Are credentials sanitized before storage?
- Are credentials encrypted at rest?
- Are credentials transmitted externally? To where?
- Can captured credentials be exported/leaked?

#### Step 1.4: Code Review - Marketplace Interaction
Examine skill download/execution:

```bash
# Find skill download code
grep -r "x402\|marketplace\|download.*skill" .

# Find skill execution code
grep -r "eval\|Function\|vm.run" .

# Find payment/transaction code
grep -r "solana\|transaction\|sign" .
```

**Critical questions:**
- How are skills validated before execution?
- Can skills execute arbitrary code?
- Is there sandboxing or isolation?
- What permissions do skills have?

#### Step 1.5: Privacy Policy & License Review
```bash
# Check license
cat LICENSE

# Check for privacy policy
find . -name "*privacy*" -o -name "*terms*"

# Check README for security claims
cat README.md | grep -i "security\|privacy\|safe"
```

#### Step 1.6: External Research
Search for:
- Existing security audits
- CVE reports
- User complaints about data leaks
- Reddit/HN discussions
- Author reputation (GitHub profile, other projects)

```bash
# Google searches:
# - "unbrowse openclaw security"
# - "unbrowse openclaw credentials leaked"
# - "unbrowse openclaw malware"
# - "lekt9 github reputation"
```

### Phase 2: Threat Modeling

Create threat model document: `security-reviews/unbrowse-threat-model.md`

**Threat Scenarios:**

1. **Credential Theft**
   - Attacker: Extension author or marketplace operator
   - Attack: Exfiltrate captured auth tokens to remote server
   - Impact: Account takeover, data breach
   - Likelihood: Medium (depends on author trustworthiness)

2. **Malicious Skill Execution**
   - Attacker: Marketplace skill publisher
   - Attack: Skill contains malicious code that steals data
   - Impact: Data exfiltration, system compromise
   - Likelihood: High (no verification mentioned)

3. **Private Key Compromise**
   - Attacker: Extension vulnerability or malicious update
   - Attack: Extract Solana private keys from local storage
   - Impact: Loss of crypto funds
   - Likelihood: Medium (depends on key storage mechanism)

4. **Man-in-the-Middle**
   - Attacker: Network adversary
   - Attack: Intercept skill downloads or payment transactions
   - Impact: Malicious skill injection, transaction manipulation
   - Likelihood: Low (if using HTTPS, high if not)

5. **Supply Chain Attack**
   - Attacker: Compromised npm dependency
   - Attack: Malicious code in third-party package
   - Impact: Full system compromise
   - Likelihood: Medium (npm ecosystem risk)

### Phase 3: Risk Assessment

Create risk matrix: High/Medium/Low for each threat

**Decision Matrix:**

| Threat | Likelihood | Impact | Mitigation Possible? | Acceptable Risk? |
|--------|-----------|--------|---------------------|------------------|
| Credential Theft | ? | Critical | ? | ? |
| Malicious Skills | ? | High | ? | ? |
| Key Compromise | ? | Critical | ? | ? |
| MITM | ? | Medium | ? | ? |
| Supply Chain | ? | High | ? | ? |

Fill this in based on code review findings.

### Phase 4: Go/No-Go Decision

**Installation is APPROVED only if ALL conditions met:**

- [ ] Credentials are NOT transmitted externally (or only to verified endpoints)
- [ ] Credentials are encrypted at rest
- [ ] Skills are sandboxed/isolated during execution
- [ ] No eval() or arbitrary code execution of untrusted input
- [ ] Private keys are encrypted with password/biometric
- [ ] Dependencies have no critical CVEs
- [ ] Author has positive reputation and other maintained projects
- [ ] Clear privacy policy exists and is acceptable
- [ ] Benefits significantly outweigh risks for YOUR use case

**If ANY red flags found:**
- Credential transmission to unknown servers → REJECT
- Arbitrary code execution without sandboxing → REJECT
- No credential sanitization → REJECT
- Critical CVEs in dependencies → REJECT (or fix first)
- Author has history of malicious projects → REJECT
- No privacy policy or unacceptable terms → REJECT

### Phase 5: Conditional Installation (ONLY if Phase 4 approved)

**If security review passes, create separate task for installation.**

DO NOT install in this task. Create new task:
- task-XXX: Install and configure Unbrowse (SECURITY APPROVED)

Installation task should include:
- Sandboxed test environment first (VM or separate browser profile)
- Limited credentials (test accounts only, never production)
- Network monitoring during installation
- Verify all traffic is expected
- Test skill generation with non-sensitive data
- Monitor for unexpected external connections

---

## Acceptance Criteria
- [ ] Repository cloned and analyzed (read-only)
- [ ] All dependencies audited for vulnerabilities
- [ ] Credential handling code reviewed
- [ ] Marketplace interaction code reviewed
- [ ] Threat model created
- [ ] Risk assessment completed
- [ ] Go/No-Go decision made with justification
- [ ] If rejected, document specific reasons
- [ ] If approved, create separate installation task

---

## Verification Checklist
- [ ] Reviewed at least 500 lines of source code
- [ ] Checked all external network calls
- [ ] Identified all credential storage mechanisms
- [ ] Found privacy policy (or noted absence)
- [ ] Researched author reputation
- [ ] Searched for existing security issues
- [ ] Created comprehensive threat model
- [ ] Can explain risks to a non-technical person

---

## Artifacts
- Research session: `claude-vault/03-Knowledge/Research-Sessions/2026-02-03-unbrowse-security-review.md`
- Threat model: `security-reviews/unbrowse-threat-model.md`
- Code review notes: `security-reviews/unbrowse-code-review.md`
- Risk assessment: `security-reviews/unbrowse-risk-assessment.md`
- (If approved) Installation task: `task-XXX-install-unbrowse.md`

## Technical Resources
- GitHub Repo: https://github.com/lekt9/unbrowse-openclaw
- OpenClaw Documentation: (find link)
- x402 Protocol: (research Solana payment protocol)
- Browser Extension Security Best Practices
- OWASP Browser Extension Security Guide

## Questions to Answer
- Who is the author (lekt9)? Any other projects?
- How many stars/forks? Recent activity?
- Are there existing security audits?
- What is OpenClaw/Clawdbot/Moltbot? Are they trustworthy?
- What is x402 protocol specifically?
- Where do captured credentials actually go?
- Is there source-available vs binary distribution?
- Can skills be inspected before execution?
- What happens if marketplace server is compromised?
- Are there any runtime sandboxing mechanisms?

## Success Metrics
**Research Phase:**
- Thorough understanding of how the system works
- Clear identification of all security risks
- Evidence-based Go/No-Go recommendation

**If Approved:**
- Safe installation with no credential leaks
- Functional testing in sandboxed environment
- Verified benefits match claims

**If Rejected:**
- Clear documentation of why it's too risky
- Recommendations saved for future reference

## Notes
- Your skepticism is 100% justified - this is NOT simple "faster browsing"
- The "100x faster" claim is technically accurate but misleading marketing
- This tool has legitimate use cases (API automation) but MAJOR security risks
- Default stance should be REJECT unless security review is exceptional
- If you're not comfortable reviewing code, REJECT automatically
- Consider: Do you actually need this? What problem does it solve?

**Joan Westenberg Check:**
- Is this solving a real bottleneck?
- Or is "100x faster browsing" exciting but unnecessary?
- What APIs do you actually need direct access to?
- Could you manually create those wrappers when needed?

## Risks / Considerations
- **Worst case scenario**: Complete credential theft, crypto wallet drained, data breach
- **Likely scenario**: Tool works but exposes more data than expected
- **Best case scenario**: Tool is secure but benefit doesn't justify complexity
- **Legal risk**: Automated API access may violate terms of service
- **Maintenance burden**: Tool may break with browser updates
- **Trust risk**: Installing code that intercepts all traffic is inherently risky

## Related Tasks
- task-94: Happy Coder DX (is this actually making browsing better?)
- Future: If approved and installed, could spawn automation tasks
- Future: If rejected, document why for future similar evaluations

## Integration Points
- **Browser**: Would run as extension (Chrome/Firefox/Edge?)
- **Solana Wallet**: Need to evaluate which wallet to use
- **API Automation**: Could integrate with existing automation workflows
- **Security**: May want to run in isolated browser profile

---

## CRITICAL REMINDER

**DO NOT INSTALL THIS TOOL UNTIL SECURITY REVIEW IS COMPLETE AND APPROVED.**

This task is RESEARCH ONLY. Installation requires separate task and explicit approval.

Default answer is NO unless evidence strongly supports YES.

Your data security > 100x faster API calls.
