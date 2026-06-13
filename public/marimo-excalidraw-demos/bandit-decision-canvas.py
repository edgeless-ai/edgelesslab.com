import marimo

__generated_with = "0.23.8"
app = marimo.App(width="full", app_title="Bandit Decision Canvas")


@app.cell(hide_code=True)
def _():
    import marimo as mo
    import numpy as np
    import matplotlib.pyplot as plt
    from wigglystuff import Excalidraw

    return Excalidraw, mo, np, plt


@app.cell(hide_code=True)
def _(np):
    np.random.seed(123)
    return


@app.cell(hide_code=True)
def _(mo):
    n_arms = mo.ui.slider(start=2, stop=6, step=1, value=3, label="Number of Arms")
    n_steps = mo.ui.slider(start=20, stop=200, step=10, value=80, label="Time Steps")
    eps = mo.ui.slider(start=0.0, stop=0.5, step=0.05, value=0.1, label="Epsilon (ε-greedy)")
    return eps, n_arms, n_steps


@app.cell(hide_code=True)
def _(eps, n_arms, n_steps, np):
    true_means = np.linspace(0.3, 0.9, n_arms.value)
    np.random.shuffle(true_means)

    def run_bandit(eps_val, steps, means):
        n = len(means)
        counts = np.zeros(n)
        values = np.zeros(n)
        regrets = []
        rewards = []
        optimal = np.max(means)
        total_regret = 0.0

        for t in range(steps):
            if np.random.random() < eps_val:
                action = np.random.randint(n)
            else:
                action = np.argmax(values / (counts + 1e-9))

            reward = np.random.binomial(1, means[action])
            counts[action] += 1
            values[action] += reward
            rewards.append(reward)
            total_regret += optimal - means[action]
            regrets.append(total_regret)

        return np.array(regrets), np.array(rewards), counts, values

    eps_val = eps.value
    regrets, rewards, counts, values = run_bandit(eps_val, n_steps.value, true_means)
    return counts, regrets, rewards, true_means, values


@app.cell(hide_code=True)
def _(n_steps, np, plt, regrets, rewards):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
    fig.patch.set_facecolor('#0a0a0f')
    ax1.set_facecolor('#0a0a0f')
    ax2.set_facecolor('#0a0a0f')

    # Cumulative regret
    ax1.plot(regrets, color='#ff6b35', linewidth=2)
    ax1.fill_between(range(len(regrets)), regrets, alpha=0.1, color='#ff6b35')
    ax1.set_title('Cumulative Regret', color='white', fontsize=12)
    ax1.set_xlabel('Step', color='white')
    ax1.set_ylabel('Regret', color='white')
    ax1.tick_params(colors='white')
    for spine in ax1.spines.values():
        spine.set_color('white')

    # Rolling average reward
    window = max(5, n_steps.value // 10)
    rolling = np.convolve(rewards, np.ones(window)/window, mode='valid')
    ax2.plot(rolling, color='#00d4ff', linewidth=2)
    ax2.set_title(f'Rolling Avg Reward (window={window})', color='white', fontsize=12)
    ax2.set_xlabel('Step', color='white')
    ax2.set_ylabel('Avg Reward', color='white')
    ax2.tick_params(colors='white')
    for spine in ax2.spines.values():
        spine.set_color('white')

    plt.tight_layout()
    plt
    return


@app.cell(hide_code=True)
def _(Excalidraw, mo):
    canvas = mo.ui.anywidget(Excalidraw(height=550, theme="dark"))
    return (canvas,)


@app.cell(hide_code=True)
def _(counts, eps, mo, n_arms, true_means, values):
    est_values = values / (counts + 1e-9)
    rows = []
    for i in range(n_arms.value):
        rows.append(
            f"| Arm {i} | {true_means[i]:.2f} | {est_values[i]:.2f} | {int(counts[i])} | "
            f"{'✅ OPTIMAL' if true_means[i] == max(true_means) else ''} |"
        )

    mo.md(f"""
    ## Multi-Armed Bandit — ε-Greedy Strategy

    **ε = {eps.value}** | Arms = {n_arms.value} | Steps = {len(true_means)} → only one is optimal

    | Arm | True μ | Estimated μ | Times Pulled | Notes |
    |-----|--------|-------------|-------------|-------|
    {chr(10).join(rows)}

    **The exploration-exploitation tradeoff:**
    - With probability **ε**, explore randomly
    - With probability **1-ε**, exploit the best-known arm
    - Higher ε → more exploration, slower convergence but less risk of missing the best arm
    - Lower ε → faster convergence but might get stuck on a suboptimal arm
    """)
    return


@app.cell(hide_code=True)
def _(eps, mo, n_arms, n_steps):
    mo.hstack([mo.vstack([n_arms, n_steps, eps])])
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md("""
    ## ✏️ Decision Canvas

    Use the Excalidraw whiteboard to:
    - Draw a decision tree for the ε-greedy strategy
    - Annotate the regret curve with insights
    - Sketch expected value estimates for each arm
    - Diagram alternative strategies (UCB, Thompson Sampling, etc.)
    """)
    return


@app.cell(hide_code=True)
def _(canvas):
    canvas
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md("""
    ---
    ### Architecture

    This demo runs a **multi-armed bandit** simulation with a **freeform annotation layer**:

    1. **Simulation**: ε-greedy strategy plays against arms with hidden true means
    2. **Visualization**: Cumulative regret (left) + rolling average reward (right) update reactively
    3. **Excalidraw whiteboard**: Sketch decision trees, annotate strategies, compare approaches

    Adjust ε, arms, and steps — the simulation re-runs instantly. The whiteboard persists for freeform exploration.

    *Built with [wigglystuff](https://github.com/koaning/wigglystuff) + [marimo](https://marimo.io)*

    #python #reinforcementlearning #bandits #excalidraw #opensource
    """)
    return


if __name__ == "__main__":
    app.run()
