/* ===== OS NAMESPACE, EVENTS, AND SMALL HELPERS ===== */
(function () {
  const OS = (window.OS = window.OS || {});
  const listeners = new Map();

  OS.on = (event, fn) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => OS.off(event, fn);
  };
  OS.off = (event, fn) => listeners.get(event)?.delete(fn);
  OS.emit = (event, detail) => {
    listeners.get(event)?.forEach(fn => {
      try { fn(detail); } catch (error) { console.error(`OS: "${event}" listener failed`, error); }
    });
  };

  const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
  const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  let uidCounter = 0;

  OS.util = {
    isMac,
    mod: isMac ? '⌘' : 'Ctrl ',
    esc: value => String(value ?? '').replace(/[&<>"']/g, c => escapeMap[c]),
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    uid: (prefix = 'id') => `${prefix}${++uidCounter}`,
    debounce(fn, delay) {
      let timer;
      return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
    },
    /** Parses an HTML string into a single element. */
    el(html) {
      const template = document.createElement('template');
      template.innerHTML = html.trim();
      return template.content.firstElementChild;
    },
    /** Reads a "YYYY-MM-DD" key in local time. */
    dateKey(date = new Date()) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    },
    formatBytes(bytes) {
      if (bytes < 1000) return `${bytes} byte${bytes === 1 ? '' : 's'}`;
      if (bytes < 1e6) return `${(bytes / 1e3).toFixed(bytes < 1e4 ? 1 : 0)} KB`;
      return `${(bytes / 1e6).toFixed(1)} MB`;
    },
    relativeTime(timestamp) {
      const diff = Date.now() - timestamp;
      if (diff < 60e3) return 'Just now';
      if (diff < 3600e3) { const m = Math.floor(diff / 60e3); return `${m} min${m > 1 ? 's' : ''} ago`; }
      const date = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
      if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
      if (diff < 6 * 86400e3) return date.toLocaleDateString('en-US', { weekday: 'long' });
      return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
    },
    longDate(timestamp) {
      return new Date(timestamp).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(',', '').replace(/, (\d)/, ' at $1');
    },
    /** Local safe storage for small per-browser conveniences. */
    prefersReducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    isCoarse: () => window.matchMedia('(pointer: coarse)').matches,
    isPhone: () => window.matchMedia('(max-width: 600px)').matches,
    /** Allows only https/http/mailto destinations in generated links. */
    safeUrl(value) {
      try {
        const url = new URL(value);
        return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : '';
      } catch { return ''; }
    },
    /** Resolves after the given number of animation frames. */
    frame: () => new Promise(resolve => requestAnimationFrame(() => resolve())),
    /** True when motion should play: respects the setting and the OS preference. */
    motionOn: () => document.documentElement.dataset.motion !== 'off',
  };
})();
