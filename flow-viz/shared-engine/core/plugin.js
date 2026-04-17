/**
 * Polymarket Flow Viz - Plugin System
 * 
 * Autoresearcher pattern: Plugin architecture for extensibility
 * All data sources, visual effects, and interactions are plugins
 */

class Plugin {
  constructor(name, version = '1.0.0') {
    this.name = name;
    this.version = version;
    this.enabled = false;
    this.dependencies = [];
    this.priority = 0;          // Lower = earlier in lifecycle
  }

  // Lifecycle hooks - override in subclasses
  async init(config, context) {
    this.config = config;
    this.context = context;
    this.enabled = true;
    return true;
  }

  async destroy() {
    this.enabled = false;
    return true;
  }

  // Update hook called every frame
  update(deltaTime, elapsedTime) {
    // Override in subclass
  }

  // Render hook
  render(layer) {
    // layer: 'background' | 'trails' | 'particles' | 'markets' | 'overlay' | 'ui'
    // Return true if rendered something
    return false;
  }

  // Event handling
  onEvent(eventType, data) {
    // Override to handle specific events
  }

  // Check if plugin can run
  checkRequirements() {
    return { valid: true, errors: [] };
  }

  // Get plugin info
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      enabled: this.enabled,
      dependencies: this.dependencies
    };
  }
}

// Plugin Manager
class PluginManager {
  constructor(eventBus) {
    this.plugins = new Map();
    this.hooks = {
      init: [],
      update: [],
      render: { background: [], trails: [], particles: [], markets: [], overlay: [], ui: [] },
      destroy: []
    };
    this.eventBus = eventBus;
    
    // Subscribe to events for plugins
    this.eventBus.on('*', (event) => {
      this.broadcastEvent(event.type, event);
    });
  }

  register(plugin) {
    if (!(plugin instanceof Plugin)) {
      throw new Error('Plugin must extend Plugin base class');
    }
    
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin ${plugin.name} already registered, overwriting`);
    }
    
    this.plugins.set(plugin.name, plugin);
    
    // Sort by priority
    this.sortHooks();
    
    this.eventBus.emit('plugin:registered', { name: plugin.name });
    
    return this;
  }

  async enable(name, config = {}, context = {}) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }
    
    // Check dependencies
    for (const dep of plugin.dependencies) {
      if (!this.plugins.has(dep)) {
        throw new Error(`Plugin ${name} requires dependency ${dep}`);
      }
      const depPlugin = this.plugins.get(dep);
      if (!depPlugin.enabled) {
        await this.enable(dep, config, context);
      }
    }
    
    // Check requirements
    const reqs = plugin.checkRequirements();
    if (!reqs.valid) {
      throw new Error(`Plugin ${name} requirements not met: ${reqs.errors.join(', ')}`);
    }
    
    // Initialize
    await plugin.init(config, context);
    
    // Register hooks
    this.registerHooks(plugin);
    
    this.eventBus.emit('plugin:enabled', { name });
    
    return plugin;
  }

  async disable(name) {
    const plugin = this.plugins.get(name);
    if (!plugin || !plugin.enabled) return;
    
    // Check for plugins that depend on this
    for (const [otherName, otherPlugin] of this.plugins) {
      if (otherPlugin.enabled && otherPlugin.dependencies.includes(name)) {
        throw new Error(`Cannot disable ${name}: ${otherName} depends on it`);
      }
    }
    
    await plugin.destroy();
    this.unregisterHooks(plugin);
    
    this.eventBus.emit('plugin:disabled', { name });
  }

  registerHooks(plugin) {
    // Update hook
    if (plugin.update !== Plugin.prototype.update) {
      this.hooks.update.push({ plugin, fn: plugin.update.bind(plugin) });
    }
    
    // Render hooks
    const renderLayers = ['background', 'trails', 'particles', 'markets', 'overlay', 'ui'];
    for (const layer of renderLayers) {
      if (plugin.render !== Plugin.prototype.render) {
        // Check if plugin actually renders to this layer
        const boundRender = plugin.render.bind(plugin);
        this.hooks.render[layer].push({ plugin, fn: (l) => boundRender(l) });
      }
    }
    
    this.sortHooks();
  }

  unregisterHooks(plugin) {
    this.hooks.update = this.hooks.update.filter(h => h.plugin !== plugin);
    
    for (const layer in this.hooks.render) {
      this.hooks.render[layer] = this.hooks.render[layer].filter(h => h.plugin !== plugin);
    }
  }

  sortHooks() {
    const sortByPriority = (a, b) => a.plugin.priority - b.plugin.priority;
    
    this.hooks.update.sort(sortByPriority);
    
    for (const layer in this.hooks.render) {
      this.hooks.render[layer].sort(sortByPriority);
    }
  }

  broadcastEvent(eventType, data) {
    for (const [name, plugin] of this.plugins) {
      if (plugin.enabled && plugin.onEvent !== Plugin.prototype.onEvent) {
        try {
          plugin.onEvent(eventType, data);
        } catch (err) {
          console.error(`Error in plugin ${name} event handler:`, err);
        }
      }
    }
  }

  // Lifecycle execution
  update(deltaTime, elapsedTime) {
    for (const hook of this.hooks.update) {
      try {
        hook.fn(deltaTime, elapsedTime);
      } catch (err) {
        console.error(`Error in plugin ${hook.plugin.name} update:`, err);
      }
    }
  }

  render(layer, ...args) {
    const hooks = this.hooks.render[layer] || [];
    for (const hook of hooks) {
      try {
        hook.fn(layer, ...args);
      } catch (err) {
        console.error(`Error in plugin ${hook.plugin.name} render:`, err);
      }
    }
  }

  // Utilities
  getPlugin(name) {
    return this.plugins.get(name);
  }

  listPlugins() {
    return Array.from(this.plugins.values()).map(p => p.getInfo());
  }

  getEnabledPlugins() {
    return Array.from(this.plugins.values())
      .filter(p => p.enabled)
      .map(p => p.getInfo());
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Plugin, PluginManager };
}
