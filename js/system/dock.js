/* ===== DOCK =====
   Pinned apps, running apps, recent apps, Downloads, and Trash. Icons
   magnify continuously around the pointer (like macOS, the Dock grows and
   neighbors make room), bounce while launching, and show running dots and
   badges. Right-click an icon for its menu. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  const PHONE_APPS = ['launchpad', 'finder', 'safari', 'notes', 'terminal', 'settings'];
  let dock;
  let tray;
  let pointerX = null;
  let raf = 0;
  let hideTimer;
  const sizes = new WeakMap();
  const badges = {};

  const pinned = () => (OS.settings.get('pinnedApps') || []).filter(id => OS.apps.get(id));
  const baseSize = () => {
    const configured = OS.util.isPhone() ? 42 : OS.settings.get('dockSize') || 60;
    return Number(getComputedStyle(document.documentElement).getPropertyValue('--dock-fit')) || configured;
  };
  const canMagnify = () => OS.settings.get('dockMagnification') && OS.util.motionOn() && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function iconMarkup(app) {
    return app.iconHtml ? app.iconHtml() : `<img src="${esc(app.icon)}" alt="" draggable="false" />`;
  }

  function appItem(id, extraClass = '') {
    const app = OS.apps.get(id);
    return `<button type="button" class="dock-item${extraClass}" data-dock-app="${esc(id)}" aria-label="${esc(app.name)}">
      <span class="dock-icon">${iconMarkup(app)}</span>
      <span class="dock-tip" aria-hidden="true">${esc(app.name)}</span>
      <span class="dock-dot" aria-hidden="true"></span>
      <span class="dock-badge" hidden></span>
    </button>`;
  }

  function render() {
    if (!tray) return;
    const pins = pinned();
    const running = OS.apps.running().filter(id => !pins.includes(id) && OS.apps.get(id));
    const recents = OS.settings.get('showRecentApps') ? OS.apps.recents().filter(id => !running.includes(id)).slice(0, 3) : [];
    const trashFull = VFS.trashCount() > 0;
    tray.innerHTML = [
      ...pins.map(id => appItem(id, PHONE_APPS.includes(id) ? '' : ' phone-hidden')),
      ...running.map(id => appItem(id)),
      recents.length ? '<span class="dock-divider" aria-hidden="true"></span>' : '',
      ...recents.map(id => appItem(id, ' is-recent phone-hidden')),
      '<span class="dock-divider" aria-hidden="true"></span>',
      `<button type="button" class="dock-item dock-stack phone-hidden" data-dock-folder="/Downloads" aria-label="Downloads"><span class="dock-icon"><img src="images/icons/apps/downloads.png" alt="" draggable="false" /></span><span class="dock-tip" aria-hidden="true">Downloads</span></button>`,
      `<button type="button" class="dock-item dock-trash" data-dock-trash aria-label="Trash${trashFull ? ', contains items' : ''}"><span class="dock-icon"><img src="images/icons/files/${trashFull ? 'trash-full' : 'trash'}.png" alt="" draggable="false" /></span><span class="dock-tip" aria-hidden="true">Trash</span></button>`,
    ].join('');
    update();
    fit();
  }

  /** Shrinks icons when the Dock would not fit the screen, like macOS. */
  function fit() {
    const count = tray.querySelectorAll('.dock-item:not([hidden])').length || 1;
    const visible = [...tray.querySelectorAll('.dock-item')].filter(el => el.offsetParent !== null).length || count;
    const configured = OS.util.isPhone() ? 42 : OS.settings.get('dockSize') || 60;
    const dividers = tray.querySelectorAll('.dock-divider').length;
    const available = window.innerWidth - 32 - dividers * 12 - 16;
    const fitSize = Math.max(28, Math.min(configured, Math.floor(available / visible) - 2));
    document.documentElement.style.setProperty('--dock-fit', fitSize);
    document.documentElement.style.setProperty('--dock-icon', `${fitSize}px`);
    tray.querySelectorAll('.dock-item').forEach(el => { sizes.set(el, fitSize); el.style.removeProperty('--size'); });
  }

  function update() {
    if (!tray) return;
    tray.querySelectorAll('[data-dock-app]').forEach(el => {
      const id = el.dataset.dockApp;
      el.classList.toggle('is-running', OS.apps.isRunning(id));
      el.classList.toggle('phone-running', OS.apps.isRunning(id));
      const badge = el.querySelector('.dock-badge');
      const value = badges[id];
      badge.hidden = !value;
      badge.textContent = value || '';
      if (id === 'calendar') {
        const icon = el.querySelector('.dock-icon');
        const fresh = OS.apps.get('calendar').iconHtml?.();
        if (fresh && icon.dataset.day !== String(new Date().getDate())) { icon.innerHTML = fresh; icon.dataset.day = String(new Date().getDate()); }
      }
    });
  }

  /* ---------- Magnification ---------- */
  function sizeAt(distance, base, max) {
    const range = base * 2.8;
    if (distance >= range) return base;
    return base + (max - base) * (1 + Math.cos((Math.PI * distance) / range)) / 2;
  }
  function frame() {
    raf = 0;
    const base = baseSize();
    const max = Math.max(base, Math.min(128, OS.settings.get('dockMagnificationSize') || 88));
    let settled = true;
    tray.querySelectorAll('.dock-item').forEach(el => {
      if (el.offsetParent === null) return;
      const rect = el.getBoundingClientRect();
      const target = pointerX == null ? base : sizeAt(Math.abs(pointerX - (rect.left + rect.width / 2)), base, max);
      const current = sizes.get(el) ?? base;
      let next = current + (target - current) * 0.35;
      if (Math.abs(next - target) < 0.25) next = target; else settled = false;
      sizes.set(el, next);
      if (next === base) el.style.removeProperty('--size'); else el.style.setProperty('--size', `${next.toFixed(2)}px`);
    });
    if (!settled) raf = requestAnimationFrame(frame);
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(frame); }

  /* ---------- Actions ---------- */
  function togglePin(id) {
    const list = pinned();
    OS.settings.set('pinnedApps', list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  }

  function menuFor(el) {
    if (el.matches('[data-dock-trash]')) {
      const count = VFS.trashCount();
      return [
        { label: 'Open', action: () => OS.apps.launch('finder', { location: 'trash' }) },
        '-',
        { label: 'Empty Trash', disabled: !count, action: () => OS.fs.emptyTrash() },
      ];
    }
    if (el.matches('[data-dock-folder]')) {
      return [
        { label: 'Open “Downloads”', action: () => OS.apps.launch('finder', { path: '/Downloads' }) },
        { label: 'Open in Terminal', action: () => OS.apps.launch('terminal', { run: 'cd ~/Downloads' }) },
      ];
    }
    const id = el.dataset.dockApp;
    const app = OS.apps.get(id);
    const running = OS.apps.isRunning(id);
    const windows = OS.wm.list(id).filter(w => !w.data.about);
    const isPinned = pinned().includes(id);
    return [
      ...windows.map(w => ({ label: w.title || app.name, checked: w.isFocused() ? true : undefined, action: () => { OS.wm.focus(w.id); w.focusContent(); } })),
      windows.length ? '-' : null,
      ...(app.dockMenu ? [...app.dockMenu(), '-'] : []),
      { label: 'Options', submenu: [
        { label: 'Keep in Dock', checked: isPinned, disabled: id === 'finder', action: () => togglePin(id) },
        { label: 'Show in Finder', action: () => OS.apps.launch('finder', { location: 'applications' }) },
      ] },
      '-',
      running && id !== 'finder' && windows.length ? { label: 'Hide', action: () => OS.wm.hideApp(id) } : null,
      running && id !== 'finder' ? { label: 'Quit', action: () => OS.apps.quit(id) } : null,
      !running ? { label: 'Open', action: () => OS.apps.launch(id) } : null,
    ];
  }

  function onClick(event) {
    const item = event.target.closest('.dock-item');
    if (!item) return;
    if (item.dataset.dockApp) {
      const id = item.dataset.dockApp;
      if (id === 'launchpad') { OS.launchpad.toggle(); return; }
      OS.launchpad?.close();
      OS.apps.activate(id);
    } else if (item.dataset.dockFolder) {
      OS.launchpad?.close();
      OS.apps.launch('finder', { path: item.dataset.dockFolder });
    } else if (item.hasAttribute('data-dock-trash')) {
      OS.launchpad?.close();
      OS.apps.launch('finder', { location: 'trash' });
    }
  }

  function openMenu(item) {
    const rect = item.querySelector('.dock-icon').getBoundingClientRect();
    OS.menu.open(menuFor(item), { anchorRect: rect, above: true, gap: 12, align: 'left', className: 'menu-dock', label: item.getAttribute('aria-label'), onClose: () => dock.classList.remove('has-menu') });
    // Centre the menu over the icon.
    const menu = document.querySelector('#overlays > .menu:last-child');
    if (menu) {
      const width = menu.offsetWidth;
      menu.style.left = `${Math.max(6, Math.min(window.innerWidth - width - 6, rect.left + rect.width / 2 - width / 2))}px`;
    }
    dock.classList.add('has-menu');
  }

  function init() {
    dock = document.getElementById('dock');
    tray = dock.querySelector('.dock-tray');
    render();
    tray.addEventListener('click', onClick);
    tray.addEventListener('contextmenu', event => {
      const item = event.target.closest('.dock-item');
      if (!item) return;
      event.preventDefault();
      openMenu(item);
    });
    let pressTimer;
    tray.addEventListener('pointerdown', event => {
      const item = event.target.closest('.dock-item');
      if (!item || event.pointerType === 'mouse') return;
      pressTimer = setTimeout(() => openMenu(item), 550);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => tray.addEventListener(type, () => clearTimeout(pressTimer)));
    tray.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !canMagnify()) return;
      pointerX = event.clientX;
      schedule();
    });
    tray.addEventListener('pointerleave', () => { pointerX = null; schedule(); });

    // Auto-hide: reveal at the bottom edge, hide after the pointer leaves.
    document.addEventListener('pointermove', event => {
      if (!document.documentElement.classList.contains('dock-autohide')) return;
      if (event.clientY >= window.innerHeight - 4) { clearTimeout(hideTimer); dock.classList.add('is-revealed'); }
    });
    dock.addEventListener('pointerleave', () => {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { if (!dock.classList.contains('has-menu')) dock.classList.remove('is-revealed'); }, 350);
    });

    ['app:launch', 'app:quit'].forEach(type => OS.on(type, render));
    ['app:state', 'app:active', 'window:open', 'window:close'].forEach(type => OS.on(type, update));
    OS.on('vfs:change', () => {
      const full = VFS.trashCount() > 0;
      const img = tray.querySelector('[data-dock-trash] img');
      if (img && img.src.includes('trash-full') !== full) render();
    });
    OS.on('settings:change', ({ key }) => {
      if (['pinnedApps', 'showRecentApps', 'dockSize', '*'].includes(key)) render();
    });
    window.addEventListener('resize', OS.util.debounce(fit, 60));
    setInterval(update, 60e3);
  }

  OS.dock = {
    init, render, update,
    setBadge(id, value) { badges[id] = value ? String(value) : ''; update(); },
    iconRect(id) {
      const el = tray?.querySelector(`[data-dock-app="${CSS.escape(id)}"] .dock-icon`);
      return el && el.offsetParent !== null ? el.getBoundingClientRect() : null;
    },
    trashRect: () => tray?.querySelector('[data-dock-trash] .dock-icon')?.getBoundingClientRect() || null,
    bounce(id) {
      const icon = tray?.querySelector(`[data-dock-app="${CSS.escape(id)}"] .dock-icon`);
      if (!icon || !OS.util.motionOn()) return;
      icon.animate([
        { transform: 'translateY(0)' }, { transform: 'translateY(-22px)', offset: 0.22 }, { transform: 'translateY(0)', offset: 0.46 },
        { transform: 'translateY(-11px)', offset: 0.66 }, { transform: 'translateY(0)' },
      ], { duration: 820, easing: 'cubic-bezier(.3,.6,.4,1)' });
    },
    pulse(id) {
      const icon = tray?.querySelector(`[data-dock-app="${CSS.escape(id)}"] .dock-icon`);
      if (icon && OS.util.motionOn()) icon.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 420, delay: 300 });
    },
    highlightTrash(on) { tray?.querySelector('[data-dock-trash]')?.classList.toggle('is-drop-target', on); },
  };
})();
