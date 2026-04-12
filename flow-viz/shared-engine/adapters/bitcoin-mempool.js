/**
 * Bitcoin Mempool Adapter
 * 
 * Visual: Transactions as particles, fee buckets as containers,
 *         blocks as periodic drains, urgency as color temperature
 * 
 * API: mempool.space (free, no auth, CORS-friendly)
 */

class BitcoinMempoolAdapter extends DataSourceAdapter {
  constructor(config = {}) {
    super('bitcoin-mempool');
    this.apiUrl = config.apiUrl || 'https://mempool.space/api';
    this.feeBuckets = config.feeBuckets || [
      { min: 1, max: 5, label: '1-5 sat/vB' },
      { min: 5, max: 10, label: '5-10 sat/vB' },
      { min: 10, max: 20, label: '10-20 sat/vB' },
      { min: 20, max: 50, label: '20-50 sat/vB' },
      { min: 50, max: Infinity, label: '50+ sat/vB' }
    ];
    this.blockTime = 600; // 10 minutes in seconds
    this.lastBlockHeight = 0;
    this.nextBlockEta = null;
  }

  async fetch() {
    // Parallel fetch for efficiency
    const [mempool, fees, blocks] = await Promise.all([
      this.fetchMempool(),
      this.fetchFeeEstimates(),
      this.fetchRecentBlocks()
    ]);

    return {
      mempool,
      fees,
      blocks,
      timestamp: Date.now()
    };
  }

