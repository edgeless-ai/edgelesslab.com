/**
 * ScrollEngine -- IntersectionObserver-based step manager for scrollytelling.
 *
 * Inspired by Pudding.cool-style narrative scroll experiences.
 * Uses rootMargin '-50% 0px -50% 0px' so a step is 'entered' when it
 * reaches the center of the viewport. Progress (0-1) is computed from
 * the scroll position through the step element and updated via rAF for
 * smooth 60fps tracking.
 *
 * Usage example:
 *
 *   const engine = new ScrollEngine(document.querySelectorAll('.step'), {
 *     onStepEnter(idx)       { ... },     // fired when step idx enters centre
 *     onStepLeave(idx)       { ... },     // fired when step idx leaves centre
 *     onStepProgress(idx, p) { ... },     // fired with 0 <= p <= 1
 *   });
 *
 *   const stop = renderLoop(function () { engine.tick(); });
 *
 *   // Later, cleanup:
 *   engine.destroy();
 *   stop();
 *
 * @module scroll-engine
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  renderLoop — tiny rAF wrapper                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Starts a requestAnimationFrame loop that invokes `callback` every frame.
   *
   * @param  {Function} callback  Called each animation frame with no arguments.
   * @return {Function}           stop() — call to halt the loop.
   */
  function renderLoop(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('renderLoop expects a function');
    }

    let running = true;

    function loop() {
      if (!running) return;
      callback();
      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);

    return function stop() {
      running = false;
    };
  }

  /* ------------------------------------------------------------------ */
  /*  ScrollEngine                                                        */
  /* ------------------------------------------------------------------ */

  /** @const {string} Intersection root margin — step is "entered" at viewport centre. */
  var ROOT_MARGIN = '-50% 0px -50% 0px';

  /** @const {string} CSS class toggled on the current (centred) step. */
  var ACTIVE_CLASS = 'active';

  /**
   * Creates a scrollytelling step manager.
   *
   * @param {NodeList}  steps     .step elements in document order.
   * @param {Object}    callbacks
   * @param {Function}  [callbacks.onStepEnter]     Fired once when step enters centre.
   * @param {Function}  [callbacks.onStepLeave]     Fired once when step leaves centre.
   * @param {Function}  [callbacks.onStepProgress]  Fired every rAF tick with (index, 0-1).
   */
  function ScrollEngine(steps, callbacks) {
    if (!steps || typeof steps.length !== 'number') {
      throw new Error('ScrollEngine: steps must be a NodeList or array-like of .step elements');
    }

    if (!steps.length) {
      console.warn('ScrollEngine: No steps provided — engine is a no-op.');
    }

    /** @type {Element[]} */
    this.steps = Array.from(steps);

    /** @private */
    this._callbacks = {
      onStepEnter:    (typeof callbacks.onStepEnter    === 'function' ? callbacks.onStepEnter    : null),
      onStepLeave:    (typeof callbacks.onStepLeave    === 'function' ? callbacks.onStepLeave    : null),
      onStepProgress: (typeof callbacks.onStepProgress === 'function' ? callbacks.onStepProgress : null),
    };

    /** @private Index of the step currently centred in the viewport (-1 = none). */
    this._currentStep = -1;

    /** @private Set of steps that have fired their enter callback (prevents double-fires). */
    this._entered = new Set();

    /** @private Stored progress values per step index (avoids redundant callback calls). */
    this._lastProgress = {};

    /** @private The IntersectionObserver instance. */
    this._observer = null;

    /** @private Cached step bounding rects — refreshed lazily. */
    this._rects = [];

    /** @private Bound handle for page unload. */
    this._onUnload = this.destroy.bind(this);

    /* ---------- initialise observer ---------- */

    this._initObserver();

    /* ---------- register cleanup on page unload ---------- */

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this._onUnload);
      window.addEventListener('pagehide', this._onUnload);
    }
  }

  /* ---- public helpers ---- */

  ScrollEngine.prototype = /** @lends ScrollEngine.prototype */ {

    constructor: ScrollEngine,

    /**
     * Tick — call from a rAF loop to update per-step progress via
     * onStepProgress(index, 0-1). This is intentionally decoupled from
     * IntersectionObserver so progress flows at 60fps even when the
     * browser coalesces observer callbacks.
     */
    tick: function () {
      if (!this.steps.length) return;

      var current = this._currentStep;
      if (current < 0) return;  // no step currently centred — nothing to progress-track

      var step  = this.steps[current];
      var rect  = step.getBoundingClientRect();
      var vh    = window.innerHeight;
      var stepH = rect.height;

      if (stepH <= 0) return;

      // progress 0 when the step's top crosses the viewport centre,
      //          1 when its bottom crosses the viewport centre.
      var centreY = vh / 2;
      var topToCentre = centreY - rect.top;
      var progress = Math.max(0, Math.min(1, topToCentre / stepH));

      // Only fire onStepProgress when the value actually changes.
      if (this._lastProgress[current] !== progress) {
        this._lastProgress[current] = progress;

        if (this._callbacks.onStepProgress) {
          this._callbacks.onStepProgress(current, progress);
        }
      }
    },

    /**
     * Returns the index of the currently centred step, or -1.
     * @return {number}
     */
    getCurrentStep: function () {
      return this._currentStep;
    },

    /**
     * Programmatically jump to (and activate) a specific step index.
     * Useful for initial setup or keyboard navigation.
     *
     * @param {number} index
     */
    activateStep: function (index) {
      if (index < 0 || index >= this.steps.length) return;
      this._setActiveStep(index);
    },

    /**
     * Refresh cached element rects (call after layout-affecting DOM changes).
     */
    refresh: function () {
      // Nothing heavy to refresh now — but the API surface is forward-compatible.
    },

    /**
     * Full teardown: disconnect observer, remove active classes, clear state,
     * and deregister page-lifecycle listeners.
     */
    destroy: function () {
      // Disconnect observer.
      if (this._observer) {
        this._observer.disconnect();
        this._observer = null;
      }

      // Remove active class from all steps.
      for (var i = 0; i < this.steps.length; i++) {
        this.steps[i].classList.remove(ACTIVE_CLASS);
      }

      // Wipe state.
      this._currentStep = -1;
      this._entered.clear();
      this._lastProgress = {};

      // Deregister lifecycle handlers.
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', this._onUnload);
        window.removeEventListener('pagehide', this._onUnload);
      }
    },

    /* ---------------------------------------------------------------- */
    /*  PRIVATE                                                          */
    /* ---------------------------------------------------------------- */

    /** @private */
    _initObserver: function () {
      this._observer = new IntersectionObserver(
        (entries) => {
          for (var i = 0; i < entries.length; i++) {
            this._handleIntersection(entries[i]);
          }
        },
        {
          rootMargin: ROOT_MARGIN,
          threshold: [0, 0.25, 0.5, 0.75, 1],
        }
      );

      for (var i = 0; i < this.steps.length; i++) {
        this._observer.observe(this.steps[i]);
      }
    },

    /**
     * Handles a single IntersectionObserver entry.
     * @private
     * @param {IntersectionObserverEntry} entry
     */
    _handleIntersection: function (entry) {
      var index = this.steps.indexOf(entry.target);
      if (index === -1) return;

      var isIntersecting = entry.isIntersecting;

      if (isIntersecting) {
        // Step has entered the centre zone.
        if (this._currentStep !== index && !this._entered.has(index)) {
          // Leave the previous step first.
          if (this._currentStep >= 0) {
            this._leaveStep(this._currentStep);
          }

          this._setActiveStep(index);
        }
      } else {
        // Step has left the centre zone.
        if (this._currentStep === index) {
          this._leaveStep(index);
        }
      }
    },

    /**
     * Activates a step: sets _currentStep, toggles CSS class, fires enter callback.
     * @private
     * @param {number} index
     */
    _setActiveStep: function (index) {
      if (index === this._currentStep) return;

      // Deactivate all, activate this one.
      for (var i = 0; i < this.steps.length; i++) {
        this.steps[i].classList.remove(ACTIVE_CLASS);
      }
      this.steps[index].classList.add(ACTIVE_CLASS);

      this._currentStep = index;
      this._entered.add(index);
      this._lastProgress[index] = undefined;  // reset progress cache for fresh start

      if (this._callbacks.onStepEnter) {
        this._callbacks.onStepEnter(index);
      }
    },

    /**
     * Leaves a step: fires leave callback and clears internal state for that index.
     * @private
     * @param {number} index
     */
    _leaveStep: function (index) {
      if (this._callbacks.onStepLeave) {
        this._callbacks.onStepLeave(index);
      }

      this._currentStep = -1;
      this._entered.delete(index);
      this._lastProgress[index] = undefined;

      this.steps[index].classList.remove(ACTIVE_CLASS);
    },
  };

  /* ------------------------------------------------------------------ */
  /*  exports                                                            */
  /* ------------------------------------------------------------------ */

  window.ScrollEngine = ScrollEngine;
  window.renderLoop   = renderLoop;
})();
