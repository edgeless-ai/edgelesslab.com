# Polymarket Flow Viz - Modular Engine Architecture

**Autoresearcher Pattern Implementation:** Plugin-based, event-driven, configuration-driven architecture.

## Directory Structure

```
shared-engine/
├── config/
│   └── default.js              # Single source of truth for all params
├── core/
│   ├── event-bus.js            # Pub/sub for loose coupling
│   ├── plugin.js               # Base class + plugin manager
│   ├── fluid-engine.js         # Core simulation (markets, particles)
│   └── orchestrator.js         # Dependency injection container
├── adapters/
│   └── data-source.js          # Data source abstraction (mock/rest/websocket)
└── plugins/                    # Future: visual effects, interactions, etc.
```

## Core Principles

### 1. Configuration as Source of Truth

All visual and behavioral parameters live in `config/default.js`.

**Benefits:**
- Reproducible visualizations (same config = same output)
- Runtime switching without code changes
- Environment-specific overrides (URL params, env vars)
- Validation on load

**Key config sections:**
- `engine` -- seed, color mode, renderer, frame rate
- `dataSource` -- type, refresh interval, API settings
- `markets` -- count, size scaling, placement strategy
- `particles` -- count, flow parameters, life cycle
- `colors` -- palettes, category mapping, warmth
- `connections` -- correlation visualization

### 2. Event-Driven Architecture

`event-bus.js` provides pub/sub for all component communication.

**Why:**
- Components don't know about each other
- Easy to add new features (just subscribe to events)
- Debugging via event history
- Time-travel possible (replay events)

**Event types:**
```javascript
ENGINE_INIT, ENGINE_TICK, ENGINE_RESIZE
DATA_LOADING, DATA_LOADED, DATA_ERROR, DATA_UPDATED
MARKET_HOVER, MARKET_CLICK, MARKET_SELECTED
PARTICLE_SPAWN, PARTICLE_RESET, PARTICLE_FLOW
KEY_PRESS, MOUSE_MOVE, MOUSE_CLICK
CONFIG_CHANGED, DATA_SOURCE_SWITCH
```

### 3. Plugin System

`plugin.js` provides lifecycle management.

**Base Plugin class:**
- `init(config, context)` -- setup
- `update(deltaTime, elapsedTime)` -- per-frame
- `render(layer)` -- draw to specific layer
- `destroy()` -- cleanup
- `onEvent(type, data)` -- handle events

**Plugin Manager:**
- Handles dependencies
- Priority-based execution order
- Hot enable/disable

**Current plugins:**
- `FluidEngine` -- markets, particles, flow field (priority -10)

**Future plugins:**
- `AudioReactive` -- WebAudio FFT input
- `TooltipOverlay` -- market info on hover
- `TradingBridge` -- trading bot position overlay
- `Recording` -- automated frame capture

### 4. Adapter Pattern for Data Sources

`data-source.js` abstracts all data sources behind single interface.

**Interface:**
- `fetch()` -- get raw data
- `normalize(data)` -- convert to standard format
- `refresh()` -- public method, emits events
- `startAutoRefresh(interval)` / `stopAutoRefresh()`

**Implementations:**
- `MockDataSource` -- static JSON with random variation
- `RestDataSource` -- Polymarket CLOB API (with proxy)
- Future: `WebSocketDataSource` -- real-time

**Data format:**
```javascript
{
  id: string,
  question: string,
  volume24h: number,
  liquidity: number,
  yesPrice: number,
  noPrice: number,
  category: string,
  resolutionTime: Date,
  numTraders: number,
  trades24h: number,
  flowRate: number,       // computed: trades per second
  activityScore: number   // computed: 0-1 activity level
}
```

### 5. Orchestrator as DI Container

`orchestrator.js` wires everything together.

**Responsibilities:**
- Configuration loading and merging
- Plugin registration and initialization
- Data source lifecycle
- P5.js integration hooks
- Action methods (save, regenerate, pause)
- Status aggregation

**P5.js integration:**
```javascript
// Sketch file
define orchestrator globally

function setup() {
  orchestrator.setup(this);
}

function draw() {
  orchestrator.draw();
}
```

**Non-P5.js usage:**
```javascript
const { Orchestrator } = require('./core/orchestrator');
const orchestrator = new Orchestrator();
await orchestrator.initialize({
  dataSource: { type: 'rest', api: { proxyUrl: '...' } }
});
// Use without p5 for headless rendering, tests, etc.
```

## Layered Rendering

Render passes in order:

1. **background** -- clear canvas, solid color
2. **trails** -- offscreen graphics buffer, fading history
3. **particles** -- active particle dots
4. **markets** -- blobs, labels, metrics
5. **overlay** -- connections, highlights
6. **ui** -- tooltips, controls, debug info

Each layer can have multiple plugins contributing.

## Configuration Overrides

Priority (low to high):

1. `config/default.js` -- base values
2. User config object passed to `initialize()`
3. URL parameters (seed, source, etc)
4. Runtime changes via `updateConfig()`

**URL parameters:**
- `?seed=123` -- reproducible layout
- `?source=rest` -- switch data source
- `?dataset=stress-test` -- mock data variant
- `?particles=1600` -- particle count
- `?mode=demo` -- minimal UI labels
- `?debug=true` -- show debug panel

## Using Prototype V2

Open `shared-engine/prototype-v2.html` in browser via local server.

**Key bindings:**
- `s` -- save PNG
- `r` -- regenerate with new seed
- `space` -- pause/resume
- `d` -- toggle debug panel
- `1/2/3` -- switch mock dataset

**Debug panel shows:**
- Current state
- Plugin list
- Market/particle counts
- Data source status
- Full config object

## Extending the Engine

### Add a new plugin:

```javascript
// plugins/audio-reactive.js
class AudioReactivePlugin extends Plugin {
  constructor() {
    super('audio-reactive', '1.0.0');
    this.dependencies = ['fluid-engine'];
    this.priority = 10;
  }

  async init(config, context) {
    await super.init(config, context);
    // Setup WebAudio
    this.analyser = new (window.AudioContext || window.webkitAudioContext)();
    return true;
  }

  update(deltaTime, elapsedTime) {
    // Analyze audio, emit events
    const fft = this.getFFT();
    this.context.events.emit('AUDIO_PEAK', { frequency: fft });
  }
}

// Register
orchestrator.plugins.register(new AudioReactivePlugin());
orchestrator.plugins.enable('audio-reactive');
```

### Add new data source:

```javascript
// adapters/trading-source.js
class TradingDataSource extends DataSourceAdapter {
  constructor(wsUrl) {
    super('trading-websocket');
    this.wsUrl = wsUrl;
  }

  async fetch() {
    // Connect to Trading bot WebSocket
    // Return positions as market-like data
  }

  normalizeMarket(raw) {
    // Convert position to visualization format
    return {
      id: raw.marketId,
      question: raw.marketName,
      volume24h: raw.positionSize,
      yesPrice: raw.entryPrice,
      category: 'position',
      // ...
    };
  }
}
```

### Add custom placement strategy:

```javascript
// In fluid-engine.js placement logic
spiralPlacement(marketData, marketSizes, canvasWidth, canvasHeight) {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const spacing = 150;
  
  for (let i = 0; i < marketData.length; i++) {
    const angle = i * 0.5; // Golden angle-ish
    const radius = Math.sqrt(i + 1) * spacing;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    this.markets.push(new Market(marketSizes[i], x, y, this.config));
  }
}
```

Then add to config:
```javascript
markets.placement.strategy = 'spiral';
```

## Performance Considerations

1. **Particle count** -- config.particles.count, default 800
2. **Pixel density** -- config.engine.pixelDensity, use 1 for performance
3. **Trail fade** -- config.trails.fadeRate, higher = faster clear = less GPU
4. **Market limit** -- config.markets.count.max, default 12
5. **Disable FES** -- p5.disableFriendlyErrors = true (always)

**Benchmarks:**
- 800 particles @ 60fps on modern laptop
- 1600 particles @ 30fps acceptable
- 12 markets with glow layers @ 60fps

## Testing

Unit test structure (not yet implemented):

```javascript
// tests/data-source.test.js
const { MockDataSource } = require('../adapters/data-source');

test('MockDataSource generates valid markets', async () => {
  const source = new MockDataSource('default');
  await source.init({}, { events: { emit: () => {} } });
  const data = await source.fetch();
  
  expect(data.markets).toHaveLength(6);
  expect(data.markets[0]).toHaveProperty('id');
  expect(data.markets[0]).toHaveProperty('yesPrice');
});
```

## Roadmap

1. **Now** -- Core engine complete, mock data working
2. **Next** -- Cloudflare proxy for CORS, test REST source
3. **Then** -- Public demo page (no UI, just viz)
4. **Then** -- Trader workstation (detail panels, controls)
5. **Then** -- Trading integration (position overlay, alerts)
6. **Then** -- WebSocket real-time (if API available)
