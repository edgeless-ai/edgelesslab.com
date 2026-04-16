/**
 * Polymarket Flow Viz - Orchestrator
 * 
 * Autoresearcher pattern: Dependency injection container
 * Wires together all plugins, adapters, and manages lifecycle
 */

class Orchestrator {
  constructor() {
    this.config = null;
    this.plugins = new PluginManager(Events);
    this.dataSource = null;
    this.engine = null;
    
    this.state = 'idle';          // 'idle' | 'initializing' | 'running' | 'paused' | 'error'
    this.lastError = null;
    
    this.p5Instance = null;
    this.initialized = false;
  }

  async initialize(userConfig = {}) {
    this.state = 'initializing';
    
    try {
      // Load config only if setup() hasn't already (the p5 path pre-loads
      // so URL params and the seeded aesthetic variation land before any
      // data source or plugin reads the config).
      if (!this.config) {
        this.config = this.loadConfig(userConfig);
      } else if (userConfig && Object.keys(userConfig).length) {
        this.deepMerge(this.config, userConfig);
      }
      
      // Initialize event bus
      const context = {
        events: Events,
        config: this.config,
        orchestrator: this
      };
      
      // Initialize data source
      this.dataSource = DataSourceFactory.create(this.config.dataSource);
      this.dataSource.eventBus = Events;
      await this.dataSource.init(this.config.dataSource, context);
      
      // Add data source to context
      context.dataSource = this.dataSource;
      
      // Initialize core engine plugin
      this.engine = new FluidEngine();
      this.plugins.register(this.engine);
      await this.plugins.enable('fluid-engine', this.config, context);
      
      // Start data refresh
      if (this.config.dataSource.refreshInterval > 0) {
        this.dataSource.startAutoRefresh(this.config.dataSource.refreshInterval);
      }
      
      // Initial data load
      await this.dataSource.refresh();
      
      this.state = 'running';
      this.initialized = true;
      
      Events.emit('ENGINE_INIT', { 
        config: this.config,
        plugins: this.plugins.listPlugins(),
        dataSource: this.dataSource.name
      });
      
      console.log('Orchestrator initialized:', this.getStatus());
      return true;
      
    } catch (err) {
      this.state = 'error';
      this.lastError = err.message;
      console.error('Orchestrator initialization failed:', err);
      Events.emit('ENGINE_INIT', { error: err.message });
      throw err;
    }
  }

  loadConfig(userConfig) {
    // Deep clone default config (functions are lost by JSON round-trip;
    // re-attach the couple we need below).
    const config = JSON.parse(JSON.stringify(CONFIG));
    config.validate = CONFIG.validate;
    config.merge = CONFIG.merge;
    config.loadEnvironment = CONFIG.loadEnvironment;

    // Apply user overrides
    if (userConfig) {
      this.deepMerge(config, userConfig);
    }

    // Load environment (URL params)
    if (typeof window !== 'undefined') {
      config.loadEnvironment();
    }

    // Validate
    config.validate();

    // Resolve seed: explicit ?seed=X is reproducible, otherwise fresh every
    // page load. This is what drives per-refresh variation.
    if (config.engine.seed === null || config.engine.seed === undefined) {
      config.engine.seed = Math.floor(Math.random() * 999999);
    }

    // Randomise palette and flow feel from the seed, unless the caller
    // opted out via ?preset=default.
    const params = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
    const preset = params?.get('preset');
    if (preset !== 'default' && typeof applyAestheticVariation === 'function') {
      const rng = makeRng(config.engine.seed);
      applyAestheticVariation(config, rng);
      config._rng = rng;
    }

    return config;
  }

  deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  // P5.js integration hooks
  setup(p5Instance) {
    this.p5Instance = p5Instance;
    
    if (!this.config) {
      // Called directly from p5, need to load config first
      const urlParams = new URLSearchParams(window.location.search);
      const seedParam = urlParams.get('seed');

      // Only override dataSource.type if explicitly set via URL param —
      // otherwise preserve whatever the demo page set on CONFIG
      const overrides = {
        engine: {
          seed: seedParam ? parseInt(seedParam) : null
        }
      };
      const sourceParam = urlParams.get('source');
      if (sourceParam) {
        overrides.dataSource = { type: sourceParam };
      }
      // Actually assign — without this, later initialize() re-loads config
      // from scratch and loses the URL overrides.
      this.config = this.loadConfig(overrides);
    }
    
    const c = this.config.engine;
    
    // Apply p5 settings
    if (c.disableFriendlyErrors && typeof p5 !== 'undefined') {
      p5.disableFriendlyErrors = true;
    }
    
    // Set seed
    randomSeed(c.seed);
    noiseSeed(c.seed);
    
    // Create canvas
    const renderer = c.renderer === 'WEBGL' ? WEBGL : P2D;
    createCanvas(windowWidth, windowHeight, renderer);
    
    // Set color mode
    colorMode(c.colorMode, c.colorRanges.h, c.colorRanges.s, c.colorRanges.b, c.colorRanges.a);
    
    // Set pixel density
    pixelDensity(c.pixelDensity);
    
    // Emit resize event
    Events.emit('ENGINE_RESIZE', { width, height });
    
    // Trigger init (async, fire and forget)
    this.initialize().catch(err => {
      console.error('Auto-initialization failed:', err);
    });
  }

  draw() {
    if (this.state !== 'running') return;
    
    const now = millis();
    const deltaTime = now - (this.lastFrameTime || now - 16);
    this.lastFrameTime = now;
    
    // Update plugins
    this.plugins.update(deltaTime, now);
    
    // Render layers
    this.plugins.render('background');
    this.plugins.render('trails');
    this.plugins.render('particles');
    this.plugins.render('markets');
    this.plugins.render('overlay');
    this.plugins.render('ui');
    
    Events.emit('ENGINE_TICK', { deltaTime, elapsed: now });
  }

  handleResize() {
    resizeCanvas(windowWidth, windowHeight);
    Events.emit('ENGINE_RESIZE', { width, height });
  }

  handleKeyPress(key) {
    const cfg = this.config.interaction.keyboard;
    
    if (key === cfg.saveKey) {
      this.saveCanvas();
    } else if (key === cfg.regenerateKey) {
      this.regenerate();
    } else if (key === cfg.pauseKey) {
      this.togglePause();
    }
    
    Events.emit('KEY_PRESS', { key });
  }

  handleMouseMove(x, y) {
    if (this.engine) {
      const market = this.engine.getMarketAt(x, y);
      
      if (market) {
        Events.emit('MARKET_HOVER', { market, x, y });
      } else {
        Events.emit('MARKET_LEAVE', { x, y });
      }
    }
    
    Events.emit('MOUSE_MOVE', { x, y });
  }

  handleMouseClick(x, y) {
    if (this.engine) {
      const market = this.engine.getMarketAt(x, y);
      
      if (market) {
        Events.emit('MARKET_CLICK', { market, x, y });
        Events.emit('MARKET_SELECTED', { market });
      }
    }
    
    Events.emit('MOUSE_CLICK', { x, y });
  }

  // Actions
  saveCanvas() {
    const filename = `${this.config.export.defaultFilename}-${this.config.engine.seed}`;
    
    Events.emit('EXPORT_START', { format: 'png', filename });
    saveCanvas(filename, 'png');
    Events.emit('EXPORT_COMPLETE', { format: 'png', filename });
  }

  regenerate() {
    const seed = Math.floor(Math.random() * 999999);
    this.config.engine.seed = seed;

    // Re-seed p5 so placement / particle spawns are reproducible for this seed.
    if (typeof randomSeed === 'function') randomSeed(seed);
    if (typeof noiseSeed === 'function') noiseSeed(seed);

    // Same aesthetic randomizer used at init — one code path, one source of truth.
    const rng = makeRng(seed);
    applyAestheticVariation(this.config, rng);
    this.config._rng = rng;

    // Propagate config changes to the engine and its entities
    if (this.engine) {
      this.engine.config = this.config;
      if (this.engine.markets) {
        this.engine.markets.forEach(m => { m.config = this.config; });
      }
      this.engine.regenerate();
    }

    Events.emit('ENGINE_REGENERATE', { seed });
  }

