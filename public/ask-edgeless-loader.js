// No bundle, DOM inspection or inference request unless the deploy-time flag is ON.
(async () => {
  try {
    // Preview-only even if a production config is accidentally enabled.
    if (!location.hostname.endsWith('.workers.dev') && !['localhost','127.0.0.1'].includes(location.hostname)) return;
    const shop = document.documentElement.dataset.askEdgelessSurface === 'shop';
    const supported = shop ? location.pathname === '/' : /^\/(blog|field-notes|lab|creative-demos)(\/|$)/.test(location.pathname);
    if (!supported) return;
    const config = await fetch('/ask-edgeless-config.json', {cache:'no-store', credentials:'omit'}).then(r => r.ok ? r.json() : null);
    if (config?.enabled !== true) return;
    const script = document.createElement('script');
    script.src = '/ask-edgeless.js'; script.type = 'module';
    window.__ASK_EDGELESS_CONFIG__ = config;
    document.head.append(script);
  } catch { /* Fail closed: the regular site remains usable. */ }
})();
