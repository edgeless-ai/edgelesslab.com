/**
 * Polymarket Flow Viz - Fluid Engine
 * 
 * Core simulation engine: markets, particles, flow field
 * Manages all visual entities and their interactions
 */

class FluidEngine extends Plugin {
  constructor() {
    super('fluid-engine', '1.0.0');
    this.priority = -10;           // Run early (negative = high priority)
    
    // Entities
    this.markets = [];
    this.particles = [];
    this.connections = [];
    
    // State
    this.trailLayer = null;
    this.time = 0;
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.deltaTime = 0;
    
    // Spatial indexing for optimization
    this.spatialGrid = null;
    this.gridSize = 100;
  }

  async init(config, context) {
    await super.init(config, context);
    
    // Initialize p5.js if available
    if (typeof createGraphics === 'function') {
      this.initGraphics();
    }
    
    // Subscribe to data updates
    this.context.events.on('DATA_UPDATED', (data) => {
      this.onDataUpdated(data);
    });
    
    // Subscribe to resize
    this.context.events.on('ENGINE_RESIZE', () => {
      this.onResize();
    });
    
    return true;
  }

  initGraphics() {
    const c = this.config;
    // p5.Graphics.colorMode requires the p5 constant, not a string
    const mode = { hsb: HSB, hsl: HSL, rgb: RGB }[c.engine.colorMode.toLowerCase()] || RGB;
    const ranges = c.engine.colorRanges;

    // Create trail layer
    if (c.trails.enabled) {
      this.trailLayer = createGraphics(width, height);
      this.trailLayer.colorMode(mode, ranges.h, ranges.s, ranges.b, ranges.a);
      this.applyBackground(this.trailLayer);
    }

    // Set main canvas color mode
    colorMode(mode, ranges.h, ranges.s, ranges.b, ranges.a);
  }

  onDataUpdated(data) {
    this.updateMarkets(data.markets);
  }

  updateMarkets(marketData) {
    const c = this.config.markets;
    
    // Limit market count
    const targetCount = Math.min(
      marketData.length,
      Math.max(c.count.min, Math.min(c.count.max, c.count.target))
    );
    
    const selectedMarkets = marketData.slice(0, targetCount);
    
    // Place markets
    this.placeMarkets(selectedMarkets);
    
    // Initialize connections
    this.computeConnections();
    
    // Reinitialize particles with new market configuration
    this.initParticles();
  }

  placeMarkets(marketData) {
    const cfg = this.config.markets.placement;
    const canvasWidth = width || window.innerWidth;
    const canvasHeight = height || window.innerHeight;
    
    this.markets = [];
    
    // Compute target sizes first
    const marketSizes = marketData.map(m => this.computeMarketSize(m));
    
    if (cfg.strategy === 'poisson-disk') {
      this.poissonDiskPlacement(marketData, marketSizes, canvasWidth, canvasHeight, cfg);
    } else if (cfg.strategy === 'grid') {
      this.gridPlacement(marketData, marketSizes, canvasWidth, canvasHeight);
    } else {
      this.randomPlacement(marketData, marketSizes, canvasWidth, canvasHeight, cfg);
    }
  }

  computeMarketSize(marketData) {
    const cfg = this.config.markets.size;
    const volume = marketData.volume24h || 0;
    
    // Normalize volume to 0-1 range
    const normalized = this.normalizeValue(volume, cfg.volumeRange[0], cfg.volumeRange[1]);
    
    // Apply scaling function
    let scaled;
    switch (cfg.scaleFactor) {
      case 'sqrt':
        scaled = Math.sqrt(normalized);
        break;
      case 'log':
        scaled = Math.log10(1 + normalized * 9) / Math.log10(10);
        break;
      case 'linear':
      default:
        scaled = normalized;
    }
    
    const radius = cfg.minRadius + scaled * (cfg.maxRadius - cfg.minRadius);
    
    return {
      ...marketData,
      radius,
      x: 0,
      y: 0
    };
  }

