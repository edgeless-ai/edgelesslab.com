/**
 * Polymarket Flow Viz - Data Source Adapter
 * 
 * Autoresearcher pattern: Adapter pattern for data source abstraction
 * Swap between mock, REST, WebSocket without changing visualization
 */

class DataSourceAdapter extends Plugin {
  constructor(name) {
    super(name, '1.0.0');
    this.data = null;
    this.lastUpdate = null;
    this.status = 'idle';       // 'idle' | 'loading' | 'ready' | 'error'
    this.error = null;
    this.refreshTimer = null;
  }

  // Override in subclasses
  async fetch() {
    throw new Error('fetch() must be implemented by subclass');
  }

  async refresh() {
    if (this.status === 'loading') return;
    
    this.status = 'loading';
    this.error = null;
    this.eventBus?.emit('DATA_LOADING', { source: this.name });
    
    try {
      const data = await this.fetch();
      this.data = this.normalize(data);
      this.lastUpdate = Date.now();
      this.status = 'ready';
      
      this.eventBus?.emit('DATA_LOADED', { 
        source: this.name,
        markets: this.data.markets.length,
        timestamp: this.lastUpdate
      });
      
      this.eventBus?.emit('DATA_UPDATED', this.data);
      
      return this.data;
    } catch (err) {
      this.status = 'error';
      this.error = err.message;
      
      this.eventBus?.emit('DATA_ERROR', { 
        source: this.name,
        error: err.message 
      });
      
      throw err;
    }
  }

  normalize(rawData) {
    // Default normalization - override for specific sources
    return {
      markets: Array.isArray(rawData) ? rawData.map(this.normalizeMarket) : [],
      timestamp: Date.now(),
      source: this.name
    };
  }

  normalizeMarket(raw) {
    // Must be overridden
    throw new Error('normalizeMarket() must be implemented');
  }

  getMarkets() {
    return this.data?.markets || [];
  }

  getMarket(id) {
    return this.getMarkets().find(m => m.id === id);
  }

  startAutoRefresh(intervalMs) {
    this.stopAutoRefresh();
    
    if (intervalMs > 0) {
      this.refreshTimer = setInterval(() => {
        this.refresh().catch(err => {
          console.warn(`Auto-refresh failed for ${this.name}:`, err.message);
        });
      }, intervalMs);
    }
  }

  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  async destroy() {
    this.stopAutoRefresh();
    this.data = null;
    await super.destroy();
  }
}

