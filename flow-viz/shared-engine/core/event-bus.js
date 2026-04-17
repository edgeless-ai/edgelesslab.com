/**
 * Polymarket Flow Viz - Event Bus
 * 
 * Autoresearcher pattern: Pub/sub for loose coupling between modules
 * Enables plugins, reactive updates, and clean separation
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.history = [];               // For debugging/time-travel
    this.maxHistory = 100;
  }

  on(event, handler, context = null) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    const subscription = { handler, context, once: false };
    this.listeners.get(event).push(subscription);
    
    return () => this.off(event, handler);
  }

  once(event, handler, context = null) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    const subscription = { handler, context, once: true };
    this.listeners.get(event).push(subscription);
    
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (!this.listeners.has(event)) return;
    
    const listeners = this.listeners.get(event);
    const index = listeners.findIndex(l => l.handler === handler);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  emit(event, data = null) {
    const timestamp = Date.now();
    const eventObj = { type: event, data, timestamp };
    
    // Add to history
    this.history.push(eventObj);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    
    // Notify listeners
    if (!this.listeners.has(event)) return;
    
    const listeners = this.listeners.get(event);
    const toRemove = [];
    
    for (const listener of listeners) {
      try {
        if (listener.context) {
          listener.handler.call(listener.context, data, eventObj);
        } else {
          listener.handler(data, eventObj);
        }
      } catch (err) {
        console.error(`Error in event handler for ${event}:`, err);
      }
      
      if (listener.once) {
        toRemove.push(listener);
      }
    }
    
    // Remove once listeners
    for (const listener of toRemove) {
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    }
    
    // Also emit to wildcard listeners
    if (this.listeners.has('*')) {
      for (const listener of this.listeners.get('*')) {
        try {
          listener.handler.call(listener.context, eventObj);
        } catch (err) {
          console.error('Error in wildcard handler:', err);
        }
      }
    }
  }

  // Wait for an event (Promise-based)
  waitFor(event, timeout = null) {
    return new Promise((resolve, reject) => {
      const handler = (data) => resolve(data);
      this.once(event, handler);
      
      if (timeout) {
        setTimeout(() => {
          this.off(event, handler);
          reject(new Error(`Timeout waiting for event: ${event}`));
        }, timeout);
      }
    });
  }

  // Get history for debugging
  getHistory(eventType = null) {
    if (eventType) {
      return this.history.filter(e => e.type === eventType);
    }
    return [...this.history];
  }

  // Clear history
  clearHistory() {
    this.history = [];
  }

  // Remove all listeners for an event
  removeAll(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  // Get list of active event types
  getEventTypes() {
    return Array.from(this.listeners.keys());
  }
}

// Singleton instance
const Events = new EventBus();

// Event type constants
const EventTypes = {
  // Engine lifecycle
  ENGINE_INIT: 'engine:init',
  ENGINE_START: 'engine:start',
  ENGINE_STOP: 'engine:stop',
  ENGINE_TICK: 'engine:tick',
  ENGINE_RESIZE: 'engine:resize',
  
  // Data
  DATA_LOADING: 'data:loading',
  DATA_LOADED: 'data:loaded',
  DATA_ERROR: 'data:error',
  DATA_UPDATED: 'data:updated',
  MARKET_ADDED: 'market:added',
  MARKET_UPDATED: 'market:updated',
  MARKET_REMOVED: 'market:removed',
  
  // Markets
  MARKET_HOVER: 'market:hover',
  MARKET_LEAVE: 'market:leave',
  MARKET_CLICK: 'market:click',
  MARKET_SELECTED: 'market:selected',
  MARKET_FOCUS: 'market:focus',
  
  // Particles
  PARTICLE_SPAWN: 'particle:spawn',
  PARTICLE_RESET: 'particle:reset',
  PARTICLE_FLOW: 'particle:flow',
  
  // Interactions
  KEY_PRESS: 'key:press',
  MOUSE_MOVE: 'mouse:move',
  MOUSE_CLICK: 'mouse:click',
  
  // Export
  EXPORT_START: 'export:start',
  EXPORT_COMPLETE: 'export:complete',
  
  // Config
  CONFIG_CHANGED: 'config:changed',
  CONFIG_RELOAD: 'config:reload'
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EventBus, Events, EventTypes };
}
