/* ===== CALENDAR =====
   Month grid with events, a day inspector, and an add-event sheet. Events
   save in this browser; timed events alert shortly before they start.
   The Dock icon shows today's date. */
(function () {
  const OS = window.OS;
  const { esc, dateKey } = OS.util;
  const CALENDARS = { home: { name: 'Home', color: '#3a8ef6' }, work: { name: 'Work', color: '#ff9f0a' }, personal: { name: 'Personal', color: '#bf5af2' }, family: { name: 'Family', color: '#34c759' } };
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let win = null;
  let view = new Date();
  let selected = dateKey();
  const alerted = new Set();

  const load = () => CloudStorage.get('calendar_events', []);
  const save = events => { CloudStorage.set('calendar_events', events); OS.emit('calendar:change'); };
  const eventsOn = key => load().filter(e => e.date === key).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const color = e => (CALENDARS[e.calendar] || CALENDARS.home).color;
  const timeLabel = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); };
  const longDay = key => new Date(`${key}T00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  function iconHtml() {
    const now = new Date();
    return `<span class="cal-icon" aria-hidden="true"><span class="cal-icon-month">${now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span><span class="cal-icon-day">${now.getDate()}</span></span>`;
  }

  function renderGrid() {
    const year = view.getFullYear();
    const month = view.getMonth();
    const first = new Date(year, month, 1).getDay();
    const today = dateKey();
    const start = new Date(year, month, 1 - first);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const key = dateKey(day);
      const events = eventsOn(key);
      const shown = events.slice(0, 3);
      cells.push(`<div class="cal-cell${day.getMonth() !== month ? ' is-other' : ''}${key === today ? ' is-today' : ''}${key === selected ? ' is-selected' : ''}" role="gridcell" data-day="${key}" tabindex="${key === selected ? 0 : -1}" aria-label="${esc(longDay(key))}${events.length ? `, ${events.length} event${events.length > 1 ? 's' : ''}` : ''}">
        <span class="cal-num">${day.getDate() === 1 ? `${day.toLocaleDateString('en-US', { month: 'short' })} ` : ''}${day.getDate()}</span>
        ${shown.map(e => `<span class="cal-pill" style="--cal:${color(e)}"><i></i>${esc(e.title)}${e.time ? `<small>${esc(timeLabel(e.time))}</small>` : ''}</span>`).join('')}
        ${events.length > 3 ? `<span class="cal-more">${events.length - 3} more…</span>` : ''}
      </div>`);
    }
    const $ = s => win.body.querySelector(s);
    $('[data-month]').innerHTML = `<strong>${view.toLocaleDateString('en-US', { month: 'long' })}</strong> ${year}`;
    $('[data-grid]').innerHTML = DAYS.map(d => `<div class="cal-dow" role="columnheader">${d}</div>`).join('') + cells.join('');
  }

  function renderInspector() {
    const events = eventsOn(selected);
    win.body.querySelector('[data-inspector]').innerHTML = `<header><p>${esc(new Date(`${selected}T00:00`).toLocaleDateString('en-US', { weekday: 'long' }))}</p><h3>${esc(new Date(`${selected}T00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))}</h3></header>
      ${events.length ? events.map(e => `<article class="cal-event" style="--cal:${color(e)}"><div><strong>${esc(e.title)}</strong><small>${e.time ? esc(timeLabel(e.time)) : 'All day'} · ${esc((CALENDARS[e.calendar] || CALENDARS.home).name)}</small>${e.description ? `<p>${esc(e.description)}</p>` : ''}</div><button type="button" class="cal-delete" data-delete="${e.id}" aria-label="Delete ${esc(e.title)}">Delete</button></article>`).join('') : '<p class="cal-none">No events</p>'}
      <button type="button" class="push-button is-accent cal-add" data-add>+ Add Event</button>`;
  }

  function render() { if (win) { renderGrid(); renderInspector(); } }

  function addEvent(date = selected) {
    const layer = OS.util.el(`<div class="alert-layer is-sheet" role="presentation"><form class="sheet-form" role="dialog" aria-modal="true" aria-label="New event">
      <h2>New Event</h2>
      <label>Title<input name="title" required placeholder="Event title" autocomplete="off" /></label>
      <div class="sheet-row"><label>Date<input name="date" type="date" value="${esc(date)}" required /></label><label>Time<input name="time" type="time" /></label></div>
      <label class="sheet-check"><input name="allday" type="checkbox" checked /> All-day</label>
      <label>Calendar<select name="calendar">${Object.entries(CALENDARS).map(([id, c]) => `<option value="${id}">${c.name}</option>`).join('')}</select></label>
      <label>Notes<textarea name="description" rows="3" placeholder="Add notes"></textarea></label>
      <div class="sheet-buttons"><button type="button" class="push-button" data-cancel>Cancel</button><button type="submit" class="push-button is-default">Add</button></div>
    </form></div>`);
    win.el.appendChild(layer);
    const form = layer.querySelector('form');
    const allday = form.elements.allday;
    const time = form.elements.time;
    time.disabled = true;
    allday.addEventListener('change', () => { time.disabled = allday.checked; if (!allday.checked && !time.value) time.value = '09:00'; });
    time.addEventListener('input', () => { if (time.value) allday.checked = false; });
    const closeSheet = () => { layer.remove(); win?.body.querySelector('[data-grid] [tabindex="0"]')?.focus({ preventScroll: true }); };
    layer.querySelector('[data-cancel]').addEventListener('click', closeSheet);
    form.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeSheet(); } });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const title = form.elements.title.value.trim();
      if (!title) { form.elements.title.focus(); return; }
      const events = load();
      const entry = { id: Date.now(), date: form.elements.date.value || date, title, description: form.elements.description.value.trim(), calendar: form.elements.calendar.value };
      if (!allday.checked && time.value) entry.time = time.value;
      events.push(entry);
      save(events);
      selected = entry.date;
      view = new Date(`${entry.date}T00:00`);
      closeSheet();
      render();
    });
    requestAnimationFrame(() => form.elements.title.focus());
  }

  async function deleteEvent(id) {
    const event = load().find(e => e.id === id);
    if (!event) return;
    const ok = await OS.dialog.confirm({ title: `Delete “${event.title}”?`, message: 'This event will be removed from your calendar.', confirm: 'Delete', destructive: true, win });
    if (!ok) return;
    save(load().filter(e => e.id !== id));
    render();
  }

  function move(months) {
    view = new Date(view.getFullYear(), view.getMonth() + months, 1);
    render();
  }
  function goToday() {
    view = new Date();
    selected = dateKey();
    render();
  }

  function open(args = {}) {
    if (args.date) { selected = args.date; view = new Date(`${args.date}T00:00`); }
    win = OS.wm.create({
      app: 'calendar', title: 'Calendar', chrome: 'toolbar', width: 900, height: 600, minWidth: 420, minHeight: 360, className: 'calendar-win', lightsTop: 19, lightsLeft: 18,
      content: `<div class="calendar">
        <header class="toolbar cal-bar" data-drag>
          <div class="toolbar-flex" data-drag></div>
          <button type="button" class="tb-btn" data-add aria-label="New event" title="New Event"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
          <div class="segmented cal-nav"><button type="button" data-move="-1" aria-label="Previous month">‹</button><button type="button" data-today>Today</button><button type="button" data-move="1" aria-label="Next month">›</button></div>
        </header>
        <div class="cal-body">
          <section class="cal-main"><h2 class="cal-month" data-month></h2><div class="cal-grid" data-grid role="grid" aria-label="Month"></div></section>
          <aside class="cal-inspector" data-inspector aria-label="Selected day"></aside>
        </div>
      </div>`,
      onFocusRequest: () => win.body.querySelector('[data-grid] [tabindex="0"]')?.focus({ preventScroll: true }),
      onClose: () => { win = null; return true; },
    });
    win.body.addEventListener('click', event => {
      const t = event.target;
      const day = t.closest('[data-day]');
      if (day) { selected = day.dataset.day; if (day.classList.contains('is-other')) view = new Date(`${selected}T00:00`); render(); win.body.querySelector(`[data-day="${selected}"]`)?.focus({ preventScroll: true }); return; }
      const moveButton = t.closest('[data-move]');
      if (moveButton) { move(Number(moveButton.dataset.move)); return; }
      if (t.closest('[data-today]')) { goToday(); return; }
      if (t.closest('[data-add]')) { addEvent(); return; }
      const del = t.closest('[data-delete]');
      if (del) deleteEvent(Number(del.dataset.delete));
    });
    win.body.addEventListener('dblclick', event => {
      const day = event.target.closest('[data-day]');
      if (day) addEvent(day.dataset.day);
    });
    win.body.querySelector('[data-grid]').addEventListener('keydown', event => {
      const delta = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[event.key];
      if (delta) {
        event.preventDefault();
        const next = new Date(`${selected}T00:00`);
        next.setDate(next.getDate() + delta);
        selected = dateKey(next);
        if (next.getMonth() !== view.getMonth()) view = new Date(next.getFullYear(), next.getMonth(), 1);
        render();
        win.body.querySelector(`[data-day="${selected}"]`)?.focus();
      }
      if (event.key === 'Enter') { event.preventDefault(); addEvent(); }
    });
    render();
    return win;
  }

  // Alert about timed events starting within ten minutes (while CloudOS is open).
  function checkAlerts() {
    const now = new Date();
    const today = dateKey(now);
    load().filter(e => e.date === today && e.time && !alerted.has(e.id)).forEach(e => {
      const [h, m] = e.time.split(':').map(Number);
      const minutes = (new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m) - now) / 60e3;
      if (minutes <= 10 && minutes > -1) {
        alerted.add(e.id);
        OS.notify({ app: 'calendar', title: e.title, message: `${timeLabel(e.time)} · ${minutes < 1 ? 'Starting now' : `in ${Math.ceil(minutes)} minutes`}`, onClick: () => OS.apps.launch('calendar', { date: e.date }) });
      }
    });
  }
  setInterval(checkAlerts, 30e3);
  setTimeout(checkAlerts, 4000);
  OS.on('calendar:change', () => { if (win) render(); });

  OS.apps.register({
    id: 'calendar',
    name: 'Calendar',
    icon: 'images/icons/apps/calendar.png',
    iconHtml,
    keywords: ['events', 'schedule', 'date', 'agenda', 'month'],
    single: true,
    version: '14.0',
    about: 'Plan your month. Events are saved in this browser and timed events remind you shortly before they start.',
    help: 'Click a day to see its events; double-click (or press Enter) to add one. Use ‹ Today › to move between months, or the arrow keys to move between days. Upcoming events also appear in Notification Center.',
    open,
    onReopen: (w, args) => { if (args.date) { selected = args.date; view = new Date(`${args.date}T00:00`); render(); } },
    menus: () => [
      { title: 'File', items: [
        { label: 'New Event', shortcut: `${OS.util.mod}N`, disabled: !win, action: () => addEvent() },
        '-',
        { label: 'Close', shortcut: `${OS.util.mod}W`, disabled: !win, action: () => win?.close() },
      ] },
      { title: 'View', items: [
        { label: 'Go to Today', shortcut: `${OS.util.mod}T`, disabled: !win, action: goToday },
        { label: 'Next Month', disabled: !win, action: () => move(1) },
        { label: 'Previous Month', disabled: !win, action: () => move(-1) },
      ] },
    ],
  });
})();
