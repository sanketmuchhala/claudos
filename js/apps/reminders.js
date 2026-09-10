/* ===== REMINDERS =====
   A to-do list with inline adding and editing. The Dock badge counts open
   reminders. Data format is unchanged from CloudOS 1: { id, t, d }. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  let win = null;
  let filter = 'all';
  let showCompleted = true;

  const load = () => CloudStorage.get('todos', []);
  function save(todos) {
    CloudStorage.set('todos', todos);
    badge(todos);
    OS.emit('todos:change');
  }
  function badge(todos = load()) { OS.dock.setBadge('reminders', todos.filter(t => !t.d).length || null); }

  function render() {
    if (!win) return;
    const todos = load();
    const open = todos.filter(t => !t.d).length;
    const done = todos.length - open;
    const $ = s => win.body.querySelector(s);
    $('[data-count-all]').textContent = open;
    $('[data-count-done]').textContent = done;
    win.body.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('is-active', b.dataset.filter === filter));
    const shown = todos.filter(t => (filter === 'completed' ? t.d : showCompleted || !t.d));
    $('[data-heading]').textContent = filter === 'completed' ? 'Completed' : 'Reminders';
    $('[data-heading]').classList.toggle('is-done', filter === 'completed');
    $('[data-summary]').textContent = filter === 'completed' ? `${done} completed` : `${open} remaining`;
    $('[data-toggle-completed]').textContent = showCompleted ? 'Hide Completed' : 'Show Completed';
    $('[data-toggle-completed]').hidden = filter === 'completed';
    $('[data-items]').innerHTML = shown.length ? shown.map(t => `<div class="rem-item${t.d ? ' is-done' : ''}" data-id="${t.id}">
        <button type="button" class="rem-check" data-toggle aria-label="${t.d ? 'Mark as not completed' : 'Mark as completed'}: ${esc(t.t)}" aria-pressed="${!!t.d}"></button>
        <span class="rem-text" data-edit tabindex="0">${esc(t.t)}</span>
        <button type="button" class="rem-delete" data-delete aria-label="Delete ${esc(t.t)}">×</button>
      </div>`).join('') : `<p class="rem-empty">${filter === 'completed' ? 'No completed reminders' : 'All done! Add a reminder below.'}</p>`;
    $('[data-new-row]').hidden = filter === 'completed';
  }

  function add(text) {
    const value = text.trim();
    if (!value) return;
    const todos = load();
    todos.push({ id: Date.now(), t: value, d: false });
    save(todos);
    render();
  }

  function edit(row) {
    const id = Number(row.dataset.id);
    const span = row.querySelector('[data-edit]');
    const todo = load().find(t => t.id === id);
    if (!todo) return;
    const input = OS.util.el(`<input class="rem-input" value="${esc(todo.t)}" aria-label="Edit reminder" />`);
    span.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = commit => {
      if (done) return;
      done = true;
      if (commit) {
        const todos = load();
        const item = todos.find(t => t.id === id);
        if (item && input.value.trim()) { item.t = input.value.trim(); save(todos); }
      }
      render();
    };
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); finish(true); }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  }

  function open() {
    win = OS.wm.create({
      app: 'reminders', title: 'Reminders', chrome: 'toolbar', width: 640, height: 480, minWidth: 360, minHeight: 300, className: 'reminders-win', lightsTop: 19, lightsLeft: 18,
      content: `<div class="reminders">
        <aside class="sidebar rem-sidebar" data-drag aria-label="Lists"><div class="rem-smart">
          <button type="button" class="rem-smart-card" data-filter="all"><span class="rem-smart-icon is-blue">≡</span><strong data-count-all>0</strong><span>All</span></button>
          <button type="button" class="rem-smart-card" data-filter="completed"><span class="rem-smart-icon is-gray">✓</span><strong data-count-done>0</strong><span>Completed</span></button>
        </div><div class="sb-section"><h3>My Lists</h3><button type="button" class="sb-item rem-list-item" data-filter="all"><span class="rem-list-dot"></span>Reminders</button></div></aside>
        <section class="rem-main">
          <header class="toolbar rem-bar" data-drag><div class="toolbar-flex" data-drag></div><button type="button" class="tb-btn" data-toggle-completed></button><button type="button" class="tb-btn" data-focus-new aria-label="New Reminder" title="New Reminder"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button></header>
          <div class="rem-scroll"><div class="rem-head"><h2 data-heading>Reminders</h2><span data-summary></span></div>
            <div class="rem-items" data-items></div>
            <form class="rem-new" data-new-row><span class="rem-check is-ghost" aria-hidden="true"></span><input type="text" placeholder="New Reminder" aria-label="New reminder" data-new autocomplete="off" /></form>
          </div>
        </section>
      </div>`,
      onFocusRequest: () => win.body.querySelector('[data-new]').focus({ preventScroll: true }),
      onClose: () => { win = null; return true; },
    });
    const input = win.body.querySelector('[data-new]');
    win.body.querySelector('[data-new-row]').addEventListener('submit', event => { event.preventDefault(); add(input.value); input.value = ''; input.focus(); });
    win.body.addEventListener('click', event => {
      const t = event.target;
      const f = t.closest('[data-filter]');
      if (f) { filter = f.dataset.filter; render(); return; }
      if (t.closest('[data-toggle-completed]')) { showCompleted = !showCompleted; render(); return; }
      if (t.closest('[data-focus-new]')) { filter = 'all'; render(); input.focus(); return; }
      const row = t.closest('[data-id]');
      if (!row) return;
      const id = Number(row.dataset.id);
      if (t.closest('[data-toggle]')) {
        const todos = load();
        const item = todos.find(x => x.id === id);
        if (item) { item.d = !item.d; save(todos); }
        if (OS.util.motionOn() && item?.d) { row.classList.add('is-completing'); setTimeout(render, 380); } else render();
        return;
      }
      if (t.closest('[data-delete]')) { save(load().filter(x => x.id !== id)); render(); return; }
      if (t.closest('[data-edit]')) edit(row);
    });
    win.body.addEventListener('keydown', event => {
      const span = event.target.closest('[data-edit]');
      if (span && event.key === 'Enter') { event.preventDefault(); edit(span.closest('[data-id]')); }
      if (span && (event.key === 'Backspace' || event.key === 'Delete') && (event.metaKey || event.key === 'Delete')) { event.preventDefault(); save(load().filter(x => x.id !== Number(span.closest('[data-id]').dataset.id))); render(); }
    });
    render();
    return win;
  }

  OS.on('todos:change', render);
  badge();

  OS.apps.register({
    id: 'reminders',
    name: 'Reminders',
    icon: 'images/icons/apps/reminders.png',
    keywords: ['todo', 'tasks', 'checklist', 'to-do', 'list'],
    single: true,
    version: '7.0',
    about: 'Keep track of things to do. The Dock badge shows how many are left.',
    help: 'Type in “New Reminder” and press Enter to add. Click the circle to complete, click the text to edit, and × to delete. Open reminders also appear in Notification Center.',
    open,
    menus: () => [
      { title: 'File', items: [
        { label: 'New Reminder', shortcut: `${OS.util.mod}N`, disabled: !win, action: () => { filter = 'all'; render(); win.body.querySelector('[data-new]').focus(); } },
        '-',
        { label: 'Close', shortcut: `${OS.util.mod}W`, disabled: !win, action: () => win?.close() },
      ] },
      { title: 'View', items: [
        { label: 'All', checked: filter === 'all', action: () => { filter = 'all'; render(); } },
        { label: 'Completed', checked: filter === 'completed', action: () => { filter = 'completed'; render(); } },
        '-',
        { label: showCompleted ? 'Hide Completed' : 'Show Completed', action: () => { showCompleted = !showCompleted; render(); } },
      ] },
    ],
  });
})();
