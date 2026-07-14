/**
 * GsapScroll — GSAP ScrollTrigger upgrade for the swarm-narrative scrollytelling.
 *
 * Enhances the existing scroll-engine with:
 *   - ScrollTrigger pinning of .sticky-graphic (smoother than CSS position: sticky)
 *   - Scroll-driven scrubbing (progress tied to scroll, 60fps via GSAP's ticker)
 *   - Same callbacks as ScrollEngine (onStepEnter/onStepLeave/onStepProgress)
 *   - Graceful fallback: if GSAP not loaded, the original engine runs untouched
 *
 * Load after scroll-engine.js but before init.js.
 * If GSAP is unavailable, init.js uses the original ScrollEngine as-is.
 *
 * @module gsap-scroll
 */
(function () {
  'use strict';

  var GsapScroll = {};

  /**
   * Initialise GSAP-powered scroll engine.
   * Detects whether GSAP and ScrollTrigger are loaded; if not, returns false
   * so init.js can fall back to the vanilla ScrollEngine.
   *
   * @param {NodeList} steps  .step elements
   * @param {Object} callbacks  { onStepEnter, onStepLeave, onStepProgress }
   * @param {HTMLElement} pinTarget  .sticky-graphic element to pin
   * @returns {boolean}  true if GSAP initialised, false if unavailable
   */
  GsapScroll.init = function (steps, callbacks, pinTarget) {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('GsapScroll: GSAP not loaded — falling back to vanilla ScrollEngine');
      return false;
    }

    var stepArray = Array.from(steps);
    if (!stepArray.length) return false;

    // Kill any existing ScrollTrigger instances on these elements
    ScrollTrigger.getAll().forEach(function (st) {
      if (st && st.revert) st.revert();
    });

    // Pin the graphic panel
    if (pinTarget) {
      ScrollTrigger.create({
        trigger: pinTarget.parentElement || document.getElementById('scrolly'),
        start: 'top top',
        end: function () {
          var totalH = 0;
          for (var i = 0; i < stepArray.length; i++) {
            totalH += stepArray[i].offsetHeight;
          }
          return '+=' + totalH;
        },
        pin: pinTarget,
        pinSpacing: false,
        anticipatePin: 1,
      });
    }

    // Create a ScrollTrigger per step for scrub-based progress
    var triggers = [];
    var currentIndex = -1;

    for (var i = 0; i < stepArray.length; i++) {
      var step = stepArray[i];
      var index = i; // capture for closure

      var trigger = ScrollTrigger.create({
        trigger: step,
        start: 'top center',
        end: 'bottom center',
        scrub: 1.5, // smooth interpolation over 1.5s
        onEnter: function () {
          var idx = parseInt(this.trigger.getAttribute('data-step'), 10) - 1;
          if (idx !== currentIndex) {
            // Leave previous
            if (currentIndex >= 0 && callbacks.onStepLeave) {
              callbacks.onStepLeave(currentIndex);
            }
            currentIndex = idx;
            // Enter new
            stepArray.forEach(function (s) { s.classList.remove('active'); });
            this.trigger.classList.add('active');
            if (callbacks.onStepEnter) {
              callbacks.onStepEnter(idx);
            }
          }
        }.bind(trigger),
        onLeave: function () {
          var idx = parseInt(this.trigger.getAttribute('data-step'), 10) - 1;
          if (idx === currentIndex) {
            this.trigger.classList.remove('active');
            currentIndex = -1;
          }
        }.bind(trigger),
        onUpdate: function (self) {
          var idx = parseInt(this.trigger.getAttribute('data-step'), 10) - 1;
          var progress = self.progress; // 0-1
          if (callbacks.onStepProgress) {
            callbacks.onStepProgress(idx, progress);
          }
        }.bind(trigger),
      });

      triggers.push(trigger);
    }

    // Update step indicator on scroll
    var indicator = document.getElementById('step-indicator');
    if (indicator) {
      ScrollTrigger.create({
        trigger: document.getElementById('scrolly'),
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: function (self) {
          var totalSteps = stepArray.length;
          var rawStep = self.progress * totalSteps;
          var stepNum = Math.min(Math.floor(rawStep) + 1, totalSteps);
          indicator.textContent = '0' + stepNum + ' / 0' + totalSteps;
        },
      });
    }

    // Refresh ScrollTrigger on resize (accounts for layout changes)
    ScrollTrigger.addEventListener('refreshInit', function () {
      ScrollTrigger.refresh();
    });

    // Store for cleanup
    GsapScroll._triggers = triggers;
    GsapScroll._currentIndex = -1;

    // Initial refresh
    ScrollTrigger.refresh();

    return true;
  };

  /**
   * Destroy GSAP scroll — kill all triggers and unregister.
   */
  GsapScroll.destroy = function () {
    if (GsapScroll._triggers) {
      GsapScroll._triggers.forEach(function (t) { t.kill(); });
      GsapScroll._triggers = [];
    }
    ScrollTrigger.getAll().forEach(function (st) { st.kill(); });
    GsapScroll._currentIndex = -1;
  };

  window.GsapScroll = GsapScroll;
})();
