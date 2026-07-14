/**
 * Chapter 2 — Many Minds, One Problem
 *
 * Five bandit agents race on the same bandit problem:
 *   Random, Epsilon-Greedy, UCB1, Thompson Sampling, Optimistic Initial Values.
 *
 * All five regret curves are OVERLAID on a single chart for direct comparison.
 * A winner highlight and per-agent stats panel appear as the user scrolls through.
 *
 * Exposes window.Chapter2Renderer with init(canvas), update(progress), destroy().
 *
 * Dependencies: VizUtils (viz-utils.js)
 *
 * @module chapter2-renderer
 */
(function () {
  'use strict';

  /* ================================================================== */
  /*  CONFIGURATION                                                       */
  /* ================================================================== */

  /** @const {number} Number of simulation steps. */
  var NUM_STEPS = 300;

  /** @const {number} Number of arms. */
  var NUM_ARMS = 3;

  /** @const {number[]} True reward probabilities — arm 0 is obviously best. */
  var ARM_PROBS = [0.7, 0.3, 0.1];

  /** @const {Object[]} Agent configurations. */
  var AGENT_CONFIGS = [
    { strategy: 'random',         params: {},                   label: 'Random' },
    { strategy: 'epsilon-greedy', params: { epsilon: 0.1 },     label: 'Epsilon-Greedy' },
    { strategy: 'ucb',            params: { ucbC: 2.0 },        label: 'UCB1' },
    { strategy: 'thompson',       params: {},                   label: 'Thompson' },
    { strategy: 'optimistic',     params: { optimism: 5.0 },    label: 'Optimistic' },
  ];

  /** @const {string[]} Drawn from VizUtils.AGENT_COLORS. */
  var AGENT_COLORS = VizUtils.AGENT_COLORS;

  /** Progress at which the full chart reveal completes. */
  var FULL_REVEAL_AT = 0.8;

  /** Progress at which winner & stats panel appear. */
  var WINNER_SHOW_AT = 0.75;

  /* ================================================================== */
  /*  LAYOUT FOR SINGLE OVERLAID CHART                                    */
  /* ================================================================== */

  /** @const {number} Top padding for title. */
  var TITLE_H = 38;

  /** @const {number} Height reserved for the final-stats bar chart. */
  var STATS_H_MIN = 55;

  /** @const {number} Legend row height. */
  var LEGEND_H = 24;

  /** @const {number} Chart area left margin (legend labels are in this strip). */
  var CHART_MARGIN_L = 16;

  /** @const {number} Chart area right margin. */
  var CHART_MARGIN_R = 10;

  /* ================================================================== */
  /*  DPI-AWARE CANVAS SETUP                                              */
  /* ================================================================== */

  /**
   * Resize canvas to match container at current devicePixelRatio.
   * Uses ctx.setTransform(dpr, …) so all drawing stays in CSS px.
   * @private
   * @param {HTMLCanvasElement} canvas
   * @returns {{ ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number }}
   */
  function setupCanvas(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var w = rect.width;
    var h = rect.height;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h, dpr: dpr };
  }

  /* ================================================================== */
  /*  HELPER — compute stats from a runRace result                        */
  /* ================================================================== */

  /**
   * @private
   * @param {{ histories: number[][], finalStats: Object[] }} result
   * @returns {{ winner: number, regrets: number[], labels: string[], colors: string[] }}
   */
  function computeStats(result) {
    var stats = result.finalStats;
    var bestIdx = 0;
    var bestRegret = stats[0].regret;
    var regrets = [];
    for (var i = 0; i < stats.length; i++) {
      var r = stats[i].regret;
      regrets.push(r);
      if (r < bestRegret) {
        bestRegret = r;
        bestIdx = i;
      }
    }
    return {
      winner:  bestIdx,
      regrets: regrets,
    };
  }

  /* ================================================================== */
  /*  CHAPTER 2 RENDERER                                                  */
  /* ================================================================== */

  /**
   * Renderer for step 2 — overlaid multi-agent regret curves + stats.
   *
   * @constructor
   * @param {HTMLCanvasElement} canvas  The #graphic-canvas element.
   */
  function Chapter2Renderer(canvas) {
    this._canvas  = canvas;
    this._ctx     = null;
    this._w       = 0;
    this._h       = 0;

    this._agents     = null;
    this._simulator  = null;
    this._raceResult = null;
    this._raceRun    = false;
    this._stats      = null;     // { winner, regrets }

    this._lastProgress = 0;

    // Bound handlers
    var self = this;
    this._resizeHandler = function () { self._onResize(); };
  }

  Chapter2Renderer.prototype = /** @lends Chapter2Renderer.prototype */ {

    constructor: Chapter2Renderer,

    /* ---------------------------------------------------------------- */
    /*  PUBLIC API                                                        */
    /* ---------------------------------------------------------------- */

    /**
     * Initialise the renderer.
     * @param {HTMLCanvasElement} [canvas]  Optionally override canvas.
     */
    init: function (canvas) {
      if (canvas) this._canvas = canvas;
      if (!this._canvas) return;

      var d = setupCanvas(this._canvas);
      this._ctx = d.ctx;
      this._w   = d.w;
      this._h   = d.h;

      // Reset
      this._raceRun    = false;
      this._raceResult = null;
      this._stats      = null;

      // Create agents
      this._agents = AGENT_CONFIGS.map(function (cfg) {
        return new VizUtils.Agent(cfg.strategy, cfg.params);
      });

      // Shared bandit
      this._simulator = new VizUtils.BanditSimulator(NUM_ARMS, ARM_PROBS);

      // Resize listener
      window.addEventListener('resize', this._resizeHandler);

      // Initial draw
      this._drawIdle();
    },

    /**
     * Called each scroll frame.
     * @param {number} progress  0 = just entered, 1 = about to leave.
     */
    update: function (progress) {
      if (!this._ctx) return;
      this._lastProgress = progress;

      // Trigger race at 10% scroll — gives reader a moment to orient
      if (progress >= 0.1 && !this._raceRun) {
        this._runRace();
      }

      if (this._raceRun && this._raceResult) {
        this._render(progress);
      } else {
        this._drawIdle();
      }
    },

    /**
     * Full teardown.
     */
    destroy: function () {
      window.removeEventListener('resize', this._resizeHandler);
      this._canvas = null;
      this._ctx    = null;
      this._agents = null;
      this._simulator = null;
      this._raceResult = null;
      this._stats = null;
      this._raceRun = false;
    },

    /* ---------------------------------------------------------------- */
    /*  PRIVATE                                                           */
    /* ---------------------------------------------------------------- */

    /** @private */
    _runRace: function () {
      if (!this._agents || !this._simulator) return;
      this._raceResult = VizUtils.runRace(this._agents, this._simulator, NUM_STEPS);
      this._raceRun = true;
      this._stats = computeStats(this._raceResult);
    },

    /** @private */
    _onResize: function () {
      if (!this._canvas) return;
      var d = setupCanvas(this._canvas);
      this._ctx = d.ctx;
      this._w   = d.w;
      this._h   = d.h;
      if (this._raceRun && this._raceResult) {
        this._render(this._lastProgress);
      } else {
        this._drawIdle();
      }
    },

    /* ---------------------------------------------------------------- */
    /*  IDLE STATE                                                        */
    /* ---------------------------------------------------------------- */

    /** @private */
    _drawIdle: function () {
      var ctx = this._ctx;
      var w = this._w;
      var h = this._h;
      if (!ctx) return;

      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(0, 0, w, h);

      // Title
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Many Minds, One Problem', w / 2, h * 0.32);

      // Subtitle
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '13px sans-serif';
      ctx.fillText('Five strategies race on the same bandit', w / 2, h * 0.32 + 30);

      ctx.font = '13px monospace';
      ctx.fillText('Who converges fastest?', w / 2, h * 0.32 + 54);

      // Agent dots preview
      var cols = AGENT_CONFIGS.length;
      var dotAreaW = cols * 110;
      var startX = (w - dotAreaW) / 2;
      var dotY = h * 0.55;

      for (var i = 0; i < cols; i++) {
        var cx = startX + i * 110 + 55;
        var color = AGENT_COLORS[i % AGENT_COLORS.length];

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(cx, dotY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(AGENT_CONFIGS[i].label, cx, dotY + 12);
      }

      // Scroll prompt
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Scroll to start the race →', w / 2, h - 20);
    },

    /* ---------------------------------------------------------------- */
    /*  MAIN RENDER — single overlaid chart + stats                       */
    /* ---------------------------------------------------------------- */

    /**
     * Render the full vis: overlaid regret curves + stats bar chart.
     * @private
     * @param {number} progress  0..1
     */
    _render: function (progress) {
      var ctx = this._ctx;
      var w   = this._w;
      var h   = this._h;
      var result = this._raceResult;
      if (!ctx || !result || !this._stats) return;

      var histories = result.histories;
      var numAgents = histories.length;
      var stats     = this._stats;
      var winner    = stats.winner;

      // --- Compute alpha parameters ---

      // Chart fade-in: starts at ~0.1, full at FULL_REVEAL_AT
      var chartAlpha = VizUtils.clamp((progress - 0.1) / (FULL_REVEAL_AT - 0.1), 0, 1);

      // Winner reveal: starts at WINNER_SHOW_AT
      var winnerAlpha = VizUtils.clamp((progress - WINNER_SHOW_AT) / (1 - WINNER_SHOW_AT), 0, 1);

      // How many steps to reveal (for the left-to-right curve draw effect)
      var revealSteps = Math.max(1, Math.floor(NUM_STEPS * chartAlpha));

      // --- Layout ---
      var statsAreaH = (h > 420) ? STATS_H_MIN : 0;
      var chartTop    = TITLE_H;
      var chartBottom = h - statsAreaH - 10;
      var chartH      = chartBottom - chartTop - LEGEND_H;

      var plotLeft  = CHART_MARGIN_L;
      var plotRight = w - CHART_MARGIN_R;
      var plotW     = plotRight - plotLeft;

      // Max regret across all series (for y-axis)
      var maxRegret = 0;
      for (var i = 0; i < numAgents; i++) {
        var d = histories[i];
        var last = d[d.length - 1];
        if (last > maxRegret) maxRegret = last;
      }
      maxRegret = maxRegret * 1.15 || 1;

      /* ------- CLEAR ------- */
      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.globalAlpha = chartAlpha;

      /* ---- Title ---- */
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Many Minds, One Problem', w / 2, 6);

      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '9px monospace';
      ctx.fillText(NUM_STEPS + ' steps · cumulative regret  (lower is better)', w / 2, 22);

      /* ---- Legend row ---- */
      var legendY = chartTop;
      var legendLeft = plotLeft;
      var legendSpacing = Math.min(Math.floor((plotW - 20) / numAgents), 140);

      ctx.textBaseline = 'middle';
      ctx.font = '10px sans-serif';

      for (var li = 0; li < numAgents; li++) {
        var lx = legendLeft + li * legendSpacing;
        var color = AGENT_COLORS[li % AGENT_COLORS.length];

        // Colour swatch
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(lx, legendY + 6, 10, 10);

        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.textAlign = 'left';
        ctx.fillText(AGENT_CONFIGS[li].label, lx + 14, legendY + 11);
      }

      /* ---- Overlaid regret curves ---- */
      var plotY      = legendY + LEGEND_H;
      var plotAreaH  = Math.max(30, chartBottom - plotY);

      // Grid lines
      var gridLines = 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (var g = 0; g <= gridLines; g++) {
        var gy = plotY + (plotAreaH / gridLines) * g;
        ctx.beginPath();
        ctx.moveTo(plotLeft, gy);
        ctx.lineTo(plotRight, gy);
        ctx.stroke();
      }

      // Y-axis labels
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (var yg = 0; yg <= gridLines; yg++) {
        var yy = plotY + (plotAreaH / gridLines) * yg;
        var val = maxRegret - (maxRegret / gridLines) * yg;
        ctx.fillText(val.toFixed(1), plotRight + 4, yy);
      }

      // Y-axis label
      if (w > 300) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.translate(plotLeft - 6, plotY + plotAreaH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('cumulative regret', 0, 0);
        ctx.restore();
      }

      // X-axis label
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('step', plotLeft + plotW / 2, chartBottom - 6);

      // Draw each agent's curve — up to revealSteps
      for (var ai = 0; ai < numAgents; ai++) {
        var data     = histories[ai];
        var color    = AGENT_COLORS[ai % AGENT_COLORS.length];
        var isWinner = (ai === winner);

        ctx.strokeStyle = color;
        ctx.lineWidth   = isWinner ? 2.5 : 1.5;
        ctx.globalAlpha = isWinner
          ? VizUtils.lerp(chartAlpha * 0.7, chartAlpha, winnerAlpha)
          : chartAlpha * 0.7;
        ctx.beginPath();

        var pointsToDraw = Math.min(revealSteps, data.length);

        for (var t = 0; t < pointsToDraw; t++) {
          var x = plotLeft + (t / (NUM_STEPS - 1)) * plotW;
          var yVal = plotY + plotAreaH - (data[t] / maxRegret) * plotAreaH;
          if (t === 0) {
            ctx.moveTo(x, yVal);
          } else {
            ctx.lineTo(x, yVal);
          }
        }
        ctx.stroke();

        // Bright endpoint dot (for the agent)
        if (pointsToDraw > 1) {
          var lastX = plotLeft + ((pointsToDraw - 1) / (NUM_STEPS - 1)) * plotW;
          var lastY = plotY + plotAreaH - (data[pointsToDraw - 1] / maxRegret) * plotAreaH;

          ctx.fillStyle = color;
          ctx.globalAlpha = isWinner
            ? VizUtils.lerp(0.6, 1.0, winnerAlpha)
            : 0.7;
          ctx.beginPath();
          ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      /* ---- Winner reveal badge (bottom of curve area) ---- */
      if (winner >= 0 && winnerAlpha > 0) {
        var wy = chartBottom - 4;
        ctx.fillStyle = 'rgba(255, 215, 0, ' + (0.15 * winnerAlpha) + ')';
        ctx.fillRect(plotLeft, wy - 16, plotW, 18);

        ctx.fillStyle = '#ffd700';
        ctx.globalAlpha = winnerAlpha;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('★ ' + AGENT_CONFIGS[winner].label + ' wins — lowest cumulative regret', w / 2, wy - 1);
      }

      ctx.restore();

      /* ---- Stats bar chart (regret per agent, bottom panel) ---- */
      if (statsAreaH > 0 && chartAlpha > 0.3) {
        ctx.save();
        ctx.globalAlpha = winnerAlpha;  // fade in with winner reveal
        this._renderStatsBars(ctx, w, h - statsAreaH - 6, w, statsAreaH, stats, chartAlpha);
        ctx.restore();
      }
    },

    /* ---------------------------------------------------------------- */
    /*  STATS BAR CHART                                                   */
    /* ---------------------------------------------------------------- */

    /**
     * Draw horizontal bars showing final regret per agent, sorted best→worst.
     * @private
     */
    _renderStatsBars: function (ctx, w, y, areaW, areaH, stats, chartAlpha) {
      var numAgents = stats.regrets.length;

      // Create sorted indices: best (lowest regret) first
      var indices = [];
      for (var i = 0; i < numAgents; i++) indices.push(i);
      indices.sort(function (a, b) { return stats.regrets[a] - stats.regrets[b]; });

      var barH  = Math.min(22, (areaH - 20) / numAgents);
      var gap   = Math.max(2, (areaH - 20 - barH * numAgents) / (numAgents - 1));
      var startY = y + 16;

      var maxR = stats.regrets[indices[indices.length - 1]] * 1.1 || 1;
      var barLeft  = 80;
      var barRight = w - 10;
      var barW     = barRight - barLeft;
      if (barW < 50) return;

      // "Final Regret" label
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('final regret', barLeft, startY - 2);

      for (var ri = 0; ri < numAgents; ri++) {
        var idx  = indices[ri];
        var color = AGENT_COLORS[idx % AGENT_COLORS.length];
        var bw    = (stats.regrets[idx] / maxR) * barW;
        var by    = startY + ri * (barH + gap);

        // Rank badge
        var rankLabel = ri === 0 ? '★' : '#' + (ri + 1);
        ctx.fillStyle = ri === 0 ? '#ffd700' : 'rgba(255,255,255,0.35)';
        ctx.font = ri === 0 ? 'bold 11px sans-serif' : '9px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(rankLabel, barLeft - 22, by + barH / 2);

        // Bar
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(barLeft, by, Math.max(bw, 4), barH);

        // Agent label
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(AGENT_CONFIGS[idx].label, barLeft + 6, by + barH / 2);

        // Regret value
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(stats.regrets[idx].toFixed(1), barRight - 4, by + barH / 2);

        ctx.globalAlpha = 1.0;
      }
    },
  };

  /* ================================================================== */
  /*  EXPORT                                                              */
  /* ================================================================== */

  window.Chapter2Renderer = Chapter2Renderer;

})();
