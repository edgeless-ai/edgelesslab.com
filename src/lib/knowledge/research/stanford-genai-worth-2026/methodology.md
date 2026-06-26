# Methodology — What is Generative AI Worth?

## Survey design
- **Platform:** Prolific
- **Wave 1:** July 2025, N=1,500 (1,491 post-cleaning)
- **Wave 2:** March 2026, N=2,000 (1,908 post-cleaning)
- **Sample:** Representative U.S. adults matched to census on age, gender, ethnicity, education, income, residence.

## Core question
> Q8. Would you give up access to any AI tool like ChatGPT, Gemini, Claude, or Copilot for one month starting tomorrow morning in exchange for $1/$10/$20/$50/$100/$200/$500?

- Randomized price points across respondents.
- Binary choice model.

## Econometric model
```logit
Pr(Y_i = 1 | p_i) = Λ(α + β ln p_i)
WTA_med = exp(-α̂ / β̂)
WTA_mean = ∫₀^{500} [1 - Λ(α̂ + β̂ ln p)] dp
CS = WTA × N_users × 12
```
- `Λ` = logistic CDF
- Log price accounts for concavity of valuation in money amounts
- Truncated at $500 for conservatism on mean

## Heterogeneity extension
```logit
Pr(Y_i = 1 | p_i, X_i) = Λ(α + β ln p_i + X'_i γ)
```
- Reported as average marginal effects (AMEs)
- Negative coefficients → lower probability of accepting → higher WTA

## Quality controls
- Bot/LLM usage detection
- Explicit + implicit attention checks (99.7% pass explicit)
- Fake LLM decoy attention check (0% selected it — confirms non-LLM sample)
- Fast/errant response removal
- Median completion time: 3m 15s

## Key heterogeneities (strongest predictors of higher WTA)
1. Higher usage frequency
2. Workplace use of gen AI
3. Paid subscription status

Additional significant differences: gender, age, ethnicity.

## Why the method matters for Edgeless
WTA is the right frame for welfare measurement. Revenue measures producer value; WTA measures user value. The gap (12×) is the Lindahl-price argument for undercounting AI in GDP.