  normalizeValue(value, min, max) {
    if (max <= min) return 0.5;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  poissonDiskPlacement(marketData, marketSizes, canvasWidth, canvasHeight, cfg) {
    const placed = [];
    
    for (let i = 0; i < marketData.length; i++) {
      let attempts = 0;
      let x, y;
      let market = marketSizes[i];
      const minDist = market.radius + cfg.minDistance;
      
      do {
        x = cfg.padding + market.radius + Math.random() * (canvasWidth - cfg.padding * 2 - market.radius * 2);
        y = cfg.padding + market.radius + Math.random() * (canvasHeight - cfg.padding * 2 - market.radius * 2);
        attempts++;
      } while (
        attempts < cfg.attempts &&
        placed.some(p => {
          const dx = x - p.x;
          const dy = y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          return dist < minDist + p.radius;
        })
      );
      
      market = new Market(market, x, y, this.config, this.context.events);
      this.markets.push(market);
      placed.push({ x, y, radius: market.radius });
    }
  }

  gridPlacement(marketData, marketSizes, canvasWidth, canvasHeight) {
    const cols = Math.ceil(Math.sqrt(marketData.length));
    const rows = Math.ceil(marketData.length / cols);
    const cellW = canvasWidth / cols;
    const cellH = canvasHeight / rows;
    
    for (let i = 0; i < marketData.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = cellW * col + cellW / 2;
      const y = cellH * row + cellH / 2;
      
      this.markets.push(new Market(marketSizes[i], x, y, this.config, this.context.events));
    }
  }

  randomPlacement(marketData, marketSizes, canvasWidth, canvasHeight, cfg) {
    for (let i = 0; i < marketData.length; i++) {
      const radius = marketSizes[i].radius;
      const x = cfg.padding + radius + Math.random() * (canvasWidth - cfg.padding * 2 - radius * 2);
      const y = cfg.padding + radius + Math.random() * (canvasHeight - cfg.padding * 2 - radius * 2);
      
      this.markets.push(new Market(marketSizes[i], x, y, this.config, this.context.events));
    }
  }

  computeConnections() {
    const cfg = this.config.connections;
    if (!cfg.enabled) return;
    
    this.connections = [];
    
    for (let i = 0; i < this.markets.length; i++) {
      for (let j = i + 1; j < this.markets.length; j++) {
        const m1 = this.markets[i];
        const m2 = this.markets[j];
        
        const dx = m1.x - m2.x;
        const dy = m1.y - m2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (cfg.maxDistance && dist > cfg.maxDistance) continue;
        
        const strength = this.computeCorrelation(m1, m2, cfg);
        
        if (strength > 0) {
          this.connections.push({ m1, m2, strength, distance: dist });
        }
      }
    }
  }

  computeCorrelation(m1, m2, cfg) {
    if (cfg.correlationStrategy === 'category') {
      if (m1.category === m2.category) {
        return cfg.strength.sameCategory;
      }
      
      // Check category relationships
      const rel = this.config.categoryRelationships.find(
        r => (r.from === m1.category && r.to === m2.category) ||
             (r.from === m2.category && r.to === m1.category)
      );
      
      if (rel) return rel.correlation;
      
      return cfg.strength.default;
    }
    
    // Other strategies could use price correlation, volume similarity, etc.
    return cfg.strength.default;
  }

  initParticles() {
    const cfg = this.config.particles;
    this.particles = [];
    
    // Pre-allocate particle pool for performance
    for (let i = 0; i < cfg.count; i++) {
      this.particles.push(new Particle(this.markets, this.config, this.context.events));
    }
  }

  onResize() {
    // Reinitialize graphics
    if (this.trailLayer) {
      this.trailLayer = createGraphics(width, height);
      this.trailLayer.colorMode(
        this.config.engine.colorMode,
        this.config.engine.colorRanges.h,
        this.config.engine.colorRanges.s,
        this.config.engine.colorRanges.b,
        this.config.engine.colorRanges.a
      );
      this.applyBackground(this.trailLayer);
    }
    
    // Re-place markets
    if (this.markets.length > 0 && this.context.dataSource) {
      const markets = this.context.dataSource.getMarkets();
      if (markets.length > 0) {
        this.updateMarkets(markets);
      }
    }
  }

  update(deltaTime, elapsedTime) {
    this.deltaTime = deltaTime;
    this.time = elapsedTime;
    this.frameCount++;
    
    // Update markets
    for (const market of this.markets) {
      market.update(deltaTime, elapsedTime);
    }
    
    // Update particles
    for (const particle of this.particles) {
      particle.update(deltaTime, elapsedTime, this.markets, this.time);
    }
  }

  render(layer) {
    switch (layer) {
      case 'background':
        this.renderBackground();
        break;
      case 'trails':
        this.renderTrails();
        break;
      case 'particles':
        this.renderParticles();
        break;
      case 'markets':
        this.renderMarkets();
        break;
      case 'overlay':
        this.renderConnections();
        break;
    }
  }

  renderBackground() {
    const c = this.config.colors.background;
    background(c.h, c.s, c.b);
  }

  applyBackground(graphics) {
    const c = this.config.colors.background;
    graphics.background(c.h, c.s, c.b);
  }

  renderTrails() {
    if (!this.trailLayer || !this.config.trails.enabled) return;
    
    const cfg = this.config.trails;
    
    // Fade trail layer
    this.trailLayer.noStroke();
    const c = this.config.colors.background;
    this.trailLayer.fill(c.h, c.s, c.b, cfg.fadeRate);
    this.trailLayer.rect(0, 0, width, height);
    
    // Draw particle trails
    const sizeMult = cfg.particleSizeMultiplier;
    const opacity = cfg.opacity;
    
    for (const p of this.particles) {
      if (p.life > 0) {
        const sat = 70;
        const bri = map(p.life, 0, 255, 30, 100);
        this.trailLayer.fill(p.hue, sat, bri, opacity);
        this.trailLayer.noStroke();
        this.trailLayer.ellipse(p.x, p.y, p.size * sizeMult);
      }
    }
    
    image(this.trailLayer, 0, 0);
  }

  renderParticles() {
    const cfg = this.config.particles;
    
    for (const p of this.particles) {
      if (p.life > 0) {
        const sat = 70;
        const bri = map(p.life, 0, 255, 30, 100);
        fill(p.hue, sat, bri, cfg.visual.opacity * 100);
        noStroke();
        ellipse(p.x, p.y, p.size);
      }
    }
  }

  renderMarkets() {
    for (const market of this.markets) {
      market.render();
    }
  }

  renderConnections() {
    const cfg = this.config.connections;
    if (!cfg.enabled) return;
    
    strokeWeight(cfg.visual.strokeWeight);
    
    for (const conn of this.connections) {
      const alpha = conn.strength * cfg.visual.maxAlpha;
      stroke(0, 0, 100, alpha);
      line(conn.m1.x, conn.m1.y, conn.m2.x, conn.m2.y);
    }
  }

  // API for external interaction
  getMarketAt(x, y) {
    for (const market of this.markets) {
      if (market.contains(x, y)) {
        return market;
      }
    }
    return null;
  }

  regenerate() {
    if (this.context.dataSource) {
      const markets = this.context.dataSource.getMarkets();
      this.updateMarkets(markets);
    }
  }

  async destroy() {
    if (this.trailLayer) {
      this.trailLayer.remove();
      this.trailLayer = null;
    }
    this.markets = [];
    this.particles = [];
    this.connections = [];
    await super.destroy();
  }
}

// Market class (defined in separate file, inline here for standalone)
class Market {
  constructor(data, x, y, config, eventBus) {
    this.data = data;
    this.x = x;
    this.y = y;
    this.config = config;
    this.eventBus = eventBus;
    
    this.radius = data.radius || 60;
    this.category = data.category || 'other';
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.hovered = false;
    this.selected = false;
  }

