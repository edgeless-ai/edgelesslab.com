/**
 * Chapter 3 — Wisdom of the Swarm
 *
 * Consensus/synthesis visualisation showing 5 agents with vote rings,
 * confidence bars, and a collective consensus bar. Agents start with
 * scattered estimates and converge to the correct arm over the scroll
 * animation.
 *
 * Exposes window.Chapter3Renderer with init(canvas), update(progress), destroy().
 *
 * Dependencies: VizUtils (viz-utils.js)
 */
(function () {
  'use strict';

  /* ================================================================== */
  /*  CONFIGURATION                                                       */
  /* ================================================================== */

  /** @const {number} */
  var NUM_AGENTS = 5;

  /** @const {number} */
  var NUM_ARMS = 3;

  /** Index of the correct (highest-reward) arm. */
  var CORRECT_ARM = 0;

  /** Agent display names. */
  var AGENT_NAMES = ['Random', 'Epsilon-Greedy', 'UCB1', 'Thompson', 'Optimistic'];

  /**
   * Trustworthiness baseline per agent (0..1).
   * Lower = less reliable historically; influences how quickly their
   * vote converges and how much weight the consensus gives them.
   */
  var TRUST_BASELINE = [0.35, 0.65, 0.82, 0.90, 0.72];

  /**
   * Target true reward values per arm (matching the bandit config
   * used in chapters 1 and 2).
   */
  var TRUE_VALUES = [0.7, 0.3, 0.1];

  /** Convergence duration in terms of progress (0..1). */
  var CONVERGE_DURATION = 0.85;

  /* ================================================================== */
  /*  LAYOUT CONSTANTS                                                    */
  /* ================================================================== */

  /** Fraction of canvas height for the vote ring section. */
  var RINGS_HEIGHT_RATIO = 0.42;

  /** Fraction of canvas height for the confidence bars section. */
  var CONFIDENCE_HEIGHT_RATIO = 0.28;

  /** Fraction of canvas height for the consensus bar section. */
  var CONSENSUS_HEIGHT_RATIO = 0.30;

  /* ================================================================== */
  /*  DPI-AWARE CANVAS SETUP                                              */
  /* ================================================================== */

  /**
   * Resize canvas to match container size at current devicePixelRatio.
   * @private
   * @param {HTMLCanvasElement} canvas
   * @returns {{ ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number }}
   */
  function setupCanvas(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var w = rect.width;
    var h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx: ctx, w: w, h: h, dpr: dpr };
  }

  /**
   * Clamp value to [0, 1].
   * @private
   * @param {number} v
   * @returns {number}
   */
  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  /**
   * Smoothstep easing.
   * @private
   */
  function smoothstep(t) {
    t = clamp01(t);
    return t * t * (3 - 2 * t);
  }

  /**
   * Linear interpolation.
   * @private
   */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /* ================================================================== */
  /*  CHAPTER 3 RENDERER                                                  */
  /* ================================================================== */

  /**
   * Renderer for the 'Wisdom of the Swarm' chapter.
   *
   * @constructor
   */
  function Chapter3Renderer() {
    /** @private @type {HTMLCanvasElement|null} */
    this._canvas = null;

    /** @private @type {CanvasRenderingContext2D|null} */
    this._ctx = null;

    /** @private @type {number} */
    this._w = 0;

    /** @private @type {number} */
    this._h = 0;

    /** @private @type {number} Last reported progress [0..1]. */
    this._lastProgress = 0;

    /** @private @type {Function|null} Bound resize handler. */
    this._resizeHandler = null;

    /* ---- Start state (scattered / unconverged) ---- */

    /** @private @type {number[][]} startVotes[n][arm] — random vote distribution. */
    this._startVotes = [];

    /** @private @type {number[][]} startEstimates[n][arm] — per-arm random estimates. */
    this._startEstimates = [];

    /** @private @type {number[][]} startConfWidths[n][arm] — wide CI widths. */
    this._startConfWidths = [];

    /* ---- Target state (converged on correct arm) ---- */

    /** @private @type {number[][]} targetVotes[n][arm] — focused on correct arm. */
    this._targetVotes = [];

    /** @private @type {number[][]} targetEstimates[n][arm] — true value estimates. */
    this._targetEstimates = [];

    /** @private @type {number[][]} targetConfWidths[n][arm] — narrow CI widths. */
    this._targetConfWidths = [];

    /** @private @type {boolean} Whether state has been initialised. */
    this._initialised = false;
  }

  Chapter3Renderer.prototype = /** @lends Chapter3Renderer.prototype */ {

    constructor: Chapter3Renderer,

    /* ---------------------------------------------------------------- */
    /*  PUBLIC API                                                        */
    /* ---------------------------------------------------------------- */

    /**
     * Initialise the renderer with a canvas element.
     * Generates random start state and converged target state.
     *
     * @param {HTMLCanvasElement} canvas  The #graphic-canvas element.
     */
    init: function (canvas) {
      if (!canvas) {
        console.warn('Chapter3Renderer.init: no canvas provided');
        return;
      }

      this._canvas = canvas;
      var d = setupCanvas(canvas);
      this._ctx = d.ctx;
      this._w = d.w;
      this._h = d.h;

      // Reset and initialise agent state
      this._initialised = false;
      this._initStates();

      // Bind resize handler — re-render at current progress on resize
      var self = this;
      this._resizeHandler = function () {
        var d2 = setupCanvas(canvas);
        self._ctx = d2.ctx;
        self._w = d2.w;
        self._h = d2.h;
        self._render(self._lastProgress);
      };
      window.addEventListener('resize', this._resizeHandler);

      // Draw initial state
      this._render(0);
    },

    /**
     * Update the visualisation based on scroll progress [0..1].
     *
     * @param {number} progress  0 = step just entered centre,
     *                           1 = step about to leave centre.
     */
    update: function (progress) {
      if (!this._ctx) return;
      this._lastProgress = progress;
      this._render(progress);
    },

    /**
     * Full teardown: remove event listeners, null references.
     */
    destroy: function () {
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }
      this._canvas = null;
      this._ctx = null;
      this._lastProgress = 0;
      this._initialised = false;
    },

    /* ---------------------------------------------------------------- */
    /*  STATE INITIALISATION                                              */
    /* ---------------------------------------------------------------- */

    /**
     * Generate initial scattered state and converged target state.
     * @private
     */
    _initStates: function () {
      var a, arm;

      // Clear arrays
      this._startVotes = [];
      this._startEstimates = [];
      this._startConfWidths = [];
      this._targetVotes = [];
      this._targetEstimates = [];
      this._targetConfWidths = [];

      for (a = 0; a < NUM_AGENTS; a++) {
        /* ---- Start state: scattered, uncertain ---- */

        // Random vote distribution (different for each agent)
        var rawVotes = [];
        var rawTotal = 0;
        for (arm = 0; arm < NUM_ARMS; arm++) {
          var v = Math.random() * 0.6 + 0.05;
          rawVotes.push(v);
          rawTotal += v;
        }
        // Normalise to sum 1
        var startVoteRow = [];
        for (arm = 0; arm < NUM_ARMS; arm++) {
          startVoteRow.push(rawVotes[arm] / rawTotal);
        }
        this._startVotes.push(startVoteRow);

        // Random estimates per arm (noisy, inaccurate)
        var estRow = [];
        var confRow = [];
        for (arm = 0; arm < NUM_ARMS; arm++) {
          estRow.push(Math.random() * 0.8 + 0.05);
          confRow.push(0.25 + Math.random() * 0.25); // wide CI
        }
        this._startEstimates.push(estRow);
        this._startConfWidths.push(confRow);

        /* ---- Target state: converged on true values ---- */

        var targetVoteRow = [];
        for (arm = 0; arm < NUM_ARMS; arm++) {
          // Strong preference for the correct arm
          if (arm === CORRECT_ARM) {
            targetVoteRow.push(0.70 + TRUST_BASELINE[a] * 0.25);
          } else if (arm === 1) {
            targetVoteRow.push(0.05 + (1 - TRUST_BASELINE[a]) * 0.15);
          } else {
            targetVoteRow.push(0.02 + (1 - TRUST_BASELINE[a]) * 0.08);
          }
        }
        // Renormalise target votes
        var tTotal = 0;
        for (arm = 0; arm < NUM_ARMS; arm++) tTotal += targetVoteRow[arm];
        for (arm = 0; arm < NUM_ARMS; arm++) targetVoteRow[arm] /= tTotal;
        this._targetVotes.push(targetVoteRow);

        // Target estimates converge to true values
        // More reliable agents converge more precisely
        var reliability = TRUST_BASELINE[a];
        var tEstRow = [];
        var tConfRow = [];
        for (arm = 0; arm < NUM_ARMS; arm++) {
          var noise = (1 - reliability) * 0.15;
          tEstRow.push(TRUE_VALUES[arm] + (Math.random() - 0.5) * noise);
          // Narrower CI for more reliable agents
          tConfRow.push(0.04 + (1 - reliability) * 0.08);
        }
        this._targetEstimates.push(tEstRow);
        this._targetConfWidths.push(tConfRow);
      }

      this._initialised = true;
    },

    /**
     * Compute the interpolated state at a given progress value.
     * @private
     * @param {number} t  Normalised convergence factor [0..1].
     * @returns {{ votes: number[][], estimates: number[][], confWidths: number[][], trustScores: number[] }}
     */
    _interpolateState: function (t) {
      var votes = [];
      var estimates = [];
      var confWidths = [];
      var trustScores = [];

      var st = smoothstep(t); // smooth easing for natural feel

      for (var a = 0; a < NUM_AGENTS; a++) {
        // Interpolate vote distribution
        var vRow = [];
        for (var arm = 0; arm < NUM_ARMS; arm++) {
          vRow.push(lerp(this._startVotes[a][arm], this._targetVotes[a][arm], st));
        }
        votes.push(vRow);

        // Interpolate estimates
        var eRow = [];
        var cRow = [];
        for (arm = 0; arm < NUM_ARMS; arm++) {
          eRow.push(lerp(this._startEstimates[a][arm], this._targetEstimates[a][arm], st));
          cRow.push(lerp(this._startConfWidths[a][arm], this._targetConfWidths[a][arm], st));
        }
        estimates.push(eRow);
        confWidths.push(cRow);

        // Trust score: start at baseline, improve with convergence
        var trust = TRUST_BASELINE[a] + (1 - TRUST_BASELINE[a]) * st * 0.3;
        trustScores.push(clamp01(trust));
      }

      return {
        votes: votes,
        estimates: estimates,
        confWidths: confWidths,
        trustScores: trustScores,
      };
    },

    /* ---------------------------------------------------------------- */
    /*  RENDER ENTRY POINT                                                */
    /* ---------------------------------------------------------------- */

    /**
     * Main render function.
     * @private
     * @param {number} progress  0..1 scroll progress.
     */
    _render: function (progress) {
      var ctx = this._ctx;
      var w = this._w;
      var h = this._h;
      if (!ctx || !this._initialised) return;

      // Convergence factor: how far along the animation we are
      var convergeT = clamp01(progress / CONVERGE_DURATION);
      var state = this._interpolateState(convergeT);

      // Clear canvas
      ctx.clearRect(0, 0, w, h);

      // Subtle background
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(0, 0, w, h);

      // Compute section boundaries
      var ringsBottom = Math.floor(h * RINGS_HEIGHT_RATIO);
      var confBottom = ringsBottom + Math.floor(h * CONFIDENCE_HEIGHT_RATIO);

      // --- Section 1: Vote rings ---
      this._drawVoteRingsSection(ctx, w, ringsBottom, state);

      // --- Divider line 1 ---
      this._drawDivider(ctx, 0, ringsBottom, w, 0.08);

      // --- Section 2: Confidence bars ---
      this._drawConfidenceSection(ctx, w, ringsBottom, confBottom - ringsBottom, state);

      // --- Divider line 2 ---
      this._drawDivider(ctx, 0, confBottom, w, 0.08);

      // --- Section 3: Consensus bar + trust summary ---
      this._drawConsensusSection(ctx, w, confBottom, h - confBottom, state, convergeT);
    },

    /* ---------------------------------------------------------------- */
    /*  VOTE RINGS SECTION                                                */
    /* ---------------------------------------------------------------- */

    /**
     * Draw the vote ring donut charts section.
     * Uses a clipped context so VizUtils.drawVoteRings renders in the
     * correct canvas region.
     * @private
     */
    _drawVoteRingsSection: function (ctx, w, h, state) {
      // Build agent labels with trust score appended
      var labels = [];
      for (var a = 0; a < NUM_AGENTS; a++) {
        var trustPct = Math.round(state.trustScores[a] * 100);
        labels.push(AGENT_NAMES[a] + ' ' + trustPct + '%');
      }

      ctx.save();
      // Translate to the rings section origin
      ctx.translate(0, 0);
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();

      // Use VizUtils.drawVoteRings — it draws relative to (0,0) so
      // after our translation it renders in the correct region.
      VizUtils.drawVoteRings(ctx, w, h, state.votes, VizUtils.ARM_COLORS, labels);

      // Over-draw trust indicator bars under each ring
      this._drawTrustIndicators(ctx, w, h, state.trustScores);

      ctx.restore();
    },

    /**
     * Draw small horizontal trust bars under each agent's vote ring.
     * @private
     */
    _drawTrustIndicators: function (ctx, w, h, trustScores) {
      var ringCount = NUM_AGENTS;
      var totalGap = (ringCount - 1) * 20;
      var ringDiameter = Math.min(
        (w - 80 - totalGap) / ringCount,
        h * 0.7
      );
      var ringRadius = ringDiameter / 2;
      var startX = (w - (ringCount * ringDiameter + totalGap)) / 2 + ringRadius;
      var centreY = h * 0.45;
      var barY = centreY + ringRadius + 26; // below the ring label

      var barW = ringDiameter * 0.7;
      var barH = 4;

      // "Trust" label above the bars
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('trust', startX, barY - 2);

      for (var a = 0; a < NUM_AGENTS; a++) {
        var cx = startX + a * (ringDiameter + 20);
        var trust = trustScores[a];
        var color = VizUtils.AGENT_COLORS[a % VizUtils.AGENT_COLORS.length];

        // Background track
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(cx - barW / 2, barY - barH / 2, barW, barH);

        // Filled portion
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(cx - barW / 2, barY - barH / 2, barW * trust, barH);
        ctx.globalAlpha = 1.0;
      }
    },

    /* ---------------------------------------------------------------- */
    /*  CONFIDENCE BARS SECTION                                           */
    /* ---------------------------------------------------------------- */

    /**
     * Draw the confidence bars section using VizUtils.drawConfidenceBars.
     * Shows each agent's estimate (with CI) for the correct arm.
     * @private
     */
    _drawConfidenceSection: function (ctx, w, yOff, h, state) {
      // Prepare per-agent confidence data for arm 0
      var estimates = [];
      var confWidths = [];
      var colors = [];

      for (var a = 0; a < NUM_AGENTS; a++) {
        // Use the estimate for the correct arm (arm 0)
        estimates.push(state.estimates[a][CORRECT_ARM]);
        confWidths.push(state.confWidths[a][CORRECT_ARM]);
        colors.push(VizUtils.AGENT_COLORS[a % VizUtils.AGENT_COLORS.length]);
      }

      ctx.save();
      ctx.translate(0, yOff);
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();

      // Title
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('confidence intervals — Arm A estimate', w / 2, 4);

      VizUtils.drawConfidenceBars(ctx, w, h, estimates, confWidths, colors, AGENT_NAMES);

      ctx.restore();
    },

    /* ---------------------------------------------------------------- */
    /*  CONSENSUS BAR SECTION                                             */
    /* ---------------------------------------------------------------- */

    /**
     * Draw the large consensus bar showing the collective decision.
     * Also draws trust score summary and convergence indicator.
     * @private
     */
    _drawConsensusSection: function (ctx, w, yOff, h, state, convergeT) {
      ctx.save();
      ctx.translate(0, yOff);

      // --- Title ---
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Collective Consensus', w / 2, 8);

      // --- Compute consensus: weighted sum of votes ---
      var consensus = [];
      for (var arm = 0; arm < NUM_ARMS; arm++) {
        consensus[arm] = 0;
      }
      for (var a = 0; a < NUM_AGENTS; a++) {
        var weight = state.trustScores[a];
        for (arm = 0; arm < NUM_ARMS; arm++) {
          consensus[arm] += state.votes[a][arm] * weight;
        }
      }

      // Determine consensus share for the correct arm
      var totalWeighted = 0;
      for (arm = 0; arm < NUM_ARMS; arm++) {
        totalWeighted += consensus[arm];
      }
      totalWeighted = totalWeighted || 1;
      var correctShare = consensus[CORRECT_ARM] / totalWeighted;

      // --- Draw the large central bar ---
      var barLeft = w * 0.15;
      var barRight = w * 0.85;
      var barW = barRight - barLeft;
      var barY = 40;
      var barH = 36;
      var barCentreY = barY + barH / 2;

      // Bar background
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.roundRect(barLeft, barY, barW, barH, 6);
      ctx.fill();

      // Consensus fill — show how strongly the swarm converges on arm A
      var fillWidth = barW * correctShare * convergeT;
      var fillColor = VizUtils.ARM_COLORS[CORRECT_ARM % VizUtils.ARM_COLORS.length];

      ctx.fillStyle = fillColor;
      ctx.globalAlpha = 0.5 + 0.4 * convergeT;
      ctx.beginPath();
      ctx.roundRect(barLeft, barY, fillWidth, barH, 6);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Bar border
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(barLeft, barY, barW, barH, 6);
      ctx.stroke();

      // --- Percentage text inside bar ---
      var pctDisplay = Math.round(correctShare * 100 * convergeT);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pctDisplay + '%', barLeft + barW / 2, barCentreY);

      // --- Arm label ---
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('Arm A', barLeft + barW + 10, barCentreY);

      // --- Vote breakdown bar below the main consensus bar ---
      var breakdownY = barY + barH + 14;
      var breakdownH = 12;
      var breakdownW = barW;

      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.roundRect(barLeft, breakdownY, breakdownW, breakdownH, 3);
      ctx.fill();

      // Draw segments for each arm in order
      var segStartX = barLeft;
      for (arm = 0; arm < NUM_ARMS; arm++) {
        var share = (consensus[arm] / totalWeighted) * convergeT;
        var segW = breakdownW * share;
        var armColor = VizUtils.ARM_COLORS[arm % VizUtils.ARM_COLORS.length];

        if (segW > 1) {
          ctx.fillStyle = armColor;
          ctx.globalAlpha = 0.3 + 0.5 * (share / (1 / NUM_ARMS));
          ctx.fillRect(segStartX, breakdownY, segW, breakdownH);
          ctx.globalAlpha = 1.0;
        }
        segStartX += segW;
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(barLeft, breakdownY, breakdownW, breakdownH, 3);
      ctx.stroke();

      // Breakdown labels
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Arm A    Arm B    Arm C', barLeft + breakdownW / 2, breakdownY + breakdownH + 4);

      // --- Convergence indicator text ---
      if (convergeT < 0.15) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Agents forming consensus...', w / 2, h - 4);
      } else if (convergeT < 0.5) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Votes converging on Arm A', w / 2, h - 4);
      } else if (convergeT >= 0.95) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Consensus reached', w / 2, h - 4);
      }

      ctx.restore();
    },

    /* ---------------------------------------------------------------- */
    /*  DRAWING HELPERS                                                   */
    /* ---------------------------------------------------------------- */

    /**
     * Draw a thin horizontal divider line.
     * @private
     */
    _drawDivider: function (ctx, x, y, w, alpha) {
      ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
      ctx.fillRect(x, y, w, 1);
    },
  };

  /* ================================================================== */
  /*  ROUND-RECT POLYFILL (for browsers without native roundRect)        */
  /* ================================================================== */

  /**
   * If CanvasRenderingContext2D.roundRect is not available, add a
   * polyfill that approximates rounded rectangles via arcs.
   */
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      if (r > w / 2) r = w / 2;
      if (r > h / 2) r = h / 2;
      this.moveTo(x + r, y);
      this.lineTo(x + w - r, y);
      this.quadraticCurveTo(x + w, y, x + w, y + r);
      this.lineTo(x + w, y + h - r);
      this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      this.lineTo(x + r, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - r);
      this.lineTo(x, y + r);
      this.quadraticCurveTo(x, y, x + r, y);
      this.closePath();
    };
  }

  /* ================================================================== */
  /*  EXPORT                                                              */
  /* ================================================================== */

  window.Chapter3Renderer = Chapter3Renderer;

})();
