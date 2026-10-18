# /// script
# requires-python = ">=3.11"
# dependencies = ["marimo==0.23.16"]
# ///
import marimo

__generated_with = "0.23.16"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    return mo


@app.cell
def _(mo):
    mo.md(r"""# How much of SRQ is the endpoint?

    **Question.** In PGRR's slot-averaged recovery quality, how much weight
    comes from the separately measured final gait rather than executed recovery
    trials?

    This is an **equation-level reproduction and sensitivity explorer** for
    Equation 2. It does not run PGRR, MuJoCo, a robot, or the paper's 108 tasks.
    The paper reports `B = 10` and mean stopping counts of 1.86 (amputation),
    1.67 (fracture), and 4.00 (joint lock).
    """)
    trials = mo.ui.slider(1.0, 10.0, value=1.67, step=0.01, label="Executed trials K")
    final_q = mo.ui.slider(0.0, 1.0, value=0.70, step=0.05, label="Final quality q_F")
    trial_q = mo.ui.slider(0.0, 1.0, value=0.30, step=0.05, label="Mean executed-trial quality")
    mo.vstack([
        mo.hstack([trials, final_q], justify="start", gap=2),
        trial_q,
    ])
    return final_q, trial_q, trials


@app.cell
def _(final_q, mo, trial_q, trials):
    _B = 10.0
    _K = float(trials.value)
    _qf = float(final_q.value)
    _qt = float(trial_q.value)
    _endpoint_weight = (_B - _K + 1) / (_B + 1)
    _trial_weight = _K / (_B + 1)
    _endpoint_part = _endpoint_weight * _qf
    _trial_part = _trial_weight * _qt
    _srq = _endpoint_part + _trial_part
    _marker = f"k-{_K:.2f}-ew-{100*_endpoint_weight:.2f}-srq-{100*_srq:.2f}"
    _endpoint_w = 520 * _endpoint_weight
    _trial_w = 520 * _trial_weight
    _endpoint_score_w = 520 * _endpoint_part
    _trial_score_w = 520 * _trial_part
    _chart = f'''<svg data-chart="srq-endpoint-weight" data-marker="{_marker}" viewBox="0 0 680 330" role="img" aria-label="SRQ endpoint and trial contributions" style="max-width:100%;height:auto">
    <rect width="680" height="330" rx="12" fill="#f5f7fb"/>
    <text x="28" y="34" font-size="18" font-weight="700">What SRQ contains</text>
    <text x="28" y="58" font-size="12" fill="#526071">B = 10; endpoint fills its own slot plus unused trial slots</text>
    <text x="28" y="96" font-size="14">Formula weight</text>
    <rect x="130" y="76" width="{_trial_w:.1f}" height="34" rx="5" fill="#4c78a8"/>
    <rect x="{130 + _trial_w:.1f}" y="76" width="{_endpoint_w:.1f}" height="34" rx="5" fill="#e28e2c"/>
    <text x="130" y="128" font-size="12" fill="#4c78a8">trials {_trial_weight:.2%}</text>
    <text x="330" y="128" font-size="12" fill="#a85c00">endpoint {_endpoint_weight:.2%}</text>
    <text x="28" y="181" font-size="14">SRQ points</text>
    <rect x="130" y="160" width="{_trial_score_w:.1f}" height="34" rx="5" fill="#4c78a8"/>
    <rect x="{130 + _trial_score_w:.1f}" y="160" width="{_endpoint_score_w:.1f}" height="34" rx="5" fill="#e28e2c"/>
    <text x="130" y="212" font-size="12" fill="#4c78a8">trials {_trial_part:.3f}</text>
    <text x="330" y="212" font-size="12" fill="#a85c00">endpoint {_endpoint_part:.3f}</text>
    <line x1="130" y1="250" x2="650" y2="250" stroke="#ccd4df"/>
    <text x="28" y="276" font-size="13">SRQ = K/11 × q_trial + (11−K)/11 × q_F = {_srq:.3f}</text>
    <text x="28" y="305" font-size="12" fill="#526071">Orange is reused endpoint evidence, not extra physical measurement.</text>
    </svg>'''
    _summary = mo.md(f"""### Operating point: K {_K:.2f} / endpoint weight {100*_endpoint_weight:.2f}% / SRQ {100*_srq:.2f}%

    With mean executed-trial quality **{_qt:.2f}** and final quality
    **{_qf:.2f}**, endpoint reuse contributes **{_endpoint_part:.3f}** of the
    **{_srq:.3f}** SRQ. The remaining **{_trial_part:.3f}** comes from measured
    trial slots.
    """)
    mo.vstack([_summary, mo.Html(_chart)])
    return


@app.cell
def _(mo):
    mo.md(r"""**Takeaway.** SRQ is a budget-normalized utility, not an
    independent recovery-path measurement. At the paper's mean stopping counts,
    the explicit endpoint coefficient is **83.09%** for amputation (`K=1.86`),
    **84.82%** for fracture (`K=1.67`), and **63.64%** for joint lock (`K=4`).
    Report endpoint quality alongside an unpadded, duration-aware path metric if
    the two are meant to provide distinct evidence.

    **Provenance and limits.** Equation 2 and the stopping-count anchors come
    from Kim et al., *Persistent Profile-Guided Reset-Free Recovery Improves
    Final Gait Selection after Irreversible Leg Damage*, arXiv:2610.20838v1:
    https://arxiv.org/abs/2610.20838 . The paper reports author-run MuJoCo
    results on 108 matched tasks, including +0.106 final quality and +0.044 SRQ
    against its IT&E-inspired comparator; those results are **quoted, not
    reproduced** here.

    Mean `K` is allowed as a sensitivity input to reproduce aggregate
    coefficients, although an individual run has integer `K`. Equal trial means
    are an analyst-controlled simplification. This demo uses no paper code,
    per-task outcomes, robot data, simulator, network request, credential, or
    paid API. Original demo code is prepared for MIT release and copies no paper
    figure or dataset.
    """)
    return


if __name__ == "__main__":
    app.run()
