/* ===== CLOUDSTORAGE: persistent state in localStorage =====
   One JSON document holds every app's saved data. Reads come from an
   in-memory copy, so debounced writes are visible immediately. */
(function () {
  const KEY = 'cloudos_state';
  const VERSION = 2;
  const WALLPAPERS_V1 = ['forest', 'nebula', 'sunset', 'slate', 'lagoon', 'abyss'];
  const ACCENTS_V1 = { '#007AFF': 'blue', '#AF52DE': 'purple', '#FF2D55': 'pink', '#FF9500': 'orange', '#34C759': 'green' };

  let cache = null;
  const timers = {};
  const clone = value => (value === undefined ? value : JSON.parse(JSON.stringify(value)));

  function defaultSettings() {
    return {
      appearance: 'dark',
      accent: 'blue',
      wallpaper: 'forest',
      dockSize: 60,
      dockMagnification: true,
      dockMagnificationSize: 88,
      autoHideDock: false,
      autoHideMenuBar: false,
      showRecentApps: true,
      minimizeEffect: 'genie',
      titlebarDoubleClick: 'zoom',
      brightness: 100,
      nightShift: false,
      reduceMotion: false,
      increaseContrast: false,
      doNotDisturb: false,
      requirePassword: true,
      openTerminalAtLogin: true,
      showBatteryPercentage: true,
      soundEffects: false,
      volume: 70,
      wifi: true,
      bluetooth: true,
      airdrop: 'contacts',
      pinnedApps: ['finder', 'launchpad', 'safari', 'mail', 'photos', 'notes', 'reminders', 'calendar', 'music', 'weather', 'clock', 'stocks', 'calculator', 'textedit', 'photobooth', 'terminal', 'settings'],
    };
  }

  function defaults() {
    const now = Date.now();
    return {
      version: VERSION,
      notes: [
        { id: now, title: 'Welcome to CloudOS', body: 'Welcome to CloudOS\nA macOS-style desktop and portfolio by Sanket Muchhala.\n\n• Terminal is the portfolio: try whoami, projects, inspect LexOrchestrator, or graph python.\n• Finder and Terminal share one file system. Files you create in Documents or on the Desktop are saved in this browser.\n• Press ⌘ Space (Ctrl Space on Windows) for Spotlight.\n• Drag a window to the left or right edge of the screen to tile it.', timestamp: now },
        { id: now + 1, title: 'Project Ideas', body: 'Project Ideas\nAI-powered event search with NLP\nGraph-based fraud detection\nMultiplayer chess with ELO rankings', timestamp: now - 3600e3 },
        { id: now + 2, title: 'Meeting Notes', body: 'Meeting Notes\nDiscussed RAG pipeline optimization\nNeed to improve document chunking strategy', timestamp: now - 86400e3 },
        { id: now + 3, title: 'Quick Note', body: 'Quick Note\nRemember to update API keys for staging.', timestamp: now - 3 * 86400e3 },
      ],
      todos: [
        { id: now, t: 'Review PRs for merchant.live', d: false },
        { id: now + 1, t: 'Update fraud detection model', d: false },
        { id: now + 2, t: 'Chess app UI improvements', d: true },
        { id: now + 3, t: 'Deploy Vercel updates', d: false },
      ],
      calendar_events: [],
      settings: defaultSettings(),
      terminal: { history: [] },
      vfs: null,
      music: { currentTrack: 0, volume: 0.7 },
      photos: [],
      favorites: [],
      recents: [],
      weather: { cities: null, selected: 0 },
      clock: { cities: ['America/New_York', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo'] },
      mail: { sent: [], read: [] },
      lastModified: now,
    };
  }

  function withIds(list) {
    return (list || []).map((item, index) => (item && item.id ? item : { ...item, id: Date.now() + index }));
  }

  /* v0/v1 → v2. Old data stays; new keys get defaults. v1 kept the terminal's
     files under /Users/sanket; the VFS moves them on first start. */
  function migrate(data) {
    const base = defaults();
    const out = { ...base, ...data };
    out.notes = withIds(out.notes).map(note => ({ ...note, timestamp: note.timestamp || Date.now() }));
    out.todos = withIds(out.todos);
    if (!Array.isArray(out.calendar_events)) out.calendar_events = [];

    const previous = data.settings || {};
    if (!data.version || data.version < 2) {
      out.settings = {
        ...base.settings,
        accent: ACCENTS_V1[String(previous.accentColor || '').toUpperCase()] || 'blue',
        dockSize: previous.dockSize && previous.dockSize !== 52 ? Math.min(80, Math.max(32, previous.dockSize)) : 60,
        autoHideDock: !!previous.autoHideDock,
        autoHideMenuBar: !!previous.autoHideMenuBar,
        showRecentApps: previous.showRecentApps !== false,
        wallpaper: WALLPAPERS_V1[previous.wallpaperIndex] || 'forest',
      };
      const terminal = data.terminal || {};
      out.terminal = { history: Array.isArray(terminal.history) ? terminal.history.slice(-80) : [] };
      if (terminal.vfs) out.legacyVfs = terminal.vfs;
    } else {
      out.settings = { ...base.settings, ...previous };
    }
    out.version = VERSION;
    return out;
  }

  function normalize(data) {
    if (data.version !== VERSION) return migrate(data);
    return { ...defaults(), ...data, settings: { ...defaultSettings(), ...data.settings } };
  }

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.warn('CloudStorage: could not read saved state', error);
      return null;
    }
  }

  function write(data) {
    try {
      data.version = VERSION;
      data.lastModified = Date.now();
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      const quota = error && (error.name === 'QuotaExceededError' || error.code === 22);
      console.warn('CloudStorage: could not save state', error);
      window.dispatchEvent(new CustomEvent('cloudstorage:error', { detail: { quota } }));
      return false;
    }
  }

  function flush() {
    const pending = Object.keys(timers);
    if (!pending.length) return;
    pending.forEach(key => { clearTimeout(timers[key]); delete timers[key]; });
    write(CloudStorage.load());
  }

  const CloudStorage = {
    KEY,
    VERSION,

    load() {
      if (cache) return cache;
      const data = read();
      cache = data ? normalize(data) : defaults();
      if (!data || data.version !== VERSION) write(cache);
      return cache;
    },

    save(data) {
      cache = data;
      return write(data);
    },

    /** Returns a copy, so callers must set() to persist changes. */
    get(key, defaultValue) {
      const value = this.load()[key];
      return value === undefined || value === null ? clone(defaultValue) : clone(value);
    },

    set(key, value) {
      const state = this.load();
      state[key] = clone(value);
      if (timers[key]) { clearTimeout(timers[key]); delete timers[key]; }
      return write(state);
    },

    /** Updates memory now and writes after typing pauses. */
    autoSave(key, value, delay = 450) {
      const state = this.load();
      state[key] = clone(value);
      clearTimeout(timers[key]);
      timers[key] = setTimeout(() => { delete timers[key]; write(state); }, delay);
    },

    delete(key) {
      const state = this.load();
      delete state[key];
      write(state);
    },

    clear() {
      Object.keys(timers).forEach(key => clearTimeout(timers[key]));
      cache = null;
      try { localStorage.removeItem(KEY); } catch { /* Nothing to remove. */ }
    },

    getDefaults: defaults,
    getDefaultSettings: defaultSettings,
    migrate,
    flush,

    getSize() {
      try { return new Blob([localStorage.getItem(KEY) || '']).size; } catch { return 0; }
    },

    getSizeString() {
      const bytes = this.getSize();
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    },

    export() {
      flush();
      return JSON.stringify(this.load(), null, 2);
    },

    import(json) {
      try {
        const data = JSON.parse(json);
        if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
        cache = normalize(data);
        return write(cache);
      } catch (error) {
        console.warn('CloudStorage: import failed', error);
        return false;
      }
    },
  };

  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  window.addEventListener('storage', event => { if (event.key === KEY) cache = null; });
  window.CloudStorage = CloudStorage;
})();
