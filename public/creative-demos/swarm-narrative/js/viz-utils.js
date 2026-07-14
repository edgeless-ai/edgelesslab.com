/**
 * VizUtils — shared visualisation library for the Swarm Narrative bandit demos.
 *
 * Provides BanditSimulator, Agent (5 strategies), chart-drawing helpers, a
 * colour palette, utility functions, and a bandit race benchmark runner.
 *
 * All exports live on the global `VizUtils` object.
 *
 * Dependencies: none (vanilla JS, works in any modern browser).
 *
 * @module viz-utils
 * @see {@link https://edgelesslab.com/creative-demos/swarm-narrative/}
 */
(function () {
  'use strict';

  /* ================================================================== */
  /*  COLOUR PALETTES                                                     */
  /* ================================================================== */

  /**
   * Agent colours (index 0-4).
   * @const {string[]}
   */
  var AGENT_COLORS = ['#b51670', '#e34a6f', '#f7b731', '#36a2eb', '#4ecdc4'];

  /**
   * Arm colours (index 0-4).
   * @const {string[]}
   */
  var ARM_COLORS = ['#ed12ed', '#f7b731', '#36a2eb', '#86efac', '#c084fc'];

  /* ================================================================== */
  /*  UTILITY FUNCTIONS                                                   */
  /* ================================================================== */

  /**
   * Returns a colour from the AGENT_COLORS palette, optionally with alpha.
   * @param {number} [alpha=1]  Alpha channel (0-1).
   * @returns {string}          CSS colour string (hex or rgba).
   */
  function randomColor(alpha) {
    var idx = Math.floor(Math.random() * AGENT_COLORS.length);
    var hex = AGENT_COLORS[idx];
    if (alpha !== undefined && alpha >= 0 && alpha < 1) {
      return hexToRgba(hex, alpha);
    }
    return hex;
  }

  /**
   * Convert a hex colour to rgba string.
   * @private
   * @param {string} hex
   * @param {number} alpha
   * @returns {string}
   */
  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  /**
   * Linear interpolation.
   * @param {number} a
   * @param {number} b
   * @param {number} t
   * @returns {number}
   */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Clamp a value between min and max.
   * @param {number} v
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  /**
   * Smoothstep — Hermite interpolation between two edges.
   * @param {number} edge0
   * @param {number} edge1
   * @param {number} x
   * @returns {number}
   */
  function smoothstep(edge0, edge1, x) {
    var t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /* ================================================================== */
  /*  BANDIT SIMULATOR                                                    */
  /* ================================================================== */

  /**
   * Multi-armed bandit simulator with Bernoulli rewards.
   *
   * @param {number}   numArms   Number of arms (≥1).
   * @param {number[]} armProbs  True reward probabilities [0..1] per arm.
   */
  function BanditSimulator(numArms, armProbs) {
    if (typeof numArms !== 'number' || numArms < 1) {
      throw new Error('BanditSimulator: numArms must be ≥ 1');
    }
    if (!Array.isArray(armProbs) || armProbs.length !== numArms) {
      throw new Error('BanditSimulator: armProbs must be an array of length numArms');
    }

    /** @type {number} */
    this.numArms = numArms;

    /** @type {number[]} True reward probabilities (read-only after construction). */
    this.armProbs = armProbs.slice();

    /** @private @type {number[]} Pull count per arm. */
    this._counts = new Array(numArms).fill(0);

    /** @private @type {number[]} Cumulative reward per arm. */
    this._rewards = new Array(numArms).fill(0);
  }

  BanditSimulator.prototype = /** @lends BanditSimulator.prototype */ {

    constructor: BanditSimulator,

    /**
     * Pull an arm and get a Bernoulli reward.
     * @param {number} armIndex  0-indexed arm.
     * @returns {number}         1 (reward) or 0 (no reward).
     */
    pullArm: function (armIndex) {
      if (armIndex < 0 || armIndex >= this.numArms) {
        throw new Error('pullArm: armIndex out of range (' + armIndex + ')');
      }
      var reward = Math.random() < this.armProbs[armIndex] ? 1 : 0;
      this._counts[armIndex]++;
      this._rewards[armIndex] += reward;
      return reward;
    },

    /**
     * Maximum true reward probability among all arms.
     * @returns {number}
     */
    getOptimalValue: function () {
      var max = 0;
      for (var i = 0; i < this.armProbs.length; i++) {
        if (this.armProbs[i] > max) max = this.armProbs[i];
      }
      return max;
    },

    /**
     * Pull count per arm.
     * @returns {number[]}
     */
    getArmCounts: function () {
      return this._counts.slice();
    },

    /**
     * Cumulative reward per arm.
     * @returns {number[]}
     */
    getArmRewards: function () {
      return this._rewards.slice();
    },

    /**
     * Reset all internal state (counts and rewards).
     */
    reset: function () {
      for (var i = 0; i < this.numArms; i++) {
        this._counts[i] = 0;
        this._rewards[i] = 0;
      }
    },
  };

  /* ================================================================== */
  /*  INTERNAL HELPERS for Agent strategies                               */
  /* ================================================================== */

  /**
   * Fast natural log approximation via Math.log (native is fast enough).
   * @private
   */
  function ln(x) {
    return Math.log(x);
  }

  /**
   * Sample from a Beta(alpha, beta) distribution using the
   * Marsaglia-Tsang transform (works for alpha >= 1, beta >= 1).
   *
   * Falls back to Beta(1, 1) = Uniform(0,1) when both params are 1.
   * Uses the gamma-variate approach for general alpha,beta ≥ 1.
   *
   * @private
   * @param {number} alpha  Shape parameter (>= 1).
   * @param {number} beta   Shape parameter (>= 1).
   * @returns {number}      Sample in [0, 1].
   */
  function sampleBeta(alpha, beta) {
    // Beta(1,1) = Uniform(0,1)
    if (alpha === 1 && beta === 1) {
      return Math.random();
    }

    // For small alpha or beta, use the gamma-based approach.
    // Gamma distribution sampling via Marsaglia-Tsang.
    var x = sampleGamma(alpha);
    var y = sampleGamma(beta);
    return x / (x + y);
  }

  /**
   * Sample from Gamma(k, θ=1) using Marsaglia-Tsang method for k >= 1.
   * For k < 1, uses the Ahrens-Dieter boost with a smaller correction.
   *
   * @private
   * @param {number} k  Shape parameter (must be >= 1 for Marsaglia-Tsang).
   * @returns {number}
   */
  function sampleGamma(k) {
    // Marsaglia-Tsang for k >= 1
    if (k < 1) {
      // Use the small-shape approximation: sample Gamma(k+1) * U^(1/k)
      return sampleGamma(k + 1) * Math.pow(Math.random(), 1 / k);
    }

    var d = k - 1 / 3;
    var c = 1 / Math.sqrt(9 * d);
    var v, x, u;

    // Loop until we accept a sample
    for (;;) {
      do {
        x = sampleNormal();
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      u = Math.random();

      // Acceptance-rejection test
      if (u < 1 - 0.0331 * (x * x) * (x * x)) {
        // Upper bound shortcut
        return d * v;
      }
      if (ln(u) < 0.5 * x * x + d * (1 - v + ln(v))) {
        return d * v;
      }
    }
  }

  /**
   * Sample from standard Normal(0,1) using Box-Muller transform.
   * @private
   * @returns {number}
   */
  function sampleNormal() {
    var u, v, s;
    do {
      u = Math.random() * 2 - 1;
      v = Math.random() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);

    return u * Math.sqrt(-2 * ln(s) / s);
  }

  /* ================================================================== */
  /*  AGENT — strategy-based bandit agent                                 */
  /* ================================================================== */

  /** @const {Object} Strategy name lookup. */
  var STRATEGY_NAMES = {
    'random':        'Random',
    'epsilon-greedy':'Epsilon-Greedy',
    'ucb':           'UCB1',
    'thompson':      'Thompson Sampling',
    'optimistic':    'Optimistic Initial Values',
  };

  /**
   * Create a bandit agent that uses the given strategy.
   *
   * @param {string} strategy  One of: 'random', 'epsilon-greedy', 'ucb',
   *                           'thompson', 'optimistic'.
   * @param {Object} [params]  Optional parameters.
   * @param {number} [params.epsilon=0.1]    Exploration rate (epsilon-greedy).
   * @param {number} [params.ucbC=1.0]       Exploration constant (UCB).
   * @param {number} [params.optimism=1.0]   Initial estimate (optimistic).
   * @param {number} [params.temperature=1.0] Not used currently (reserved).
   */
  function Agent(strategy, params) {
    if (!strategy || STRATEGY_NAMES[strategy] === undefined) {
      throw new Error('Agent: unknown strategy "' + strategy + '". ' +
        'Valid strategies: ' + Object.keys(STRATEGY_NAMES).join(', '));
    }

    params = params || {};

    /** @type {string} */
    this.strategy = strategy;

    /** @type {Object} */
    this.params = {
      epsilon:     params.epsilon     !== undefined ? params.epsilon     : 0.1,
      ucbC:        params.ucbC        !== undefined ? params.ucbC        : 1.0,
      optimism:    params.optimism    !== undefined ? params.optimism    : 1.0,
      temperature: params.temperature !== undefined ? params.temperature : 1.0,
    };

    /** @private @type {number} Number of arms (set lazily on first use). */
    this._numArms = 0;

    /** @private @type {number[]} Pull count per arm. */
    this._counts = [];

    /** @private @type {number[]} Cumulative reward per arm. */
    this._rewards = [];

    /** @private @type {number[]} Estimated value per arm (running average). */
    this._values = [];

    /** @private @type {number} Total pulls across all arms. */
    this._totalPulls = 0;

    /** @private @type {number} Cumulative actual reward received. */
    this._totalReward = 0;
  }

  Agent.prototype = /** @lends Agent.prototype */ {

    constructor: Agent,

    /**
     * Initialise internal arrays for N arms.
     * Called automatically on first selectArm if not already initialised.
     * @private
     * @param {number} numArms
     */
    _initArms: function (numArms) {
      if (this._numArms === numArms) return;
      this._numArms = numArms;
      this._counts   = new Array(numArms).fill(0);
      this._rewards  = new Array(numArms).fill(0);

      // For 'optimistic' strategy, initialise values to the optimism parameter.
      // For all others, start at 0.
      var initialVal = this.strategy === 'optimistic' ? this.params.optimism : 0;
      this._values = new Array(numArms).fill(initialVal);

      this._totalPulls = 0;
      this._totalReward = 0;
    },

    /**
     * Select an arm using the configured strategy.
     *
     * @param {BanditSimulator} simulator  The bandit (used for arm count context).
     * @returns {number}                   Index of the chosen arm.
     */
    selectArm: function (simulator) {
      var n = simulator.numArms;
      if (this._numArms !== n) {
        this._initArms(n);
      }

      switch (this.strategy) {

        /* ---- Random ---- */
        case 'random':
          return Math.floor(Math.random() * n);

        /* ---- Epsilon-Greedy ---- */
        case 'epsilon-greedy':
          if (Math.random() < this.params.epsilon) {
            // Explore: pick a random arm
            return Math.floor(Math.random() * n);
          }
          // Exploit: pick arm with highest estimated value, tie-break randomly
          return this._argMaxRandomTieBreak(this._values);

        /* ---- UCB1 ---- */
        case 'ucb': {
          var totalPulls = this._totalPulls;

          // Ensure every arm is pulled at least once before UCB kicks in.
          for (var i = 0; i < n; i++) {
            if (this._counts[i] === 0) {
              return i;
            }
          }

          var ucbValues = new Array(n);
          var c = this.params.ucbC;
          var logTotal = ln(totalPulls);

          for (var j = 0; j < n; j++) {
            var mean = this._values[j];
            var exploration = c * Math.sqrt((2 * logTotal) / this._counts[j]);
            ucbValues[j] = mean + exploration;
          }

          return this._argMaxRandomTieBreak(ucbValues);
        }

        /* ---- Thompson Sampling ---- */
        case 'thompson': {
          var maxSample = -Infinity;
          var bestArm = 0;

          for (var k = 0; k < n; k++) {
            // Beta posterior: Beta(1 + rewards, 1 + pulls - rewards)
            var alpha = 1 + this._rewards[k];
            var beta  = 1 + this._counts[k] - this._rewards[k];

            var sample = sampleBeta(alpha, beta);
            if (sample > maxSample) {
              maxSample = sample;
              bestArm = k;
            }
          }

          return bestArm;
        }

        /* ---- Optimistic Initial Values ---- */
        case 'optimistic':
          // Greedy with high initial estimates drives exploration naturally.
          // All arms start at `optimism` so the first pull is random (tie-break).
          // After each pull, estimate is updated — the arm with the highest
          // current estimate (which may still be optimistic if unpulled) is chosen.
          return this._argMaxRandomTieBreak(this._values);

        default:
          return 0;
      }
    },

    /**
     * Argmax with random tie-breaking.
     * @private
     * @param {number[]} arr
     * @returns {number}
     */
    _argMaxRandomTieBreak: function (arr) {
      var bestVal = -Infinity;
      var bestIndices = [];

      for (var i = 0; i < arr.length; i++) {
        if (arr[i] > bestVal) {
          bestVal = arr[i];
          bestIndices = [i];
        } else if (arr[i] === bestVal) {
          bestIndices.push(i);
        }
      }

      // Random tie-break among ties
      if (bestIndices.length === 1) {
        return bestIndices[0];
      }
      return bestIndices[Math.floor(Math.random() * bestIndices.length)];
    },

    /**
     * Update internal state after pulling an arm and observing a reward.
     *
     * @param {number} arm     Index of the arm that was pulled.
     * @param {number} reward  0 or 1.
     */
    update: function (arm, reward) {
      this._counts[arm]++;
      this._rewards[arm] += reward;
      this._totalPulls++;
      this._totalReward += reward;

      // Incremental mean update for the pulled arm:
      // new_estimate = old_estimate + (reward - old_estimate) / count
      var n = this._counts[arm];
      this._values[arm] = this._values[arm] + (reward - this._values[arm]) / n;
    },

    /**
     * Compute cumulative regret up to the current state.
     *
     * Regret = (optimal_reward_per_step × total_pulls) - actual_total_reward
     *
     * @param {BanditSimulator} simulator  Used to get the optimal arm value.
     * @returns {number}
     */
    getRegret: function (simulator) {
      var optimal = simulator.getOptimalValue();
      return optimal * this._totalPulls - this._totalReward;
    },

    /**
     * Human-readable strategy name.
     * @returns {string}
     */
    getName: function () {
      return STRATEGY_NAMES[this.strategy] || this.strategy;
    },

    /**
     * Summary statistics.
     * @returns {{ pulls: number, rewards: number, regret: number, estimatedValues: number[] }}
     */
    getStats: function () {
      return {
        pulls:           this._totalPulls,
        rewards:         this._totalReward,
        regret:          NaN,  // regret requires simulator context; use getRegret()
        estimatedValues: this._values.slice(),
      };
    },

    /**
     * Reset all internal state (counts, rewards, values, totals).
     */
    reset: function () {
      var initialVal = this.strategy === 'optimistic' ? this.params.optimism : 0;
      if (this._numArms > 0) {
        this._counts   = new Array(this._numArms).fill(0);
        this._rewards  = new Array(this._numArms).fill(0);
        this._values   = new Array(this._numArms).fill(initialVal);
      }
      this._totalPulls = 0;
      this._totalReward = 0;
    },
  };

  /* ================================================================== */
  /*  BANDIT RACE RUNNER — benchmark multiple agents on one simulator     */
  /* ================================================================== */

  /**
   * Run all agents on a shared simulator for N steps.
   *
   * Each agent takes a turn pulling an arm from the same simulator,
   * so all agents experience the exact same sequence of arm pulls
   * (fair comparison). Regret is tracked per step.
   *
   * @param {Agent[]}        agents     Array of Agent instances.
   * @param {BanditSimulator} simulator  Shared simulator instance.
   * @param {number}         steps      Number of iterations to run.
   * @returns {{ histories: number[][], finalStats: Object[] }}
   *   histories[n][t] = cumulative regret for agent n at step t.
   *   finalStats[n]   = { pulls, rewards, regret, estimatedValues }
   */
  function runRace(agents, simulator, steps) {
    if (!agents || !agents.length) {
      throw new Error('runRace: agents array is empty or undefined');
    }
    if (!simulator) {
      throw new Error('runRace: simulator is required');
    }
    if (typeof steps !== 'number' || steps < 1) {
      throw new Error('runRace: steps must be ≥ 1');
    }

    // Reset everything
    var numAgents = agents.length;
    for (var a = 0; a < numAgents; a++) {
      agents[a].reset();
    }
    simulator.reset();

    /** @type {number[][]} */
    var histories = [];
    for (var i = 0; i < numAgents; i++) {
      histories[i] = new Array(steps);
    }

    var optimal = simulator.getOptimalValue();

    for (var t = 0; t < steps; t++) {
      for (var j = 0; j < numAgents; j++) {
        var agent = agents[j];
        var arm   = agent.selectArm(simulator);
        var reward = simulator.pullArm(arm);
        agent.update(arm, reward);

        // Record cumulative regret at this step:
        // regret = optimal * (t+1) - agent._totalReward
        var regret = optimal * (t + 1) - agent._totalReward;
        histories[j][t] = regret;
      }
    }

    // Build final stats
    var finalStats = [];
    for (var k = 0; k < numAgents; k++) {
      var ag = agents[k];
      finalStats.push({
        pulls:           ag._totalPulls,
        rewards:         ag._totalReward,
        regret:          optimal * steps - ag._totalReward,
        estimatedValues: ag._values.slice(),
      });
    }

    return {
      histories:  histories,
      finalStats: finalStats,
    };
  }

  /* ================================================================== */
  /*  CHART DRAWING HELPERS                                               */
  /* ================================================================== */

  /* ---- layout constants (shared by all chart helpers) ---- */

  /** @const {number} Left margin. */
  var CHART_MARGIN_LEFT   = 60;

  /** @const {number} Right margin. */
  var CHART_MARGIN_RIGHT  = 20;

  /** @const {number} Top margin. */
  var CHART_MARGIN_TOP    = 20;

  /** @const {number} Bottom margin. */
  var CHART_MARGIN_BOTTOM = 40;

  /* ---------------------------------------------------------------- */
  /*  drawRegretCurve                                                  */
  /* ---------------------------------------------------------------- */

  /**
   * Draw a multi-line regret curve chart.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number}           canvasWidth
   * @param {number}           canvasHeight
   * @param {number[][]}       histories  histories[n] = array of regret values per step.
   * @param {string[]}         colors     Per-series line colour.
   * @param {string[]}         labels     Per-series label.
   * @param {number}           [maxRegret]  Y-axis max (auto if omitted).
   */
  function drawRegretCurve(ctx, canvasWidth, canvasHeight, histories, colors, labels, maxRegret) {
    var numSeries = histories.length;
    if (numSeries === 0) return;

    var plotLeft   = CHART_MARGIN_LEFT;
    var plotRight  = canvasWidth  - CHART_MARGIN_RIGHT;
    var plotTop    = CHART_MARGIN_TOP;
    var plotBottom = canvasHeight - CHART_MARGIN_BOTTOM;
    var plotW      = plotRight - plotLeft;
    var plotH      = plotBottom - plotTop;

    var numSteps = histories[0].length;
    if (numSteps < 2) return;

    // Determine y-axis range
    var maxY = maxRegret !== undefined ? maxRegret : 0;
    if (maxY === 0) {
      // Auto-range: find max across all series
      for (var s = 0; s < numSeries; s++) {
        for (var t = 0; t < histories[s].length; t++) {
          if (histories[s][t] > maxY) maxY = histories[s][t];
        }
      }
      // Add 10% headroom, minimum 1
      maxY = maxY * 1.1 || 1;
    }

    // Clear
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // --- Grid lines ---
    var gridLines = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (var g = 0; g <= gridLines; g++) {
      var y = plotTop + (plotH / gridLines) * g;
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();
    }

    // --- Y-axis labels ---
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var yg = 0; yg <= gridLines; yg++) {
      var yy = plotTop + (plotH / gridLines) * yg;
      var val = maxY - (maxY / gridLines) * yg;
      ctx.fillText(val.toFixed(1), plotLeft - 8, yy);
    }

    // --- X-axis label ---
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Steps', plotLeft + plotW / 2, canvasHeight - CHART_MARGIN_BOTTOM + 8);

    // --- Line series ---
    for (var si = 0; si < numSeries; si++) {
      var data = histories[si];
      ctx.strokeStyle = colors[si % colors.length] || '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (var ti = 0; ti < data.length; ti++) {
        var x = plotLeft + (ti / (numSteps - 1)) * plotW;
        var y = plotBottom - (data[ti] / maxY) * plotH;
        if (ti === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // --- Legend ---
    var legendX = plotLeft + 10;
    var legendY = plotTop + 10;
    var legendSpacing = 18;

    for (var li = 0; li < numSeries; li++) {
      var lx = legendX;
      var ly = legendY + li * legendSpacing;

      ctx.fillStyle = colors[li % colors.length] || '#fff';
      ctx.fillRect(lx, ly, 12, 12);

      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[li] || ('Series ' + li), lx + 18, ly + 6);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  drawArmChart — bar chart of arm pulls / rewards                  */
  /* ---------------------------------------------------------------- */

  /**
   * Draw a grouped bar chart showing per-arm pull counts and total rewards.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number}           canvasWidth
   * @param {number}           canvasHeight
   * @param {number[]}         counts    Pull count per arm.
   * @param {number[]}         rewards   Cumulative reward per arm.
   * @param {string[]}         colors    Per-arm bar colour (bars share fill).
   * @param {string[]}         labels    Per-arm label (e.g. 'Arm 0', 'Arm 1'...).
   */
  function drawArmChart(ctx, canvasWidth, canvasHeight, counts, rewards, colors, labels) {
    var numArms = counts.length;
    if (numArms === 0) return;

    var plotLeft   = CHART_MARGIN_LEFT + 20;
    var plotRight  = canvasWidth  - CHART_MARGIN_RIGHT;
    var plotTop    = CHART_MARGIN_TOP;
    var plotBottom = canvasHeight - CHART_MARGIN_BOTTOM;
    var plotW      = plotRight - plotLeft;
    var plotH      = plotBottom - plotTop;

    // Find max value for scaling
    var maxVal = 0;
    for (var i = 0; i < numArms; i++) {
      if (counts[i]  > maxVal) maxVal = counts[i];
      if (rewards[i] > maxVal) maxVal = rewards[i];
    }
    maxVal = maxVal * 1.15 || 1;

    var groupW   = plotW / numArms;
    var barW     = groupW * 0.35;
    var barPad   = groupW * 0.05;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // --- Baseline ---
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotLeft, plotBottom);
    ctx.lineTo(plotRight, plotBottom);
    ctx.stroke();

    // --- Y-axis labels ---
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    var yTicks = 4;
    for (var yt = 0; yt <= yTicks; yt++) {
      var yv = (maxVal / yTicks) * yt;
      var yy = plotBottom - (yv / maxVal) * plotH;
      if (yy < plotTop) continue;
      ctx.fillText(Math.round(yv).toString(), plotLeft - 8, yy);
    }

    for (var a = 0; a < numArms; a++) {
      var cx = plotLeft + a * groupW + groupW / 2;
      var armColor = colors[a % colors.length] || '#888';

      // --- Counts bar (slightly darker, wider) ---
      var cH = (counts[a] / maxVal) * plotH;
      ctx.fillStyle = armColor;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(cx - barW - barPad / 2, plotBottom - cH, barW, cH);

      // --- Rewards bar (brighter, more saturated) ---
      var rH = (rewards[a] / maxVal) * plotH;
      ctx.fillStyle = armColor;
      ctx.globalAlpha = 1.0;
      ctx.fillRect(cx + barPad / 2, plotBottom - rH, barW, rH);

      // --- Label ---
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(labels[a] || ('Arm ' + a), cx, plotBottom + 6);

      // --- Value labels on/above bars ---
      ctx.font = '9px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.textBaseline = 'bottom';
      if (counts[a] > 0) {
        ctx.fillText(counts[a].toString(), cx - barW / 2 - barPad / 2, plotBottom - cH - 2);
      }
      if (rewards[a] > 0) {
        ctx.fillText(rewards[a].toString(), cx + barW / 2 + barPad / 2, plotBottom - rH - 2);
      }
    }

    // Restore alpha
    ctx.globalAlpha = 1.0;
  }

  /* ---------------------------------------------------------------- */
  /*  drawConfidenceBars — horizontal bars with confidence intervals   */
  /* ---------------------------------------------------------------- */

  /**
   * Draw horizontal bars with confidence interval whiskers.
   *
   * Each bar shows the estimated value (centre dot/bar) with a
   * confidence width extending in both directions.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number}           canvasWidth
   * @param {number}           canvasHeight
   * @param {number[]}         estimatedValues   Point estimates per item.
   * @param {number[]}         confidenceWidths  CI half-width per item (e.g. 1.96 × std err).
   * @param {string[]}         colors            Per-item colour.
   * @param {string[]}         labels            Per-item label.
   */
  function drawConfidenceBars(ctx, canvasWidth, canvasHeight, estimatedValues, confidenceWidths, colors, labels) {
    var n = estimatedValues.length;
    if (n === 0) return;

    var marginL = 120;
    var marginR = 40;
    var marginT = 20;
    var marginB = 30;

    var plotLeft   = marginL;
    var plotRight  = canvasWidth - marginR;
    var plotTop    = marginT;
    var plotBottom = canvasHeight - marginB;
    var plotW      = plotRight - plotLeft;
    var plotH      = plotBottom - plotTop;

    // Determine x-axis range (add some padding)
    var minVal = 0;
    var maxVal = 0;
    for (var i = 0; i < n; i++) {
      var lo = estimatedValues[i] - confidenceWidths[i];
      var hi = estimatedValues[i] + confidenceWidths[i];
      if (lo < minVal) minVal = lo;
      if (hi > maxVal) maxVal = hi;
    }
    // Clamp min to at least 0 for probabilities, but allow negative if data demands
    if (minVal > 0) minVal = 0;
    var range = maxVal - minVal || 1;
    range *= 1.15;
    maxVal = minVal + range;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    var rowH       = plotH / n;
    var barMaxH    = rowH * 0.5;
    var barH       = Math.min(barMaxH, 24);

    // --- Vertical baseline at 0 (or mid-point of range) ---
    var zeroX = plotLeft + (0 - minVal) / range * plotW;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(zeroX, plotTop);
    ctx.lineTo(zeroX, plotBottom);
    ctx.stroke();

    for (var idx = 0; idx < n; idx++) {
      var cy = plotTop + idx * rowH + rowH / 2;
      var col = colors[idx % colors.length] || '#888';

      var centreX = plotLeft + (estimatedValues[idx] - minVal) / range * plotW;
      var ciX1    = plotLeft + (estimatedValues[idx] - confidenceWidths[idx] - minVal) / range * plotW;
      var ciX2    = plotLeft + (estimatedValues[idx] + confidenceWidths[idx] - minVal) / range * plotW;

      // --- CI whisker ---
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ciX1, cy);
      ctx.lineTo(ciX2, cy);
      ctx.stroke();

      // --- CI end caps ---
      var capSize = 4;
      ctx.beginPath();
      ctx.moveTo(ciX1, cy - capSize);
      ctx.lineTo(ciX1, cy + capSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ciX2, cy - capSize);
      ctx.lineTo(ciX2, cy + capSize);
      ctx.stroke();

      // --- Centre bar (point estimate marker) ---
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.9;
      var barW = Math.max(6, (centreX - ciX1) * 0.4);
      ctx.fillRect(centreX - barW / 2, cy - barH / 2, barW, barH);

      // --- Centre dot ---
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.arc(centreX, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      // --- Label ---
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[idx] || ('Item ' + idx), marginL - 12, cy);

      // --- Value text at right end of bar ---
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      var valStr = estimatedValues[idx].toFixed(3) + ' ±' + confidenceWidths[idx].toFixed(3);
      ctx.fillText(valStr, ciX2 + 8, cy);
    }

    ctx.globalAlpha = 1.0;
  }

  /* ---------------------------------------------------------------- */
  /*  drawVoteRings — animated donut charts per agent                  */
  /* ---------------------------------------------------------------- */

  /**
   * Draw animated donut (ring) charts, one per agent.
   *
   * Each ring shows the fraction of votes (or proportional metric) each arm received.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number}           canvasWidth
   * @param {number}           canvasHeight
   * @param {number[][]}       votes      votes[n] = array of values per arm (n = agents).
   * @param {string[]}         colors     Per-arm segment colour.
   * @param {string[]}         labels     Per-agent label drawn under each ring.
   */
  function drawVoteRings(ctx, canvasWidth, canvasHeight, votes, colors, labels) {
    var numAgents = votes.length;
    if (numAgents === 0) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Layout: arrange rings in a grid-like row
    var ringCount   = numAgents;
    var totalGap    = (ringCount - 1) * 20;
    var ringDiameter = Math.min(
      (canvasWidth - 80 - totalGap) / ringCount,
      canvasHeight * 0.7
    );
    var ringRadius  = ringDiameter / 2;
    var startX      = (canvasWidth - (ringCount * ringDiameter + totalGap)) / 2 + ringRadius;
    var centreY     = canvasHeight * 0.45;
    var ringW       = Math.max(6, ringRadius * 0.35);

    for (var a = 0; a < numAgents; a++) {
      var cx = startX + a * (ringDiameter + 20);
      var data = votes[a];

      // Compute totals
      var total = 0;
      for (var d = 0; d < data.length; d++) {
        total += data[d];
      }

      if (total <= 0) {
        // Draw an empty ring
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = ringW;
        ctx.beginPath();
        ctx.arc(cx, centreY, ringRadius - ringW / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Draw filled ring segments using arc
        var startAngle = -Math.PI / 2;  // start at 12 o'clock

        for (var seg = 0; seg < data.length; seg++) {
          var sliceAngle = (data[seg] / total) * Math.PI * 2;
          if (sliceAngle <= 0) continue;

          var col = colors[seg % colors.length] || '#888';

          ctx.strokeStyle = col;
          ctx.lineWidth = ringW;
          ctx.beginPath();
          ctx.arc(cx, centreY, ringRadius - ringW / 2, startAngle, startAngle + sliceAngle);
          ctx.stroke();

          startAngle += sliceAngle;
        }
      }

      // --- Label ---
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(labels[a] || ('Agent ' + a), cx, centreY + ringRadius + 10);

      // --- Percentage total in centre ---
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '12px monospace';
      ctx.textBaseline = 'middle';
      ctx.fillText(total.toString(), cx, centreY);
    }
  }

  /* ================================================================== */
  /*  EXPORTS — all properties on global VizUtils                        */
  /* ================================================================== */

  var VizUtils = {
    // Classes
    BanditSimulator: BanditSimulator,
    Agent:           Agent,

    // Palettes
    AGENT_COLORS: AGENT_COLORS,
    ARM_COLORS:   ARM_COLORS,

    // Utilities
    randomColor: randomColor,
    lerp:        lerp,
    clamp:       clamp,
    smoothstep:  smoothstep,

    // Chart helpers
    drawRegretCurve:     drawRegretCurve,
    drawArmChart:        drawArmChart,
    drawConfidenceBars:  drawConfidenceBars,
    drawVoteRings:       drawVoteRings,

    // Race runner
    runRace: runRace,
  };

  window.VizUtils = VizUtils;
})();
