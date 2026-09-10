/* ===== FILES AND LINKS =====
   Shared helpers for Finder, the desktop, Spotlight, and Terminal: icons,
   kinds, opening items with their default app, Get Info, and trash.
   OS.openURL routes links: frameable sites open in Safari, sites that refuse
   to be framed open in a new browser tab, and mailto: opens Mail. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  const ICONS = 'images/icons/files/';
  const SPECIAL = { '/Desktop': 'folder-desktop', '/Documents': 'folder-documents', '/Downloads': 'folder-downloads', '/': 'folder-home' };
  const KINDS = { md: 'Markdown document', txt: 'Plain text document', json: 'JSON document', rtf: 'Rich text document', webloc: 'Web location', html: 'HTML document', csv: 'CSV document' };
  // Sites known to refuse framing (X-Frame-Options / frame-ancestors).
  const FRAME_BLOCKED = /(^|\.)(github\.com|linkedin\.com|leetcode\.com|google\.[a-z.]+|x\.com|twitter\.com|facebook\.com|instagram\.com|youtube\.com|stackoverflow\.com|reddit\.com|medium\.com|apple\.com|amazon\.[a-z.]+|notion\.so|figma\.com|openai\.com|chatgpt\.com|claude\.ai|anthropic\.com)$/i;

  function target(node) {
    if (node?.kind !== 'symlink') return node;
    try { return VFS.follow(node); } catch { return null; }
  }

  function iconFor(node) {
    if (!node) return `${ICONS}document.png`;
    const real = target(node);
    if (!real) return `${ICONS}document.png`;
    if (real.kind === 'directory') return `${ICONS}${SPECIAL[real.path] || 'folder'}.png`;
    if (/\.webloc$/i.test(real.name)) return `${ICONS}url.png`;
    return `${ICONS}document.png`;
  }

  const extension = name => (name.includes('.') ? name.split('.').pop().toUpperCase() : '');

  function kindOf(node) {
    if (node.kind === 'symlink') return 'Alias';
    if (node.kind === 'directory') return node.projectId ? 'Project folder' : 'Folder';
    return KINDS[extension(node.name).toLowerCase()] || 'Document';
  }

  /** Display name: Finder hides .webloc extensions, like macOS. */
  const displayName = node => (node.path === '/' ? 'sanket' : node.name.replace(/\.webloc$/i, ''));

  /** Icon markup with the macOS alias arrow and document extension label. */
  function iconMarkup(node, className = '') {
    const real = target(node);
    const ext = real?.kind === 'file' && !/\.webloc$/i.test(real.name) ? extension(real.name) : '';
    const link = /\.webloc$/i.test(real?.name || '') ? `<span class="file-link-mark" aria-hidden="true">${esc((VFS.urlFor(real) || '').replace(/^https?:\/\/(www\.)?/, '').split(/[/.]/)[0].slice(0, 1).toUpperCase())}</span>` : '';
    return `<span class="file-icon ${className}"><img src="${iconFor(node)}" alt="" draggable="false" />${ext ? `<span class="file-ext" aria-hidden="true">${esc(ext.slice(0, 4))}</span>` : ''}${link}${node.kind === 'symlink' ? '<span class="file-alias" aria-hidden="true"></span>' : ''}</span>`;
  }

  function recordRecent(path) {
    const list = CloudStorage.get('recents', []);
    CloudStorage.set('recents', [path, ...list.filter(p => p !== path)].slice(0, 20));
  }

  function open(path) {
    const node = VFS.stat(path, '/', { follow: false });
    if (!node) { OS.dialog.alert({ title: 'The item can’t be found.', message: `${VFS.promptPath(path)} may have been moved or deleted.` }); return; }
    const real = target(node);
    if (!real) {
      OS.dialog.alert({ title: `The alias “${node.name}” can’t be opened because the original item can’t be found.`, icon: `${ICONS}document.png` });
      return;
    }
    const url = VFS.urlFor(real);
    if (url) { OS.openURL(url); return; }
    if (real.kind === 'directory') { OS.apps.launch('finder', { path: real.path, newWindow: true }); return; }
    recordRecent(real.path);
    OS.apps.launch('textedit', { path: real.path });
  }

  async function emptyTrash() {
    const count = VFS.trashCount();
    if (!count) return;
    const ok = await OS.dialog.confirm({ title: `Are you sure you want to permanently erase the ${count === 1 ? 'item' : `${count} items`} in the Trash?`, message: 'You can’t undo this action.', confirm: 'Empty Trash', destructive: true, icon: `${ICONS}trash-full.png` });
    if (ok) VFS.emptyTrash();
  }

  function moveToTrash(paths) {
    const failed = [];
    paths.forEach(path => { try { VFS.trash(path); } catch (error) { failed.push(error.message); } });
    if (failed.length) OS.dialog.alert({ title: 'Some items can’t be moved to the Trash.', message: failed.join('\n'), icon: `${ICONS}trash.png` });
  }

  async function rename(path) {
    const node = VFS.stat(path, '/', { follow: false });
    if (!node || node.base) return null;
    const name = await OS.dialog.prompt({ title: `Rename “${node.name}”`, value: node.name, confirm: 'Rename', icon: iconFor(node) });
    if (!name || name === node.name) return null;
    try { return VFS.move(node.path, VFS.join(VFS.parentOf(node.path), name)); } catch (error) { OS.dialog.alert({ title: 'The item can’t be renamed.', message: error.message }); return null; }
  }

  function newFolder(dirPath) {
    try { return VFS.mkdir(VFS.join(dirPath, VFS.uniqueName(dirPath, 'untitled folder'))); } catch (error) { OS.dialog.alert({ title: 'The folder can’t be created.', message: error.message }); return null; }
  }

  function getInfo(path) {
    const node = VFS.stat(path, '/', { follow: false });
    if (!node) return;
    const real = target(node);
    const size = node.kind === 'directory' ? `${VFS.children(node.path, true).length} items` : real?.kind === 'file' ? OS.util.formatBytes(VFS.sizeOf(real.content)) : '—';
    const rows = [
      ['Kind', kindOf(node)],
      ['Size', size],
      ['Where', VFS.promptPath(VFS.parentOf(node.path))],
      ...(node.kind === 'symlink' ? [['Original', VFS.promptPath(node.target)]] : []),
      ...(VFS.urlFor(real) ? [['URL', VFS.urlFor(real)]] : []),
      ['Created', OS.util.longDate(node.created || Date.now())],
      ['Modified', OS.util.longDate(node.modified || Date.now())],
      ['Sharing', node.base ? 'Read only — part of the portfolio' : 'Read & write — saved in this browser'],
    ];
    const win = OS.wm.create({
      app: 'finder', title: `${displayName(node)} Info`, width: 290, height: 420, minWidth: 260, resizable: true, className: 'info-window',
      content: `<div class="info-panel"><div class="info-head">${iconMarkup(node, 'is-large')}<div><h2>${esc(displayName(node))}</h2><p>${esc(kindOf(node))} · ${esc(size)}</p></div></div><dl class="info-rows">${rows.map(([k, v]) => `<div><dt>${esc(k)}:</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${node.projectId ? `<button type="button" class="info-action" data-inspect="${esc(node.projectId)}">Inspect in Terminal</button>` : ''}</div>`,
    });
    win.body.addEventListener('click', event => {
      const button = event.target.closest('[data-inspect]');
      if (button) OS.terminal.run(`inspect ${button.dataset.inspect}`);
    });
  }

  function openURL(url, { newTab = false } = {}) {
    const safe = OS.util.safeUrl(url);
    if (!safe) return;
    const parsed = new URL(safe);
    if (parsed.protocol === 'mailto:') {
      OS.apps.launch('mail', { compose: { to: decodeURIComponent(parsed.pathname), subject: parsed.searchParams.get('subject') || '', body: parsed.searchParams.get('body') || '' } });
      return;
    }
    if (newTab || FRAME_BLOCKED.test(parsed.hostname)) { window.open(safe, '_blank', 'noopener,noreferrer'); return; }
    OS.apps.launch('safari', { url: safe });
  }

  OS.fs = { iconFor, iconMarkup, kindOf, displayName, extension, open, emptyTrash, moveToTrash, rename, newFolder, getInfo, recordRecent, target };
  OS.openURL = openURL;
  OS.isFrameBlocked = host => FRAME_BLOCKED.test(host);
})();