  async fetchMempool() {
    try {
      const response = await fetch(`${this.apiUrl}/mempool`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn('Mempool fetch failed:', err);
      // Return mock data for resilience
      return {
        count: 5000 + Math.floor(Math.random() * 5000),
        vsize: 2000000 + Math.floor(Math.random() * 1000000),
        total_fee: 0.5 + Math.random() * 0.5,
        fee_histogram: this.generateMockHistogram()
      };
    }
  }

  async fetchFeeEstimates() {
    try {
      const response = await fetch(`${this.apiUrl}/fees/recommended`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      return {
        fastestFee: 50 + Math.floor(Math.random() * 50),
        halfHourFee: 30 + Math.floor(Math.random() * 30),
        hourFee: 15 + Math.floor(Math.random() * 15),
        economyFee: 5 + Math.floor(Math.random() * 10),
        minimumFee: 1
      };
    }
  }

  async fetchRecentBlocks() {
    try {
      const response = await fetch(`${this.apiUrl}/blocks`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      return [{
        height: 800000 + Math.floor(Math.random() * 10000),
        timestamp: Math.floor(Date.now() / 1000) - 600,
        size: 1000000 + Math.floor(Math.random() * 500000)
      }];
    }
  }

  generateMockHistogram() {
    // Mock fee histogram for resilience
    return [
      [1, 1000000],
      [5, 800000],
      [10, 600000],
      [20, 400000],
      [50, 200000],
      [100, 100000]
    ];
  }

  normalize(raw) {
    const mempool = raw.mempool;
    const fees = raw.fees;
    const blocks = raw.blocks;
    
    // Update block tracking
    if (blocks.length > 0 && blocks[0].height > this.lastBlockHeight) {
      this.lastBlockHeight = blocks[0].height;
      this.nextBlockEta = Date.now() + (this.blockTime * 1000);
      
      // Emit block found event
      this.eventBus?.emit('MEMPOOL_BLOCK_FOUND', {
        height: blocks[0].height,
        size: blocks[0].size,
        timestamp: blocks[0].timestamp
      });
    }

    // Calculate bucket stats from fee histogram
    const bucketStats = this.calculateBucketStats(mempool.fee_histogram);
    
    // Create "markets" from fee buckets
    const markets = this.feeBuckets.map((bucket, index) => {
      const stats = bucketStats[index] || { count: 0, vsize: 0 };
      const confirmationChance = this.estimateConfirmationChance(bucket, fees);
      
      return {
        id: `bucket-${bucket.min}-${bucket.max}`,
        question: bucket.label,
        // Volume = virtual size (bytes) in this fee range
        volume24h: stats.vsize,
        // Liquidity = transaction count
        liquidity: stats.count,
        // Yes price = confirmation probability (1.0 = will confirm soon)
        yesPrice: confirmationChance,
        // Category for color
        category: this.bucketToCategory(bucket, confirmationChance),
        // Resolution = next block ETA (for urgency visualization)
        resolutionTime: new Date(this.nextBlockEta || Date.now() + 600000),
        // Number of "traders" = transaction count
        numTraders: stats.count,
        // Flow rate = tx count per second entering this bucket
        trades24h: Math.floor(stats.count / 10), // Approximate
        // Computed fields
        flowRate: stats.count / 10,
        activityScore: Math.min(1, stats.count / 1000),
        // Mempool-specific metadata
        metadata: {
          feeMin: bucket.min,
          feeMax: bucket.max,
          avgFee: (bucket.min + (bucket.max === Infinity ? bucket.min * 2 : bucket.max)) / 2,
          vsize: stats.vsize,
          blockUrgency: this.calculateUrgency(bucket, fees)
        }
      };
    });

    return {
      markets,
      global: {
        mempoolSize: mempool.vsize,
        mempoolCount: mempool.count,
        totalFees: mempool.total_fee,
        nextBlockEta: this.nextBlockEta,
        lastBlockHeight: this.lastBlockHeight,
        recommendedFees: fees
      },
      timestamp: raw.timestamp,
      source: this.name
    };
  }

  calculateBucketStats(feeHistogram) {
    if (!feeHistogram) return [];
    
    const stats = this.feeBuckets.map(() => ({ count: 0, vsize: 0 }));
    
    for (const [feeRate, vsize] of feeHistogram) {
      // Find which bucket this belongs to
      for (let i = 0; i < this.feeBuckets.length; i++) {
        const bucket = this.feeBuckets[i];
        if (feeRate >= bucket.min && feeRate < (bucket.max === Infinity ? Infinity : bucket.max)) {
          stats[i].count += Math.floor(vsize / 250); // Approximate tx count
          stats[i].vsize += vsize;
          break;
        }
      }
    }
    
    return stats;
  }

  estimateConfirmationChance(bucket, fees) {
    // Simple heuristic: higher fee = higher confirmation chance
    if (fees.fastestFee <= bucket.max) return 0.95;
    if (fees.halfHourFee <= bucket.max) return 0.75;
    if (fees.hourFee <= bucket.max) return 0.50;
    if (fees.economyFee <= bucket.max) return 0.25;
    return 0.10;
  }

  bucketToCategory(bucket, confirmationChance) {
    // Color by urgency/confirmation likelihood
    if (confirmationChance >= 0.9) return 'crypto';      // Will confirm soon (gold)
    if (confirmationChance >= 0.7) return 'finance';      // Likely next few blocks (green)
    if (confirmationChance >= 0.4) return 'sports';       // Uncertain (blue)
    if (confirmationChance >= 0.2) return 'tech';        // Stuck (purple)
    return 'politics';                                    // Very low fee (red = danger)
  }

  calculateUrgency(bucket, fees) {
    // 0-1 scale of how urgent transactions in this bucket are
    const minFee = fees.minimumFee;
    const maxFee = fees.fastestFee;
    const bucketAvg = (bucket.min + (bucket.max === Infinity ? bucket.min * 2 : bucket.max)) / 2;
    
    if (maxFee <= minFee) return 0.5;
    
    return Math.max(0, Math.min(1, (bucketAvg - minFee) / (maxFee - minFee)));
  }

  // Special events for mempool visualization
  getBlockDrainEvent() {
    if (!this.lastBlockHeight) return null;
    
    const now = Date.now();
    const timeSinceLastBlock = now - (this.lastBlockTime || now - 600000);
    
    // Simulate drain pulse every ~10 minutes
    if (timeSinceLastBlock > 600000) {
      this.lastBlockTime = now;
      return {
        type: 'block_drain',
        height: this.lastBlockHeight,
        drainedBuckets: ['bucket-1-5', 'bucket-5-10', 'bucket-10-20'] // Low fee buckets clear
      };
    }
    
    return null;
  }
}

// Register for factory
if (typeof DataSourceFactory !== 'undefined') {
  DataSourceFactory.registerType('bitcoin-mempool', BitcoinMempoolAdapter);
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BitcoinMempoolAdapter };
}
