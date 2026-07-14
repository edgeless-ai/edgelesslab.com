/**
 * init.js — Bootstrap for the Swarm Narrative scrollytelling experience.
 *
 * Wires the ScrollEngine to chapter renderers (Chapter1Renderer through
 * Chapter4Renderer), manages the hero particle swarm, and updates the
 * step indicator.
 *
 * Load after all other scripts (last in the <body>).
 */
(function () {
  'use strict';

  /* ================================================================== */
  /*  DOM READY                                                           */
  /* ================================================================== */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ================================================================== */
  /*  BOOT                                                                */
  /* ================================================================== */

  function boot() {
    /* ---- Hero ---- */
    var heroCanvas = document.getElementById('hero-canvas');
    var heroRenderer = null;
    if (heroCanvas && typeof window.HeroRenderer !== 'undefined') {
      // HeroRenderer is a plain object (not a constructor) with init(canvas) and updateScroll(progress)
      heroRenderer = window.HeroRenderer;
      heroRenderer.init(heroCanvas);
    }

    /* ---- Scroll engine step elements ---- */
    var steps = document.querySelectorAll('.step');
    if (!steps.length) return;

    var renderers = {}; // { stepIndex: rendererInstance }
    var currentRenderer = null;
    var scrollEngine = null; // populated below (GsapScroll or vanilla)

    // Try GSAP first — if unavailable, fall back to vanilla ScrollEngine
    var gsapOk = false;
    if (typeof window.GsapScroll !== 'undefined') {
      gsapOk = window.GsapScroll.init(steps, {
        onStepEnter: onStepEnter,
        onStepLeave: onStepLeave,
        onStepProgress: onStepProgress,
      }, document.querySelector('.sticky-graphic'));
    }

    if (!gsapOk) {
      // Vanilla fallback
      scrollEngine = new window.ScrollEngine(steps, {
        onStepEnter: onStepEnter,
        onStepLeave: onStepLeave,
        onStepProgress: onStepProgress,
      });

      var stopLoop = window.renderLoop(function () {
        scrollEngine.tick();
      });
      // Store stop loop for cleanup
      window.__stopLoop = stopLoop;
    }

    // Shared callback implementations
    function onStepEnter(index) {
      var indicator = document.getElementById('step-indicator');
      if (indicator) {
        var total = steps.length;
        indicator.textContent = '0' + (index + 1) + ' / 0' + total;
      }

      var stepEl = steps[index];
      var stepNum = parseInt(stepEl.getAttribute('data-step'), 10);

      if (currentRenderer && currentRenderer.destroy) {
        currentRenderer.destroy();
        currentRenderer = null;
      }

      var canvas = document.getElementById('graphic-canvas');
      if (!canvas) return;

      var renderer = getRendererForStep(stepNum, canvas);
      if (renderer) {
        if (renderer.init) renderer.init(canvas);
        currentRenderer = renderer;
        renderers[index] = renderer;
      }

      if (heroRenderer && heroRenderer.updateScroll) {
        heroRenderer.updateScroll(getHeroScrollProgress(index, steps.length));
      }
    }

    function onStepLeave(index) {
      if (renderers[index] && renderers[index].destroy) {
        renderers[index].destroy();
        delete renderers[index];
      }
      if (currentRenderer === renderers[index]) {
        currentRenderer = null;
      }
    }

    function onStepProgress(index, progress) {
      if (currentRenderer && currentRenderer.update) {
        currentRenderer.update(progress);
      }
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', function () {
      if (gsapOk && typeof window.GsapScroll !== 'undefined') {
        window.GsapScroll.destroy();
      } else {
        if (window.__stopLoop) window.__stopLoop();
        if (scrollEngine && scrollEngine.destroy) scrollEngine.destroy();
      }
      if (heroRenderer && heroRenderer.destroy) {
        heroRenderer.destroy();
      }
      for (var key in renderers) {
        if (renderers[key].destroy) {
          renderers[key].destroy();
        }
      }
    });
  }

  /* ================================================================== */
  /*  RENDERER FACTORY                                                     */
  /* ================================================================== */

  /**
   * Returns the appropriate renderer instance for a given step number.
   * @param {number} stepNum  1-4
   * @param {HTMLCanvasElement} canvas
   * @returns {Object|null}
   */
  function getRendererForStep(stepNum, canvas) {
    switch (stepNum) {
      case 1:
        if (typeof window.Chapter1Renderer !== 'undefined') {
          return new window.Chapter1Renderer(canvas);
        }
        break;
      case 2:
        if (typeof window.Chapter2Renderer !== 'undefined') {
          return new window.Chapter2Renderer(canvas);
        }
        break;
      case 3:
        if (typeof window.Chapter3Renderer !== 'undefined') {
          return new window.Chapter3Renderer(canvas);
        }
        break;
      case 4:
        if (typeof window.Chapter4Renderer !== 'undefined') {
          return new window.Chapter4Renderer(canvas);
        }
        break;
    }
    return null;
  }

  /**
   * Compute a 0-1 progress value for the hero based on current scroll position.
   * The hero fades out as the user scrolls past the hero section and into step 1.
   * @param {number} activeStepIndex
   * @param {number} totalSteps
   * @returns {number}
   */
  function getHeroScrollProgress(activeStepIndex, totalSteps) {
    // 0 when at step 1, 1 when at the last step
    if (activeStepIndex <= 0) return 0;
    return Math.min(1, activeStepIndex / totalSteps);
  }
})();
