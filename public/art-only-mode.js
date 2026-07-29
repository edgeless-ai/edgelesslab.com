(() => {
  "use strict";

  if (window.self !== window.top || document.documentElement.hasAttribute("data-art-only-disabled")) {
    return;
  }

  const STORAGE_KEY = "edgeless.artOnly";
  const TOGGLE_ID = "art-only-toggle";
  const HIDE_ATTRIBUTE = "data-art-only-ui";
  const KEEP_ATTRIBUTE = "data-art-only-keep";
  const formControlSelector =
    "input, select, textarea, [role=\"slider\"], [contenteditable=\"true\"]";
  const uiSelectors = [
    "[data-art-only-hide]",
    "#controls",
    ".controls",
    "#control-panel",
    ".control-panel",
    "[class*=\"control-panel\"]",
    "[id^=\"controls-\"]",
    "[id$=\"-controls\"]",
    "#panel",
    ".gui-panel",
    ".gui-container",
    ".settings-panel",
    "#settings",
    ".settings",
    "#sidebar",
    ".sidebar",
    "aside",
    ".dg",
    ".lil-gui",
    ".tp-dfwv",
    ".tweakpane",
    "#info-panel",
    ".info-panel",
    "#instructions",
    ".instructions",
    "#help-panel",
    ".help-panel",
    "#toolbar",
    ".toolbar",
    "#hud",
    ".hud",
    "body > header",
    "body > nav",
    "body > footer",
  ];

  let controlsHidden = false;
  let discoveryTimer = 0;
  let initialized = false;

  function addStyles() {
    if (document.getElementById("art-only-styles")) return;

    const style = document.createElement("style");
    style.id = "art-only-styles";
    style.textContent = `
      [${HIDE_ATTRIBUTE}="true"] {
        transition: opacity 160ms ease, visibility 160ms ease;
      }

      html.art-only-active [${HIDE_ATTRIBUTE}="true"] {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }

      #${TOGGLE_ID} {
        position: fixed;
        right: max(14px, env(safe-area-inset-right));
        bottom: max(14px, env(safe-area-inset-bottom));
        z-index: 2147483647;
        display: inline-flex;
        min-height: 40px;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 9px 12px;
        border: 1px solid rgba(201, 255, 74, 0.52);
        border-radius: 3px;
        background: rgba(10, 10, 12, 0.86);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.24);
        color: #f3f4ef;
        font: 600 11px/1.1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        cursor: pointer;
        -webkit-backdrop-filter: blur(12px);
        backdrop-filter: blur(12px);
        transition: opacity 160ms ease, border-color 160ms ease, background 160ms ease, transform 160ms ease;
      }

      #${TOGGLE_ID}:hover {
        border-color: #c9ff4a;
        background: rgba(16, 18, 17, 0.96);
        transform: translateY(-1px);
      }

      #${TOGGLE_ID}:focus-visible {
        outline: 2px solid #c9ff4a;
        outline-offset: 3px;
      }

      #${TOGGLE_ID} .art-only-glyph {
        color: #c9ff4a;
        font-size: 15px;
        line-height: 1;
      }

      html.art-only-active #${TOGGLE_ID} {
        width: 40px;
        min-width: 40px;
        height: 40px;
        min-height: 40px;
        padding: 0;
        border-radius: 50%;
        opacity: 0.42;
      }

      html.art-only-active #${TOGGLE_ID}:hover,
      html.art-only-active #${TOGGLE_ID}:focus-visible {
        opacity: 1;
      }

      html.art-only-active #${TOGGLE_ID} .art-only-label {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      @media (max-width: 600px) {
        #${TOGGLE_ID} {
          width: 42px;
          min-width: 42px;
          height: 42px;
          min-height: 42px;
          padding: 0;
          border-radius: 50%;
        }

        #${TOGGLE_ID} .art-only-label {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        [${HIDE_ATTRIBUTE}="true"],
        #${TOGGLE_ID} {
          transition: none;
        }
      }

      @media print {
        #${TOGGLE_ID} {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function isArtworkContainer(element) {
    return Boolean(element.querySelector("canvas, [data-art-only-artwork]"));
  }

  function markAsInterface(element) {
    if (
      !(element instanceof HTMLElement) ||
      element.id === TOGGLE_ID ||
      element.hasAttribute(KEEP_ATTRIBUTE) ||
      element.closest(`[${KEEP_ATTRIBUTE}]`) ||
      isArtworkContainer(element)
    ) {
      return;
    }

    element.setAttribute(HIDE_ATTRIBUTE, "true");
  }

  function findFormPanel(control) {
    let node = control.parentElement;
    let best = null;

    while (node && node !== document.body) {
      if (node.id === TOGGLE_ID || isArtworkContainer(node)) break;

      const controlCount = node.querySelectorAll(formControlSelector).length;
      if (controlCount >= 2 || node.matches("form")) {
        best = node;
      }

      node = node.parentElement;
    }

    return best;
  }

  function discoverInterface() {
    document.querySelectorAll(uiSelectors.join(",")).forEach(markAsInterface);

    document.querySelectorAll(formControlSelector).forEach((control) => {
      const panel = findFormPanel(control);
      if (panel) markAsInterface(panel);
    });
  }

  function storedPreference() {
    const query = new URLSearchParams(window.location.search);
    if (query.get("art") === "1" || query.get("controls") === "hidden") return true;
    if (query.get("art") === "0" || query.get("controls") === "shown") return false;

    try {
      return window.localStorage.getItem(STORAGE_KEY) === "hidden";
    } catch {
      return false;
    }
  }

  function persistPreference(hidden) {
    try {
      window.localStorage.setItem(STORAGE_KEY, hidden ? "hidden" : "shown");
    } catch {
      // The control still works when storage is unavailable.
    }
  }

  function updateButton(button) {
    const label = controlsHidden ? "Show controls" : "Hide controls";
    button.setAttribute("aria-label", `${label}. Keyboard shortcut H.`);
    button.setAttribute("aria-pressed", String(controlsHidden));
    button.title = `${label} (H)`;
    button.querySelector(".art-only-glyph").textContent = controlsHidden ? "☰" : "◐";
    button.querySelector(".art-only-label").textContent = label;
  }

  function notifyArtwork() {
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(
        new CustomEvent("artonlychange", {
          detail: { controlsHidden },
        })
      );
    });
  }

  function setControlsHidden(hidden, persist = true) {
    controlsHidden = Boolean(hidden);
    discoverInterface();
    document.documentElement.classList.toggle("art-only-active", controlsHidden);
    document.body.classList.toggle("art-only-active", controlsHidden);

    const button = document.getElementById(TOGGLE_ID);
    if (button) updateButton(button);
    if (persist) persistPreference(controlsHidden);
    notifyArtwork();
  }

  function addToggle() {
    if (document.getElementById(TOGGLE_ID)) return;

    const button = document.createElement("button");
    button.id = TOGGLE_ID;
    button.type = "button";
    button.setAttribute(KEEP_ATTRIBUTE, "true");
    button.setAttribute("aria-keyshortcuts", "H");
    button.innerHTML = `
      <span class="art-only-glyph" aria-hidden="true">◐</span>
      <span class="art-only-label">Hide controls</span>
    `;
    button.addEventListener("click", () => setControlsHidden(!controlsHidden));
    document.body.appendChild(button);
    updateButton(button);
  }

  function isEditing(element) {
    return Boolean(
      element &&
        (element.matches("input, textarea, select") || element.isContentEditable)
    );
  }

  function addKeyboardControls() {
    document.addEventListener("keydown", (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "Escape" && controlsHidden) {
        setControlsHidden(false);
        return;
      }

      if (event.key.toLowerCase() === "h" && !isEditing(event.target)) {
        event.preventDefault();
        setControlsHidden(!controlsHidden);
      }
    });
  }

  function observeLateInterfaces() {
    const observer = new MutationObserver((mutations) => {
      if (!mutations.some((mutation) => mutation.addedNodes.length > 0)) return;
      window.clearTimeout(discoveryTimer);
      discoveryTimer = window.setTimeout(discoverInterface, 80);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function activate() {
    if (initialized) return;
    initialized = true;
    addStyles();
    addToggle();
    discoverInterface();
    addKeyboardControls();
    observeLateInterfaces();
    setControlsHidden(storedPreference(), false);
  }

  function initialize() {
    if (document.querySelector("canvas, [data-art-only-artwork]")) {
      activate();
      return;
    }

    const bootstrapObserver = new MutationObserver(() => {
      if (!document.querySelector("canvas, [data-art-only-artwork]")) return;
      bootstrapObserver.disconnect();
      activate();
    });
    bootstrapObserver.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