// === MOCK DATA SOURCE ===
class MockDataSource extends DataSourceAdapter {
  constructor(dataset = 'default') {
    super('mock');
    this.dataset = dataset;
    this.mockDatasets = {
      default: [
        { id: '1', question: "BTC $100K 2024", volume24h: 4500000, liquidity: 1200000, yesPrice: 0.73, category: 'crypto', resolutionDate: '2024-12-31', trades24h: 1200 },
        { id: '2', question: "Trump 2024", volume24h: 12000000, liquidity: 3400000, yesPrice: 0.52, category: 'politics', resolutionDate: '2024-11-05', trades24h: 8500 },
        { id: '3', question: "ETH ETF", volume24h: 2800000, liquidity: 890000, yesPrice: 0.89, category: 'crypto', resolutionDate: '2024-06-30', trades24h: 600 },
        { id: '4', question: "Fed Rate Cut", volume24h: 5600000, liquidity: 1800000, yesPrice: 0.31, category: 'finance', resolutionDate: '2024-09-15', trades24h: 2100 },
        { id: '5', question: "NBA Champ", volume24h: 1900000, liquidity: 540000, yesPrice: 0.45, category: 'sports', resolutionDate: '2024-06-15', trades24h: 450 },
        { id: '6', question: "AI Regulation", volume24h: 3200000, liquidity: 950000, yesPrice: 0.67, category: 'tech', resolutionDate: '2024-08-01', trades24h: 890 }
      ],
      'stress-test': [
        { id: '1', question: "Market 1", volume24h: 15000000, liquidity: 5000000, yesPrice: 0.5, category: 'crypto', resolutionDate: '2024-12-31', trades24h: 50000 },
        { id: '2', question: "Market 2", volume24h: 15000000, liquidity: 5000000, yesPrice: 0.5, category: 'crypto', resolutionDate: '2024-12-31', trades24h: 50000 },
        { id: '3', question: "Market 3", volume24h: 15000000, liquidity: 5000000, yesPrice: 0.5, category: 'crypto', resolutionDate: '2024-12-31', trades24h: 50000 },
        { id: '4', question: "Market 4", volume24h: 15000000, liquidity: 5000000, yesPrice: 0.5, category: 'crypto', resolutionDate: '2024-12-31', trades24h: 50000 },
        { id: '5', question: "Market 5", volume24h: 15000000, liquidity: 5000000, yesPrice: 0.5, category: 'crypto', resolutionDate: '2024-12-31', trades24h: 50000 },
        { id: '6', question: "Market 6", volume24h: 15000000, liquidity: 5000000, yesPrice: 0.5, category: 'crypto', resolutionDate: '2024-12-31', trades24h: 50000 },
        { id: '7', question: "Market 7", volume24h: 15000000, liquidity: 5000000, yesPrice: 0.5, category: 'crypto', resolutionDate: '2024-12-31', trades24h: 50000 },
        { id: '8', question: "Market 8", volume24h: 15000000, liquidity: 5000000, yesPrice: 0.5, category: 'crypto', resolutionDate: '2024-12-31', trades24h: 50000 },
        { id: '9', question: "Market 9", volume24h: 15000000, liquidity: 5000000, yesPrice: 0.5, category: 'crypto', resolutionDate: '2024-12-31', trades24h: 50000 },
        { id: '10', question: "Market 10", volume24h: 15000000, liquidity: 5000000, yesPrice: 0.5, category: 'crypto', resolutionDate: '2024-12-31', trades24h: 50000 },
        { id: '11', question: "Market 11", volume24h: 15000000, liquidity: 5000000, yesPrice: 0.5, category: 'crypto', resolutionDate: '2024-12-31', trades24h: 50000 },
        { id: '12', question: "Market 12", volume24h: 15000000, liquidity: 5000000, yesPrice: 0.5, category: 'crypto', resolutionDate: '2024-12-31', trades24h: 50000 }
      ],
      minimal: [
        { id: '1', question: "BTC $100K", volume24h: 5000000, liquidity: 1500000, yesPrice: 0.73, category: 'crypto', resolutionDate: '2024-12-31', trades24h: 2000 }
      ]
    };
  }

  async fetch() {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
    
    const data = this.mockDatasets[this.dataset] || this.mockDatasets.default;
    
    // Add some randomness to make it feel alive
    return data.map(m => ({
      ...m,
      yesPrice: Math.max(0.01, Math.min(0.99, m.yesPrice + (Math.random() - 0.5) * 0.02)),
      volume24h: m.volume24h * (0.95 + Math.random() * 0.1)
    }));
  }

  normalizeMarket(raw) {
    return {
      id: raw.id,
      question: raw.question,
      volume24h: parseFloat(raw.volume24h) || 0,
      liquidity: parseFloat(raw.liquidity) || 0,
      yesPrice: parseFloat(raw.yesPrice) || 0.5,
      noPrice: 1 - (parseFloat(raw.yesPrice) || 0.5),
      category: this.mapCategory(raw.category),
      resolutionTime: new Date(raw.resolutionDate),
      numTraders: Math.floor(Math.random() * 1000) + 100,
      trades24h: parseInt(raw.trades24h) || 0,
      // Computed fields
      flowRate: (parseFloat(raw.trades24h) || 0) / 86400,
      activityScore: this.computeActivityScore(raw)
    };
  }

  mapCategory(cat) {
    const mapping = {
      'politics': 'politics',
      'political': 'politics',
      'crypto': 'crypto',
      'cryptocurrency': 'crypto',
      'sports': 'sports',
      'finance': 'finance',
      'financial': 'finance',
      'tech': 'tech',
      'technology': 'tech',
      'entertainment': 'entertainment',
      'science': 'science',
      'other': 'other'
    };
    return mapping[cat?.toLowerCase()] || 'other';
  }