  update(deltaTime, elapsedTime) {
    this.pulsePhase += this.config.markets.visual.pulseSpeed;
    
    // Hover state could be updated here if we had mouse position
  }

  render() {
    const cfg = this.config.markets.visual;
    const palette = this.config.colors.categories[this.category] || this.config.colors.categories.other;
    
    // Warmth based on yes price
    const warmth = this.data.yesPrice || 0.5;
    const h = this.lerp(palette.base[0], palette.accent[0], warmth);
    const s = this.lerp(palette.base[1], palette.accent[1], warmth);
    const b = this.lerp(palette.base[2], palette.accent[2], warmth);
    
    // Glow
    for (let i = cfg.glowLayers; i > 0; i--) {
      const alpha = 30 - i * 8;
      fill(h, s, b, alpha);
      noStroke();
      ellipse(this.x, this.y, this.radius * 2 + i * cfg.glowSpread + Math.sin(this.pulsePhase) * 5);
    }
    
    // Core
    fill(h, s, b, 90);
    stroke(h, s, 20, 100);
    strokeWeight(cfg.coreStrokeWeight);
    ellipse(this.x, this.y, this.radius * 2);
    
    // Volume indicator arc
    const volHeight = (this.data.activityScore || 0.5) * (this.radius - 10);
    fill(h, s, 100, 60);
    noStroke();
    arc(this.x, this.y, this.radius * 1.6, this.radius * 1.6, Math.PI, Math.PI + Math.PI * 0.5);
    
    // Labels
    if (cfg.showLabels) {
      fill(0, 0, 100, 80);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(cfg.labelSize);
      const shortName = this.data.question?.substring(0, 20) + '...' || 'Unknown';
      text(shortName, this.x, this.y - this.radius - 15);
    }
    
    if (cfg.showMetrics) {
      textSize(cfg.metricSize);
      fill(0, 0, 100, 60);
      const price = Math.round((this.data.yesPrice || 0.5) * 100);
      const vol = ((this.data.volume24h || 0) / 1000000).toFixed(1);
      text(`${price}% | $${vol}M`, this.x, this.y + this.radius + 15);
    }
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  contains(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.radius;
  }
}

// Particle class
class Particle {
  constructor(markets, config, eventBus) {
    this.markets = markets;
    this.config = config;
    this.eventBus = eventBus;
    this.reset();
  }

