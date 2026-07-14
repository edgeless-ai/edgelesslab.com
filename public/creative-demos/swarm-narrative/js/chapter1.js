/**
 * Chapter1Renderer — 'The Coin That Knows' interactive bandit demo.
 *
 * Three slot machine arms side by side. Users click arms to pull them.
 * Each pull shows immediate reward (coin animation for win, nothing for loss)
 * + running total below each arm. A regret curve auto-draws in the bottom
 * half of the canvas as pulls accumulate.
 *
 * Progress (0-1) drives a subtle reveal animation — arms appear as the
 * user scrolls into the step.
 *
 * Dependencies: VizUtils (BanditSimulator, drawRegretCurve)
 * Renders on #graphic-canvas inside the sticky panel.
 *
 * @module chapter1-renderer
 */
(function () {
  'use strict';

  /* ================================================================== */
  /*  CONSTANTS                                                           */
  /* ================================================================== */

  /** @const {number} */
  var NUM_ARMS = 3;

  /** @const {number[]} True reward probabilities. */
  var ARM_PROBS = [0.7, 0.3, 0.1];

  /**
   * Arm colours (index 0-2; drawn from the VizUtils.ARM_COLORS palette).
   * @const {string[]}
   */
  var ARM_COLORS = ['#ed12ed', '#f7b731', '#36a2eb'];

  /** @const {string[]} */
  var ARM_LABELS = ['Arm A', 'Arm B', 'Arm C'];

  /** Fraction of canvas height reserved for the arm section. */
  var TOP_RATIO = 0.55;

  /** Arm body dimensions (CSS px). */
  var ARM_BODY_W = 100;
  var ARM_BODY_H = 140;

  /** Lever dimensions. */
  var ARM_LEVER_W = 14;
  var ARM_LEVER_H = 36;

  /** Rounded corner radius for arm body. */
  var ARM_RADIUS = 10;

  /** Coin popup animation lifetime (ms). */
  var COIN_LIFETIME = 1400;

  /** Total vertical distance a coin travels (px). */
  var COIN_RISE = 90;

  /** Progress range over which the reveal animation completes. */
  var REVEAL_DURATION = 0.35;

  /* ================================================================== */
  /*  COIN POPUP                                                         */
  /* ================================================================== */

  /**
   * A coin that floats upward from the arm slot upon a winning pull.
   * @param {number} x  Centre X (CSS px).
   * @param {number} y  Start Y (CSS px).
   */
  function Coin(x, y) {
    this.x = x;
    this.y = y;
    this._startY = y;
    this._born = performance.now();
  }

  Coin.prototype = /** @lends Coin.prototype */ {

    constructor: Coin,

    /**
     * Advance animation state.
     * @param {number} now  Current time (performance.now).
     * @returns {boolean}   true while alive, false when expired.
     */
    update: function (now) {
      var elapsed = now - this._born;
      var t = elapsed / COIN_LIFETIME;
      if (t >= 1) return false;
      // Ease-out cubic
      var ease = 1 - Math.pow(1 - t, 3);
      this.y = this._startY - ease * COIN_RISE;
      return true;
    },

    /**
     * Draw the coin.
     * @param {CanvasRenderingContext2D} ctx
     */
    draw: function (ctx) {
      var elapsed = performance.now() - this._born;
      var t = elapsed / COIN_LIFETIME;
      if (t >= 1) return;

      // Fade out in the last 40 % of life
      var alpha = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Glow
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 12;

      // Coin circle
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Coin border
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // "$" symbol
      ctx.fillStyle = '#b8860b';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', this.x, this.y + 0.5);

      ctx.restore();
    },
  };

  /* ================================================================== */
  /*  CHAPTER 1 RENDERER                                                */
  /* ================================================================== */

  /**
   * Creates a Chapter1Renderer bound to a canvas element.
   *
   * @constructor
   * @param {HTMLCanvasElement} canvas  The #graphic-canvas element.
   */
  function Chapter1Renderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    /* ---- Bandit simulator ---- */
    this.simulator = new VizUtils.BanditSimulator(NUM_ARMS, ARM_PROBS);

    /* ---- Per-arm state ---- */
    this.armTotals     = [0, 0, 0];
    this.armPullCounts = [0, 0, 0];

    /* ---- Regret tracking ---- */
    this.regretHistory = [];

    /* ---- Lever spring-physics animation ---- */
    this.leverAngles  = [0, 0, 0];
    this.leverTargets = [0, 0, 0];
    this.leverVel     = [0, 0, 0];

    /* ---- Coin animations ---- */
    this.coins = [];

    /* ---- Layout cache ---- */
    this.width  = 0;
    this.height = 0;
    this.dpr    = 1;

    /* ---- Scroll progress ---- */
    this.progress       = 0;
    this.revealProgress = 0;

    /* ---- Animation loop ---- */
    this._rafId   = null;
    this.running  = false;

    /* ---- Event listeners (bound) ---- */
    this._boundOnClick  = this._onClick.bind(this);
    this._boundOnResize = this._resize.bind(this);

    /* ---- Reset button screen rect (CSS px, set by _resize) ---- */
    this.resetBtn = { x: 0, y: 0, w: 90, h: 32 };
  }

  Chapter1Renderer.prototype = /** @lends Chapter1Renderer.prototype */ {

    constructor: Chapter1Renderer,

    /* ---------------------------------------------------------------- */
    /*  PUBLIC API                                                       */
    /* ---------------------------------------------------------------- */

    /**
     * Initialise the renderer. Call once when the step becomes active.
     * @param {HTMLCanvasElement} [canvas]  Optionally set/replace canvas.
     */
    init: function (canvas) {
      if (canvas) this.canvas = canvas;
      this.ctx = this.canvas.getContext('2d');

      this._resize();
      this.canvas.style.cursor = 'pointer';
      this.canvas.addEventListener('click', this._boundOnClick);
      window.addEventListener('resize', this._boundOnResize, { passive: true });

      if (!this.running) {
        this.running = true;
        this._loop();
      }
    },

    /**
     * Called every scroll frame.
     * @param {number} progress  0 = step just entered, 1 = step fully scrolled.
     */
    update: function (progress) {
      this.progress = progress;
      this.revealProgress = Math.min(1, progress / REVEAL_DURATION);
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
        this.canvas.style.cursor = '';
        this.canvas.removeEventListener('click', this._boundOnClick);
      }
      window.removeEventListener('resize', this._boundOnResize, { passive: true });
      this.canvas = null;
      this.ctx    = null;
      this.coins  = [];
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

      // Reset button: top-right corner
      this.resetBtn.x = this.width  - this.resetBtn.w - 14;
      this.resetBtn.y = 14;
    },

    /* ---------------------------------------------------------------- */
    /*  ARM GEOMETRY (CSS px coordinates)                                */
    /* ---------------------------------------------------------------- */

    /** @private */
    _getArmRect: function (index) {
      var topAreaH = this.height * TOP_RATIO;
      var centreY  = topAreaH / 2;
      var gap      = Math.min(30, this.width * 0.045);
      var armsW    = NUM_ARMS * ARM_BODY_W + (NUM_ARMS - 1) * gap;
      var startX   = (this.width - armsW) / 2;
      return {
        x: startX + index * (ARM_BODY_W + gap),
        y: centreY - ARM_BODY_H / 2 + 12,
        w: ARM_BODY_W,
        h: ARM_BODY_H,
      };
    },

    /** @private */
    _getLeverRect: function (armIndex) {
      var arm = this._getArmRect(armIndex);
      return {
        x: arm.x + arm.w / 2 - ARM_LEVER_W / 2,
        y: arm.y - ARM_LEVER_H + 6,
        w: ARM_LEVER_W,
        h: ARM_LEVER_H,
      };
    },

    /* ---------------------------------------------------------------- */
    /*  CLICK HANDLER                                                    */
    /* ---------------------------------------------------------------- */

    /** @private */
    _onClick: function (e) {
      var rect = this.canvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left) * (this.width  / rect.width);
      var my = (e.clientY - rect.top)  * (this.height / rect.height);

      // Reset button
      var b = this.resetBtn;
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        this._reset();
        return;
      }

      // Arm hit-test
      for (var i = 0; i < NUM_ARMS; i++) {
        var arm   = this._getArmRect(i);
        var lever = this._getLeverRect(i);
        if ((mx >= arm.x   && mx <= arm.x + arm.w   && my >= arm.y   && my <= arm.y + arm.h) ||
            (mx >= lever.x && mx <= lever.x + lever.w && my >= lever.y && my <= lever.y + lever.h)) {
          this._pullArm(i);
          return;
        }
      }
    },

    /* ---------------------------------------------------------------- */
    /*  PULL AN ARM                                                      */
    /* ---------------------------------------------------------------- */

    /** @private */
    _pullArm: function (index) {
      var reward = this.simulator.pullArm(index);

      this.armPullCounts[index]++;
      this.armTotals[index] += reward;

      // Animate lever — snap down, spring returns
      this.leverTargets[index] = -0.55;

      // Coin on win
      if (reward === 1) {
        var arm = this._getArmRect(index);
        this.coins.push(new Coin(arm.x + arm.w / 2, arm.y + 12));
      }

      // Cumulative regret = (optimal * totalPulls) - totalRewardAllArms
      var totalPulls = this.armPullCounts[0] + this.armPullCounts[1] + this.armPullCounts[2];
      var totalRew   = this.armTotals[0] + this.armTotals[1] + this.armTotals[2];
      var optimal    = this.simulator.getOptimalValue(); // 0.7
      var regret     = optimal * totalPulls - totalRew;
      this.regretHistory.push(regret);
    },

    /** @private */
    _reset: function () {
      this.simulator.reset();
      this.armTotals     = [0, 0, 0];
      this.armPullCounts = [0, 0, 0];
      this.regretHistory = [];
      this.coins         = [];
      this.leverAngles   = [0, 0, 0];
      this.leverTargets  = [0, 0, 0];
      this.leverVel      = [0, 0, 0];
    },

    /* ---------------------------------------------------------------- */
    /*  ANIMATION LOOP                                                   */
    /* ---------------------------------------------------------------- */

    /** @private */
    _loop: function () {
      if (!this.running) return;
      this._tick();
      this._render();
      this._rafId = requestAnimationFrame(this._loop.bind(this));
    },

    /** @private Advance physics. */
    _tick: function () {
      var now = performance.now();

      // Lever spring physics
      for (var i = 0; i < NUM_ARMS; i++) {
        var diff = this.leverTargets[i] - this.leverAngles[i];
        this.leverVel[i] += diff * 0.35;
        this.leverVel[i] *= 0.82;         // damping
        this.leverAngles[i] += this.leverVel[i];

        // Snap back when close to target
        if (this.leverTargets[i] === -0.55 && Math.abs(this.leverAngles[i] + 0.55) < 0.04) {
          this.leverTargets[i] = 0;
        }
      }

      // Coins
      this.coins = this.coins.filter(function (c) { return c.update(now); });
    },

    /* ---------------------------------------------------------------- */
    /*  RENDER                                                           */
    /* ---------------------------------------------------------------- */

    /** @private */
    _render: function () {
      var ctx = this.ctx;
      var w   = this.width;
      var h   = this.height;
      var dpr = this.dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Background fill
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, w, h);

      this._renderArms(ctx, w, h);
      this._renderCoins(ctx);
      this._renderDividingLine(ctx, w, h);
      this._renderRegretCurve(ctx, w, h);
      this._renderResetButton(ctx);
    },

    /* ---------------------------------------------------------------- */
    /*  ARMS                                                             */
    /* ---------------------------------------------------------------- */

    /** @private */
    _renderArms: function (ctx, w, h) {
      var reveal = this.revealProgress;

      for (var i = 0; i < NUM_ARMS; i++) {
        var arm   = this._getArmRect(i);
        var color = ARM_COLORS[i];
        var angle = this.leverAngles[i];
        var cx    = arm.x + arm.w / 2;
        var cy    = arm.y + arm.h / 2;

        ctx.save();

        // Reveal: scale + fade
        var scale = 0.25 + reveal * 0.75;
        var alpha = Math.min(1, reveal * 1.8);
        ctx.globalAlpha = alpha;

        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);

        // ----- Lever handle -----
        var lever = this._getLeverRect(i);
        var lcx   = lever.x + lever.w / 2;
        var lby   = lever.y + lever.h;  // lever base (hinge point)

        ctx.save();
        ctx.translate(lcx, lby);
        ctx.rotate(angle);

        // Lever shaft
        ctx.fillStyle = '#555';
        ctx.fillRect(-ARM_LEVER_W / 2, -ARM_LEVER_H, ARM_LEVER_W, ARM_LEVER_H);

        // Knob
        var knobR = ARM_LEVER_W / 2 + 3;
        ctx.fillStyle = '#999';
        ctx.beginPath();
        ctx.arc(0, -ARM_LEVER_H, knobR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ccc';
        ctx.beginPath();
        ctx.arc(0, -ARM_LEVER_H, knobR - 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // ----- Arm body (rounded rect) -----
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha * 0.8;
        this._roundedRect(ctx, arm.x, arm.y, arm.w, arm.h, ARM_RADIUS);
        ctx.fill();

        // Border glow
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.globalAlpha = alpha;

        // ----- Arm label -----
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(ARM_LABELS[i], cx, arm.y + 14);

        // ----- Slot / payout indicator -----
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        var slotY = arm.y + 42;
        var slotH = 8;
        ctx.fillRect(cx - 28, slotY, 56, slotH);

        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '7px monospace';
        ctx.textBaseline = 'middle';
        ctx.fillText('? ? ?', cx, slotY + slotH / 2);

        // ----- Pull count -----
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = '10px monospace';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u2191 ' + this.armPullCounts[i] + ' pulls', cx, arm.y + 70);

        // ----- Running total -----
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px monospace';
        ctx.textBaseline = 'bottom';
        ctx.fillText('$' + this.armTotals[i], cx, arm.y + arm.h - 18);

        // "TOTAL" label
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '8px sans-serif';
        ctx.textBaseline = 'bottom';
        ctx.fillText('TOTAL', cx, arm.y + arm.h - 26);

        ctx.restore();
      }
    },

    /** @private Draw a rounded rectangle path. */
    _roundedRect: function (ctx, x, y, w, h, r) {
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
    },

    /* ---------------------------------------------------------------- */
    /*  COINS                                                            */
    /* ---------------------------------------------------------------- */

    /** @private */
    _renderCoins: function (ctx) {
      for (var i = 0; i < this.coins.length; i++) {
        this.coins[i].draw(ctx);
      }
    },

    /* ---------------------------------------------------------------- */
    /*  DIVIDING LINE                                                    */
    /* ---------------------------------------------------------------- */

    /** @private */
    _renderDividingLine: function (ctx, w, h) {
      var chartTop = h * TOP_RATIO;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, chartTop);
      ctx.lineTo(w, chartTop);
      ctx.stroke();
    },

    /* ---------------------------------------------------------------- */
    /*  REGRET CURVE (bottom half)                                       */
    /* ---------------------------------------------------------------- */

    /** @private */
    _renderRegretCurve: function (ctx, w, h) {
      if (this.regretHistory.length < 2) {
        // Draw placeholder text
        var chartTop = h * TOP_RATIO;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Pull an arm to see your regret curve', w / 2, chartTop + (h - chartTop) / 2);
        return;
      }

      var chartTop = h * TOP_RATIO;
      var chartH   = h - chartTop;

      // "Regret" label
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Regret \u2198', 8, chartTop + 4);

      // Delegate to VizUtils — translate context so the chart draws
      // in the bottom half.  drawRegretCurve clears its own area.
      ctx.save();
      ctx.translate(0, chartTop);
      VizUtils.drawRegretCurve(ctx, w, chartH, [this.regretHistory], ['#fff'], ['You']);
      ctx.restore();
    },

    /* ---------------------------------------------------------------- */
    /*  RESET BUTTON                                                     */
    /* ---------------------------------------------------------------- */

    /** @private */
    _renderResetButton: function (ctx) {
      var btn = this.resetBtn;
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.revealProgress * 2);

      // Background pill
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      this._roundedRect(ctx, btn.x, btn.y, btn.w, btn.h, 16);
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u21BA Reset', btn.x + btn.w / 2, btn.y + btn.h / 2);

      ctx.restore();
    },
  };

  /* ================================================================== */
  /*  EXPORT                                                             */
  /* ================================================================== */

  window.Chapter1Renderer = Chapter1Renderer;
})();
