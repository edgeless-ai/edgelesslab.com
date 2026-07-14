/**
 * Chapter4Renderer — 'Play With It' interactive bandit sandbox.
 *
 * Full interactive sandbox where the user can:
 *   - Toggle 5 strategies on/off via checkboxes
 *   - Adjust epsilon, UCB c, optimism, and step count via sliders
 *   - Run a bandit race with animated progressive curve rendering
 *   - View final stats (reward, regret, best arm) per strategy
 *   - Reset and try different configurations
 *
 * Dependencies: VizUtils (BanditSimulator, Agent, runRace, drawRegretCurve,
 *                AGENT_COLORS, drawArmChart)
 *
 * Renders on #graphic-canvas inside the sticky panel.
 * Exposes window.Chapter4Renderer with init(canvas), update(progress), destroy().
 *
 * @module chapter4-renderer
 */
(function () {
  'use strict';

  /* ================================================================== */
  /*  CONSTANTS                                                           */
  /* ================================================================== */

  /** @const {number} Number of arms for the shared bandit. */
  var NUM_ARMS = 3;

  /** @const {number[]} True reward probabilities per arm. */
  var ARM_PROBS = [0.7, 0.3, 0.1];

  /** @const {Object[]} Strategy definitions. */
  var STRATEGIES = [
    { id: 'random',         label: 'Random',            paramKey: null       },
    { id: 'epsilon-greedy', label: 'Epsilon-Greedy',    paramKey: 'epsilon'  },
    { id: 'ucb',            label: 'UCB1',              paramKey: 'ucbC'     },
    { id: 'thompson',       label: 'Thompson Sampling', paramKey: null       },
    { id: 'optimistic',     label: 'Optimistic Init.',  paramKey: 'optimism' },
  ];

  /** @const {number} Steps to run per animation frame during race. */
  var STEPS_PER_FRAME = 4;

  /* ================================================================== */
  /*  UTILITY HELPERS                                                     */
  /* ================================================================== */

  /** Clamp v between lo and hi. */
  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  /** Round a number to a given decimal precision. */
  function toFixed(v, decimals) {
    return parseFloat(v.toFixed(decimals));
  }

  /** Draw a rounded rect path (no fill/stroke). */
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ================================================================== */
  /*  CHAPTER 4 RENDERER                                                  */
  /* ================================================================== */

  /**
   * Creates a Chapter4Renderer.
   *
   * @constructor
   */
  function Chapter4Renderer() {
    /** @private */
    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;

    /* ---- Scroll progress ---- */
    this.progress = 0;
    this.controlsAlpha = 0;

    /* ---- Sandbox state ---- */
    this.state = {
      // Strategy toggles (default: all on)
      strategies: {
        random:         true,
        'epsilon-greedy': true,
        ucb:            true,
        thompson:       true,
        optimistic:     true,
      },
      // Slider values
      epsilon:  0.1,
      ucbC:     2.0,
      optimism: 5.0,
      steps:    300,

      // Race state
      running:     false,
      raceStep:    0,
      totalSteps:  0,
      raceResult:  null,
      raceHistories: null,
      optimal:     0,
    };

    /** @private */
    this._agents = null;

    /** @private */
    this._simulator = null;

    /** @private @type {string|null} Currently dragged slider id. */
    this._dragSlider = null;

    /** @private @type {Object} Cross-run strategy win totals. */
    this.winTotals = {};

    /** @private @type {Object|null} Layout cache (set in _resize). */
    this._controls = null;

    /* ---- Animation loop ---- */
    this._rafId = null;
    this.running = false;

    /* ---- Bound event handlers ---- */
    this._boundResize  = this._resize.bind(this);
    this._boundDown    = this._onPointerDown.bind(this);
    this._boundMove    = this._onPointerMove.bind(this);
    this._boundUp      = this._onPointerUp.bind(this);
  }

  Chapter4Renderer.prototype = /** @lends Chapter4Renderer.prototype */ {

    constructor: Chapter4Renderer,

    /* ---------------------------------------------------------------- */
    /*  PUBLIC API                                                       */
    /* ---------------------------------------------------------------- */

    /**
     * Initialise the sandbox renderer.
     * @param {HTMLCanvasElement} [canvas]
     */
    init: function (canvas) {
      if (canvas) this.canvas = canvas;
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext('2d');
      this._resize();
      this.controlsAlpha = 0;

      // Event listeners (pointer events for unified mouse+touch)
      this.canvas.addEventListener('pointerdown', this._boundDown);
      this.canvas.addEventListener('pointermove', this._boundMove);
      this.canvas.addEventListener('pointerup',   this._boundUp);
      this.canvas.addEventListener('pointerleave', this._boundUp);
      window.addEventListener('resize', this._boundResize, { passive: true });

      // Start animation loop
      if (!this.running) {
        this.running = true;
        this._loop();
      }
    },

    /**
     * Called every scroll frame. Progress (0-1) fades in the controls.
     * @param {number} progress  0 = step just entered centre,
     *                           1 = step fully scrolled past.
     */
    update: function (progress) {
      this.progress = progress;
      // Fade in controls over the first ~60% of scroll range,
      // giving the reader a smooth reveal as they scroll into the sandbox.
      this.controlsAlpha = clamp((progress - 0.05) / 0.55, 0, 1);
    },

    /**
     * Full teardown.
     */
    destroy: function () {
      this.running = false;
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      if (this.canvas) {
        this.canvas.removeEventListener('pointerdown', this._boundDown);
        this.canvas.removeEventListener('pointermove', this._boundMove);
        this.canvas.removeEventListener('pointerup',   this._boundUp);
        this.canvas.removeEventListener('pointerleave', this._boundUp);
      }
      window.removeEventListener('resize', this._boundResize, { passive: true });
      this.canvas = null;
      this.ctx = null;
      this._agents = null;
      this._simulator = null;
      this._dragSlider = null;
      this._controls = null;
    },

    /* ---------------------------------------------------------------- */
    /*  LAYOUT / RESIZE                                                  */
    /* ---------------------------------------------------------------- */

    /** @private */
    _resize: function () {
      if (!this.canvas) return;
      var rect = this.canvas.getBoundingClientRect();
      this.width  = rect.width;
      this.height = rect.height;
      this.dpr    = window.devicePixelRatio || 1;
      this.canvas.width  = this.width  * this.dpr;
      this.canvas.height = this.height * this.dpr;

      this._computeLayout();
    },

    /**
     * Compute positions for all controls and chart regions.
     * Stored in this._controls. Coordinates in CSS px.
     * @private
     */
    _computeLayout: function () {
      var w = this.width;
      var h = this.height;

      // Left control panel
      var panelW = Math.min(210, Math.max(160, w * 0.22));
      var panelX = 12;
      var panelTop = 12;

      // Chart area (right of controls)
      var chartLeft = panelX + panelW + 12;
      var chartTop  = 46;
      var chartW    = Math.max(100, w - chartLeft - 12);
      var chartH    = Math.max(80,  h - chartTop - 110);

      // Stats area (below chart)
      var statsTop  = chartTop + chartH + 8;
      var statsH    = h - statsTop - 12;

      // ---- Checkboxes ----
      var cbStartY = panelTop + 34;
      var cbH = 26;
      var cbGap = 2;
      var checkboxes = [];
      for (var i = 0; i < STRATEGIES.length; i++) {
        checkboxes.push({
          id:    STRATEGIES[i].id,
          label: STRATEGIES[i].label,
          x:     panelX,
          y:     cbStartY + i * (cbH + cbGap),
          w:     panelW,
          h:     cbH,
        });
      }

      // ---- Sliders ----
      var sliderStartY = cbStartY + STRATEGIES.length * (cbH + cbGap) + 14;
      var sliderH = 40;
      var sliderGap = 4;
      var sliderTrackW = panelW - 8;

      var sliderDefs = [
        { id: 'epsilon',  label: '\u03B5 (explore rate)',  min: 0,    max: 0.5, step: 0.01, value: this.state.epsilon },
        { id: 'ucbC',     label: 'UCB c (confidence)',     min: 0,    max: 5,   step: 0.1,  value: this.state.ucbC },
        { id: 'optimism', label: 'Optimism init.',         min: 0,    max: 10,  step: 0.5,  value: this.state.optimism },
        { id: 'steps',    label: 'Steps',                  min: 50,   max: 500, step: 10,   value: this.state.steps },
      ];

      var sliders = [];
      for (var si = 0; si < sliderDefs.length; si++) {
        var sd = sliderDefs[si];
        sliders.push({
          id:      sd.id,
          label:   sd.label,
          min:     sd.min,
          max:     sd.max,
          step:    sd.step,
          value:   sd.value,
          x:       panelX + 4,
          y:       sliderStartY + si * (sliderH + sliderGap),
          w:       sliderTrackW,
          h:       sliderH,
          labelY:  sliderStartY + si * (sliderH + sliderGap) + 2,
          trackY:  sliderStartY + si * (sliderH + sliderGap) + 20,
        });
      }

      // ---- Buttons ----
      var btnY = sliderStartY + sliderDefs.length * (sliderH + sliderGap) + 10;
      var btnW = Math.floor((panelW - 8) / 2);
      var btnH = 34;

      var buttons = [
        { id: 'run',   label: '\u25B6 Run', x: panelX + 4, y: btnY, w: btnW, h: btnH },
        { id: 'reset', label: '\u21BA Reset', x: panelX + 8 + btnW, y: btnY, w: btnW, h: btnH },
      ];

      this._controls = {
        panelX:    panelX,
        panelW:    panelW,
        chartLeft: chartLeft,
        chartTop:  chartTop,
        chartW:    chartW,
        chartH:    chartH,
        statsTop:  statsTop,
        statsH:    statsH,
        checkboxes: checkboxes,
        sliders:   sliders,
        buttons:   buttons,
      };
    },

    /* ---------------------------------------------------------------- */
    /*  POINTER EVENTS                                                   */
    /* ---------------------------------------------------------------- */

    /**
     * Convert pointer event to canvas CSS px coordinates.
     * @private
     */
    _getPos: function (e) {
      var rect = this.canvas.getBoundingClientRect();
      return {
        mx: (e.clientX - rect.left) * (this.width  / rect.width),
        my: (e.clientY - rect.top)  * (this.height / rect.height),
      };
    },

    /** @private */
    _onPointerDown: function (e) {
      if (!this._controls) return;
      var pos = this._getPos(e);
      var mx = pos.mx;
      var my = pos.my;
      var ctrl = this._controls;
      var raceRunning = this.state.running;

      // Controls invisible — ignore clicks
      if (this.controlsAlpha < 0.1) return;

      // ---- Sliders (only while idle) ----
      if (!raceRunning) {
        for (var si = 0; si < ctrl.sliders.length; si++) {
          var s = ctrl.sliders[si];
          if (mx >= s.x && mx <= s.x + s.w &&
              my >= s.trackY - 4 && my <= s.trackY + 16) {
            this._dragSlider = s.id;
            this._updateSliderFromPos(s.id, mx);
            this.canvas.setPointerCapture(e.pointerId);
            e.preventDefault();
            return;
          }
        }
      }

      // ---- Checkboxes (only while idle) ----
      if (!raceRunning) {
        for (var ci = 0; ci < ctrl.checkboxes.length; ci++) {
          var cb = ctrl.checkboxes[ci];
          if (mx >= cb.x && mx <= cb.x + cb.w &&
              my >= cb.y && my <= cb.y + cb.h) {
            this.state.strategies[cb.id] = !this.state.strategies[cb.id];
            e.preventDefault();
            return;
          }
        }
      }

      // ---- Buttons ----
      for (var bi = 0; bi < ctrl.buttons.length; bi++) {
        var btn = ctrl.buttons[bi];
        if (mx >= btn.x && mx <= btn.x + btn.w &&
            my >= btn.y && my <= btn.y + btn.h) {
          if (btn.id === 'run') {
            if (raceRunning) {
              this._stopRace();
            } else {
              this._startRace();
            }
          } else if (btn.id === 'reset') {
            this._reset();
          }
          e.preventDefault();
          return;
        }
      }
    },

    /** @private */
    _onPointerMove: function (e) {
      if (!this._dragSlider || !this._controls) return;
      var pos = this._getPos(e);
      this._updateSliderFromPos(this._dragSlider, pos.mx);
    },

    /** @private */
    _onPointerUp: function () {
      this._dragSlider = null;
    },

    /**
     * Update slider value from pointer X position.
     * @private
     */
    _updateSliderFromPos: function (sliderId, mx) {
      var sliders = this._controls.sliders;
      for (var i = 0; i < sliders.length; i++) {
        if (sliders[i].id !== sliderId) continue;
        var s = sliders[i];
        var ratio = clamp((mx - s.x) / s.w, 0, 1);
        var raw = s.min + ratio * (s.max - s.min);
        var stepped = Math.round(raw / s.step) * s.step;
        stepped = clamp(stepped, s.min, s.max);
        var decimals = (s.step.toString().split('.')[1] || '').length;
        stepped = toFixed(stepped, decimals);

        s.value = stepped;
        this.state[sliderId] = stepped;
        break;
      }
    },

    /* ---------------------------------------------------------------- */
    /*  RACE EXECUTION                                                   */
    /* ---------------------------------------------------------------- */

    /**
     * Start a bandit race with selected strategies and current params.
     * @private
     */
    _startRace: function () {
      var activeStrategies = [];

      for (var i = 0; i < STRATEGIES.length; i++) {
        var s = STRATEGIES[i];
        if (this.state.strategies[s.id]) {
          activeStrategies.push(s);
        }
      }

      if (activeStrategies.length === 0) return;

      var totalSteps = this.state.steps;

      // Create fresh agents with current params
      this._agents = [];
      for (var ai = 0; ai < activeStrategies.length; ai++) {
        var cfg = activeStrategies[ai];
        var params = {};
        if (cfg.paramKey === 'epsilon')  params.epsilon  = this.state.epsilon;
        if (cfg.paramKey === 'ucbC')     params.ucbC     = this.state.ucbC;
        if (cfg.paramKey === 'optimism') params.optimism = this.state.optimism;
        this._agents.push(new VizUtils.Agent(cfg.id, params));
      }

      // Create shared simulator
      this._simulator = new VizUtils.BanditSimulator(NUM_ARMS, ARM_PROBS);
      this.state.optimal = this._simulator.getOptimalValue();

      // Allocate progressive histories
      var numAgents = this._agents.length;
      var histories = [];
      for (var hi = 0; hi < numAgents; hi++) {
        histories[hi] = new Array(totalSteps).fill(0);
      }

      this.state.raceResult    = null;
      this.state.raceHistories = histories;
      this.state.raceStep      = 0;
      this.state.totalSteps    = totalSteps;
      this.state.running       = true;
    },

    /**
     * Run one tick of the step-by-step race.
     * Processes STEPS_PER_FRAME steps per rAF frame.
     * @private
     */
    _raceTick: function () {
      if (!this.state.running) return;
      if (!this._agents || !this._simulator) {
        this.state.running = false;
        return;
      }

      var step     = this.state.raceStep;
      var total    = this.state.totalSteps;
      var histories = this.state.raceHistories;
      var agents   = this._agents;
      var sim      = this._simulator;
      var optimal  = this.state.optimal;

      var batchEnd = Math.min(step + STEPS_PER_FRAME, total);

      for (var t = step; t < batchEnd; t++) {
        for (var j = 0; j < agents.length; j++) {
          var agent = agents[j];
          var arm   = agent.selectArm(sim);
          var reward = sim.pullArm(arm);
          agent.update(arm, reward);
          histories[j][t] = optimal * (t + 1) - agent._totalReward;
        }
      }

      this.state.raceStep = batchEnd;

      // Race complete?
      if (batchEnd >= total) {
        this.state.running = false;

        var finalStats = [];
        for (var k = 0; k < agents.length; k++) {
          var ag = agents[k];

          // Best arm = argmax of estimated values (random tie-break)
          var bestArm = 0;
          var bestVal = -Infinity;
          var ties = [0];
          for (var armI = 0; armI < ag._values.length; armI++) {
            if (ag._values[armI] > bestVal) {
              bestVal = ag._values[armI];
              bestArm = armI;
              ties = [armI];
            } else if (ag._values[armI] === bestVal) {
              ties.push(armI);
            }
          }
          bestArm = ties[Math.floor(Math.random() * ties.length)];

          finalStats.push({
            pulls:           ag._totalPulls,
            rewards:         ag._totalReward,
            regret:          optimal * total - ag._totalReward,
            estimatedValues: ag._values.slice(),
            bestArm:         bestArm,
            label:           agents[k].getName(),
          });
        }

        this.state.raceResult = {
          histories:  histories,
          finalStats: finalStats,
        };

        // Track which strategy had the lowest regret this run
        var bestRegret = Infinity;
        var winnerId = null;
        for (var wi = 0; wi < finalStats.length; wi++) {
          if (finalStats[wi].regret < bestRegret) {
            bestRegret = finalStats[wi].regret;
            winnerId = STRATEGIES[activeIndices[wi]].id;
          }
        }
        if (winnerId) {
          if (!this.winTotals[winnerId]) this.winTotals[winnerId] = 0;
          this.winTotals[winnerId]++;
        }
      }
    },

    /**
     * Stop race mid-run and show partial results.
     * @private
     */
    _stopRace: function () {
      this.state.running = false;

      // Build partial final stats from whatever step we're at
      var agents = this._agents;
      var total = this.state.raceStep;
      if (!agents || total < 10) return;

      var sim = this._simulator;
      var optimal = this.state.optimal;

      var finalStats = [];
      for (var k = 0; k < agents.length; k++) {
        var ag = agents[k];

        var bestArm = 0;
        var bestVal = -Infinity;
        var ties = [0];
        for (var armI = 0; armI < ag._values.length; armI++) {
          if (ag._values[armI] > bestVal) {
            bestVal = ag._values[armI];
            bestArm = armI;
            ties = [armI];
          } else if (ag._values[armI] === bestVal) {
            ties.push(armI);
          }
        }
        bestArm = ties[Math.floor(Math.random() * ties.length)];

        finalStats.push({
          pulls:           ag._totalPulls,
          rewards:         ag._totalReward,
          regret:          optimal * total - ag._totalReward,
          estimatedValues: ag._values.slice(),
          bestArm:         bestArm,
          label:           agents[k].getName(),
        });
      }

      this.state.raceResult = {
        histories:  this.state.raceHistories ? this.state.raceHistories.map(function (h) { return h.slice(0, total); }) : null,
        finalStats: finalStats,
      };

      // Track win
      var activeIndices = [];
      for (var wi = 0; wi < STRATEGIES.length; wi++) {
        if (this.state.strategies[STRATEGIES[wi].id]) {
          activeIndices.push(wi);
        }
      }
      var bestRegret = Infinity;
      var winnerId = null;
      for (var wj = 0; wj < finalStats.length; wj++) {
        if (finalStats[wj].regret < bestRegret) {
          bestRegret = finalStats[wj].regret;
          winnerId = STRATEGIES[activeIndices[wj]].id;
        }
      }
      if (winnerId) {
        if (!this.winTotals[winnerId]) this.winTotals[winnerId] = 0;
        this.winTotals[winnerId]++;
      }
    },

    /**
     * Full reset of sandbox state.
     * @private
     */
    _reset: function () {
      this.state.running       = false;
      this.state.raceResult    = null;
      this.state.raceHistories = null;
      this.state.raceStep      = 0;
      this._agents   = null;
      this._simulator = null;
    },

    /* ---------------------------------------------------------------- */
    /*  ANIMATION LOOP                                                   */
    /* ---------------------------------------------------------------- */

    /** @private */
    _loop: function () {
      if (!this.running) return;

      // Process race if active
      if (this.state.running) {
        this._raceTick();
      }

      this._render();
      this._rafId = requestAnimationFrame(this._loop.bind(this));
    },

    /* ---------------------------------------------------------------- */
    /*  RENDER                                                           */
    /* ---------------------------------------------------------------- */

    /** @private */
    _render: function () {
      var ctx = this.ctx;
      var w = this.width;
      var h = this.height;
      var dpr = this.dpr;
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, w, h);

      // Overall fade from scroll progress
      var alpha = this.controlsAlpha;
      ctx.save();
      ctx.globalAlpha = alpha;

      // Controls sidebar
      this._renderControls(ctx);

      // Chart + stats area
      if (this.state.raceResult) {
        // Full results
        this._renderChart(ctx, this.state.raceResult.histories);
        this._renderStats(ctx, this.state.raceResult.finalStats);
      } else if (this.state.running && this.state.raceHistories) {
        // Partial progressive curves
        var partialHistories = [];
        var histories = this.state.raceHistories;
        var step = this.state.raceStep;
        for (var phi = 0; phi < histories.length; phi++) {
          partialHistories[phi] = histories[phi].slice(0, step);
        }
        this._renderChart(ctx, partialHistories);
        this._renderProgress(ctx, step, this.state.totalSteps);
      } else {
        // Idle placeholder
        this._drawPlaceholder(ctx);
      }

      ctx.restore();
    },

    /* ---------------------------------------------------------------- */
    /*  CONTROLS RENDER                                                  */
    /* ---------------------------------------------------------------- */

    /** @private */
    _renderControls: function (ctx) {
      if (!this._controls) return;
      var ctrl = this._controls;

      // Panel background
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      roundRect(ctx, ctrl.panelX - 4, 4, ctrl.panelW + 8, this.height - 8, 8);
      ctx.fill();

      // Title
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Config', ctrl.panelX, 12);

      // Section header — Strategies
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '9px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText('STRATEGIES', ctrl.panelX + 2, ctrl.checkboxes[0].y - 16);

      // Checkboxes
      for (var ci = 0; ci < ctrl.checkboxes.length; ci++) {
        this._renderCheckbox(ctx, ctrl.checkboxes[ci], ci);
      }

      // Section header — Parameters
      var lastCb = ctrl.checkboxes[ctrl.checkboxes.length - 1];
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '9px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText('PARAMETERS', ctrl.panelX + 2, lastCb.y + lastCb.h + 4);

      // Sliders
      for (var si = 0; si < ctrl.sliders.length; si++) {
        this._renderSlider(ctx, ctrl.sliders[si]);
      }

      // Buttons
      for (var bi = 0; bi < ctrl.buttons.length; bi++) {
        this._renderButton(ctx, ctrl.buttons[bi]);
      }
    },

    /**
     * Render a single checkbox.
     * @private
     */
    _renderCheckbox: function (ctx, cb, index) {
      var checked = this.state.strategies[cb.id];
      var color = VizUtils.AGENT_COLORS[index % VizUtils.AGENT_COLORS.length];
      var disabled = this.state.running;
      var alpha = disabled ? 0.35 : 1.0;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Box
      var boxX = cb.x + 4;
      var boxY = cb.y + 4;
      var boxSize = 18;
      ctx.fillStyle = checked ? color : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.strokeStyle = checked ? color : 'rgba(255,255,255,0.2)';
      ctx.fillRect(boxX, boxY, boxSize, boxSize);
      ctx.strokeRect(boxX, boxY, boxSize, boxSize);

      // Checkmark
      if (checked) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u2713', boxX + boxSize / 2, boxY + boxSize / 2 + 1);
      }

      // Label
      ctx.fillStyle = checked ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(cb.label, boxX + boxSize + 8, boxY + boxSize / 2);

      ctx.restore();
    },

    /**
     * Render a single slider.
     * @private
     */
    _renderSlider: function (ctx, s) {
      var disabled = this.state.running;
      var alpha = disabled ? 0.35 : 1.0;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(s.label, s.x, s.labelY);

      // Value display (right-aligned)
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      var disp = s.id === 'steps'
        ? Math.round(s.value).toString()
        : s.value.toFixed(s.step < 0.1 ? 2 : 1);
      ctx.fillText(disp, s.x + s.w, s.labelY);

      // Track background
      var trackY = s.trackY;
      var trackH = 6;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      roundRect(ctx, s.x, trackY, s.w, trackH, 3);
      ctx.fill();

      // Filled portion
      var ratio = (s.value - s.min) / (s.max - s.min);
      var fillW = ratio * s.w;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      roundRect(ctx, s.x, trackY, fillW, trackH, 3);
      ctx.fill();

      // Thumb
      var thumbR = 7;
      var thumbX = s.x + fillW;
      var thumbY = trackY + trackH / 2;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(thumbX, thumbY, thumbR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    },

    /**
     * Render a button.
     * @private
     */
    _renderButton: function (ctx, btn) {
      var isRun = btn.id === 'run';
      var running = this.state.running;
      // Run button is always active (click to run or click to stop)
      var active = true;
      var alpha = active ? 1.0 : 0.35;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Background — red while running (stop), blue while idle (run)
      if (isRun) {
        ctx.fillStyle = running ? '#e34a6f' : '#36a2eb';
      } else {
        ctx.fillStyle = active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)';
      }
      roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 5);
      ctx.fill();

      // Border
      ctx.strokeStyle = active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label — dynamic: "■ Stop" while running, "▶ Run" while idle
      var runLabel = running ? '\u25A0 Stop' : '\u25B6 Run';
      var label = isRun ? runLabel : btn.label;
      ctx.fillStyle = active ? '#fff' : 'rgba(255,255,255,0.35)';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, btn.x + btn.w / 2, btn.y + btn.h / 2);

      ctx.restore();
    },

    /* ---------------------------------------------------------------- */
    /*  CHART RENDER                                                     */
    /* ---------------------------------------------------------------- */

    /**
     * Draw regret curves in the chart region using VizUtils.drawRegretCurve().
     * Accepts partial or full history arrays for progressive animation.
     * @private
     * @param {CanvasRenderingContext2D} ctx
     * @param {number[][]} histories
     */
    _renderChart: function (ctx, histories) {
      if (!this._controls) return;
      var ctrl = this._controls;
      var chartLeft = ctrl.chartLeft;
      var chartTop = ctrl.chartTop;
      var chartW = ctrl.chartW;
      var chartH = ctrl.chartH;

      if (chartW < 20 || chartH < 20) return;

      var numSeries = histories.length;
      if (numSeries === 0) return;

      // Active strategy indices for colors and labels
      var activeIndices = [];
      for (var i = 0; i < STRATEGIES.length; i++) {
        if (this.state.strategies[STRATEGIES[i].id]) {
          activeIndices.push(i);
        }
      }

      // Determine max regret across all series for y-axis
      var maxY = 0;
      for (var si = 0; si < numSeries; si++) {
        var data = histories[si];
        for (var ti = 0; ti < data.length; ti++) {
          if (data[ti] > maxY) maxY = data[ti];
        }
      }
      maxY = maxY * 1.1 || 1;

      // ---- Title + subtitle (drawn before chart, above its margin) ----
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Cumulative Regret', chartLeft, chartTop + 4);

      var subtitleParts = [numSeries + ' strategy' + (numSeries > 1 ? 'ies' : 'y')];
      if (this.state.raceResult) {
        subtitleParts.push(this.state.totalSteps + ' steps');
      } else if (this.state.running) {
        subtitleParts.push(this.state.raceStep + ' / ' + this.state.totalSteps + ' steps');
      }
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '9px sans-serif';
      ctx.fillText(subtitleParts.join(' \u00B7 '), chartLeft, chartTop + 22);

      // Build colors and labels for VizUtils.drawRegretCurve
      var colors = [];
      var labels = [];
      for (var ci = 0; ci < numSeries; ci++) {
        var idx = activeIndices[ci] % VizUtils.AGENT_COLORS.length;
        colors.push(VizUtils.AGENT_COLORS[idx]);
        labels.push(STRATEGIES[activeIndices[ci]].label);
      }

      // ---- Delegate to VizUtils.drawRegretCurve within a translated sub-region ----
      ctx.save();
      ctx.translate(chartLeft, chartTop + 28);
      VizUtils.drawRegretCurve(ctx, chartW, Math.max(chartH - 28, 10),
        histories, colors, labels, maxY);
      ctx.restore();

      // ---- Back-fill the axis label area with the subtitle line (drawn AFTER chart's clearRect) ----
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(subtitleParts.join(' \u00B7 '), chartLeft, chartTop + 22);
    },

    /**
     * Draw a running progress bar below the chart.
     * @private
     */
    _renderProgress: function (ctx, step, totalSteps) {
      if (!this._controls) return;
      var ctrl = this._controls;
      var cx = ctrl.chartLeft + ctrl.chartW / 2;
      var cy = ctrl.chartTop + ctrl.chartH + 6;

      var barW = Math.min(200, ctrl.chartW - 40);
      var barH = 8;
      var barX = cx - barW / 2;

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(ctx, barX, cy, barW, barH, 4);
      ctx.fill();

      var ratio = Math.min(1, step / totalSteps);
      ctx.fillStyle = '#36a2eb';
      roundRect(ctx, barX, cy, barW * ratio, barH, 4);
      ctx.fill();

      var pct = Math.round(ratio * 100);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Running\u2026 ' + pct + '%', cx, cy + barH + 4);
    },

    /* ---------------------------------------------------------------- */
    /*  STATS RENDER                                                     */
    /* ---------------------------------------------------------------- */

    /**
     * Draw the final stats table below the chart.
     * @private
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object[]} finalStats
     */
    _renderStats: function (ctx, finalStats) {
      if (!this._controls || !finalStats || finalStats.length === 0) return;
      var ctrl = this._controls;
      var statsTop = ctrl.statsTop;
      var statsH = ctrl.statsH;

      if (statsH < 30) return;

      // Active strategy indices (for color / label)
      var activeIndices = [];
      for (var i = 0; i < STRATEGIES.length; i++) {
        if (this.state.strategies[STRATEGIES[i].id]) {
          activeIndices.push(i);
        }
      }

      var numCols = finalStats.length;
      var chartLeft = ctrl.chartLeft;
      var chartW = ctrl.chartW;

      // Section title
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Results', chartLeft, statsTop);

      // Table: header row with colored dots
      var tableTop = statsTop + 18;
      var colGap = 8;
      var colW = Math.max(80, Math.floor((chartW - (numCols - 1) * colGap) / numCols));

      for (var ci = 0; ci < numCols; ci++) {
        var colX = chartLeft + ci * (colW + colGap);
        var idx = activeIndices[ci] % VizUtils.AGENT_COLORS.length;
        var dotColor = VizUtils.AGENT_COLORS[idx];

        // Colored dot
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(colX + 6, tableTop + 7, 5, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(STRATEGIES[activeIndices[ci]].label, colX + 14, tableTop + 7);
      }

      // Data rows
      var dataRows = [
        { label: 'Reward',   get: function (s) { return s.rewards.toFixed(0); } },
        { label: 'Regret',   get: function (s) { return s.regret.toFixed(1); } },
        { label: 'Pulls',    get: function (s) { return s.pulls.toString(); } },
        { label: 'Best arm', get: function (s) { return 'Arm ' + s.bestArm; } },
        { label: 'Est. val', get: function (s) {
          if (!s.estimatedValues || s.estimatedValues.length === 0) return '\u2014';
          return s.estimatedValues.map(function (v) { return v.toFixed(2); }).join(', ');
        }},
      ];

      for (var ri = 0; ri < dataRows.length; ri++) {
        var row = dataRows[ri];
        var rowY = tableTop + 20 + ri * 16;

        // Row label
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(row.label, chartLeft, rowY);

        // Per-column values
        for (var cj = 0; cj < numCols; cj++) {
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font = '10px monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(row.get(finalStats[cj]), chartLeft + cj * (colW + colGap) + 8, rowY);
        }
      }

      // Highlight lowest-regret strategy
      var bestRegret = Infinity;
      var bestStat = null;
      for (var bsi = 0; bsi < finalStats.length; bsi++) {
        if (finalStats[bsi].regret < bestRegret) {
          bestRegret = finalStats[bsi].regret;
          bestStat = finalStats[bsi];
        }
      }

      var footY = tableTop + 20 + dataRows.length * 16 + 6;
      if (bestStat) {
        ctx.fillStyle = 'rgba(255,215,0,0.5)';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('\u2605 Lowest regret: ' + bestStat.label, chartLeft, footY);
      }

      // Cross-run win totals
      var hasWins = false;
      for (var wt in this.winTotals) {
        if (this.winTotals.hasOwnProperty(wt) && this.winTotals[wt] > 0) {
          hasWins = true;
          break;
        }
      }
      if (hasWins) {
        var winY = footY + 16;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('Win totals (all runs):', chartLeft, winY);
        var winX = chartLeft;
        for (var ws = 0; ws < STRATEGIES.length; ws++) {
          var sid = STRATEGIES[ws].id;
          var totalWins = this.winTotals[sid] || 0;
          if (totalWins > 0) {
            var idx = ws % VizUtils.AGENT_COLORS.length;
            ctx.fillStyle = VizUtils.AGENT_COLORS[idx];
            ctx.font = 'bold 10px monospace';
            ctx.fillText(STRATEGIES[ws].label + ': ' + totalWins, winX, winY + 14);
            winX += ctx.measureText(STRATEGIES[ws].label + ': ' + totalWins).width + 14;
          }
        }
      }
    },

    /* ---------------------------------------------------------------- */
    /*  PLACEHOLDER                                                      */
    /* ---------------------------------------------------------------- */

    /** @private */
    _drawPlaceholder: function (ctx) {
      if (!this._controls) return;
      var ctrl = this._controls;
      var cx = ctrl.chartLeft + ctrl.chartW / 2;
      var cy = ctrl.chartTop + ctrl.chartH / 2;

      // Only render placeholder once controls are mostly visible
      if (this.controlsAlpha < 0.05) return;

      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Configure the swarm and click \u25B6 Run', cx, cy - 10);

      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.font = '11px sans-serif';
      ctx.fillText('Toggle strategies \u00B7 adjust parameters \u00B7 compare regret', cx, cy + 16);
    },
  };

  /* ================================================================== */
  /*  EXPORT                                                              */
  /* ================================================================== */

  window.Chapter4Renderer = Chapter4Renderer;

})();
