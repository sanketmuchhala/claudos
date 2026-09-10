/* ===== DESKTOP =====
   Icons are the contents of ~/Desktop plus Macintosh HD, arranged from the
   top-right like macOS. Click to select, drag a rectangle to select several,
   drag icons to arrange them (or onto the Trash), double-click or Enter to
   open. Clicking the wallpaper makes Finder the active app. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  const CELL_W = 92;
  const CELL_H = 100;
  let host;
  let desktop;
  const selected = new Set();
  let positions = {};
  let lastPointerType = 'mouse';

  const HD = { path: '::hd', name: 'Macintosh HD' };

  function entries() {
    let nodes = [];
    try { nodes = VFS.listDirectory('/Desktop'); } catch { /* No Desktop folder. */ }
    const sort = CloudStorage.get('desktopSort', 'none');
    if (sort === 'name') nodes.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'kind') nodes.sort((a, b) => OS.fs.kindOf(a).localeCompare(OS.fs.kindOf(b)) || a.name.localeCompare(b.name));
    if (sort === 'date') nodes.sort((a, b) => (b.modified || 0) - (a.modified || 0));
    return [HD, ...nodes.map(node => ({ path: node.path, name: OS.fs.displayName(node), node }))];
  }

  function slots() {
    const top = (document.getElementById('menubar')?.offsetHeight || 28) + 10;
    const rows = Math.max(1, Math.floor((window.innerHeight - top - 110) / CELL_H));
    return { top, rows };
  }

  function positionFor(item, auto) {
    const saved = positions[item.path];
    if (saved) return { x: OS.util.clamp(saved.x, 0, window.innerWidth - CELL_W), y: OS.util.clamp(saved.y, slots().top, window.innerHeight - CELL_H - 60) };
    const { top, rows } = slots();
    const column = Math.floor(auto / rows);
    const row = auto % rows;
    return { x: window.innerWidth - 16 - (column + 1) * CELL_W, y: top + row * CELL_H };
  }

  function render() {
    const items = entries();
    let auto = 0;
    host.innerHTML = items.map(item => {
      const pos = positionFor(item, positions[item.path] ? 0 : auto++);
      const icon = item.node ? OS.fs.iconMarkup(item.node) : '<span class="file-icon"><img src="images/icons/files/hd.png" alt="" draggable="false" /></span>';
      const alias = item.node?.kind === 'symlink' ? ', alias' : '';
      return `<button type="button" class="desk-icon${selected.has(item.path) ? ' is-selected' : ''}" data-path="${esc(item.path)}" style="left:${pos.x}px;top:${pos.y}px" aria-label="${esc(item.name)}${alias}" aria-pressed="${selected.has(item.path)}">${icon}<span class="desk-label">${esc(item.name)}</span></button>`;
    }).join('');
  }

  function setSelection(paths) {
    selected.clear();
    paths.forEach(p => selected.add(p));
    host.querySelectorAll('.desk-icon').forEach(el => {
      const on = selected.has(el.dataset.path);
      el.classList.toggle('is-selected', on);
      el.setAttribute('aria-pressed', String(on));
    });
  }

  function open(path) {
    if (path === '::hd') { OS.apps.launch('finder', { location: 'hd', newWindow: true }); return; }
    OS.fs.open(path);
  }

  function savePositions() { CloudStorage.set('desktopPositions', positions); }

  /* ---------- Menus ---------- */
  function cycleWallpaper() {
    const ids = OS.theme.WALLPAPERS.map(w => w.id);
    OS.settings.set('wallpaper', ids[(ids.indexOf(OS.settings.get('wallpaper')) + 1) % ids.length]);
  }

  function backgroundMenu(x, y) {
    const sort = CloudStorage.get('desktopSort', 'none');
    const sortBy = value => () => { CloudStorage.set('desktopSort', value); positions = {}; savePositions(); render(); };
    OS.menu.open([
      { label: 'New Folder', action: () => { const folder = OS.fs.newFolder('/Desktop'); if (folder) { setSelection([folder.path]); OS.fs.rename(folder.path); } } },
      { label: 'New Finder Window', action: () => OS.apps.launch('finder', { newWindow: true }) },
      '-',
      { label: 'Get Info', action: () => OS.fs.getInfo('/Desktop') },
      { label: 'Change Wallpaper…', action: () => OS.apps.launch('settings', { pane: 'wallpaper' }) },
      { label: 'Next Wallpaper', action: cycleWallpaper },
      '-',
      { label: 'Clean Up', action: () => { positions = {}; savePositions(); render(); } },
      { label: 'Sort By', submenu: [
        { label: 'None', checked: sort === 'none', action: sortBy('none') },
        '-',
        { label: 'Name', checked: sort === 'name', action: sortBy('name') },
        { label: 'Kind', checked: sort === 'kind', action: sortBy('kind') },
        { label: 'Date Modified', checked: sort === 'date', action: sortBy('date') },
      ] },
      '-',
      { label: 'Open in Terminal', action: () => OS.terminal.run('cd ~/Desktop') },
      { label: 'System Settings…', action: () => OS.apps.launch('settings') },
      { label: 'About This Mac', action: () => OS.apps.launch('about') },
    ], { x, y, label: 'Desktop' });
  }

  function iconMenu(path, x, y) {
    if (!selected.has(path)) setSelection([path]);
    if (path === '::hd') {
      OS.menu.open([
        { label: 'Open', action: () => open(path) },
        { label: 'Get Info', action: () => OS.apps.launch('about') },
      ], { x, y });
      return;
    }
    const node = VFS.stat(path, '/', { follow: false });
    if (!node) return;
    const real = OS.fs.target(node);
    const paths = [...selected].filter(p => p !== '::hd');
    OS.menu.open([
      { label: 'Open', action: () => paths.forEach(open) },
      ...(node.kind === 'symlink' ? [{ label: 'Show Original', disabled: !real, action: () => OS.apps.launch('finder', { path: VFS.parentOf(real.path), select: real.path, newWindow: true }) }] : []),
      ...(real?.kind === 'directory' ? [{ label: 'Open in Terminal', action: () => OS.terminal.run(`cd ${Portfolio.adapter.quoteArgument(real.path)}`) }] : []),
      '-',
      { label: 'Get Info', action: () => OS.fs.getInfo(path) },
      { label: 'Rename', disabled: paths.length !== 1, action: () => OS.fs.rename(path) },
      { label: 'Copy Path', action: () => navigator.clipboard?.writeText(VFS.promptPath(path)).catch(() => {}) },
      '-',
      { label: 'Move to Trash', action: () => OS.fs.moveToTrash(paths) },
    ], { x, y });
  }

  /* ---------- Pointer ---------- */
  function startMarquee(event) {
    const start = { x: event.clientX, y: event.clientY };
    const box = document.createElement('div');
    box.className = 'desk-marquee';
    desktop.appendChild(box);
    const additive = event.metaKey || event.ctrlKey || event.shiftKey;
    const initial = additive ? new Set(selected) : new Set();
    if (!additive) setSelection([]);
    desktop.setPointerCapture(event.pointerId);
    const move = e => {
      const r = { left: Math.min(start.x, e.clientX), top: Math.min(start.y, e.clientY), right: Math.max(start.x, e.clientX), bottom: Math.max(start.y, e.clientY) };
      Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.right - r.left}px`, height: `${r.bottom - r.top}px` });
      const hits = new Set(initial);
      host.querySelectorAll('.desk-icon').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top) hits.add(el.dataset.path);
      });
      setSelection([...hits]);
    };
    const up = () => {
      desktop.removeEventListener('pointermove', move);
      desktop.removeEventListener('pointerup', up);
      desktop.removeEventListener('pointercancel', up);
      box.remove();
    };
    desktop.addEventListener('pointermove', move);
    desktop.addEventListener('pointerup', up);
    desktop.addEventListener('pointercancel', up);
  }

  function startIconDrag(event, icon) {
    const start = { x: event.clientX, y: event.clientY };
    const moving = [...host.querySelectorAll('.desk-icon')].filter(el => selected.has(el.dataset.path));
    const origins = moving.map(el => ({ el, x: el.offsetLeft, y: el.offsetTop }));
    let dragging = false;
    icon.setPointerCapture(event.pointerId);
    const overTrash = e => { const r = OS.dock.trashRect(); return r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 10 && e.clientY <= r.bottom + 10; };
    const move = e => {
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!dragging && Math.abs(dx) + Math.abs(dy) < 5) return;
      dragging = true;
      host.classList.add('is-dragging');
      origins.forEach(o => { o.el.style.left = `${o.x + dx}px`; o.el.style.top = `${o.y + dy}px`; });
      OS.dock.highlightTrash(overTrash(e));
    };
    const up = e => {
      icon.removeEventListener('pointermove', move);
      icon.removeEventListener('pointerup', up);
      icon.removeEventListener('pointercancel', up);
      host.classList.remove('is-dragging');
      OS.dock.highlightTrash(false);
      if (!dragging) return;
      icon.dataset.dragged = '1';
      setTimeout(() => delete icon.dataset.dragged, 0);
      if (e.type === 'pointerup' && overTrash(e)) {
        const paths = [...selected].filter(p => p !== '::hd');
        origins.forEach(o => { o.el.style.left = `${o.x}px`; o.el.style.top = `${o.y}px`; });
        if (paths.length) OS.fs.moveToTrash(paths);
        return;
      }
      origins.forEach(o => {
        positions[o.el.dataset.path] = { x: Math.round(o.el.offsetLeft / 4) * 4, y: Math.round(o.el.offsetTop / 4) * 4 };
      });
      savePositions();
    };
    icon.addEventListener('pointermove', move);
    icon.addEventListener('pointerup', up);
    icon.addEventListener('pointercancel', up);
  }

  function init() {
    desktop = document.getElementById('desktop');
    host = document.getElementById('desktop-icons');
    positions = CloudStorage.get('desktopPositions', {});
    render();

    desktop.addEventListener('pointerdown', event => {
      lastPointerType = event.pointerType;
      const icon = event.target.closest('.desk-icon');
      const onBackground = event.target === desktop || event.target === host || event.target.classList?.contains('wallpaper-layer');
      if (icon) {
        if (event.button !== 0) return;
        const path = icon.dataset.path;
        if (event.metaKey || event.ctrlKey) {
          const next = new Set(selected);
          if (next.has(path)) next.delete(path); else next.add(path);
          setSelection([...next]);
        } else if (!selected.has(path)) setSelection([path]);
        OS.wm.blurAll();
        OS.apps.setActive('finder');
        if (!OS.util.isCoarse()) startIconDrag(event, icon);
        return;
      }
      if (!onBackground) return;
      if (OS.wm.isDesktopShown()) OS.wm.showDesktop(false);
      OS.wm.blurAll();
      OS.apps.setActive('finder');
      if (event.button === 0) startMarquee(event);
    });
    host.addEventListener('click', event => {
      const icon = event.target.closest('.desk-icon');
      if (!icon || icon.dataset.dragged) return;
      if (event.detail === 0 || lastPointerType === 'touch') open(icon.dataset.path);
    });
    host.addEventListener('dblclick', event => {
      const icon = event.target.closest('.desk-icon');
      if (icon && lastPointerType !== 'touch') { setSelection([icon.dataset.path]); open(icon.dataset.path); }
    });
    desktop.addEventListener('contextmenu', event => {
      if (event.target.closest('.win, #dock, #menubar')) return;
      event.preventDefault();
      const icon = event.target.closest('.desk-icon');
      if (icon) iconMenu(icon.dataset.path, event.clientX, event.clientY);
      else backgroundMenu(event.clientX, event.clientY);
    });
    host.addEventListener('keydown', event => {
      const icon = event.target.closest('.desk-icon');
      if (!icon) return;
      const icons = [...host.querySelectorAll('.desk-icon')];
      const i = icons.indexOf(icon);
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        const next = icons[OS.util.clamp(i + (event.key === 'ArrowDown' || event.key === 'ArrowLeft' ? 1 : -1), 0, icons.length - 1)];
        next.focus();
        setSelection([next.dataset.path]);
      }
      if ((event.key === 'Backspace' || event.key === 'Delete') && (event.metaKey || event.key === 'Delete')) {
        event.preventDefault();
        OS.fs.moveToTrash([...selected].filter(p => p !== '::hd'));
      }
    });
    host.addEventListener('focusin', event => {
      const icon = event.target.closest('.desk-icon');
      if (icon && !selected.has(icon.dataset.path) && lastPointerType !== 'mouse') setSelection([icon.dataset.path]);
    });

    OS.on('vfs:change', render);
    window.addEventListener('resize', OS.util.debounce(render, 80));
  }

  OS.desktop = { init, render, select: setSelection, cycleWallpaper };
})();
