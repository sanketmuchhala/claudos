/* ===== TEXTEDIT =====
   Documents live in the shared file system. New documents are rich text
   (.rtf, stored as sanitized HTML); .txt, .md, and .json open as plain text.
   Portfolio files open locked; Duplicate copies one into Documents. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  const docs = new Map();
  const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'BR', 'P', 'DIV', 'SPAN', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'FONT', 'BLOCKQUOTE', 'A', 'SUB', 'SUP']);
  const STYLE_OK = /^(color|background-color|font-family|font-size|font-weight|font-style|text-align|text-decoration(-line)?)$/;

  /** Keeps basic formatting; drops scripts, handlers, and unknown markup. */
  function sanitize(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const walk = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === Node.COMMENT_NODE) { child.remove(); return; }
        if (child.nodeType !== Node.ELEMENT_NODE) return;
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META'].includes(child.tagName)) { child.remove(); return; }
        walk(child);
        if (!ALLOWED.has(child.tagName)) { child.replaceWith(...child.childNodes); return; }
        [...child.attributes].forEach(attr => {
          const name = attr.name.toLowerCase();
          if (name === 'style') {
            const kept = attr.value.split(';').map(s => s.trim()).filter(s => STYLE_OK.test(s.split(':')[0]?.trim().toLowerCase() || '') && !/url\(|expression/i.test(s));
            if (kept.length) child.setAttribute('style', kept.join('; ')); else child.removeAttribute('style');
          } else if (name === 'href' && child.tagName === 'A') {
            if (!OS.util.safeUrl(attr.value)) child.removeAttribute('href');
          } else if (!(child.tagName === 'FONT' && ['color', 'face', 'size'].includes(name))) child.removeAttribute(attr.name);
        });
      });
    };
    walk(template.content);
    return template.innerHTML;
  }

  const isRich = name => /\.rtf$/i.test(name);

  function create(args = {}) {
    const node = args.path ? VFS.stat(args.path) : null;
    if (node) {
      const existing = [...docs.entries()].find(([, d]) => d.path === node.path);
      if (existing) { const win = OS.wm.get(existing[0]); if (win) { OS.wm.focus(win.id); win.focusContent(); return win; } }
    }
    const doc = {
      path: node?.path || null,
      name: node ? node.name : 'Untitled',
      rich: node ? isRich(node.name) : true,
      locked: !!node?.base,
      saved: '',
      dirty: false,
    };
    const win = OS.wm.create({
      app: 'textedit', title: doc.name, width: 680, height: 520, minWidth: 340, minHeight: 240, className: 'textedit-win',
      titleIcon: '<svg class="win-title-icon" viewBox="0 0 14 16" aria-hidden="true"><path d="M1.5 1.5h7l4 4v9h-11Z" fill="#f2f2f2" stroke="#8a8a8a" stroke-width=".8"/><path d="M8.5 1.5v4h4" fill="none" stroke="#8a8a8a" stroke-width=".8"/></svg>',
      content: `<div class="textedit${doc.rich ? ' is-rich' : ' is-plain'}">
        ${doc.rich ? `<div class="te-toolbar" role="toolbar" aria-label="Format">
          <select data-block aria-label="Paragraph style"><option value="p">Body</option><option value="h1">Title</option><option value="h2">Heading</option><option value="h3">Subheading</option></select>
          <select data-font aria-label="Font"><option value="">System</option><option value="Helvetica Neue, Helvetica, Arial">Helvetica</option><option value="Georgia, Times New Roman, serif">Georgia</option><option value="Menlo, Monaco, monospace">Menlo</option><option value="Avenir Next, Avenir, sans-serif">Avenir</option></select>
          <span class="te-sep"></span>
          <button type="button" data-cmd="bold" aria-label="Bold"><b>B</b></button><button type="button" data-cmd="italic" aria-label="Italic"><i>I</i></button><button type="button" data-cmd="underline" aria-label="Underline"><u>U</u></button><button type="button" data-cmd="strikeThrough" aria-label="Strikethrough"><s>S</s></button>
          <label class="te-color" title="Text color"><input type="color" data-color value="#e6e6e6" aria-label="Text color" /></label>
          <span class="te-sep"></span>
          <button type="button" data-cmd="justifyLeft" aria-label="Align left"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12M2 6.5h8M2 10h12M2 13.5h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></button>
          <button type="button" data-cmd="justifyCenter" aria-label="Center"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12M4 6.5h8M2 10h12M4 13.5h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></button>
          <button type="button" data-cmd="justifyRight" aria-label="Align right"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12M6 6.5h8M2 10h12M6 13.5h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></button>
          <span class="te-sep"></span>
          <button type="button" data-cmd="insertUnorderedList" aria-label="Bulleted list">• List</button><button type="button" data-cmd="insertOrderedList" aria-label="Numbered list">1. List</button>
        </div>` : ''}
        ${doc.locked ? `<div class="te-locked"><svg viewBox="0 0 12 14" aria-hidden="true"><rect x="1.5" y="6" width="9" height="7" rx="1.6" fill="currentColor"/><path d="M3.5 6V4.3a2.5 2.5 0 0 1 5 0V6" fill="none" stroke="currentColor" stroke-width="1.4"/></svg><span>Locked — this file is part of the read-only portfolio.</span><button type="button" class="push-button" data-duplicate>Duplicate to Documents</button></div>` : ''}
        <div class="te-page">${doc.rich ? '<div class="te-area" data-area contenteditable="true" role="textbox" aria-multiline="true" aria-label="Document" spellcheck="true"></div>' : `<textarea class="te-area te-plain" data-area aria-label="Document" spellcheck="${/\.(json|md)$/i.test(doc.name) ? 'false' : 'true'}"${doc.locked ? ' readonly' : ''}></textarea>`}</div>
      </div>`,
      onFocusRequest: () => win.body.querySelector('[data-area]').focus({ preventScroll: true }),
      onClose: async closing => {
        if (doc.dirty && !doc.locked) {
          const choice = await OS.dialog.ask({ title: `Do you want to save the changes made to the document “${doc.name}”?`, message: 'Your changes will be lost if you don’t save them.', buttons: ['Save…', 'Don’t Save', 'Cancel'], defaultButton: 'Save…', cancelButton: 'Cancel', win: closing });
          if (choice === 'Cancel' || choice === null) return false;
          if (choice === 'Save…' && !(await save(false))) return false;
        }
        docs.delete(closing.id);
        return true;
      },
    });
    const area = win.body.querySelector('[data-area]');
    const read = () => (doc.rich ? area.innerHTML : area.value);
    function setTitle() {
      win.setTitle(`${doc.name}${doc.dirty ? ' — Edited' : ''}${doc.locked ? ' — Locked' : ''}`);
      win.el.classList.toggle('is-dirty', doc.dirty);
    }
    function markDirty() { doc.dirty = read() !== doc.saved; setTitle(); }

    if (node) {
      if (doc.rich) area.innerHTML = sanitize(node.content || '');
      else area.value = node.content || '';
      OS.fs.recordRecent(node.path);
    } else if (args.content) {
      area.innerText = args.content;
    }
    doc.saved = read();
    setTitle();

    async function save(saveAs) {
      if (doc.locked) return false;
      let path = doc.path;
      if (!path || saveAs) {
        const target = await saveSheet(doc.rich ? `${doc.name.replace(/\.[^.]+$/, '')}.rtf` : doc.name);
        if (!target) return false;
        path = target;
      }
      try {
        const content = doc.rich ? sanitize(area.innerHTML) : area.value;
        const saved = VFS.writeFile(path, content);
        doc.path = saved.path;
        doc.name = saved.name;
        doc.saved = read();
        doc.dirty = false;
        OS.fs.recordRecent(saved.path);
        setTitle();
        return true;
      } catch (error) {
        OS.dialog.alert({ title: 'The document can’t be saved.', message: error.message, win });
        return false;
      }
    }

    function saveSheet(defaultName) {
      return new Promise(resolve => {
        const folders = [['/Documents', 'Documents'], ['/Desktop', 'Desktop'], ['/Downloads', 'Downloads'], ['/', 'sanket (home)']];
        const layer = OS.util.el(`<div class="alert-layer is-sheet" role="presentation"><form class="sheet-form" role="dialog" aria-modal="true" aria-label="Save">
          <h2>Save As</h2>
          <label>Save As:<input name="name" value="${esc(defaultName === 'Untitled.rtf' || defaultName === 'Untitled' ? `Untitled${doc.rich ? '.rtf' : '.txt'}` : defaultName)}" autocomplete="off" spellcheck="false" /></label>
          <label>Where:<select name="dir">${folders.map(([p, label]) => `<option value="${p}">${label}</option>`).join('')}</select></label>
          <div class="sheet-buttons"><button type="button" class="push-button" data-cancel>Cancel</button><button type="submit" class="push-button is-default">Save</button></div>
        </form></div>`);
        win.el.appendChild(layer);
        const form = layer.querySelector('form');
        const done = value => { layer.remove(); resolve(value); area.focus({ preventScroll: true }); };
        const nameInput = form.elements.name;
        requestAnimationFrame(() => { nameInput.focus(); nameInput.setSelectionRange(0, nameInput.value.lastIndexOf('.') > 0 ? nameInput.value.lastIndexOf('.') : nameInput.value.length); });
        layer.querySelector('[data-cancel]').addEventListener('click', () => done(null));
        form.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); done(null); } });
        form.addEventListener('submit', async event => {
          event.preventDefault();
          const name = nameInput.value.trim().replace(/[/\\]/g, '-');
          if (!name) return;
          const path = VFS.join(form.elements.dir.value, name);
          const existing = VFS.stat(path);
          if (existing && existing.path !== doc.path) {
            const replace = await OS.dialog.confirm({ title: `“${name}” already exists. Do you want to replace it?`, message: 'Replacing it will overwrite its current contents.', confirm: 'Replace', destructive: true, win });
            if (!replace) return;
          }
          done(path);
        });
      });
    }

    function duplicate() {
      try {
        const copy = VFS.copy(doc.path, VFS.join('/Documents', VFS.uniqueName('/Documents', doc.name)));
        create({ path: copy.path });
      } catch (error) { OS.dialog.alert({ title: 'The document can’t be duplicated.', message: error.message, win }); }
    }

    area.addEventListener('input', markDirty);
    area.addEventListener('paste', event => {
      if (!doc.rich) return;
      const html = event.clipboardData.getData('text/html');
      if (!html) return;
      event.preventDefault();
      document.execCommand('insertHTML', false, sanitize(html));
    });
    win.el.addEventListener('keydown', event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save(event.shiftKey); }
      if (doc.rich && (event.metaKey || event.ctrlKey) && ['b', 'i', 'u'].includes(event.key.toLowerCase()) && event.target === area) {
        event.preventDefault();
        document.execCommand({ b: 'bold', i: 'italic', u: 'underline' }[event.key.toLowerCase()]);
        markDirty();
      }
    });
    win.body.addEventListener('pointerdown', event => { if (event.target.closest('.te-toolbar button')) event.preventDefault(); });
    win.body.addEventListener('click', event => {
      const cmd = event.target.closest('[data-cmd]');
      if (cmd) { area.focus(); document.execCommand(cmd.dataset.cmd); markDirty(); }
      if (event.target.closest('[data-duplicate]')) duplicate();
    });
    win.body.addEventListener('change', event => {
      if (event.target.matches('[data-block]')) { area.focus(); document.execCommand('formatBlock', false, event.target.value); markDirty(); }
      if (event.target.matches('[data-font]')) { area.focus(); document.execCommand('fontName', false, event.target.value || '-apple-system, BlinkMacSystemFont, sans-serif'); markDirty(); }
    });
    win.body.addEventListener('input', event => {
      if (event.target.matches('[data-color]')) { area.focus(); document.execCommand('foreColor', false, event.target.value); markDirty(); }
    });

    docs.set(win.id, {
      save, duplicate, doc, area,
      makePlain() {
        if (!doc.rich) return;
        const text = area.innerText;
        doc.rich = false;
        const textarea = OS.util.el('<textarea class="te-area te-plain" data-area aria-label="Document"></textarea>');
        textarea.value = text;
        area.replaceWith(textarea);
        win.body.querySelector('.te-toolbar')?.remove();
        win.body.querySelector('.textedit').classList.replace('is-rich', 'is-plain');
        if (doc.path) { doc.path = null; doc.name = doc.name.replace(/\.rtf$/i, '.txt'); }
        textarea.addEventListener('input', () => { doc.dirty = true; setTitle(); });
        doc.dirty = true;
        setTitle();
      },
    });
    return win;
  }

  const current = () => { const win = OS.wm.focused(); return win?.app === 'textedit' ? docs.get(win.id) : null; };

  OS.apps.register({
    id: 'textedit',
    name: 'TextEdit',
    icon: 'images/icons/apps/textedit.png',
    keywords: ['text', 'editor', 'document', 'write', 'rtf', 'txt'],
    version: '1.19',
    about: 'Write and edit documents saved in the shared file system. Rich text for new documents, plain text for .txt, .md, and .json files.',
    help: `${OS.util.mod}S saves (Save As lets you pick Desktop, Documents, or Downloads). Portfolio files open locked; choose Duplicate to Documents to edit a copy. Files you save appear in Finder and in Terminal (ls ~/Documents).`,
    open: args => create(args),
    menus: ({ win }) => {
      const d = win && docs.get(win.id);
      return [
        { title: 'File', items: [
          { label: 'New', shortcut: `${OS.util.mod}N`, action: () => create({}) },
          { label: 'Open…', shortcut: `${OS.util.mod}O`, action: () => OS.apps.launch('finder', { path: '/Documents', newWindow: true }) },
          { label: 'Open Recent', submenu: () => {
            const recent = CloudStorage.get('recents', []).map(p => VFS.stat(p)).filter(n => n?.kind === 'file').slice(0, 8);
            return recent.length ? recent.map(n => ({ label: n.name, action: () => create({ path: n.path }) })) : [{ label: 'No recent documents', disabled: true }];
          } },
          '-',
          { label: 'Close', shortcut: `${OS.util.mod}W`, disabled: !win, action: () => win?.close() },
          { label: 'Save…', shortcut: `${OS.util.mod}S`, disabled: !d || d.doc.locked, action: () => d.save(false) },
          { label: 'Save As…', shortcut: `⇧${OS.util.mod}S`, disabled: !d || d.doc.locked, action: () => d.save(true) },
          { label: 'Duplicate', disabled: !d?.doc.path, action: () => d.duplicate() },
        ] },
        { title: 'Format', items: [
          { label: 'Bold', shortcut: `${OS.util.mod}B`, disabled: !d?.doc.rich, action: () => { d.area.focus(); document.execCommand('bold'); } },
          { label: 'Italic', shortcut: `${OS.util.mod}I`, disabled: !d?.doc.rich, action: () => { d.area.focus(); document.execCommand('italic'); } },
          { label: 'Underline', shortcut: `${OS.util.mod}U`, disabled: !d?.doc.rich, action: () => { d.area.focus(); document.execCommand('underline'); } },
          '-',
          { label: 'Make Plain Text', shortcut: `⇧${OS.util.mod}T`, disabled: !d?.doc.rich, action: () => d.makePlain() },
        ] },
      ];
    },
  });
  OS.textedit = { current };
})();