  reset() {
    if (this.markets.length === 0) return;
    
    // Spawn at random market
    const market = this.markets[Math.floor(Math.random() * this.markets.length)];
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * market.radius * 0.8;
    
    this.x = market.x + Math.cos(angle) * r;
    this.y = market.y + Math.sin(angle) * r;
    this.origin = market;
    this.target = null;
    
    this.vx = 0;
    this.vy = 0;
    
    const cfg = this.config.particles.life;
    this.life = cfg.min + Math.random() * (cfg.max - cfg.min);
    this.decay = cfg.decay.min + Math.random() * (cfg.decay.max - cfg.decay.min);
    
    const sizeCfg = this.config.particles.size;
    this.size = sizeCfg.min + Math.random() * (sizeCfg.max - sizeCfg.min);
    
    // Color based on origin
    const palette = this.config.colors.categories[market.category] || this.config.colors.categories.other;
    this.hue = Math.random() > 0.5 ? palette.base[0] : palette.accent[0];
    
    this.eventBus?.emit('PARTICLE_SPAWN', { particle: this, origin: market });
  }

  update(deltaTime, elapsedTime, markets, noiseTime) {
    if (!this.target || Math.random() < 0.01) {
      this.findTarget(markets);
    }

    // Attraction to target
    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        const cfg = this.config.particles.flow;
        this.vx += (dx / dist) * cfg.attractionStrength;
        this.vy += (dy / dist) * cfg.attractionStrength;
      }
    }
    
    // Noise flow field
    const cfg = this.config.particles.flow;
    const noiseVal = noise(this.x * cfg.noiseScale, this.y * cfg.noiseScale, noiseTime * 0.0001);
    const angle = noiseVal * Math.PI * 4;
    this.vx += Math.cos(angle) * 0.1;
    this.vy += Math.sin(angle) * 0.1;
    
    // Damping
    this.vx *= cfg.damping;
    this.vy *= cfg.damping;
    
    // Update position
    this.x += this.vx * cfg.speed;
    this.y += this.vy * cfg.speed;
    
    // Life
    this.life -= this.decay;
    
    // Reset conditions
    if (this.life <= 0 || 
        (this.target && this.distanceTo(this.target) < this.target.radius) ||
        this.isOutOfBounds()) {
      this.eventBus?.emit('PARTICLE_RESET', { particle: this });
      this.reset();
    }
  }

  findTarget(markets) {
    let nearest = null;
    let minDist = Infinity;
    
    for (const m of markets) {
      if (m !== this.origin) {
        const d = this.distanceTo(m);
        if (d < minDist) {
          minDist = d;
          nearest = m;
        }
      }
    }
    
    this.target = nearest;
  }

  distanceTo(target) {
    const dx = this.x - target.x;
    const dy = this.y - target.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  isOutOfBounds() {
    return this.x < 0 || this.x > width || this.y < 0 || this.y > height;
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FluidEngine, Market, Particle };
}
