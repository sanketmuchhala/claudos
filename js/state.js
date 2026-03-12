/* ===== GLOBAL STATE ===== */

// Window management state (session-only, not persisted)
let wid = 0;
let zTop = 100;
let wins = {};
let activeWin = null;

// Persistent data loaded from CloudStorage
// Note: These are loaded from localStorage via CloudStorage.get()
// If no saved data exists, defaults from storage.js are used
const todos = CloudStorage.get('todos', [
  { t: 'Review PRs for merchant.live', d: false },
  { t: 'Update fraud detection model', d: false },
  { t: 'Chess app UI improvements', d: true },
  { t: 'Deploy Vercel updates', d: false }
]);

const notes = CloudStorage.get('notes', [
  { id: Date.now(), title: 'Project Ideas', body: 'AI-powered event search with NLP\nGraph-based fraud detection\nMultiplayer chess with ELO rankings', timestamp: Date.now() },
  { id: Date.now() + 1, title: 'Meeting Notes', body: 'Discussed RAG pipeline optimization\nNeed to improve document chunking strategy', timestamp: Date.now() },
  { id: Date.now() + 2, title: 'Quick Note', body: 'Remember to update API keys for staging.', timestamp: Date.now() }
]);

// Calculator state (session-only)
let calcVal = '0', calcPrev = null, calcOp = null, calcRst = false;

// Music data (hardcoded playlist)
const playlist = [
  { t: 'Midnight City', a: 'M83', d: '4:03' },
  { t: 'Blinding Lights', a: 'The Weeknd', d: '3:20' },
  { t: 'Starboy', a: 'The Weeknd', d: '3:50' },
  { t: 'Take On Me', a: 'a-ha', d: '3:48' },
  { t: 'Electric Feel', a: 'MGMT', d: '3:49' },
  { t: 'Instant Crush', a: 'Daft Punk', d: '5:37' },
  { t: 'Digital Love', a: 'Daft Punk', d: '4:58' },
  { t: 'Redbone', a: 'Childish Gambino', d: '5:26' }
];

let curTrack = 0, playing = false;

// Stocks data (hardcoded for demo)
const stocks = [
  { s: 'AAPL', n: 'Apple Inc.', p: '227.63', c: '+1.23', pct: '+0.54' },
  { s: 'GOOGL', n: 'Alphabet', p: '175.89', c: '-0.82', pct: '-0.46' },
  { s: 'MSFT', n: 'Microsoft', p: '415.40', c: '+3.15', pct: '+0.76' },
  { s: 'AMZN', n: 'Amazon', p: '197.12', c: '+1.87', pct: '+0.96' },
  { s: 'TSLA', n: 'Tesla', p: '248.91', c: '-4.23', pct: '-1.67' },
  { s: 'NVDA', n: 'NVIDIA', p: '881.86', c: '+12.34', pct: '+1.42' },
  { s: 'META', n: 'Meta', p: '512.33', c: '+5.67', pct: '+1.12' }
];

// Terminal state
const termHist = CloudStorage.get('terminal', { history: [] }).history;

// Other session state
let calDate = new Date();
let noteIdx = 0;
let ncOpen = false;
let wallIdx = CloudStorage.get('settings', { wallpaperIndex: 0 }).wallpaperIndex;

// Wallpapers
const walls = [
  'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
  'linear-gradient(135deg,#0c0014,#2d1b69,#5b2a86)',
  'linear-gradient(135deg,#1a2a6c,#b21f1f,#fdbb2d)',
  'linear-gradient(135deg,#141e30,#243b55)',
  'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',
  'linear-gradient(135deg,#000428,#004e92)'
];

// Apply saved settings on load
(function applySettings() {
  const settings = CloudStorage.get('settings', {});

  // Apply dark mode if enabled
  if (settings.darkMode) {
    document.documentElement.style.setProperty('--glass', 'rgba(30,30,30,0.75)');
    document.documentElement.style.setProperty('--text', '#f5f5f7');
    document.documentElement.style.setProperty('--text2', '#a1a1a6');
    document.documentElement.style.setProperty('--border', 'rgba(255,255,255,0.2)');
  }

  // Apply accent color if set
  if (settings.accentColor) {
    document.documentElement.style.setProperty('--accent', settings.accentColor);
  }

  // Apply dock size if set
  if (settings.dockSize) {
    document.documentElement.style.setProperty('--dock-icon-size', settings.dockSize + 'px');
  }

  // Apply wallpaper
  if (wallIdx > 0 && wallIdx < walls.length) {
    setTimeout(() => {
      const desktop = document.getElementById('desktop');
      if (desktop) desktop.style.background = walls[wallIdx];
    }, 100);
  }
})();
