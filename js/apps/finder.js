/* ===== FINDER =====
   Browses the shared file system: the read-only portfolio and the visitor's
   own Desktop, Documents, and Downloads. Also Recents, Applications,
   Macintosh HD, Trash, and colour tags. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  const mod = OS.util.mod;
  const TAGS = [['red', 'Red'], ['orange', 'Orange'], ['yellow', 'Yellow'], ['green', 'Green'], ['blue', 'Blue'], ['purple', 'Purple'], ['gray', 'Gray']];
  const SIDEBAR_ICON = name => `<i class="sb-glyph" style="--glyph:url('images/icons/sidebar/${name}.png')" aria-hidden="true"></i>`;
  const finders = new Map();

  const LOCATION = {
    recents: { title: 'Recents', glyph: 'recents' },
    applications: { title: 'Applications', glyph: 'applicationsfolder' },
    hd: { title: 'Macintosh HD', glyph: 'internaldisk' },
    trash: { title: 'Trash', glyph: 'genericfolder' },
  };

  function locationTitle(loc) {
    if (loc.type === 'path') return loc.path === '/' ? 'sanket' : VFS.nameOf(loc.path);
    if (loc.type === 'tag') return TAGS.find(t => t[0] === loc.tag)?.[1] || 'Tag';
    if (loc.type === 'search') return `Searching “${loc.query}”`;
    return LOCATION[loc.type]?.title || 'Finder';
  }

  function nodeItem(node, extra = {}) {
    const real = OS.fs.target(node);
    const kind = real?.kind === 'directory' ? 'directory' : 'file';
    return {
      key: node.path, name: OS.fs.displayName(node), node, iconHtml: OS.fs.iconMarkup(node), folder: kind === 'directory',
      kind: OS.fs.kindOf(node), size: node.kind === 'directory' ? null : real?.kind === 'file' ? VFS.sizeOf(real.content) : null,
      modified: node.modified, readOnly: !!node.base, tags: VFS.tagsFor(node.path), ...extra,
    };
  }

  function itemsFor(loc) {
    if (loc.type === 'path') return VFS.listDirectory(loc.path).map(n => nodeItem(n));
    if (loc.type === 'trash') return VFS.stat(VFS.TRASH) ? VFS.listDirectory(VFS.TRASH, '/', { all: true }).map(n => nodeItem(n, { trashed: true })) : [];
    if (loc.type === 'recents') return CloudStorage.get('recents', []).map(p => VFS.stat(p)).filter(Boolean).map(n => nodeItem(n));
    if (loc.type === 'tag') return VFS.taggedPaths(loc.tag).map(p => VFS.stat(p, '/', { follow: false })).filter(Boolean).map(n => nodeItem(n));
    if (loc.type === 'search') return VFS.search(loc.query, 80).map(n => nodeItem(n));
    if (loc.type === 'applications') return OS.apps.list().map(app => ({ key: `app:${app.id}`, name: app.name, app, iconHtml: `<span class="file-icon">${app.iconHtml ? app.iconHtml() : `<img src="${esc(app.icon)}" alt="" draggable="false" />`}</span>`, kind: 'Application', size: null, modified: null, readOnly: true, folder: false }));
    if (loc.type === 'hd') return [
      { key: 'loc:applications', name: 'Applications', loc: { type: 'applications' }, iconHtml: '<span class="file-icon"><img src="images/icons/files/folder-applications.png" alt="" /></span>', kind: 'Folder', folder: true, readOnly: true },
      { key: 'loc:home', name: 'sanket', loc: { type: 'path', path: '/' }, iconHtml: '<span class="file-icon"><img src="images/icons/files/folder-home.png" alt="" /></span>', kind: 'Home folder', folder: true, readOnly: true },
    ];
    return [];
  }

  function sortItems(items, sort) {
    const dir = sort.dir === 'desc' ? -1 : 1;
    const by = {
      name: (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }),
      kind: (a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name),
      date: (a, b) => (a.modified || 0) - (b.modified || 0),
      size: (a, b) => (a.size ?? -1) - (b.size ?? -1),
    }[sort.key] || (() => 0);
    return sort.key === 'none' ? items : [...items].sort((a, b) => by(a, b) * dir);
  }

  function create(args = {}) {
    const state = {
      loc: args.location ? { type: args.location } : { type: 'path', path: args.path || '/projects' },
      back: [], forward: [], selected: new Set(), anchor: null,
      view: CloudStorage.get('finderView', 'icons'), sort: CloudStorage.get('finderSort', { key: 'name', dir: 'asc' }),
      preview: CloudStorage.get('finderPreview', true), items: [], query: '',
    };
    if (state.loc.type === 'path') {
      const node = VFS.stat(state.loc.path);
      state.loc.path = node && node.kind === 'directory' ? node.path : '/';
    }
    const win = OS.wm.create({
      app: 'finder', title: locationTitle(state.loc), chrome: 'toolbar', width: 880, height: 520, minWidth: 460, minHeight: 280,
      className: 'finder-win', lightsTop: 19, lightsLeft: 18,
      content: `<div class="finder">
        <aside class="sidebar" data-drag aria-label="Sidebar"><div class="sidebar-scroll">
          <div class="sb-section"><h3>Favorites</h3>
            <button type="button" class="sb-item" data-loc="recents">${SIDEBAR_ICON('recents')}Recents</button>
            <button type="button" class="sb-item" data-loc="applications">${SIDEBAR_ICON('applicationsfolder')}Applications</button>
            <button type="button" class="sb-item" data-path="/Desktop">${SIDEBAR_ICON('desktopfolder')}Desktop</button>
            <button type="button" class="sb-item" data-path="/Documents">${SIDEBAR_ICON('documentsfolder')}Documents</button>
            <button type="button" class="sb-item" data-path="/Downloads">${SIDEBAR_ICON('downloadsfolder')}Downloads</button>
            <button type="button" class="sb-item" data-path="/">${SIDEBAR_ICON('homefolder')}sanket</button>
          </div>
          <div class="sb-section"><h3>Portfolio</h3>
            <button type="button" class="sb-item" data-path="/projects">${SIDEBAR_ICON('genericfolder')}Projects</button>
            <button type="button" class="sb-item" data-path="/skills">${SIDEBAR_ICON('smartfolder')}Skills</button>
            <button type="button" class="sb-item" data-path="/experience">${SIDEBAR_ICON('genericfile')}Experience</button>
          </div>
          <div class="sb-section"><h3>Locations</h3>
            <button type="button" class="sb-item" data-loc="hd">${SIDEBAR_ICON('internaldisk')}Macintosh HD</button>
            <button type="button" class="sb-item" data-loc="trash"><svg class="sb-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4h11M6 4V2.6h4V4m-6 0 .7 9.1a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L12 4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>Trash</button>
          </div>
          <div class="sb-section"><h3>Tags</h3>${TAGS.map(([id, label]) => `<button type="button" class="sb-item" data-tag="${id}"><span class="tag-dot tag-${id}"></span>${label}</button>`).join('')}</div>
        </div></aside>
        <section class="finder-main">
          <header class="toolbar" data-drag>
            <div class="toolbar-group"><button type="button" class="tb-btn" data-nav="back" aria-label="Back">‹</button><button type="button" class="tb-btn" data-nav="forward" aria-label="Forward">›</button></div>
            <h1 class="toolbar-title" data-title></h1>
            <div class="toolbar-flex" data-drag></div>
            <div class="segmented" role="group" aria-label="View"><button type="button" data-view="icons" aria-label="as Icons"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h5v5H2Zm7 0h5v5H9ZM2 9h5v5H2Zm7 0h5v5H9Z" fill="currentColor"/></svg></button><button type="button" data-view="list" aria-label="as List"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12M2 8h12M2 13h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button></div>
            <button type="button" class="tb-btn" data-action="new-folder" aria-label="New Folder" title="New Folder"><svg viewBox="0 0 20 16" aria-hidden="true"><path d="M1.5 3.5A1.5 1.5 0 0 1 3 2h4l1.6 1.6H17a1.5 1.5 0 0 1 1.5 1.5v7.4A1.5 1.5 0 0 1 17 14H3a1.5 1.5 0 0 1-1.5-1.5Z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M10 6.5v5M7.5 9h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button>
            <button type="button" class="tb-btn" data-action="terminal" aria-label="Open in Terminal" title="Open in Terminal"><svg viewBox="0 0 20 16" aria-hidden="true"><rect x="1.5" y="1.5" width="17" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="m5 6 2.5 2L5 10m4 0h5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <label class="tb-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="m14.5 14.5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input type="search" placeholder="Search" aria-label="Search files" data-search /></label>
          </header>
          <div class="finder-banner" data-banner hidden></div>
          <div class="finder-body"><div class="finder-content" data-content tabindex="0" role="listbox" aria-multiselectable="true" aria-label="Files"></div><aside class="finder-preview" data-preview aria-label="Preview"></aside></div>
          <footer class="finder-status" data-status></footer>
        </section>
      </div>`,
      onFocusRequest: () => win.body.querySelector('[data-content]').focus({ preventScroll: true }),
      onClose: () => { finders.delete(win.id); return true; },
    });
    const $ = selector => win.body.querySelector(selector);
    const content = $('[data-content]');

    function go(loc, { push = true } = {}) {
      if (push) { state.back.push(state.loc); state.forward = []; }
      state.loc = loc;
      state.selected.clear();
      state.anchor = null;
      if (loc.type !== 'search') { state.query = ''; $('[data-search]').value = ''; }
      render();
    }

    function selectedItems() { return state.items.filter(item => state.selected.has(item.key)); }

    function openItem(item) {
      if (!item) return;
      if (item.app) { OS.apps.launch(item.app.id); return; }
      if (item.loc) { go(item.loc); return; }
      if (item.trashed) { OS.dialog.alert({ title: `“${item.name}” is in the Trash.`, message: 'To use this item, first drag it out of the Trash or choose Put Back.', icon: 'images/icons/files/trash-full.png', win }); return; }
      const real = OS.fs.target(item.node);
      if (real?.kind === 'directory') go({ type: 'path', path: real.path });
      else OS.fs.open(item.node.path);
    }

    function renderSidebar() {
      win.body.querySelectorAll('.sb-item').forEach(el => {
        const active = (el.dataset.path && state.loc.type === 'path' && el.dataset.path === state.loc.path)
          || (el.dataset.loc && state.loc.type === el.dataset.loc)
          || (el.dataset.tag && state.loc.type === 'tag' && state.loc.tag === el.dataset.tag);
        el.classList.toggle('is-active', !!active);
        el.setAttribute('aria-current', active ? 'true' : 'false');
      });
    }

    function renderPreview() {
      const box = $('[data-preview]');
      box.hidden = !state.preview;
      win.body.querySelector('.finder-body').classList.toggle('has-preview', state.preview);
      if (!state.preview) return;
      const picked = selectedItems();
      if (picked.length !== 1) {
        box.innerHTML = `<div class="fp-empty">${picked.length ? `${picked.length} items selected` : state.loc.type === 'path' && VFS.stat(state.loc.path)?.projectId ? '' : 'Select an item to preview it.'}</div>`;
        if (!picked.length && state.loc.type === 'path') {
          const node = VFS.stat(state.loc.path);
          if (node?.projectId) box.innerHTML = projectCard(node.projectId);
        }
        return;
      }
      const item = picked[0];
      const real = item.node ? OS.fs.target(item.node) : null;
      const projectId = real?.projectId && real.kind === 'directory' ? real.projectId : null;
      if (projectId) { box.innerHTML = projectCard(projectId); return; }
      const rows = [['Kind', item.kind], ...(item.size != null ? [['Size', OS.util.formatBytes(item.size)]] : []), ...(item.modified ? [['Modified', OS.util.longDate(item.modified)]] : []), ...(item.node ? [['Where', VFS.promptPath(VFS.parentOf(item.node.path))]] : [])];
      const text = real?.kind === 'file' && !VFS.urlFor(real) ? real.content.slice(0, 1200) : '';
      box.innerHTML = `<div class="fp-icon">${item.iconHtml.replace('file-icon', 'file-icon is-large')}</div><h3>${esc(item.name)}</h3><p class="fp-kind">${esc(item.kind)}${item.readOnly && item.node ? ' · read only' : ''}</p>${text ? `<pre class="fp-text">${esc(text)}</pre>` : ''}${VFS.urlFor(real) ? `<p class="fp-url">${esc(VFS.urlFor(real))}</p>` : ''}<dl class="fp-rows">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${item.app ? `<button type="button" class="push-button" data-open>Open</button>` : ''}`;
    }

    function projectCard(id) {
      const p = Portfolio.adapter.matchProject(id);
      if (!p) return '';
      const links = [p.demo && ['Live demo', p.demo], p.repository && ['Repository', p.repository]].filter(Boolean);
      return `<div class="fp-project"><span class="fp-mark">${Portfolio.render.mark(p.id, p.name)}</span><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><div class="fp-tags">${p.stack.slice(0, 8).map(s => `<span>${esc(s)}</span>`).join('')}</div><div class="fp-actions"><button type="button" class="push-button is-default" data-inspect="${esc(p.id)}">Inspect in Terminal</button>${links.map(([label, url]) => `<button type="button" class="push-button" data-url="${esc(url)}">${esc(label)} ↗</button>`).join('')}</div></div>`;
    }

    function render() {
      let items;
      try { items = itemsFor(state.loc); } catch { state.loc = { type: 'path', path: '/' }; items = itemsFor(state.loc); }
      state.items = sortItems(items, state.loc.type === 'recents' ? { key: 'none' } : state.sort);
      const title = locationTitle(state.loc);
      win.setTitle(title);
      $('[data-title]').textContent = title;
      $('[data-nav="back"]').disabled = !state.back.length;
      $('[data-nav="forward"]').disabled = !state.forward.length;
      win.body.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
      const writable = state.loc.type === 'path' && VFS.isWritableDir(state.loc.path);
      $('[data-action="new-folder"]').disabled = !writable;
      $('[data-action="terminal"]').disabled = state.loc.type !== 'path';
      const banner = $('[data-banner]');
      if (state.loc.type === 'trash') { banner.hidden = false; banner.innerHTML = `<span>Trash</span><button type="button" class="push-button" data-empty-trash${state.items.length ? '' : ' disabled'}>Empty</button>`; }
      else if (state.loc.type === 'path' && !writable && state.loc.path !== '/') { banner.hidden = false; banner.innerHTML = '<span><strong>Read only.</strong> This is part of the portfolio. Copy items to Documents to edit them.</span>'; }
      else banner.hidden = true;
      content.className = `finder-content view-${state.view}`;
      if (!state.items.length) {
        content.innerHTML = `<p class="finder-empty">${state.loc.type === 'search' ? 'No results' : state.loc.type === 'trash' ? 'Trash is empty' : state.loc.type === 'tag' ? 'No items with this tag' : 'This folder is empty'}</p>`;
      } else if (state.view === 'list') {
        const col = (key, label) => `<button type="button" class="lh-${key}${state.sort.key === key ? ` is-sorted is-${state.sort.dir}` : ''}" data-sort="${key}">${label}</button>`;
        content.innerHTML = `<div class="list-head" role="presentation">${col('name', 'Name')}${col('date', 'Date Modified')}${col('size', 'Size')}${col('kind', 'Kind')}</div>${state.items.map((item, i) => `<div class="list-row${state.selected.has(item.key) ? ' is-selected' : ''}" role="option" aria-selected="${state.selected.has(item.key)}" data-key="${esc(item.key)}" data-i="${i}"><span class="lr-name">${item.iconHtml.replace('file-icon', 'file-icon is-small')}<span>${esc(item.name)}</span>${item.tags?.map(t => `<span class="tag-dot tag-${t}"></span>`).join('') || ''}</span><span class="lr-date">${item.modified ? esc(OS.util.relativeTime(item.modified)) : '--'}</span><span class="lr-size">${item.size != null ? esc(OS.util.formatBytes(item.size)) : '--'}</span><span class="lr-kind">${esc(item.kind)}</span></div>`).join('')}`;
      } else {
        content.innerHTML = state.items.map((item, i) => `<div class="icon-cell${state.selected.has(item.key) ? ' is-selected' : ''}" role="option" aria-selected="${state.selected.has(item.key)}" data-key="${esc(item.key)}" data-i="${i}" title="${esc(item.name)}">${item.iconHtml}<span class="icon-name">${item.tags?.length ? `<span class="tag-dots">${item.tags.map(t => `<span class="tag-dot tag-${t}"></span>`).join('')}</span>` : ''}${esc(item.name)}</span></div>`).join('');
      }
      const status = $('[data-status]');
      const count = state.items.length;
      status.textContent = `${state.selected.size ? `${state.selected.size} of ` : ''}${count} item${count === 1 ? '' : 's'}${state.loc.type === 'path' ? (writable ? ' · saved in this browser' : ' · read only') : ''}`;
      renderSidebar();
      renderPreview();
    }

    function updateSelection() {
      content.querySelectorAll('[data-key]').forEach(el => {
        const on = state.selected.has(el.dataset.key);
        el.classList.toggle('is-selected', on);
        el.setAttribute('aria-selected', String(on));
      });
      const count = state.items.length;
      const writable = state.loc.type === 'path' && VFS.isWritableDir(state.loc.path);
      $('[data-status]').textContent = `${state.selected.size ? `${state.selected.size} of ` : ''}${count} item${count === 1 ? '' : 's'}${state.loc.type === 'path' ? (writable ? ' · saved in this browser' : ' · read only') : ''}`;
      renderPreview();
    }

    function selectIndex(i, { extend = false } = {}) {
      const item = state.items[OS.util.clamp(i, 0, state.items.length - 1)];
      if (!item) return;
      if (!extend) state.selected.clear();
      state.selected.add(item.key);
      state.anchor = item.key;
      updateSelection();
      content.querySelector(`[data-key="${CSS.escape(item.key)}"]`)?.scrollIntoView({ block: 'nearest' });
    }

    /* ---------- Menus ---------- */
    function itemMenu(item, x, y) {
      const picked = selectedItems();
      const nodes = picked.filter(i => i.node).map(i => i.node);
      const writable = nodes.length && nodes.every(n => !n.base);
      const real = item.node ? OS.fs.target(item.node) : null;
      if (item.trashed) {
        OS.menu.open([
          { label: 'Put Back', action: () => nodes.forEach(n => { try { VFS.putBack(n.path); } catch (error) { OS.dialog.alert({ title: 'The item can’t be put back.', message: error.message, win }); } }) },
          { label: 'Delete Immediately…', danger: true, action: async () => { if (await OS.dialog.confirm({ title: `Are you sure you want to delete ${nodes.length === 1 ? `“${item.name}”` : `these ${nodes.length} items`} immediately?`, message: 'You can’t undo this action.', confirm: 'Delete', destructive: true, win })) nodes.forEach(n => VFS.remove(n.path, '/', { recursive: true })); } },
          '-',
          { label: 'Empty Trash', action: () => OS.fs.emptyTrash() },
        ], { x, y });
        return;
      }
      OS.menu.open([
        { label: 'Open', action: () => picked.forEach(openItem) },
        ...(real?.kind === 'file' && !VFS.urlFor(real) ? [{ label: 'Open With', submenu: [
          { label: 'TextEdit', icon: 'images/icons/apps/textedit.png', action: () => OS.apps.launch('textedit', { path: real.path }) },
          { label: 'Terminal', icon: 'images/icons/apps/terminal.png', action: () => OS.terminal.run(`cat ${Portfolio.adapter.quoteArgument(real.path)}`) },
        ] }] : []),
        ...(real?.projectId && real.kind === 'directory' ? [{ label: 'Inspect in Terminal', action: () => OS.terminal.run(`inspect ${real.projectId}`) }] : []),
        ...(real?.kind === 'directory' ? [{ label: 'Open in Terminal', action: () => OS.terminal.run(`cd ${Portfolio.adapter.quoteArgument(real.path)}`) }] : []),
        ...(item.node?.kind === 'symlink' ? [{ label: 'Show Original', disabled: !real, action: () => { go({ type: 'path', path: VFS.parentOf(real.path) }); state.selected = new Set([real.path]); updateSelection(); } }] : []),
        '-',
        ...(item.node ? [
          { label: 'Move to Trash', disabled: !writable, action: () => OS.fs.moveToTrash(nodes.map(n => n.path)) },
          '-',
          { label: 'Get Info', action: () => nodes.forEach(n => OS.fs.getInfo(n.path)) },
          { label: 'Rename', disabled: !writable || nodes.length !== 1, action: () => OS.fs.rename(item.node.path) },
          { label: writable ? 'Duplicate' : 'Copy to Documents', action: () => nodes.forEach(n => {
            try {
              const dest = writable ? VFS.parentOf(n.path) : '/Documents';
              VFS.copy(n.path, VFS.join(dest, VFS.uniqueName(dest, writable ? n.name.replace(/(\.[^.]+)?$/, ' copy$1') : n.name)), '/', { recursive: true });
            } catch (error) { OS.dialog.alert({ title: 'The item can’t be copied.', message: error.message, win }); }
          }) },
          { label: 'Copy Path', action: () => navigator.clipboard?.writeText(nodes.map(n => VFS.promptPath(n.path)).join('\n')).catch(() => {}) },
          '-',
          { label: 'Tags', submenu: TAGS.map(([id, label]) => ({ label, icon: `<span class="tag-dot tag-${id}"></span>`, checked: nodes.every(n => VFS.tagsFor(n.path).includes(id)), action: () => { const on = !nodes.every(n => VFS.tagsFor(n.path).includes(id)); nodes.forEach(n => VFS.setTag(n.path, id, on)); } })) },
        ] : []),
      ], { x, y });
    }

    function backgroundMenu(x, y) {
      const writable = state.loc.type === 'path' && VFS.isWritableDir(state.loc.path);
      OS.menu.open([
        { label: 'New Folder', disabled: !writable, action: () => newFolder() },
        '-',
        ...(state.loc.type === 'path' ? [{ label: 'Get Info', action: () => OS.fs.getInfo(state.loc.path) }, { label: 'Open in Terminal', action: () => OS.terminal.run(`cd ${Portfolio.adapter.quoteArgument(state.loc.path)}`) }, '-'] : []),
        ...(state.loc.type === 'trash' ? [{ label: 'Empty Trash', disabled: !state.items.length, action: () => OS.fs.emptyTrash() }, '-'] : []),
        { label: 'View', submenu: [
          { label: 'as Icons', checked: state.view === 'icons', action: () => setView('icons') },
          { label: 'as List', checked: state.view === 'list', action: () => setView('list') },
        ] },
        { label: 'Sort By', submenu: sortMenu() },
        { label: state.preview ? 'Hide Preview' : 'Show Preview', action: togglePreview },
      ], { x, y });
    }

    function sortMenu() {
      return [['name', 'Name'], ['kind', 'Kind'], ['date', 'Date Modified'], ['size', 'Size']].map(([key, label]) => ({ label, checked: state.sort.key === key, action: () => setSort(key) }));
    }
    function setSort(key) {
      state.sort = { key, dir: state.sort.key === key && state.sort.dir === 'asc' ? 'desc' : 'asc' };
      CloudStorage.set('finderSort', state.sort);
      render();
    }
    function setView(view) { state.view = view; CloudStorage.set('finderView', view); render(); }
    function togglePreview() { state.preview = !state.preview; CloudStorage.set('finderPreview', state.preview); renderPreview(); }
    function newFolder() {
      if (state.loc.type !== 'path') return;
      const folder = OS.fs.newFolder(state.loc.path);
      if (folder) { state.selected = new Set([folder.path]); render(); OS.fs.rename(folder.path).then(renamed => { if (renamed) { state.selected = new Set([renamed.path]); render(); } }); }
    }
    function trashSelected() {
      const nodes = selectedItems().filter(i => i.node && !i.node.base && !i.trashed).map(i => i.node.path);
      if (nodes.length) OS.fs.moveToTrash(nodes);
    }

    /* ---------- Events ---------- */
    let lastPointer = 'mouse';
    win.body.addEventListener('pointerdown', event => { lastPointer = event.pointerType; });
    win.body.addEventListener('click', event => {
      const t = event.target;
      const sb = t.closest('.sb-item');
      if (sb) {
        if (sb.dataset.path) go({ type: 'path', path: sb.dataset.path });
        else if (sb.dataset.loc) go({ type: sb.dataset.loc });
        else if (sb.dataset.tag) go({ type: 'tag', tag: sb.dataset.tag });
        return;
      }
      const nav = t.closest('[data-nav]');
      if (nav) {
        if (nav.dataset.nav === 'back' && state.back.length) { state.forward.push(state.loc); go(state.back.pop(), { push: false }); }
        if (nav.dataset.nav === 'forward' && state.forward.length) { state.back.push(state.loc); go(state.forward.pop(), { push: false }); }
        return;
      }
      const view = t.closest('[data-view]'); if (view) { setView(view.dataset.view); return; }
      if (t.closest('[data-action="new-folder"]')) { newFolder(); return; }
      if (t.closest('[data-action="terminal"]') && state.loc.type === 'path') { OS.terminal.run(`cd ${Portfolio.adapter.quoteArgument(state.loc.path)}`); return; }
      if (t.closest('[data-empty-trash]')) { OS.fs.emptyTrash(); return; }
      const sortButton = t.closest('[data-sort]'); if (sortButton) { setSort(sortButton.dataset.sort); return; }
      const inspect = t.closest('[data-inspect]'); if (inspect) { OS.terminal.run(`inspect ${inspect.dataset.inspect}`); return; }
      const url = t.closest('[data-url]'); if (url) { OS.openURL(url.dataset.url); return; }
      if (t.closest('[data-open]')) { openItem(selectedItems()[0]); return; }
      const cell = t.closest('[data-key]');
      if (cell && content.contains(cell)) {
        const i = Number(cell.dataset.i);
        const key = cell.dataset.key;
        if (event.shiftKey && state.anchor) {
          const a = state.items.findIndex(x => x.key === state.anchor);
          const [from, to] = a < i ? [a, i] : [i, a];
          state.selected = new Set(state.items.slice(from, to + 1).map(x => x.key));
          updateSelection();
        } else if (event.metaKey || event.ctrlKey) {
          if (state.selected.has(key)) state.selected.delete(key); else state.selected.add(key);
          state.anchor = key;
          updateSelection();
        } else {
          selectIndex(i);
          if (event.detail === 0 || lastPointer === 'touch') openItem(state.items[i]);
        }
        return;
      }
      if (t === content || t.classList.contains('finder-empty')) { state.selected.clear(); updateSelection(); }
    });
    content.addEventListener('dblclick', event => {
      const cell = event.target.closest('[data-key]');
      if (cell && lastPointer !== 'touch') openItem(state.items[Number(cell.dataset.i)]);
    });
    content.addEventListener('contextmenu', event => {
      event.preventDefault();
      const cell = event.target.closest('[data-key]');
      if (cell) {
        if (!state.selected.has(cell.dataset.key)) selectIndex(Number(cell.dataset.i));
        itemMenu(state.items[Number(cell.dataset.i)], event.clientX, event.clientY);
      } else backgroundMenu(event.clientX, event.clientY);
    });
    content.addEventListener('keydown', event => {
      if (event.target !== content) return;
      const current = state.items.findIndex(x => x.key === state.anchor);
      const columns = state.view === 'icons' ? Math.max(1, Math.floor(content.clientWidth / 104)) : 1;
      const moves = { ArrowRight: state.view === 'icons' ? 1 : 0, ArrowLeft: state.view === 'icons' ? -1 : 0, ArrowDown: columns, ArrowUp: -columns };
      if (event.key in moves && moves[event.key]) { event.preventDefault(); selectIndex(current < 0 ? 0 : current + moves[event.key], { extend: event.shiftKey }); }
      else if (event.key === 'Enter' || ((event.metaKey || event.ctrlKey) && event.key === 'ArrowDown')) { event.preventDefault(); selectedItems().forEach(openItem); }
      else if ((event.metaKey || event.ctrlKey) && event.key === 'ArrowUp') { event.preventDefault(); if (state.loc.type === 'path' && state.loc.path !== '/') go({ type: 'path', path: VFS.parentOf(state.loc.path) }); }
      else if ((event.key === 'Backspace' && (event.metaKey || event.ctrlKey)) || event.key === 'Delete') { event.preventDefault(); trashSelected(); }
      else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') { event.preventDefault(); state.selected = new Set(state.items.map(x => x.key)); updateSelection(); }
      else if (event.key === ' ' && selectedItems().length === 1) { event.preventDefault(); if (!state.preview) togglePreview(); }
    });
    const search = $('[data-search]');
    search.addEventListener('input', () => {
      const query = search.value.trim();
      if (query) {
        if (state.loc.type !== 'search') state.back.push(state.loc);
        state.loc = { type: 'search', query };
        state.selected.clear();
        render();
      } else if (state.loc.type === 'search') go(state.back.pop() || { type: 'path', path: '/' }, { push: false });
    });
    search.addEventListener('keydown', event => { if (event.key === 'Escape' && search.value) { event.stopPropagation(); search.value = ''; search.dispatchEvent(new Event('input')); } });

    const offChange = OS.on('vfs:change', () => { if (win.el.isConnected) { const keys = state.selected; render(); state.selected = new Set([...keys].filter(k => state.items.some(i => i.key === k))); updateSelection(); } });
    win.on('close', offChange);
    finders.set(win.id, { go, render, state, newFolder, setView, togglePreview, trashSelected, focusSearch: () => search.focus(), setSort, sortMenu, selectedItems, openItem });
    if (args.select) { state.selected = new Set([args.select]); }
    render();
    return win;
  }

  const current = () => { const win = OS.wm.focused(); return win?.app === 'finder' ? finders.get(win.id) : null; };
  const goTo = loc => { const f = current(); if (f) f.go(loc); else create(loc.type === 'path' ? { path: loc.path } : { location: loc.type }); };

  OS.apps.register({
    id: 'finder',
    name: 'Finder',
    icon: 'images/icons/apps/finder.png',
    keywords: ['files', 'folders', 'documents', 'browse', 'projects'],
    alwaysRunning: true,
    version: '15.0',
    about: 'Browse the portfolio as folders, and keep your own files in Desktop, Documents, and Downloads. Everything you create is saved in this browser.',
    help: 'Double-click folders to open them and files to open them in TextEdit. Right-click for Get Info, Rename, Tags, and Move to Trash. The portfolio folders are read-only; copy items to Documents to edit them. Space shows the preview pane.',
    open(args = {}) {
      if (!args.newWindow && !args.path && !args.location) {
        const existing = OS.wm.list('finder').filter(w => finders.has(w.id));
        if (existing.length) { OS.wm.focus(existing[0].id); return existing[0]; }
      }
      return create(args);
    },
    appMenu: () => [
      { label: 'About Finder', action: () => OS.apps.showAbout(OS.apps.get('finder')) },
      '-',
      { label: 'Settings…', shortcut: `${mod},`, action: () => OS.apps.launch('settings', { pane: 'desktop-dock' }) },
      '-',
      { label: 'Empty Trash…', shortcut: `⇧${mod}⌫`, disabled: !VFS.trashCount(), action: () => OS.fs.emptyTrash() },
      '-',
      { label: 'Hide Others', shortcut: `⌥${mod}H`, action: () => OS.apps.running().filter(a => a !== 'finder').forEach(a => OS.wm.hideApp(a)) },
      { label: 'Show All', action: () => OS.apps.running().forEach(a => OS.wm.unhideApp(a)) },
    ],
    dockMenu: () => [{ label: 'New Finder Window', action: () => create({ newWindow: true }) }],
    menus: ({ win }) => {
      const f = win && finders.get(win.id);
      const picked = f ? f.selectedItems() : [];
      return [
        { title: 'File', items: [
          { label: 'New Finder Window', shortcut: `${mod}N`, action: () => create({ newWindow: true }) },
          { label: 'New Folder', shortcut: `⇧${mod}N`, disabled: !f || f.state.loc.type !== 'path' || !VFS.isWritableDir(f.state.loc.path), action: () => f?.newFolder() },
          { label: 'Open', shortcut: `${mod}O`, disabled: !picked.length, action: () => picked.forEach(f.openItem) },
          { label: 'Close Window', shortcut: `${mod}W`, disabled: !win, action: () => win?.close() },
          '-',
          { label: 'Get Info', shortcut: `${mod}I`, disabled: !picked.some(i => i.node), action: () => picked.filter(i => i.node).forEach(i => OS.fs.getInfo(i.node.path)) },
          { label: 'Rename', disabled: picked.length !== 1 || !picked[0].node || picked[0].node.base, action: () => OS.fs.rename(picked[0].node.path) },
          { label: 'Move to Trash', shortcut: `${mod}⌫`, disabled: !picked.some(i => i.node && !i.node.base && !i.trashed), action: () => f?.trashSelected() },
          '-',
          { label: 'Find', shortcut: `${mod}F`, disabled: !f, action: () => f?.focusSearch() },
        ] },
        { title: 'View', items: [
          { label: 'as Icons', checked: f?.state.view === 'icons', disabled: !f, action: () => f?.setView('icons') },
          { label: 'as List', checked: f?.state.view === 'list', disabled: !f, action: () => f?.setView('list') },
          '-',
          { label: 'Sort By', disabled: !f, submenu: () => f.sortMenu() },
          { label: f?.state.preview ? 'Hide Preview' : 'Show Preview', disabled: !f, action: () => f?.togglePreview() },
          '-',
          document.fullscreenElement ? { label: 'Exit Full Screen', action: () => document.exitFullscreen?.() } : { label: 'Enter Full Screen', action: () => document.documentElement.requestFullscreen?.().catch(() => {}) },
        ] },
        { title: 'Go', items: [
          { label: 'Back', shortcut: `${mod}[`, disabled: !f?.state.back.length, action: () => win.body.querySelector('[data-nav="back"]').click() },
          { label: 'Forward', shortcut: `${mod}]`, disabled: !f?.state.forward.length, action: () => win.body.querySelector('[data-nav="forward"]').click() },
          { label: 'Enclosing Folder', shortcut: `${mod}↑`, disabled: !f || f.state.loc.type !== 'path' || f.state.loc.path === '/', action: () => f.go({ type: 'path', path: VFS.parentOf(f.state.loc.path) }) },
          '-',
          { label: 'Recents', action: () => goTo({ type: 'recents' }) },
          { label: 'Documents', action: () => goTo({ type: 'path', path: '/Documents' }) },
          { label: 'Desktop', action: () => goTo({ type: 'path', path: '/Desktop' }) },
          { label: 'Downloads', action: () => goTo({ type: 'path', path: '/Downloads' }) },
          { label: 'Home', action: () => goTo({ type: 'path', path: '/' }) },
          { label: 'Projects', action: () => goTo({ type: 'path', path: '/projects' }) },
          { label: 'Applications', action: () => goTo({ type: 'applications' }) },
          { label: 'Macintosh HD', action: () => goTo({ type: 'hd' }) },
          '-',
          { label: 'Go to Folder…', shortcut: `⇧${mod}G`, action: async () => {
            const path = await OS.dialog.prompt({ title: 'Go to the folder:', value: f?.state.loc.type === 'path' ? VFS.promptPath(f.state.loc.path) : '~/', confirm: 'Go', icon: 'images/icons/apps/finder.png' });
            if (!path) return;
            const node = VFS.stat(path.trim());
            if (node?.kind === 'directory') goTo({ type: 'path', path: node.path });
            else OS.dialog.alert({ title: 'The folder can’t be found.', message: path });
          } },
        ] },
      ];
    },
  });
})();
