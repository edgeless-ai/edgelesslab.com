/**
 * Polymarket Flow Viz - Default Configuration
 * 
 * Autoresearcher pattern: Configuration as single source of truth
 * All visual and behavioral parameters defined here
 */

const CONFIG = {
  // === Core Engine ===
  engine: {
    seed: null,                    // null = random, or specify for reproducible
    frameRate: 60,
    colorMode: 'HSB',              // 'HSB' | 'RGB'
    colorRanges: {                 // For HSB mode
      h: 360,
      s: 100,
      b: 100,
      a: 100
    },
    renderer: 'P2D',               // 'P2D' | 'WEBGL'
    pixelDensity: 1,               // 1 for performance, 2 for retina
    disableFriendlyErrors: true
  },

  // === Data Source ===
  dataSource: {
    type: 'mock',                  // 'mock' | 'rest' | 'websocket' | 'composite'
    refreshInterval: 60000,        // ms between refreshes for REST
    mockDataSet: 'default',        // 'default' | 'stress-test' | 'minimal'
    api: {
      baseUrl: null,               // Set via env/proxy
      proxyUrl: null,              // Cloudflare worker endpoint
      timeout: 10000,
      retries: 3
    }
  },

  // === Market Rendering ===
  markets: {
    count: {                       // Auto-adjust if fewer available
      min: 3,
      max: 12,
      target: 6
    },
    size: {
      minRadius: 40,
      maxRadius: 200,
      scaleFactor: 'sqrt',         // 'linear' | 'sqrt' | 'log'
      volumeRange: [0, 15000000] // Volume range for size mapping
    },
    placement: {
      strategy: 'poisson-disk',    // 'random' | 'grid' | 'poisson-disk'
      minDistance: 100,            // Minimum distance between markets
      padding: 50,                 // Edge padding
      attempts: 100                // Max attempts for poisson-disk
    },
    visual: {
      pulseSpeed: 0.02,
      glowLayers: 3,
      glowSpread: 20,
      coreStrokeWeight: 2,
      showLabels: true,
      labelSize: 10,
      showMetrics: true,
      metricSize: 8
    }
  },

  // === Particle System (Fluid) ===
  particles: {
    count: 800,
    spawnStrategy: 'weighted',     // 'random' | 'weighted' | 'volume-proportional'
    size: {
      min: 2,
      max: 5
    },
    life: {
      min: 100,
      max: 255,
      decay: { min: 1, max: 3 }
    },
    flow: {
      speed: 0.8,
      noiseScale: 0.003,
      noiseOctaves: 4,
      attractionStrength: 0.3,
      damping: 0.98
    },
    visual: {
      opacity: 0.3,
      blendMode: 'normal'          // 'normal' | 'add' | 'screen'
    }
  },

  // === Trails ===
  trails: {
    enabled: true,
    fadeRate: 3,                   // Alpha per frame to fade
    particleSizeMultiplier: 0.5,   // Smaller particles on trail layer
    opacity: 15
  },

  // === Connections (Correlation) ===
  connections: {
    enabled: true,
    maxDistance: null,             // null = connect all, or pixel distance
    correlationStrategy: 'category', // 'category' | 'price' | 'volume' | 'manual'
    strength: {
      sameCategory: 0.5,
      relatedCategories: 0.3,      // e.g., crypto-finance
      default: 0.1
    },
    visual: {
      strokeWeight: 1,
      maxAlpha: 40
    }
  },

  // === Color System ===
  colors: {
    background: { h: 230, s: 30, b: 5 },  // Dark blue-black
    categories: {
      crypto:     { base: [60, 80, 90],  accent: [45, 95, 100] },   // Gold
      politics:   { base: [0, 70, 85],   accent: [340, 90, 95] },   // Red
      finance:    { base: [160, 60, 80], accent: [140, 80, 95] },  // Green
      sports:     { base: [200, 70, 85], accent: [220, 85, 100] },  // Blue
      tech:       { base: [280, 60, 85], accent: [300, 80, 100] },// Purple
      entertainment: { base: [30, 70, 85], accent: [20, 90, 95] },  // Orange
      science:    { base: [180, 60, 80], accent: [170, 80, 95] }, // Cyan
      other:      { base: [0, 0, 80],    accent: [0, 0, 100] }      // White/Gray
    },
    probabilityMapping: {
      lowPriceHueShift: -20,       // Shift toward cool
      highPriceHueShift: 20        // Shift toward warm
    }
  },

  // === Category Relationships ===
  categoryRelationships: [
    { from: 'crypto', to: 'finance', correlation: 0.3 },
    { from: 'finance', to: 'crypto', correlation: 0.3 },
    { from: 'tech', to: 'science', correlation: 0.2 },
    { from: 'politics', to: 'finance', correlation: 0.15 }
  ],

  // === Interaction ===
  interaction: {
    hover: {
      enabled: true,
      highlightScale: 1.2,
      showTooltip: true
    },
    click: {
      enabled: true,
      action: 'select'             // 'select' | 'focus' | 'detail'
    },
    keyboard: {
      saveKey: 's',
      regenerateKey: 'r',
      pauseKey: ' '
    }
  },

  // === Export ===
  export: {
    formats: ['png', 'gif'],
    defaultFilename: 'polymarket-flow-viz',
    quality: 1.0
  },

  // === Debug ===
  debug: {
    enabled: false,
    showFps: true,
    showParticleCount: false,
    showBounds: false,
    logLevel: 'warn'                // 'debug' | 'info' | 'warn' | 'error'
  }
};

// Configuration validation
CONFIG.validate = function() {
  const errors = [];
  
  if (this.markets.count.min > this.markets.count.max) {
    errors.push('markets.count.min cannot exceed max');
  }
  
  if (this.particles.count < 10) {
    errors.push('particles.count should be at least 10');
  }
  
  if (errors.length > 0) {
    console.error('Configuration errors:', errors);
    throw new Error('Invalid configuration: ' + errors.join(', '));
  }
  
  return true;
};

// Deep merge helper
CONFIG.merge = function(overrides) {
  const merge = (target, source) => {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = merge(target[key] || {}, source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  };
  
  merge(this, overrides);
  this.validate();
  return this;
};

// Environment-specific overrides
CONFIG.loadEnvironment = function() {
  // Check for URL params
  const params = new URLSearchParams(window.location.search);
  
  if (params.has('seed')) {
    this.engine.seed = parseInt(params.get('seed'));
  }
  
  if (params.has('mode')) {
    const mode = params.get('mode');
    if (mode === 'demo') {
      this.markets.visual.showLabels = false;
      this.markets.visual.showMetrics = false;
      this.interaction.hover.enabled = false;
    } else if (mode === 'workstation') {
      this.markets.visual.showLabels = true;
      this.markets.visual.showMetrics = true;
      this.dataSource.type = 'rest';
    }
  }
  
  if (params.has('debug')) {
    this.debug.enabled = params.get('debug') === 'true';
  }
  
  this.validate();
  return this;
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
