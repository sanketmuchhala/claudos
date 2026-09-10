/* ===== SETTINGS AND APPEARANCE =====
   Every preference lives in CloudStorage "settings". Changing one applies it
   immediately and emits "settings:change" for anything that mirrors it. */
(function () {
  const OS = window.OS;
  const root = document.documentElement;
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const ACCENTS = {
    blue: { name: 'Blue', light: '#007aff', dark: '#0a84ff' },
    purple: { name: 'Purple', light: '#9a3fd1', dark: '#bf5af2' },
    pink: { name: 'Pink', light: '#e6245a', dark: '#ff375f' },
    red: { name: 'Red', light: '#e0362c', dark: '#ff453a' },
    orange: { name: 'Orange', light: '#f08c00', dark: '#ff9f0a' },
    yellow: { name: 'Yellow', light: '#e0b400', dark: '#ffd60a' },
    green: { name: 'Green', light: '#28b43c', dark: '#32d74b' },
    graphite: { name: 'Graphite', light: '#8e8e93', dark: '#98989d' },
  };

  const WALLPAPERS = [
    { id: 'forest', name: 'Forest', image: 'images/wallpapers/forest.jpg', background: 'linear-gradient(180deg, #0914110a, #07130e2e 65%, #06100e55), url("images/wallpapers/forest.jpg") center 46% / cover no-repeat #0b120f', fog: true },
    { id: 'twilight', name: 'Twilight', background: 'radial-gradient(ellipse at 30% 40%, rgba(101,78,163,.5), transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(234,175,200,.25), transparent 50%), linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
    { id: 'nebula', name: 'Nebula', background: 'radial-gradient(ellipse at 70% 30%, rgba(190,110,255,.28), transparent 55%), linear-gradient(135deg, #0c0014, #2d1b69, #5b2a86)' },
    { id: 'sunset', name: 'Sunset', background: 'linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d)' },
    { id: 'slate', name: 'Slate', background: 'radial-gradient(ellipse at 50% 0%, rgba(120,160,210,.18), transparent 60%), linear-gradient(135deg, #141e30, #243b55)' },
    { id: 'lagoon', name: 'Lagoon', background: 'radial-gradient(ellipse at 20% 80%, rgba(80,200,200,.18), transparent 55%), linear-gradient(135deg, #0f2027, #203a43, #2c5364)' },
    { id: 'abyss', name: 'Abyss', background: 'radial-gradient(ellipse at 60% 20%, rgba(60,140,255,.25), transparent 55%), linear-gradient(135deg, #000428, #004e92)' },
  ];

  let settings = CloudStorage.get('settings', CloudStorage.getDefaultSettings());

  function resolvedAppearance() {
    return settings.appearance === 'auto' ? (darkQuery.matches ? 'dark' : 'light') : settings.appearance === 'light' ? 'light' : 'dark';
  }

  function wallpaper(id = settings.wallpaper) {
    if (typeof id === 'string' && id.startsWith('photo:')) {
      const photo = OS.photos?.find(id.slice(6));
      if (photo) return { id, name: 'Photo', background: `url("${photo.src}") center / cover no-repeat #111`, image: photo.src };
    }
    return WALLPAPERS.find(w => w.id === id) || WALLPAPERS[0];
  }

  function applyWallpaper() {
    const paper = wallpaper();
    root.style.setProperty('--wallpaper', paper.background);
    const layer = document.querySelector('.wallpaper-layer');
    if (layer) layer.style.background = paper.background;
    root.dataset.wallpaper = paper.fog ? 'forest' : 'plain';
  }

  function applyAccent() {
    const accent = ACCENTS[settings.accent] || ACCENTS.blue;
    root.style.setProperty('--accent', accent[resolvedAppearance()]);
    root.dataset.accent = settings.accent;
  }

  function applyMotion() {
    root.dataset.motion = settings.reduceMotion || reducedQuery.matches || document.hidden ? 'off' : 'on';
  }

  function applyDisplay() {
    root.style.setProperty('--display-dim', String(Math.max(0, (100 - settings.brightness) / 100) * 0.75));
    root.dataset.nightShift = settings.nightShift ? 'on' : 'off';
  }

  function applyAll() {
    root.dataset.appearance = resolvedAppearance();
    root.dataset.contrast = settings.increaseContrast ? 'more' : 'normal';
    // The portfolio terminal's "forest | contrast" theme follows Increase Contrast.
    root.dataset.theme = settings.increaseContrast ? 'contrast' : 'forest';
    root.style.setProperty('--dock-size', `${settings.dockSize}px`);
    root.classList.toggle('dock-autohide', !!settings.autoHideDock);
    root.classList.toggle('menubar-autohide', !!settings.autoHideMenuBar);
    applyAccent();
    applyWallpaper();
    applyMotion();
    applyDisplay();
  }

  OS.settings = {
    get: key => settings[key],
    all: () => ({ ...settings }),
    set(key, value) {
      if (settings[key] === value && typeof value !== 'object') return;
      settings = { ...settings, [key]: value };
      CloudStorage.set('settings', settings);
      applyAll();
      OS.emit('settings:change', { key, value });
    },
    toggle(key) { this.set(key, !settings[key]); return settings[key]; },
    reload() { settings = CloudStorage.get('settings', CloudStorage.getDefaultSettings()); applyAll(); OS.emit('settings:change', { key: '*' }); },
  };

  OS.theme = {
    ACCENTS,
    WALLPAPERS,
    wallpaper,
    appearance: resolvedAppearance,
    apply: applyAll,
    /** The portfolio terminal's theme name. */
    terminalTheme: () => (settings.increaseContrast ? 'contrast' : 'forest'),
    motion: () => (settings.reduceMotion ? 'off' : 'auto'),
  };

  darkQuery.addEventListener('change', () => { if (settings.appearance === 'auto') { applyAll(); OS.emit('settings:change', { key: 'appearance' }); } });
  reducedQuery.addEventListener('change', applyMotion);
  document.addEventListener('visibilitychange', applyMotion);
  applyAll();
})();
