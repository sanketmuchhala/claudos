/* ===== SYSTEM SETTINGS =====
   Every control changes CloudOS: appearance, accent, wallpaper, Dock, menu
   bar, display dimming and Night Shift, sound, Focus, accessibility, lock
   screen, login items, and storage (export, import, reset). */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  let win = null;
  let pane = 'appearance';
  let query = '';

  const GLYPH = {
    wifi: '<path d="M10 15.2a1.4 1.4 0 1 0 0 .01ZM6.3 12.1a5.2 5.2 0 0 1 7.4 0l-1.1 1.1a3.7 3.7 0 0 0-5.2 0Zm-2.5-2.5a8.7 8.7 0 0 1 12.4 0l-1.1 1.1a7.1 7.1 0 0 0-10.2 0Z" fill="#fff"/>',
    bluetooth: '<path d="M6.5 7.2 13 12.6l-3.2 2.9V4.5L13 7.4 6.5 12.8" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    network: '<circle cx="10" cy="10" r="5.6" fill="none" stroke="#fff" stroke-width="1.4"/><path d="M4.4 10h11.2M10 4.4c2 2.2 2 9 0 11.2M10 4.4c-2 2.2-2 9 0 11.2" fill="none" stroke="#fff" stroke-width="1.2"/>',
    battery: '<rect x="3.5" y="7" width="11.5" height="6" rx="1.5" fill="none" stroke="#fff" stroke-width="1.3"/><rect x="5" y="8.5" width="7" height="3" rx=".6" fill="#fff"/><path d="M16.2 9v2" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>',
    general: '<circle cx="10" cy="10" r="2.4" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M10 3.5v2m0 9v2m6.5-6.5h-2m-9 0h-2m11.1-4.6-1.4 1.4m-6.4 6.4-1.4 1.4m9.2 0-1.4-1.4M6.2 6.2 4.8 4.8" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>',
    accessibility: '<circle cx="10" cy="5.3" r="1.5" fill="#fff"/><path d="M4.8 8h10.4M10 8v3.6m0 0L7.4 16m2.6-4.4 2.6 4.4" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    appearance: '<circle cx="10" cy="10" r="5.6" fill="none" stroke="#fff" stroke-width="1.4"/><path d="M10 4.4a5.6 5.6 0 0 1 0 11.2Z" fill="#fff"/>',
    control: '<rect x="4" y="5" width="12" height="4.4" rx="2.2" fill="none" stroke="#fff" stroke-width="1.3"/><circle cx="7.2" cy="7.2" r="1.3" fill="#fff"/><rect x="4" y="11" width="12" height="4.4" rx="2.2" fill="none" stroke="#fff" stroke-width="1.3"/><circle cx="12.8" cy="13.2" r="1.3" fill="#fff"/>',
    dock: '<rect x="3.5" y="4" width="13" height="10" rx="1.8" fill="none" stroke="#fff" stroke-width="1.3"/><rect x="6" y="11" width="8" height="1.8" rx=".9" fill="#fff"/>',
    display: '<rect x="3.5" y="4.5" width="13" height="8.5" rx="1.5" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M8 15.8h4" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>',
    focus: '<path d="M12.6 12.2A5 5 0 0 1 7.7 4.9a5.4 5.4 0 1 0 7.4 7.3 5 5 0 0 1-2.5 0Z" fill="#fff"/>',
    wallpaper: '<rect x="3.5" y="4.5" width="13" height="11" rx="1.8" fill="none" stroke="#fff" stroke-width="1.3"/><path d="m4.5 14 3.6-4 2.6 2.6 1.8-1.8 3 3.2" fill="none" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/><circle cx="13" cy="7.6" r="1.2" fill="#fff"/>',
    sound: '<path d="M4 8.2h2.6L10 5.3v9.4l-3.4-2.9H4Z" fill="#fff"/><path d="M12.4 7.6a3.4 3.4 0 0 1 0 4.8m2-6.8a6.3 6.3 0 0 1 0 8.8" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>',
    lock: '<rect x="5.5" y="9" width="9" height="7" rx="1.6" fill="#fff"/><path d="M7.5 9V7a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="#fff" stroke-width="1.5"/>',
    users: '<circle cx="10" cy="7.4" r="2.6" fill="#fff"/><path d="M4.8 15.6a5.2 5.2 0 0 1 10.4 0Z" fill="#fff"/>',
  };
  const PANES = [
    { id: 'wifi', name: 'Wi-Fi', glyph: 'wifi', color: '#0a84ff', group: 1, keywords: ['internet', 'network', 'online'] },
    { id: 'bluetooth', name: 'Bluetooth', glyph: 'bluetooth', color: '#0a84ff', group: 1, keywords: ['wireless'] },
    { id: 'network', name: 'Network', glyph: 'network', color: '#0a84ff', group: 1, keywords: ['connection', 'online'] },
    { id: 'battery', name: 'Battery', glyph: 'battery', color: '#30d158', group: 2, keywords: ['power', 'charging'] },
    { id: 'general', name: 'General', glyph: 'general', color: '#8e8e93', group: 3, keywords: ['about', 'storage', 'reset', 'export', 'backup', 'login items', 'version'] },
    { id: 'accessibility', name: 'Accessibility', glyph: 'accessibility', color: '#0a84ff', group: 3, keywords: ['reduce motion', 'contrast', 'animation'] },
    { id: 'appearance', name: 'Appearance', glyph: 'appearance', color: '#1c1c1e', group: 3, keywords: ['dark mode', 'light mode', 'accent', 'color', 'theme'] },
    { id: 'control-center', name: 'Control Center', glyph: 'control', color: '#8e8e93', group: 3, keywords: ['menu bar', 'battery percentage'] },
    { id: 'desktop-dock', name: 'Desktop & Dock', glyph: 'dock', color: '#1c1c1e', group: 3, keywords: ['dock', 'magnification', 'menu bar', 'hide', 'minimize', 'title bar'] },
    { id: 'displays', name: 'Displays', glyph: 'display', color: '#0a84ff', group: 3, keywords: ['brightness', 'night shift', 'resolution'] },
    { id: 'focus', name: 'Focus', glyph: 'focus', color: '#5e5ce6', group: 3, keywords: ['do not disturb', 'notifications'] },
    { id: 'sound', name: 'Sound', glyph: 'sound', color: '#ff375f', group: 3, keywords: ['volume', 'alerts', 'effects'] },
    { id: 'wallpaper', name: 'Wallpaper', glyph: 'wallpaper', color: '#32ade6', group: 3, keywords: ['background', 'desktop picture', 'forest'] },
    { id: 'lock', name: 'Lock Screen', glyph: 'lock', color: '#1c1c1e', group: 4, keywords: ['password', 'login', 'startup'] },
    { id: 'users', name: 'Users & Groups', glyph: 'users', color: '#0a84ff', group: 4, keywords: ['account', 'profile'] },
  ];
  OS.settingsPanes = PANES.map(p => ({ id: p.id, name: p.name, keywords: p.keywords }));

  const icon = p => `<span class="set-icon" style="--set:${p.color}"><svg viewBox="0 0 20 20" aria-hidden="true">${GLYPH[p.glyph]}</svg></span>`;
  const s = key => OS.settings.get(key);
  const toggle = (key, label, detail = '') => `<div class="set-row"><div><span>${esc(label)}</span>${detail ? `<small>${esc(detail)}</small>` : ''}</div><button type="button" class="switch" role="switch" aria-checked="${!!s(key)}" aria-label="${esc(label)}" data-toggle="${key}"></button></div>`;
  const range = (key, label, min, max, unit = '') => `<div class="set-row"><span>${esc(label)}</span><span class="set-range"><input type="range" min="${min}" max="${max}" value="${s(key)}" data-range="${key}" aria-label="${esc(label)}" /><output data-output="${key}">${s(key)}${unit}</output></span></div>`;
  const select = (key, label, options) => `<div class="set-row"><span>${esc(label)}</span><select data-select="${key}" aria-label="${esc(label)}">${options.map(([v, l]) => `<option value="${esc(v)}"${String(s(key)) === String(v) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
  const group = (rows, title = '') => `${title ? `<h3 class="set-group-title">${esc(title)}</h3>` : ''}<div class="set-group">${rows}</div>`;
  const info = (label, value) => `<div class="set-row"><span>${esc(label)}</span><span class="set-value">${esc(value)}</span></div>`;

  function storageBreakdown() {
    const state = CloudStorage.load();
    const size = key => new Blob([JSON.stringify(state[key] ?? '')]).size;
    const total = CloudStorage.getSize();
    const parts = [['Files', size('vfs'), '#0a84ff'], ['Photos', size('photos'), '#ff9f0a'], ['Notes & Reminders', size('notes') + size('todos') + size('calendar_events'), '#ffd60a'], ['Other', Math.max(0, total - size('vfs') - size('photos') - size('notes') - size('todos') - size('calendar_events')), '#8e8e93']];
    const quota = 5 * 1024 * 1024;
    return `<div class="set-storage"><div class="set-storage-head"><strong>CloudOS storage</strong><span>${OS.util.formatBytes(total)} of about 5 MB</span></div><div class="set-bar">${parts.map(([, bytes, color]) => `<i style="width:${(bytes / quota) * 100}%;background:${color}"></i>`).join('')}</div><div class="set-legend">${parts.map(([label, bytes, color]) => `<span><i style="background:${color}"></i>${label} · ${OS.util.formatBytes(bytes)}</span>`).join('')}</div></div>`;
  }

  function content(id) {
    const battery = OS.menubar.battery();
    switch (id) {
      case 'appearance': return `<h2>Appearance</h2>${group(`<div class="set-row set-appearance"><span>Appearance</span><div class="set-looks">${[['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']].map(([v, l]) => `<button type="button" class="set-look is-${v}" data-look="${v}" aria-pressed="${s('appearance') === v}"><span class="set-look-art"></span>${l}</button>`).join('')}</div></div>
          <div class="set-row"><span>Accent color</span><div class="set-accents">${Object.entries(OS.theme.ACCENTS).map(([k, a]) => `<button type="button" class="set-accent" data-accent="${k}" style="--c:${a.dark}" aria-label="${a.name}" aria-pressed="${s('accent') === k}" title="${a.name}"></button>`).join('')}</div></div>`)}
          <p class="set-note">The terminal keeps its charcoal forest look in both modes, like macOS Terminal.</p>`;
      case 'accessibility': return `<h2>Accessibility</h2>${group(toggle('reduceMotion', 'Reduce motion', 'Turns off window animations, Dock magnification, and the forest fog. Your device’s reduced-motion setting is always respected.') + toggle('increaseContrast', 'Increase contrast', 'Opaque menu bar, Dock, and menus; also switches Terminal to its contrast theme.'), 'Display')}`;
      case 'desktop-dock': {
        const pinned = s('pinnedApps') || [];
        return `<h2>Desktop &amp; Dock</h2>${group(range('dockSize', 'Size', 32, 80, ' pt') + toggle('dockMagnification', 'Magnification') + range('dockMagnificationSize', 'Magnified size', 48, 128, ' pt') + select('minimizeEffect', 'Minimize windows using', [['genie', 'Genie Effect'], ['scale', 'Scale Effect']]) + select('titlebarDoubleClick', 'Double-click a window’s title bar to', [['zoom', 'Zoom'], ['minimize', 'Minimize'], ['none', 'Do Nothing']]) + toggle('autoHideDock', 'Automatically hide and show the Dock') + toggle('showRecentApps', 'Show suggested and recent apps in Dock'), 'Dock')}
          ${group(toggle('autoHideMenuBar', 'Automatically hide and show the menu bar'), 'Menu Bar')}
          ${group(OS.apps.list().filter(a => a.id !== 'finder').map(a => `<label class="set-row set-app-row"><span class="set-app"><img src="${esc(a.icon)}" alt="" />${esc(a.name)}</span><input type="checkbox" data-pin="${a.id}"${pinned.includes(a.id) ? ' checked' : ''} aria-label="Keep ${esc(a.name)} in the Dock" /></label>`).join(''), 'Apps in the Dock')}
          ${group(`<div class="set-row"><span>Tiling</span><span class="set-value">Drag a window to the left or right edge to tile it, or to the top to fill the screen.</span></div>`, 'Windows')}`;
      }
      case 'displays': return `<h2>Displays</h2>${group(range('brightness', 'Brightness', 30, 100, '%') + toggle('nightShift', 'Night Shift', 'Warmer colors for evening use.'))}${group(info('Screen', `${screen.width} × ${screen.height}`) + info('Scale', `${window.devicePixelRatio || 1}×`) + info('Window', `${window.innerWidth} × ${window.innerHeight}`), 'This display')}`;
      case 'sound': return `<h2>Sound</h2>${group(range('volume', 'Output volume', 0, 100, '%') + toggle('soundEffects', 'Play sound effects', 'A chime for notifications and a shutter sound in Photo Booth.') + '<div class="set-row"><span>Alert sound</span><button type="button" class="push-button" data-test-sound>Play</button></div>')}`;
      case 'focus': return `<h2>Focus</h2>${group(toggle('doNotDisturb', 'Do Not Disturb', 'Silences notification banners. They still collect in Notification Center.'))}`;
      case 'control-center': return `<h2>Control Center</h2>${group(toggle('showBatteryPercentage', 'Show battery percentage', battery ? '' : 'This browser doesn’t report battery status.'), 'Menu Bar')}<p class="set-note">Control Center is in the menu bar next to the clock.</p>`;
      case 'wallpaper': {
        const current = s('wallpaper');
        const photos = CloudStorage.get('photos', []).slice(0, 8);
        return `<h2>Wallpaper</h2><div class="set-wall-current" style="background:${esc(OS.theme.wallpaper().background)}"><span>${esc(OS.theme.wallpaper().name)}</span></div>
          <h3 class="set-group-title">Desktop pictures</h3><div class="set-walls">${OS.theme.WALLPAPERS.map(w => `<button type="button" class="set-wall" data-wall="${w.id}" aria-pressed="${current === w.id}" style="background:${esc(w.background)}"><span>${esc(w.name)}</span></button>`).join('')}</div>
          <h3 class="set-group-title">Photos</h3><div class="set-walls"><button type="button" class="set-wall" data-wall="photo:sanket" aria-pressed="${current === 'photo:sanket'}" style="background:url('images/photos/sanket.jpg') center/cover"><span>Sanket</span></button>${photos.map(p => `<button type="button" class="set-wall" data-wall="photo:${esc(p.id)}" aria-pressed="${current === `photo:${p.id}`}" style="background:url('${esc(p.src)}') center/cover"><span>Photo Booth</span></button>`).join('')}</div>`;
      }
      case 'wifi': return `<h2>Wi-Fi</h2>${group(toggle('wifi', 'Wi-Fi') + info('Status', navigator.onLine ? (s('wifi') ? 'Connected to the internet' : 'Connected (Wi-Fi turned off in CloudOS)') : 'No internet connection'))}<p class="set-note">Status reflects whether this browser is online. Turning Wi-Fi off only changes the menu bar icon.</p>`;
      case 'bluetooth': return `<h2>Bluetooth</h2>${group(toggle('bluetooth', 'Bluetooth'))}<p class="set-note">A preference within CloudOS; no devices are scanned.</p>`;
      case 'network': {
        const connection = navigator.connection;
        return `<h2>Network</h2>${group(info('Status', navigator.onLine ? 'Connected' : 'Offline') + (connection?.effectiveType ? info('Connection quality', connection.effectiveType.toUpperCase()) : '') + (connection?.downlink ? info('Estimated bandwidth', `${connection.downlink} Mbps`) : ''))}`;
      }
      case 'battery': return `<h2>Battery</h2>${battery ? group(info('Battery level', `${Math.round(battery.level * 100)}%`) + info('Power source', battery.charging ? 'Power Adapter' : 'Battery')) : '<p class="set-note">This browser doesn’t report battery information, so CloudOS doesn’t show one.</p>'}`;
      case 'lock': return `<h2>Lock Screen</h2>${group(toggle('requirePassword', 'Show the lock screen at startup', 'Any password unlocks CloudOS.') + '<div class="set-row"><span>Lock now</span><button type="button" class="push-button" data-lock>Lock Screen</button></div>')}`;
      case 'users': return `<h2>Users &amp; Groups</h2>${group(`<div class="set-row set-user"><img src="images/avatar.jpg" alt="" /><div><strong>${esc(Portfolio.data.person.name)}</strong><small>${esc(Portfolio.data.person.role)} · Admin</small></div></div>`)}${group(info('Visitors', 'Signed in as a guest of this portfolio'), 'Guests')}`;
      case 'general': return `<h2>General</h2>
          ${group(`<div class="set-row set-about"><img src="images/icons/files/macbook.png" alt="" /><div><strong>CloudOS</strong><small>Sequoia-inspired portfolio desktop · Version 15.0</small></div></div>` + info('Built by', Portfolio.data.person.name) + info('Browser', navigator.userAgentData?.brands?.filter(b => !/Not.?A.?Brand/i.test(b.brand)).map(b => b.brand).join(', ') || navigator.vendor || 'Web browser') + info('Portfolio data', `${Portfolio.contentCounts.projects} projects · ${Portfolio.contentCounts.skills} skills`), 'About')}
          ${group(toggle('openTerminalAtLogin', 'Open Terminal at login', 'The portfolio terminal opens after you unlock, like terminal.sanketmuchhala.com.'), 'Login Items')}
          ${group(`<div class="set-row set-block">${storageBreakdown()}</div><div class="set-row"><span>Back up everything</span><button type="button" class="push-button" data-export>Export…</button></div><div class="set-row"><span>Restore from a backup</span><button type="button" class="push-button" data-import>Import…</button></div><div class="set-row"><span>Erase all content and settings</span><button type="button" class="push-button is-destructive" data-reset>Reset CloudOS…</button></div>`, 'Storage')}`;
      default: return '';
    }
  }

  function renderSidebar() {
    const q = query.trim().toLowerCase();
    const panes = PANES.filter(p => p.id !== 'battery' || OS.menubar.battery()).filter(p => !q || p.name.toLowerCase().includes(q) || p.keywords.some(k => k.includes(q)));
    let lastGroup = 0;
    win.body.querySelector('[data-panes]').innerHTML = panes.map(p => {
      const gap = p.group !== lastGroup && lastGroup ? '<div class="set-gap"></div>' : '';
      lastGroup = p.group;
      return `${gap}<button type="button" class="set-pane-item${p.id === pane ? ' is-active' : ''}" data-pane="${p.id}" aria-current="${p.id === pane}">${icon(p)}${esc(p.name)}</button>`;
    }).join('') || '<p class="set-none">No Results</p>';
  }

  function render() {
    if (!win) return;
    renderSidebar();
    const main = win.body.querySelector('[data-content]');
    const scroll = main.scrollTop;
    main.innerHTML = `<div class="set-page">${content(pane)}</div>`;
    main.scrollTop = scroll;
    const p = PANES.find(x => x.id === pane);
    win.body.querySelector('[data-title]').textContent = p?.name || 'System Settings';
    win.setTitle(p?.name || 'System Settings');
  }

  function exportBackup() {
    const blob = new Blob([CloudStorage.export()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cloudos-backup-${OS.util.dateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function importBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const ok = await OS.dialog.confirm({ title: `Restore CloudOS from “${file.name}”?`, message: 'Your current files, notes, and settings will be replaced. CloudOS restarts afterwards.', confirm: 'Restore', destructive: true, win });
      if (!ok) return;
      if (CloudStorage.import(await file.text())) window.location.reload();
      else OS.dialog.alert({ title: 'That file isn’t a CloudOS backup.', win });
    });
    input.click();
  }
  async function reset() {
    const ok = await OS.dialog.confirm({ title: 'Erase all content and settings?', message: 'Your notes, reminders, events, files, photos, and settings in this browser will be deleted. You can’t undo this.', confirm: 'Erase', destructive: true, win });
    if (!ok) return;
    CloudStorage.clear();
    window.location.reload();
  }

  function open(args = {}) {
    if (args.pane && PANES.some(p => p.id === args.pane)) pane = args.pane;
    win = OS.wm.create({
      app: 'settings', title: 'System Settings', chrome: 'toolbar', width: 760, height: 560, minWidth: 420, minHeight: 360, className: 'settings-win', lightsTop: 19, lightsLeft: 18,
      content: `<div class="settings">
        <aside class="sidebar set-sidebar" data-drag aria-label="Settings">
          <div class="set-sidebar-top" data-drag></div>
          <label class="set-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="m14.5 14.5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input type="search" placeholder="Search" aria-label="Search settings" data-search /></label>
          <button type="button" class="set-user-card" data-pane="users"><img src="images/avatar.jpg" alt="" /><span><strong>${esc(Portfolio.data.person.name)}</strong><small>${esc(Portfolio.data.person.role)}</small></span></button>
          <nav class="set-panes" data-panes aria-label="Panes"></nav>
        </aside>
        <section class="set-main"><header class="toolbar" data-drag><h1 class="toolbar-title" data-title></h1><div class="toolbar-flex" data-drag></div></header><div class="set-content" data-content></div></section>
      </div>`,
      onClose: () => { win = null; return true; },
    });
    win.body.addEventListener('click', event => {
      const t = event.target;
      const p = t.closest('[data-pane]');
      if (p) { pane = p.dataset.pane; render(); return; }
      const sw = t.closest('[data-toggle]');
      if (sw) { OS.settings.toggle(sw.dataset.toggle); return; }
      const look = t.closest('[data-look]');
      if (look) { OS.settings.set('appearance', look.dataset.look); return; }
      const accent = t.closest('[data-accent]');
      if (accent) { OS.settings.set('accent', accent.dataset.accent); return; }
      const wall = t.closest('[data-wall]');
      if (wall) { OS.settings.set('wallpaper', wall.dataset.wall); return; }
      if (t.closest('[data-test-sound]')) {
        const was = OS.settings.get('soundEffects');
        if (!was) OS.settings.set('soundEffects', true);
        OS.notify({ app: 'settings', title: 'Alert sound', message: 'This is how notifications sound.', timeout: 2500 });
        if (!was) OS.settings.set('soundEffects', false);
        return;
      }
      if (t.closest('[data-lock]')) { OS.lock(); return; }
      if (t.closest('[data-export]')) { exportBackup(); return; }
      if (t.closest('[data-import]')) { importBackup(); return; }
      if (t.closest('[data-reset]')) reset();
    });
    win.body.addEventListener('input', event => {
      const r = event.target.closest('[data-range]');
      if (r) {
        OS.settings.set(r.dataset.range, Number(r.value));
        const out = win.body.querySelector(`[data-output="${r.dataset.range}"]`);
        if (out) out.textContent = `${r.value}${out.textContent.replace(/^[\d.]+/, '')}`;
      }
      if (event.target.matches('[data-search]')) { query = event.target.value; renderSidebar(); }
    });
    win.body.addEventListener('change', event => {
      const sel = event.target.closest('[data-select]');
      if (sel) OS.settings.set(sel.dataset.select, sel.value);
      const pin = event.target.closest('[data-pin]');
      if (pin) {
        const pinned = (OS.settings.get('pinnedApps') || []).filter(id => id !== pin.dataset.pin);
        OS.settings.set('pinnedApps', pin.checked ? [...pinned, pin.dataset.pin] : pinned);
      }
    });
    render();
    return win;
  }

  OS.on('settings:change', () => {
    if (!win) return;
    const active = document.activeElement;
    if (active?.matches?.('[data-range]') && win.body.contains(active)) return;
    render();
  });

  OS.apps.register({
    id: 'settings',
    name: 'System Settings',
    icon: 'images/icons/apps/settings.png',
    keywords: ['preferences', 'settings', 'options', 'dark mode', 'wallpaper', 'dock'],
    single: true,
    version: '15.0',
    about: 'Appearance, wallpaper, Dock and menu bar, display, sound, Focus, accessibility, lock screen, and storage — all saved in this browser.',
    open,
    onReopen: (w, args) => { if (args.pane && PANES.some(p => p.id === args.pane)) { pane = args.pane; render(); } },
  });
})();
