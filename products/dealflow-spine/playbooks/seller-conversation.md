# Playbook: The Seller Conversation

> **Not financial or legal advice.** Internal R&D / educational-analytical
> material. Outbound calling is heavily regulated (TCPA, FCC 2024 AI-voice
> rules, state DNC) — per the strategy doc, cold outreach is MAIL / human
> callers with DNC-scrubbed lists, consent-first; AI voice only on inbound
> and warm/opted-in follow-up. Verify compliance with an attorney.

## Ethos (the honest version)

Grounded in `~/Downloads/SCRIPT V1.pdf` (the seminar's SPIN acquisition
script) — but per the strategy notes, that script is "more manipulative
than its own 'be honest' slides," so this playbook **keeps its structure
and encodes the honest version**:

- **There is no magic script.** The call has a skeleton because good calls
  need the same facts every time — not because words trick people into
  selling.
- **Be honest, solve problems.** You are only useful to a seller whose
  problem your deal structure actually solves (arrears cured, entitlement
  restored, maintenance burden gone). If no problem: nice call, no deal —
  that's the picker's `pass` doing its job.
- **Rapport is real, not a technique.** The script's best advice, kept
  verbatim in spirit: find common ground, "BE Genuine about it… freestyle
  this part as YOURSELF… not trying to be anything."
- **Listen for motivation instead of interrogating for it.** The script is
  right that sellers reveal motivation while rambling about the property
  (the elderly owner mentioning undone yardwork and too many stairs). Let
  them talk; take notes; never fake-probe.

**What we deliberately DROP from the seminar script:**

| Seminar tactic | Why dropped | Honest replacement |
|---|---|---|
| Fake "underwriting team" hold ("let me go talk to them") | It's theater — there is no team on hold | "I'm going to run the numbers properly after this call and call you back by [time] with a real answer" — then do it |
| Positioning as a powerless "dumb salesperson" so the seller has "no one to fight" | Manufactured helplessness is manipulation | Be straightforwardly who you are: a small investor who makes their own decisions and will give a direct yes/no |
| Scaring with "CRAAAZY stories" about rewiring costs to pre-frame a low offer | Fear-seeding | If condition genuinely affects price, show the math (repair line items, the MAO sensitivity table) |
| Pressure-leveraging verbal commitments ("hold them to it, force the issue") | Commitment-trap | Confirm mutual understanding, send the numbers in writing, give them room to consult family/attorney |

## Call skeleton (facts the underwriting needs)

The seminar script's *sequence* is sound — it's a data-collection order.
Each step feeds a calculator input:

1. **Permission + who you are.** Real name, real entity, real location,
   what you actually do ("small local investor; we buy directly, as-is,
   cash or by taking over payments"). "Is now an okay time?"
2. **Confirm the property facts** (beds/baths/sqft) — public data is wrong
   often enough that this one question saves whole deals. → comps inputs.
3. **Occupancy** (owner / tenant / vacant) → timeline + strategy (vacant
   favors wholesale; inherited tenant changes sub-to math).
4. **Their plan and timeline** ("do you have a place picked out?" / "90
   days or so?") — this is asking "how serious are you" respectfully.
   → motivation signal confirmation.
5. **Price expectation.** Hear the number, thank them, move on — don't
   negotiate mid-call, don't flinch. → anchors vs MAO / entry cost.
6. **Condition walkthrough**: interior, then roof/siding/foundation, then
   utilities/plumbing/electrical (the script's 3-pass order is good).
   Listen for the *life situation* behind deferred maintenance — that's
   motivation revealing itself. → repairs estimate, condition score.
7. **The loan** (if creative finance is on the table): "Do you know
   roughly what's left on the mortgage, and is the payment current?" Asked
   plainly, with the honest reason: "it changes what kind of offer works."
   → `loan_balance, piti, arrears` for `subto`/`assumption.analyze()`.
8. **Decision-makers on title** — everyone who must sign, identified now.
9. **Close honestly**: state what happens next and WHEN ("I'll run this
   tonight and call you at 10am with either a number or a no"), then do
   exactly that. A real offer summary in writing; "agreement to review"
   language is fine, hiding the word "contract" as a trick is not.

## After the call → into the engine

1. Encode facts + confirmed signals into the candidate dict.
2. `strategy_picker.pick(facts)` → ranked strategies with reasons; read the
   disqualifiers to the team, not just the winner.
3. Run the winning calculator (`wholesale` / `subto` / `assumption`) with
   the call's numbers; sensitivity/stress before any offer.
4. **HITL gate (surgical, per the strategy doc): a human makes the offer,
   signs the contract, wires the money.** The engine ranks and explains;
   it never commits.
5. Call the seller back when you said you would — including when the answer
   is "we're not the right buyer, here's who might be." That referral is
   what makes the next absentee-list letter answered.

## What the spine must provide (pre-call packet)

- Owner name, mailing vs situs address (absentee), years owned
- Loan facts on record: origination amount/date, lender, loan type (FHA/VA
  flag!), estimated balance
- Signals that fired (arrears, probate, fire, insurance-gap…) — so the
  caller can be usefully honest ("we work with folks behind on payments")
  instead of fishing
- Comp snapshot + condition-from-imagery score → provisional MAO range so
  a credible ballpark is possible on the follow-up call
- DNC/TCPA scrub status: **do not dial unscrubbed numbers.**
