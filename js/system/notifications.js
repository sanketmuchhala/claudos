/* ===== NOTIFICATIONS AND NOTIFICATION CENTER =====
   Banners slide in below the menu bar. Focus (Do Not Disturb) delivers them
   silently. Clicking the clock opens Notification Center: delivered
   notifications plus widgets built from real app data. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  const delivered = [];
  let stack;
  let panel = null;
  let ncTimer;

  function playChime() {
    if (!OS.settings.get('soundEffects')) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime((OS.settings.get('volume') ?? 70) / 700, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      gain.connect(ctx.destination);
      [880, 1318].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start(ctx.currentTime + i * 0.09);
        osc.stop(ctx.currentTime + 0.5);
      });
      setTimeout(() => ctx.close(), 800);
    } catch { /* Audio is optional. */ }
  }

  function dismiss(el) {
    if (!el.isConnected || el.classList.contains('is-leaving')) return;
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), OS.util.motionOn() ? 260 : 0);
  }

  function notify({ app = 'finder', title, message = '', icon, timeout = 5000, onClick }) {
    const def = OS.apps.get(app);
    const entry = { id: OS.util.uid('note'), app, title, message, icon: icon || def?.icon || 'images/icons/apps/finder.png', time: Date.now(), onClick };
    delivered.unshift(entry);
    delivered.splice(30);
    if (panel) renderPanel();
    if (OS.settings.get('doNotDisturb') || OS.isLocked?.()) return entry;
    playChime();
    const el = OS.util.el(`<div class="banner" role="status">
      <button type="button" class="banner-close" aria-label="Dismiss notification">×</button>
      <img class="banner-icon" src="${esc(entry.icon)}" alt="" />
      <div class="banner-text"><div class="banner-head"><strong>${esc(title)}</strong><time>now</time></div>${message ? `<p>${esc(message)}</p>` : ''}</div>
    </div>`);
    el.addEventListener('click', event => {
      if (event.target.closest('.banner-close')) { dismiss(el); return; }
      dismiss(el);
      if (onClick) onClick(); else if (def) OS.apps.activate(app);
    });
    stack.prepend(el);
    [...stack.children].slice(3).forEach(dismiss);
    let timer = setTimeout(() => dismiss(el), timeout);
    el.addEventListener('pointerenter', () => clearTimeout(timer));
    el.addEventListener('pointerleave', () => { timer = setTimeout(() => dismiss(el), 2000); });
    return entry;
  }

  /* ---------- Widgets ---------- */
  function upcomingEvents() {
    const today = OS.util.dateKey();
    return CloudStorage.get('calendar_events', [])
      .filter(e => e.date >= today)
      .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
      .slice(0, 3);
  }

  function widgets() {
    const now = new Date();
    const events = upcomingEvents();
    const todos = CloudStorage.get('todos', []).filter(t => !t.d);
    const weather = OS.weather?.summary?.();
    const battery = OS.menubar.battery();
    const stocks = OS.stocks?.summary?.() || [];
    const day = key => new Date(`${key}T00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `
      <section class="nc-widget nc-clock"><time>${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</time><p>${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p></section>
      <section class="nc-widget nc-calendar" data-open-app="calendar"><header><span class="nc-cal-date"><b>${now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</b>${now.getDate()}</span><h3>Up Next</h3></header>
        ${events.length ? events.map(e => `<div class="nc-event"><span class="nc-event-bar"></span><div><strong>${esc(e.title)}</strong><small>${esc(day(e.date))}${e.time ? ` · ${esc(e.time)}` : ''}</small></div></div>`).join('') : '<p class="nc-empty">No upcoming events</p>'}
      </section>
      <section class="nc-widget nc-reminders" data-open-app="reminders"><header><img src="images/icons/apps/reminders.png" alt="" /><h3>Reminders</h3><span class="nc-count">${todos.length}</span></header>
        ${todos.length ? todos.slice(0, 3).map(t => `<div class="nc-todo"><span class="nc-ring"></span>${esc(t.t)}</div>`).join('') : '<p class="nc-empty">All done</p>'}
      </section>
      <section class="nc-widget nc-weather" data-open-app="weather">${weather ? `<header><h3>${esc(weather.city)}</h3><span>${esc(weather.icon)}</span></header><p class="nc-temp">${esc(weather.temp)}</p><p>${esc(weather.condition)}</p><small>${esc(weather.range)}${weather.demo ? ' · offline sample' : ''}</small>` : '<header><h3>Weather</h3></header><p class="nc-empty">Open Weather to load a forecast.</p>'}</section>
      ${stocks.length ? `<section class="nc-widget nc-stocks" data-open-app="stocks"><header><img src="images/icons/apps/stocks.png" alt="" /><h3>Stocks</h3><small>sample data</small></header>${stocks.slice(0, 3).map(s => `<div class="nc-stock"><strong>${esc(s.symbol)}</strong><span>${esc(s.price)}</span><em class="${s.up ? 'up' : 'down'}">${esc(s.change)}</em></div>`).join('')}</section>` : ''}
      ${battery ? `<section class="nc-widget nc-battery"><header><h3>Batteries</h3></header><div class="nc-battery-row"><span class="nc-battery-ring" style="--level:${battery.level}"><b>${Math.round(battery.level * 100)}%</b></span><span>This device${battery.charging ? ' · charging' : ''}</span></div></section>` : ''}`;
  }

  function renderPanel() {
    if (!panel) return;
    panel.innerHTML = `<div class="nc-scroll">
      ${delivered.length ? `<div class="nc-notes"><header><h2>Notifications</h2><button type="button" data-nc-clear>Clear</button></header>${delivered.slice(0, 8).map(n => `<button type="button" class="nc-note" data-note="${n.id}"><img src="${esc(n.icon)}" alt="" /><span><span class="nc-note-head"><strong>${esc(n.title)}</strong><time>${esc(OS.util.relativeTime(n.time))}</time></span>${n.message ? `<small>${esc(n.message)}</small>` : ''}</span></button>`).join('')}</div>` : ''}
      ${widgets()}
    </div>`;
  }

  function openPanel() {
    if (panel) return;
    OS.controlCenter?.close();
    panel = document.createElement('aside');
    panel.className = 'notification-center';
    panel.setAttribute('aria-label', 'Notification Center');
    document.getElementById('overlays').appendChild(panel);
    renderPanel();
    panel.addEventListener('click', event => {
      if (event.target.closest('[data-nc-clear]')) { delivered.length = 0; renderPanel(); return; }
      const note = event.target.closest('[data-note]');
      if (note) {
        const entry = delivered.find(n => n.id === note.dataset.note);
        closePanel();
        if (entry?.onClick) entry.onClick(); else if (entry) OS.apps.activate(entry.app);
        return;
      }
      const widget = event.target.closest('[data-open-app]');
      if (widget) { closePanel(); OS.apps.launch(widget.dataset.openApp); }
    });
    ncTimer = setInterval(renderPanel, 30e3);
    setTimeout(() => document.addEventListener('pointerdown', onOutside, true));
    document.querySelector('[data-status="clock"]')?.classList.add('is-open');
  }

  function onOutside(event) {
    if (panel?.contains(event.target) || event.target.closest?.('[data-status="clock"]')) return;
    closePanel();
  }

  function closePanel() {
    if (!panel) return;
    clearInterval(ncTimer);
    const el = panel;
    panel = null;
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), OS.util.motionOn() ? 220 : 0);
    document.removeEventListener('pointerdown', onOutside, true);
    document.querySelector('[data-status="clock"]')?.classList.remove('is-open');
  }

  OS.notify = notify;
  OS.notificationCenter = {
    init() { stack = document.getElementById('banners'); },
    toggle: () => (panel ? closePanel() : openPanel()),
    open: openPanel,
    close: closePanel,
    refresh: renderPanel,
    isOpen: () => !!panel,
    delivered: () => delivered.slice(),
  };
})();