  computeActivityScore(market) {
    const volumeScore = Math.log10(Math.max(1, market.volume24h)) / 10;
    const tradeScore = Math.min(1, market.trades24h / 5000);
    return (volumeScore + tradeScore) / 2;
  }
}

// === REST API DATA SOURCE ===
class RestDataSource extends DataSourceAdapter {
  constructor(config) {
    super('rest');
    this.apiUrl = config.baseUrl;
    this.proxyUrl = config.proxyUrl;
    this.timeout = config.timeout || 10000;
    this.retries = config.retries || 3;
  }

  get effectiveUrl() {
    return this.proxyUrl || this.apiUrl;
  }

  async fetch() {
    if (!this.effectiveUrl) {
      throw new Error('No API URL configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.effectiveUrl}/markets?active=true`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PolymarketFlowViz/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timeout);
      
      if (err.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw err;
    }
  }

  normalizeMarket(raw) {
    return {
      id: raw.market_slug || raw.id || raw._id,
      question: raw.question || raw.title,
      volume24h: parseFloat(raw.volume) || parseFloat(raw.volume24hr) || 0,
      liquidity: parseFloat(raw.liquidity) || 0,
      yesPrice: parseFloat(raw.best_yes_price) || parseFloat(raw.yes_price) || 0.5,
      noPrice: parseFloat(raw.best_no_price) || parseFloat(raw.no_price) || 0.5,
      category: this.mapCategory(raw.category || raw.group),
      resolutionTime: new Date(raw.resolution_date || raw.end_date),
      numTraders: parseInt(raw.num_traders) || 0,
      trades24h: parseInt(raw.num_trades_24h) || 0,
      flowRate: (parseInt(raw.num_trades_24h) || 0) / 86400,
      activityScore: this.computeActivityScore(raw)
    };
  }

  mapCategory(cat) {
    // Same as MockDataSource
    const mapping = {
      'politics': 'politics',
      'political': 'politics',
      'crypto': 'crypto',
      'cryptocurrency': 'crypto',
      'sports': 'sports',
      'finance': 'finance',
      'financial': 'finance',
      'tech': 'tech',
      'technology': 'tech',
      'entertainment': 'entertainment',
      'science': 'science',
      'other': 'other'
    };
    return mapping[cat?.toLowerCase()] || 'other';
  }

  computeActivityScore(market) {
    const volume = parseFloat(market.volume) || parseFloat(market.volume24hr) || 0;
    const trades = parseInt(market.num_trades_24h) || 0;
    const volumeScore = Math.log10(Math.max(1, volume)) / 10;
    const tradeScore = Math.min(1, trades / 5000);
    return (volumeScore + tradeScore) / 2;
  }
}

// Data Source Registry for extensibility
const DataSourceRegistry = {
  types: new Map(),
  
  register(type, constructor) {
    this.types.set(type, constructor);
  },
  
  get(type) {
    return this.types.get(type);
  },
  
  list() {
    return Array.from(this.types.keys());
  }
};

// Backward compatibility
DataSourceFactory = {
  registerType(type, constructor) {
    DataSourceRegistry.register(type, constructor);
  },
  
  create(config) {
    const type = config.type || 'mock';
    
    // Check registry first
    const Constructor = DataSourceRegistry.get(type);
    if (Constructor) {
      return new Constructor(config);
    }
    
    // Built-in types
    switch (type) {
      case 'mock':
        return new MockDataSource(config.mockDataSet || 'default');
      
      case 'rest':
        return new RestDataSource(config.api);
      
      case 'composite':
        throw new Error('Composite data source not yet implemented');
      
      default:
        throw new Error(`Unknown data source type: ${type}. Available: ${DataSourceRegistry.list().join(', ')}`);
    }
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    DataSourceAdapter, 
    MockDataSource, 
    RestDataSource,
    DataSourceFactory 
  };
}
