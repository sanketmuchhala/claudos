/* ===== MENU BAR =====
   Apple menu, the active app's menus, and status items. Status items use
   real browser information (online state, the Battery API where available)
   and hide themselves rather than invent values. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  const mod = OS.util.isMac ? '⌘' : 'Ctrl+';
  let bar, left, right;
  let openKey = null;
  let battery = null;

  const APPLE = '<svg viewBox="0 0 814 1000" aria-hidden="true"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" fill="currentColor"/></svg>';
  const ICONS = {
    wifi: '<svg viewBox="0 0 20 16" aria-hidden="true"><path d="M10 13.6a1.5 1.5 0 1 0 0 .01ZM5.9 10.2a5.8 5.8 0 0 1 8.2 0l-1.2 1.2a4.1 4.1 0 0 0-5.8 0Zm-2.7-2.7a9.6 9.6 0 0 1 13.6 0l-1.2 1.2a7.9 7.9 0 0 0-11.2 0ZM.5 4.8a13.4 13.4 0 0 1 19 0l-1.2 1.2a11.7 11.7 0 0 0-16.6 0Z" fill="currentColor"/></svg>',
    wifiOff: '<svg viewBox="0 0 20 16" aria-hidden="true"><path d="M10 13.6a1.5 1.5 0 1 0 0 .01ZM5.9 10.2a5.8 5.8 0 0 1 8.2 0l-1.2 1.2a4.1 4.1 0 0 0-5.8 0Zm-2.7-2.7a9.6 9.6 0 0 1 13.6 0l-1.2 1.2a7.9 7.9 0 0 0-11.2 0ZM.5 4.8a13.4 13.4 0 0 1 19 0l-1.2 1.2a11.7 11.7 0 0 0-16.6 0Z" fill="currentColor" opacity=".35"/><path d="M3 1.5l14 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m14.2 14.2 5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    control: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="6" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="7" r="2" fill="currentColor"/><rect x="3" y="14" width="18" height="6" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="17" r="2" fill="currentColor"/></svg>',
    fullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V4h4m8 0h4v4M4 16v4h4m8 0h4v-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  const batteryIcon = (level, charging) => `<svg viewBox="0 0 30 14" aria-hidden="true"><rect x=".75" y=".75" width="25" height="12.5" rx="3.6" fill="none" stroke="currentColor" stroke-opacity=".55" stroke-width="1.2"/><rect x="2.5" y="2.5" width="${Math.max(1.5, 21.5 * level)}" height="9" rx="2.2" fill="currentColor"/><path d="M27.6 4.8v4.4c.9-.3 1.6-1.2 1.6-2.2s-.7-1.9-1.6-2.2Z" fill="currentColor" fill-opacity=".55"/>${charging ? '<path d="M14.8 2.2 9.6 7.6h3.4l-1.4 4.2 5.2-5.4h-3.4Z" fill="#000" fill-opacity=".75"/>' : ''}</svg>`;

  function recentItems() {
    const apps = OS.apps.running().concat(OS.apps.recents()).filter((id, i, all) => all.indexOf(id) === i && OS.apps.get(id)).slice(0, 6);
    const docs = (CloudStorage.get('recents', []) || []).map(path => VFS.stat(path)).filter(Boolean).slice(0, 6);
    return [
      { header: true, label: 'Applications' },
      ...apps.map(id => ({ label: OS.apps.get(id).name, icon: OS.apps.get(id).icon, action: () => OS.apps.launch(id) })),
      '-',
      { header: true, label: 'Documents' },
      ...(docs.length ? docs.map(node => ({ label: node.name, icon: OS.fs.iconFor(node), action: () => OS.fs.open(node.path) })) : [{ label: 'No recent documents', disabled: true }]),
    ];
  }

  function appleMenu() {
    return [
      { label: 'About This Mac', action: () => OS.apps.launch('about') },
      '-',
      { label: 'System Settings…', action: () => OS.apps.launch('settings') },
      { label: 'Recent Items', submenu: recentItems },
      '-',
      { label: 'Force Quit…', shortcut: `⌥${mod}⎋`, action: () => OS.power.forceQuit() },
      '-',
      { label: 'Sleep', action: () => OS.power.sleep() },
      { label: 'Restart…', action: () => OS.power.restart() },
      { label: 'Shut Down…', action: () => OS.power.shutDown() },
      '-',
      { label: 'Lock Screen', shortcut: `⌃${mod}Q`, action: () => OS.lock() },
      { label: `Log Out ${Portfolio.data.person.name}…`, shortcut: `⇧${mod}Q`, action: () => OS.power.logOut() },
    ];
  }

  function renderLeft() {
    const menus = OS.apps.menusFor(OS.apps.active());
    left.innerHTML = `<button type="button" class="mb-item mb-apple" data-mb="apple" aria-label="Apple menu" aria-haspopup="menu">${APPLE}</button>${menus.map((m, i) => `<button type="button" class="mb-item${m.bold ? ' mb-app' : ''}" data-mb="${i}" aria-haspopup="menu">${esc(m.title)}</button>`).join('')}`;
  }

  function keys() { return [...left.querySelectorAll('[data-mb]')].map(b => b.dataset.mb); }

  function openMenu(key, keyboard = false) {
    const button = left.querySelector(`[data-mb="${key}"]`);
    if (!button) return;
    const items = key === 'apple' ? appleMenu() : OS.apps.menusFor(OS.apps.active())[Number(key)]?.items;
    if (!items) return;
    const returnFocus = document.activeElement;
    left.querySelectorAll('.mb-item').forEach(b => { b.classList.toggle('is-open', b === button); b.setAttribute('aria-expanded', String(b === button)); });
    openKey = key;
    bar.classList.add('has-open-menu');
    OS.menu.open(items, {
      anchorRect: button.getBoundingClientRect(),
      top: bar.getBoundingClientRect().bottom,
      gap: 1,
      keyboard,
      className: 'menu-bar-menu',
      label: key === 'apple' ? 'Apple' : button.textContent,
      ignore: [left],
      returnFocus,
      onNavigate: direction => {
        const list = keys();
        const next = list[(list.indexOf(openKey) + direction + list.length) % list.length];
        openMenu(next, true);
      },
      onEscape: () => { if (keyboard) button.focus(); },
      onClose: () => {
        if (openKey !== key) return;
        openKey = null;
        button.classList.remove('is-open');
        button.setAttribute('aria-expanded', 'false');
        bar.classList.remove('has-open-menu');
      },
    });
  }

  function formatClock(date = new Date()) {
    return date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).replaceAll(',', '');
  }

  let clockTimer;
  function tick() {
    const time = right.querySelector('time');
    const now = new Date();
    time.dateTime = now.toISOString();
    const date = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replaceAll(',', '');
    time.innerHTML = `<span class="mb-clock-date">${date}&nbsp;</span>${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    right.querySelector('[data-status="clock"]').setAttribute('aria-label', `${now.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}. Open Notification Center`);
    clearTimeout(clockTimer);
    clockTimer = setTimeout(tick, 60e3 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
    OS.dock?.update();
  }

  function renderStatus() {
    const wifi = right.querySelector('[data-status="wifi"]');
    const online = navigator.onLine && OS.settings.get('wifi');
    wifi.innerHTML = online ? ICONS.wifi : ICONS.wifiOff;
    wifi.setAttribute('aria-label', online ? 'Wi-Fi: connected' : 'Wi-Fi: not connected');
    const batt = right.querySelector('[data-status="battery"]');
    if (battery) {
      const pct = Math.round(battery.level * 100);
      batt.hidden = false;
      batt.innerHTML = `${OS.settings.get('showBatteryPercentage') ? `<span class="mb-battery-pct">${pct}%</span>` : ''}${batteryIcon(battery.level, battery.charging)}`;
      batt.setAttribute('aria-label', `Battery ${pct}%${battery.charging ? ', charging' : ''}`);
    } else batt.hidden = true;
  }

  function statusMenu(kind, button) {
    const anchorRect = button.getBoundingClientRect();
    const opts = { anchorRect, top: bar.getBoundingClientRect().bottom, gap: 1, align: 'right', className: 'menu-bar-menu', ignore: [button] };
    if (kind === 'wifi') {
      OS.menu.open([
        { label: 'Wi-Fi', checked: !!OS.settings.get('wifi'), action: () => OS.settings.toggle('wifi') },
        '-',
        { header: true, label: 'Connection' },
        { label: navigator.onLine ? 'Connected to the internet' : 'No internet connection', disabled: true },
        '-',
        { label: 'Wi-Fi Settings…', action: () => OS.apps.launch('settings', { pane: 'wifi' }) },
      ], opts);
    } else if (kind === 'battery' && battery) {
      OS.menu.open([
        { header: true, label: `Battery · ${Math.round(battery.level * 100)}%` },
        { label: `Power Source: ${battery.charging ? 'Power Adapter' : 'Battery'}`, disabled: true },
        '-',
        { label: 'Show Percentage', checked: !!OS.settings.get('showBatteryPercentage'), action: () => OS.settings.toggle('showBatteryPercentage') },
        { label: 'Battery Settings…', action: () => OS.apps.launch('settings', { pane: 'battery' }) },
      ], opts);
    }
  }

  function init() {
    bar = document.getElementById('menubar');
    left = bar.querySelector('.mb-left');
    right = bar.querySelector('.mb-right');
    const portfolio = Portfolio.link('portfolio');
    right.innerHTML = `<a class="mb-link" href="${esc(portfolio?.url || 'https://sanketmuchhala.com/')}" target="_blank" rel="noopener noreferrer">Main portfolio ↗</a>
      <button type="button" class="mb-status" data-status="fullscreen" aria-label="Toggle Fullscreen" title="Toggle Fullscreen">${ICONS.fullscreen}</button>
      <button type="button" class="mb-status" data-status="battery" hidden></button>
      <button type="button" class="mb-status" data-status="wifi"></button>
      <button type="button" class="mb-status" data-status="spotlight" aria-label="Spotlight" title="Spotlight (${Portfolio.shortcuts.searchShortcutHints().primary})">${ICONS.search}</button>
      <button type="button" class="mb-status" data-status="control" aria-label="Control Center" aria-haspopup="dialog">${ICONS.control}</button>
      <button type="button" class="mb-status mb-clock" data-status="clock" aria-haspopup="dialog"><time></time></button>`;
    renderLeft();
    renderStatus();
    tick();

    left.addEventListener('pointerdown', event => {
      const button = event.target.closest('[data-mb]');
      if (!button || event.button !== 0) return;
      event.preventDefault();
      if (openKey === button.dataset.mb) { OS.menu.closeAll(); return; }
      openMenu(button.dataset.mb, false);
    });
    left.addEventListener('pointerover', event => {
      const button = event.target.closest('[data-mb]');
      if (button && openKey !== null && openKey !== button.dataset.mb && event.pointerType === 'mouse') openMenu(button.dataset.mb, false);
    });
    left.addEventListener('keydown', event => {
      const button = event.target.closest('[data-mb]');
      if (!button) return;
      if (['Enter', ' ', 'ArrowDown'].includes(event.key)) { event.preventDefault(); openMenu(button.dataset.mb, true); }
      if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        const buttons = [...left.querySelectorAll('[data-mb]')];
        buttons[(buttons.indexOf(button) + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length].focus();
      }
    });
    right.addEventListener('click', event => {
      const button = event.target.closest('[data-status]');
      if (!button) return;
      const kind = button.dataset.status;
      if (kind === 'spotlight') OS.spotlight.toggle();
      if (kind === 'control') OS.controlCenter.toggle(button);
      if (kind === 'clock') OS.notificationCenter.toggle();
      if (kind === 'wifi' || kind === 'battery') statusMenu(kind, button);
      if (kind === 'fullscreen') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
      }
    });

    // Auto-hide: reveal when the pointer reaches the top edge.
    document.addEventListener('pointermove', event => {
      if (!document.documentElement.classList.contains('menubar-autohide')) return;
      if (event.clientY <= 3) bar.classList.add('is-revealed');
      else if (event.clientY > 40 && !bar.classList.contains('has-open-menu')) bar.classList.remove('is-revealed');
    });

    OS.on('app:active', () => { OS.menu.closeAll(); renderLeft(); });
    OS.on('settings:change', ({ key }) => { if (['wifi', 'showBatteryPercentage', '*'].includes(key)) renderStatus(); });
    window.addEventListener('online', renderStatus);
    window.addEventListener('offline', renderStatus);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
    navigator.getBattery?.().then(b => {
      battery = b;
      renderStatus();
      ['levelchange', 'chargingchange'].forEach(type => b.addEventListener(type, renderStatus));
    }).catch(() => {});
  }

  OS.menubar = { init, render: renderLeft, battery: () => battery, formatClock, open: openMenu };
})();
