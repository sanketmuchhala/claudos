/* ===== CLOUDSTORAGE: Centralized localStorage Manager ===== */

const CloudStorage = {
  KEY: 'cloudos_state',
  VERSION: 1,

  // Debounce timer for auto-save
  _saveTimers: {},

  /**
   * Load entire state from localStorage
   * @returns {Object} Full state object
   */
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return this.getDefaults();

      const data = JSON.parse(raw);

      // Handle version migration if needed
      if (!data.version || data.version < this.VERSION) {
        return this.migrate(data);
      }

      return data;
    } catch (e) {
      console.error('CloudStorage: Failed to load state', e);
      return this.getDefaults();
    }
  },

  /**
   * Save entire state to localStorage
   * @param {Object} data - Full state object to save
   */
  save(data) {
    try {
      data.version = this.VERSION;
      data.lastModified = Date.now();

      const json = JSON.stringify(data);
      const size = new Blob([json]).size;

      // Warn if approaching 5MB localStorage limit
      if (size > 4 * 1024 * 1024) {
        console.warn('CloudStorage: Approaching localStorage limit (' + Math.round(size / 1024) + 'KB / 5MB)');
      }

      localStorage.setItem(this.KEY, json);
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error('CloudStorage: localStorage quota exceeded!');
        alert('Storage quota exceeded. Please clear some data.');
      } else {
        console.error('CloudStorage: Failed to save state', e);
      }
    }
  },

  /**
   * Get a specific key from storage
   * @param {string} key - Key to retrieve
   * @param {*} defaultValue - Default if key doesn't exist
   * @returns {*} Value for key or default
   */
  get(key, defaultValue) {
    const state = this.load();
    return state[key] !== undefined ? state[key] : defaultValue;
  },

  /**
   * Set a specific key in storage (immediate save)
   * @param {string} key - Key to set
   * @param {*} value - Value to save
   */
  set(key, value) {
    const state = this.load();
    state[key] = value;
    this.save(state);
  },

  /**
   * Auto-save with debounce (useful for text inputs)
   * Waits 500ms after last call before saving
   * @param {string} key - Key to set
   * @param {*} value - Value to save
   */
  autoSave(key, value) {
    // Clear existing timer for this key
    if (this._saveTimers[key]) {
      clearTimeout(this._saveTimers[key]);
    }

    // Set new timer
    this._saveTimers[key] = setTimeout(() => {
      this.set(key, value);
      delete this._saveTimers[key];
    }, 500);
  },

  /**
   * Delete a specific key
   * @param {string} key - Key to delete
   */
  delete(key) {
    const state = this.load();
    delete state[key];
    this.save(state);
  },

  /**
   * Clear all storage (reset to defaults)
   */
  clear() {
    localStorage.removeItem(this.KEY);
  },

  /**
   * Get default state structure
   * @returns {Object} Default state with all keys
   */
  getDefaults() {
    return {
      version: this.VERSION,
      notes: [
        { id: Date.now(), title: 'Project Ideas', body: 'AI-powered event search with NLP\nGraph-based fraud detection\nMultiplayer chess with ELO rankings', timestamp: Date.now() },
        { id: Date.now() + 1, title: 'Meeting Notes', body: 'Discussed RAG pipeline optimization\nNeed to improve document chunking strategy', timestamp: Date.now() },
        { id: Date.now() + 2, title: 'Quick Note', body: 'Remember to update API keys for staging.', timestamp: Date.now() }
      ],
      todos: [
        { id: Date.now(), t: 'Review PRs for merchant.live', d: false },
        { id: Date.now() + 1, t: 'Update fraud detection model', d: false },
        { id: Date.now() + 2, t: 'Chess app UI improvements', d: true },
        { id: Date.now() + 3, t: 'Deploy Vercel updates', d: false }
      ],
      calendar_events: [],
      settings: {
        darkMode: false,
        dockSize: 52,
        accentColor: '#007AFF',
        autoHideDock: false,
        autoHideMenuBar: false,
        showRecentApps: true,
        wallpaperIndex: 0
      },
      terminal: {
        history: [],
        vfs: {
          '/Users/sanket': {
            type: 'dir',
            children: ['Desktop', 'Documents', 'Downloads', 'test.txt']
          },
          '/Users/sanket/Desktop': {
            type: 'dir',
            children: []
          },
          '/Users/sanket/Documents': {
            type: 'dir',
            children: []
          },
          '/Users/sanket/Downloads': {
            type: 'dir',
            children: []
          },
          '/Users/sanket/test.txt': {
            type: 'file',
            content: 'Hello World!\nWelcome to CloudOS Terminal.',
            size: 38
          }
        },
        currentPath: '/Users/sanket'
      },
      music: {
        currentTrack: 0,
        volume: 0.7,
        customPlaylists: []
      },
      lastModified: Date.now()
    };
  },

  /**
   * Migrate old schema to new version
   * @param {Object} oldData - Old schema data
   * @returns {Object} Migrated data
   */
  migrate(oldData) {
    console.log('CloudStorage: Migrating from version', oldData.version || 0, 'to', this.VERSION);

    // Start with defaults and overlay old data
    const defaults = this.getDefaults();
    const migrated = { ...defaults, ...oldData };

    // Ensure all new keys exist
    if (!migrated.settings) migrated.settings = defaults.settings;
    if (!migrated.terminal) migrated.terminal = defaults.terminal;
    if (!migrated.calendar_events) migrated.calendar_events = [];

    // Add IDs to notes if missing
    if (migrated.notes && migrated.notes[0] && !migrated.notes[0].id) {
      migrated.notes = migrated.notes.map((n, i) => ({
        ...n,
        id: Date.now() + i,
        timestamp: n.timestamp || Date.now()
      }));
    }

    // Add IDs to todos if missing
    if (migrated.todos && migrated.todos[0] && !migrated.todos[0].id) {
      migrated.todos = migrated.todos.map((t, i) => ({
        ...t,
        id: Date.now() + i
      }));
    }

    migrated.version = this.VERSION;
    this.save(migrated);

    return migrated;
  },

  /**
   * Get storage size in bytes
   * @returns {number} Size in bytes
   */
  getSize() {
    const raw = localStorage.getItem(this.KEY);
    if (!raw) return 0;
    return new Blob([raw]).size;
  },

  /**
   * Get storage size as human-readable string
   * @returns {string} Size string (e.g., "125 KB")
   */
  getSizeString() {
    const bytes = this.getSize();
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  },

  /**
   * Export state as JSON file (for backup)
   * @returns {string} JSON string of state
   */
  export() {
    const state = this.load();
    return JSON.stringify(state, null, 2);
  },

  /**
   * Import state from JSON string
   * @param {string} json - JSON string to import
   * @returns {boolean} Success status
   */
  import(json) {
    try {
      const data = JSON.parse(json);
      this.save(data);
      return true;
    } catch (e) {
      console.error('CloudStorage: Failed to import', e);
      return false;
    }
  }
};

// Initialize on load - ensure defaults exist
if (!localStorage.getItem(CloudStorage.KEY)) {
  CloudStorage.save(CloudStorage.getDefaults());
}
