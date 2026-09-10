/* ===== APPLICATIONS =====
   Apps register a definition: { id, name, icon, open(args), menus(ctx),
   single, keywords, help, alwaysRunning }. This module launches and quits
   them, tracks which one is active for the menu bar, and builds the standard
   App, File, Edit, View, Window, and Help menus. */
(function () {
  const OS = window.OS;
  const registry = new Map();
  const running = new Set(['finder']);
  const background = new Set();
  let active = 'finder';
  let mru = ['finder'];
  let recentApps = [];

  const get = id => registry.get(id);

  function register(def) {
    registry.set(def.id, { launchpad: true, ...def });
  }

  function find(query) {
    const q = String(query).toLowerCase().replace(/\.app$/, '').trim();
    const apps = [...registry.values()];
    return apps.find(a => a.id === q || a.name.toLowerCase() === q) || apps.find(a => a.name.toLowerCase().startsWith(q));
  }

  function list() {
    return [...registry.values()].filter(a => a.launchpad !== false).sort((a, b) => a.name.localeCompare(b.name));
  }

  function touch(id) {
    mru = [id, ...mru.filter(x => x !== id)];
  }

  function markRunning(id) {
    if (!running.has(id)) {
      running.add(id);
      if (!(OS.settings.get('pinnedApps') || []).includes(id)) recentApps = [id, ...recentApps.filter(x => x !== id)].slice(0, 3);
      OS.emit('app:launch', id);
    }
    touch(id);
  }

  function setActive(id) {
    if (!registry.has(id)) return;
    touch(id);
    if (active === id) return;
    active = id;
    OS.emit('app:active', id);
  }

  function launch(id, args = {}) {
    const def = get(id);
    if (!def) return null;
    if (def.transient) return def.open?.(args);
    if (!running.has(id) && def.open) OS.dock?.bounce(id);
    markRunning(id);
    OS.wm.unhideApp(id);
    const existing = OS.wm.list(id);
    if (def.single && existing.length) {
      const win = existing[0];
      OS.wm.focus(win.id);
      win.focusContent();
      def.onReopen?.(win, args);
      setActive(id);
      return win;
    }
    const result = def.open ? def.open(args) : null;
    setActive(id);
    return result;
  }

  /** Dock and switcher semantics: bring windows forward, restore, or reopen. */
  function activate(id) {
    const def = get(id);
    if (!def) return;
    if (def.transient || !running.has(id) || !OS.wm.list(id).length) { launch(id); return; }
    OS.wm.unhideApp(id);
    if (!OS.wm.bringToFront(id) && !OS.wm.restoreMinimized(id)) launch(id);
    setActive(id);
  }

  function stop(id) {
    if (!running.has(id) || get(id)?.alwaysRunning) return;
    running.delete(id);
    background.delete(id);
    mru = mru.filter(x => x !== id);
    OS.emit('app:quit', id);
    if (active === id) {
      const next = OS.wm.visible()[0];
      if (next) OS.wm.focus(next.id); else setActive('finder');
    }
  }

  async function quit(id) {
    const def = get(id);
    if (!def) return false;
    def.quitting = true;
    try {
      for (const win of OS.wm.list(id)) {
        const closed = await OS.wm.close(win.id);
        if (!closed) return false;
      }
    } finally { def.quitting = false; }
    def.onQuit?.();
    stop(id);
    return true;
  }

  OS.on('app:lastWindowClosed', id => {
    const def = get(id);
    if (!def || def.alwaysRunning || def.keepRunning || background.has(id)) return;
    stop(id);
  });

  /* ---------- About panels ---------- */
  function showAbout(def) {
    const existing = OS.wm.list(def.id).find(w => w.data.about);
    if (existing) { existing.focus(); return; }
    const { esc } = OS.util;
    const win = OS.wm.create({
      app: def.id, title: `About ${def.name}`, chrome: 'none', width: 284, height: 262, resizable: false, minimizable: false, className: 'about-panel',
      content: `<div class="about-panel-body" data-drag><img src="${esc(def.icon)}" alt="" /><h2>${esc(def.name)}</h2><p class="about-version">Version ${esc(def.version || '15.0')} (CloudOS)</p><p class="about-desc">${esc(def.about || `${def.name} for CloudOS.`)}</p><p class="about-copy">Designed and built by Sanket Muchhala.<br>Not affiliated with Apple Inc.</p></div>`,
    });
    win.data.about = true;
  }

  /* ---------- Standard menus ---------- */
  const mod = OS.util.isMac ? '⌘' : 'Ctrl+';
  function windowList(ctx) {
    const windows = OS.wm.list(ctx.def.id).filter(w => !w.data.about);
    return windows.length ? ['-', ...windows.map(w => ({ label: w.title || ctx.def.name, checked: w.isFocused(), action: () => { OS.wm.focus(w.id); w.focusContent(); } }))] : [];
  }
  function standardMenus(ctx) {
    const { def, win } = ctx;
    return {
      File: { title: 'File', items: [
        ...(def.single ? [] : [{ label: 'New Window', shortcut: `${mod}N`, action: () => { def.open?.({ newWindow: true }); } }, '-']),
        { label: 'Close Window', shortcut: `${mod}W`, disabled: !win, action: () => win?.close() },
      ] },
      Edit: { title: 'Edit', items: [
        { label: 'Undo', shortcut: `${mod}Z`, action: () => OS.menu.edit('undo') },
        { label: 'Redo', shortcut: `⇧${mod}Z`, action: () => OS.menu.edit('redo') },
        '-',
        { label: 'Cut', shortcut: `${mod}X`, action: () => OS.menu.edit('cut') },
        { label: 'Copy', shortcut: `${mod}C`, action: () => OS.menu.edit('copy') },
        { label: 'Paste', shortcut: `${mod}V`, action: () => OS.menu.edit('paste') },
        { label: 'Select All', shortcut: `${mod}A`, action: () => OS.menu.edit('selectAll') },
      ] },
      View: { title: 'View', items: [
        document.fullscreenElement
          ? { label: 'Exit Full Screen', shortcut: '⌃⌘F', action: () => document.exitFullscreen?.() }
          : { label: 'Enter Full Screen', shortcut: '⌃⌘F', disabled: !document.documentElement.requestFullscreen, action: () => document.documentElement.requestFullscreen?.().catch(() => {}) },
      ] },
      Window: { title: 'Window', items: [
        { label: 'Minimize', shortcut: `${mod}M`, disabled: !win || win.opts.minimizable === false, action: () => win?.minimize() },
        { label: 'Zoom', disabled: !win || win.opts.resizable === false, action: () => win?.toggleZoom() },
        { label: 'Fill', disabled: !win || win.opts.resizable === false, action: () => win?.tileTo('fill') },
        { label: 'Center', disabled: !win, action: () => win?.center() },
        { label: 'Move & Resize', disabled: !win || win.opts.resizable === false, submenu: [
          { label: 'Left', action: () => win?.tileTo('left') },
          { label: 'Right', action: () => win?.tileTo('right') },
          '-',
          { label: 'Return to Previous Size', disabled: !win || (!win.zoomed && !win.tile), action: () => win?.tileTo('restore') },
        ] },
        '-',
        { label: 'Bring All to Front', action: () => OS.wm.bringToFront(def.id) },
        ...windowList(ctx),
      ] },
      Help: { title: 'Help', items: [
        { label: `${def.name} Help`, action: () => OS.dialog.alert({ title: `${def.name} Help`, message: def.help || `${def.name} works like its macOS namesake. Everything you create is saved in this browser.`, icon: def.icon }) },
        ...(def.helpItems ? def.helpItems(ctx) : []),
        '-',
        { label: 'CloudOS Keyboard Shortcuts', action: () => OS.dialog.alert({ title: 'Keyboard shortcuts', icon: 'images/icons/apps/settings.png', message: `${OS.util.isMac ? '⌘ Space' : 'Ctrl Space'} or ${mod}K — Spotlight\n${OS.util.isMac ? '⌘ Tab or ⌥ Tab' : 'Alt Tab'} — switch apps (when your browser allows it)\nEsc — close menus, Spotlight, and Launchpad\nDrag a window to the screen’s left or right edge to tile it; to the top to fill.\nDouble-click a title bar to zoom.` }) },
      ] },
    };
  }

  function menusFor(id) {
    const def = get(id) || get('finder');
    const focused = OS.wm.focused();
    const win = focused && focused.app === def.id ? focused : OS.wm.visible(def.id)[0] || null;
    const ctx = { def, win };
    const standard = standardMenus(ctx);
    const custom = def.menus ? def.menus(ctx).filter(Boolean) : [];
    const named = title => custom.find(m => m.title === title);
    const appMenu = { title: def.name, bold: true, items: def.appMenu ? def.appMenu(ctx) : [
      { label: `About ${def.name}`, action: () => showAbout(def) },
      '-',
      { label: 'Settings…', shortcut: `${mod},`, action: () => launch('settings', { pane: def.settingsPane }) },
      '-',
      { label: `Hide ${def.name}`, shortcut: `${mod}H`, action: () => OS.wm.hideApp(def.id) },
      { label: 'Hide Others', shortcut: `⌥${mod}H`, action: () => [...running].filter(a => a !== def.id).forEach(a => OS.wm.hideApp(a)) },
      { label: 'Show All', action: () => [...running].forEach(a => OS.wm.unhideApp(a)) },
      '-',
      { label: `Quit ${def.name}`, shortcut: `${mod}Q`, action: () => quit(def.id) },
    ] };
    const merge = (base, extra) => (extra ? { title: base.title, items: [...extra.items, ...(extra.replace ? [] : ['-', ...base.items])] } : base);
    return [
      appMenu,
      named('File') || standard.File,
      named('Edit') || standard.Edit,
      named('View') || standard.View,
      ...custom.filter(m => !['File', 'Edit', 'View', 'Window', 'Help'].includes(m.title)),
      named('Window') ? merge(standard.Window, named('Window')) : standard.Window,
      named('Help') ? merge(standard.Help, named('Help')) : standard.Help,
    ];
  }

  OS.apps = {
    register, get, find, list, launch, activate, quit, showAbout, menusFor,
    active: () => active,
    setActive,
    isRunning: id => running.has(id),
    running: () => mru.filter(id => running.has(id)).concat([...running].filter(id => !mru.includes(id))),
    recents: () => recentApps.filter(id => !(OS.settings.get('pinnedApps') || []).includes(id)),
    /** Keeps an app running with no windows (e.g. Music while playing). */
    setBackground(id, on) {
      if (on) { background.add(id); markRunning(id); }
      else { background.delete(id); if (!OS.wm.list(id).length) stop(id); }
      OS.emit('app:state', id);
    },
  };
})();