  togglePause() {
    if (this.state === 'running') {
      this.state = 'paused';
      noLoop();
    } else if (this.state === 'paused') {
      this.state = 'running';
      loop();
    }
    
    Events.emit('ENGINE_PAUSE', { state: this.state });
  }

  switchDataSource(type, options = {}) {
    // Stop current
    if (this.dataSource) {
      this.dataSource.stopAutoRefresh();
    }
    
    // Update config
    this.config.dataSource.type = type;
    Object.assign(this.config.dataSource, options);
    
    // Create new
    const context = {
      events: Events,
      config: this.config,
      orchestrator: this,
      dataSource: null
    };
    
    this.dataSource = DataSourceFactory.create(this.config.dataSource);
    this.dataSource.eventBus = Events;
    this.dataSource.init(this.config.dataSource, context);
    
    context.dataSource = this.dataSource;
    
    // Restart
    if (this.config.dataSource.refreshInterval > 0) {
      this.dataSource.startAutoRefresh(this.config.dataSource.refreshInterval);
    }
    
    this.dataSource.refresh();
    
    Events.emit('DATA_SOURCE_SWITCH', { type, options });
  }

  async destroy() {
    this.state = 'idle';
    
    if (this.dataSource) {
      await this.dataSource.destroy();
      this.dataSource = null;
    }
    
    // Disable all plugins
    for (const plugin of this.plugins.getEnabledPlugins()) {
      await this.plugins.disable(plugin.name);
    }
    
    this.initialized = false;
    Events.emit('ENGINE_STOP', {});
  }

  // Status
  getStatus() {
    return {
      state: this.state,
      initialized: this.initialized,
      config: {
        seed: this.config?.engine.seed,
        dataSource: this.config?.dataSource.type,
        particleCount: this.config?.particles.count
      },
      plugins: this.plugins.listPlugins(),
      markets: this.engine?.markets.length || 0,
      particles: this.engine?.particles.length || 0,
      dataSource: {
        type: this.dataSource?.name,
        status: this.dataSource?.status,
        lastUpdate: this.dataSource?.lastUpdate
      }
    };
  }

  // Configuration updates
  updateConfig(path, value) {
    const keys = path.split('.');
    let target = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      target = target[keys[i]];
    }
    
    target[keys[keys.length - 1]] = value;
    
    Events.emit('CONFIG_CHANGED', { path, value });
    
    // Some changes require reinitialization
    if (path.startsWith('engine.') || path.startsWith('dataSource.')) {
      console.warn('Config change requires reinitialization:', path);
    }
  }

  getConfig(path = null) {
    if (!path) return this.config;
    
    const keys = path.split('.');
    let target = this.config;
    
    for (const key of keys) {
      if (target[key] === undefined) return undefined;
      target = target[key];
    }
    
    return target;
  }
}

// Singleton
const orchestrator = new Orchestrator();

// P5.js sketch wrapper function
function createPolymarketViz(userConfig = {}) {
  return function(p) {
    p.setup = function() {
      orchestrator.setup(p);
    };
    
    p.draw = function() {
      orchestrator.draw();
    };
    
    p.windowResized = function() {
      orchestrator.handleResize();
    };
    
    p.keyPressed = function() {
      orchestrator.handleKeyPress(p.key);
    };
    
    p.mouseMoved = function() {
      orchestrator.handleMouseMove(p.mouseX, p.mouseY);
    };
    
    p.mouseClicked = function() {
      orchestrator.handleMouseClick(p.mouseX, p.mouseY);
    };
  };
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Orchestrator, orchestrator, createPolymarketViz };
}
