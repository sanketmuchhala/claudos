/* ===== NOTES =====
   A list of notes and an editor whose first line is the title. Notes save as
   you type. Export a note to ~/Documents or share it through Mail. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  let win = null;
  let currentId = null;
  let query = '';

  const load = () => CloudStorage.get('notes', []);
  const save = (notes, debounced = false) => {
    if (debounced) CloudStorage.autoSave('notes', notes); else CloudStorage.set('notes', notes);
    OS.emit('notes:change');
  };
  const sorted = notes => [...notes].sort((a, b) => b.timestamp - a.timestamp);
  const titleOf = body => (body.split('\n').find(line => line.trim()) || '').trim().slice(0, 80) || 'New Note';
  const previewOf = body => body.split('\n').filter(line => line.trim()).slice(1).join(' ').slice(0, 90) || 'No additional text';

  function renderList() {
    const q = query.toLowerCase();
    const notes = sorted(load()).filter(n => !q || n.body.toLowerCase().includes(q) || (n.title || '').toLowerCase().includes(q));
    const list = win.body.querySelector('[data-list]');
    list.innerHTML = notes.length
      ? notes.map(n => `<button type="button" class="note-row${n.id === currentId ? ' is-selected' : ''}" data-id="${n.id}" role="option" aria-selected="${n.id === currentId}"><strong>${esc(n.title || titleOf(n.body))}</strong><span><time>${esc(OS.util.relativeTime(n.timestamp))}</time> ${esc(previewOf(n.body))}</span></button>`).join('')
      : `<p class="notes-empty">${q ? 'No Results' : 'No Notes'}</p>`;
    win.body.querySelector('[data-count]').textContent = `${load().length} note${load().length === 1 ? '' : 's'}`;
  }

  function renderEditor() {
    const note = load().find(n => n.id === currentId);
    const editor = win.body.querySelector('[data-editor]');
    const date = win.body.querySelector('[data-date]');
    const empty = win.body.querySelector('[data-empty]');
    editor.hidden = !note;
    date.hidden = !note;
    empty.hidden = !!note;
    win.body.querySelector('[data-delete]').disabled = !note;
    if (!note) return;
    if (editor.dataset.id !== String(note.id)) {
      editor.textContent = note.body;
      editor.dataset.id = String(note.id);
    }
    date.textContent = new Date(note.timestamp).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(', ', ' ').replace(/, (\d)/, ' at $1');
  }

  function select(id, { focus = false } = {}) {
    currentId = id;
    renderList();
    renderEditor();
    win.body.querySelector('.notes').classList.add('show-editor');
    if (focus) placeCaretAtEnd(win.body.querySelector('[data-editor]'));
  }

  function placeCaretAtEnd(el) {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function newNote(body = '') {
    const notes = load();
    const note = { id: Date.now(), title: body ? titleOf(body) : 'New Note', body, timestamp: Date.now() };
    notes.unshift(note);
    save(notes);
    query = '';
    win.body.querySelector('[data-search]').value = '';
    select(note.id, { focus: true });
    return note;
  }

  async function deleteCurrent() {
    const note = load().find(n => n.id === currentId);
    if (!note) return;
    const ok = await OS.dialog.confirm({ title: `Delete “${note.title || titleOf(note.body)}”?`, message: 'This note will be deleted permanently.', confirm: 'Delete', destructive: true, win });
    if (!ok) return;
    const notes = sorted(load());
    const index = notes.findIndex(n => n.id === note.id);
    notes.splice(index, 1);
    save(notes);
    currentId = (notes[index] || notes[index - 1])?.id ?? null;
    renderList();
    renderEditor();
  }

  function exportCurrent() {
    const note = load().find(n => n.id === currentId);
    if (!note) return;
    const name = VFS.uniqueName('/Documents', `${(note.title || titleOf(note.body)).replace(/[/\\:]/g, '-').slice(0, 60)}.txt`);
    try {
      const node = VFS.writeFile(`/Documents/${name}`, note.body);
      OS.notify({ app: 'notes', title: 'Exported to Documents', message: name, onClick: () => OS.apps.launch('finder', { path: '/Documents', select: node.path, newWindow: true }) });
    } catch (error) { OS.dialog.alert({ title: 'The note can’t be exported.', message: error.message, win }); }
  }

  function shareCurrent() {
    const note = load().find(n => n.id === currentId);
    if (note) OS.apps.launch('mail', { compose: { subject: note.title || titleOf(note.body), body: note.body } });
  }

  function open(args = {}) {
    const notes = sorted(load());
    currentId = args.noteId && notes.some(n => n.id === args.noteId) ? args.noteId : notes[0]?.id ?? null;
    win = OS.wm.create({
      app: 'notes', title: 'Notes', chrome: 'toolbar', width: 760, height: 500, minWidth: 360, minHeight: 280, className: 'notes-win', lightsTop: 19, lightsLeft: 18,
      content: `<div class="notes">
        <section class="notes-list-pane">
          <header class="toolbar notes-list-bar" data-drag><div class="toolbar-flex" data-drag></div><span class="notes-count" data-count></span></header>
          <label class="notes-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="m14.5 14.5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input type="search" placeholder="Search" aria-label="Search notes" data-search /></label>
          <div class="notes-list" data-list role="listbox" aria-label="Notes"></div>
        </section>
        <section class="notes-editor-pane">
          <header class="toolbar notes-editor-bar" data-drag>
            <button type="button" class="tb-btn notes-back" data-back aria-label="Back to notes">‹ Notes</button>
            <div class="toolbar-flex" data-drag></div>
            <button type="button" class="tb-btn" data-share aria-label="Share via Mail" title="Share via Mail"><svg viewBox="0 0 16 18" aria-hidden="true"><path d="M8 11V1.8M4.8 4.6 8 1.5l3.2 3.1M5 7.5H3.5v8.5h9V7.5H11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <button type="button" class="tb-btn" data-delete aria-label="Delete note" title="Delete"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4h11M6 4V2.6h4V4m-6 0 .7 9.1a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L12 4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <button type="button" class="tb-btn" data-new aria-label="New note" title="New Note"><svg viewBox="0 0 18 18" aria-hidden="true"><path d="M13.5 2.5 15.5 4.5 8 12l-3 1 1-3Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 3H3.5A1.5 1.5 0 0 0 2 4.5v10A1.5 1.5 0 0 0 3.5 16h10a1.5 1.5 0 0 0 1.5-1.5V10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button>
          </header>
          <div class="notes-scroll">
            <p class="notes-date" data-date></p>
            <div class="notes-editor" data-editor role="textbox" aria-multiline="true" aria-label="Note" spellcheck="true"></div>
            <p class="notes-empty-editor" data-empty>No note selected. Choose one or create a new note.</p>
          </div>
        </section>
      </div>`,
      onFocusRequest: () => { const editor = win.body.querySelector('[data-editor]'); if (!editor.hidden) editor.focus({ preventScroll: true }); },
      onClose: () => { CloudStorage.flush(); win = null; return true; },
    });
    const editor = win.body.querySelector('[data-editor]');
    try { editor.contentEditable = 'plaintext-only'; } catch { editor.contentEditable = 'true'; }
    if (editor.contentEditable !== 'plaintext-only') editor.contentEditable = 'true';
    editor.addEventListener('input', () => {
      const notes = load();
      const note = notes.find(n => n.id === currentId);
      if (!note) return;
      note.body = editor.innerText.replace(/\n$/, '');
      note.title = titleOf(note.body);
      note.timestamp = Date.now();
      save(notes, true);
      renderList();
      win.body.querySelector('[data-date]').textContent = 'Edited just now';
    });
    editor.addEventListener('paste', event => {
      if (editor.contentEditable === 'plaintext-only') return;
      event.preventDefault();
      document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
    });
    win.body.addEventListener('click', event => {
      const row = event.target.closest('[data-id]');
      if (row) { select(Number(row.dataset.id)); return; }
      if (event.target.closest('[data-new]')) newNote();
      if (event.target.closest('[data-delete]')) deleteCurrent();
      if (event.target.closest('[data-share]')) shareCurrent();
      if (event.target.closest('[data-back]')) win.body.querySelector('.notes').classList.remove('show-editor');
    });
    win.body.querySelector('[data-list]').addEventListener('keydown', event => {
      const ids = sorted(load()).map(n => n.id);
      const i = ids.indexOf(currentId);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); const next = ids[OS.util.clamp(i + (event.key === 'ArrowDown' ? 1 : -1), 0, ids.length - 1)]; if (next) { select(next); win.body.querySelector(`[data-id="${next}"]`)?.focus(); } }
      if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); deleteCurrent(); }
      if (event.key === 'Enter') { event.preventDefault(); placeCaretAtEnd(editor); }
    });
    win.body.querySelector('[data-search]').addEventListener('input', event => { query = event.target.value; renderList(); });
    renderList();
    renderEditor();
    return win;
  }

  OS.apps.register({
    id: 'notes',
    name: 'Notes',
    icon: 'images/icons/apps/notes.png',
    keywords: ['text', 'memo', 'write', 'notepad'],
    single: true,
    version: '4.11',
    about: 'Jot things down. Notes save as you type, stay in this browser, and can be exported to Documents or shared through Mail.',
    help: 'The first line of a note is its title. Use the compose button for a new note, the trash button to delete, and the search field to filter. File ▸ Export as Text saves a copy to ~/Documents.',
    open,
    onReopen: (w, args) => { if (args.noteId) select(args.noteId); },
    menus: () => [
      { title: 'File', items: [
        { label: 'New Note', shortcut: `${OS.util.mod}N`, disabled: !win, action: () => newNote() },
        '-',
        { label: 'Export as Text to Documents', disabled: !win || !currentId, action: exportCurrent },
        { label: 'Share via Mail…', disabled: !win || !currentId, action: shareCurrent },
        '-',
        { label: 'Delete Note', disabled: !win || !currentId, action: deleteCurrent },
        { label: 'Close', shortcut: `${OS.util.mod}W`, disabled: !win, action: () => win?.close() },
      ] },
    ],
  });
})();
