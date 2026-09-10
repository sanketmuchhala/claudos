/* ===== WINDOW MANAGER =====
   Windows: cascade placement, titlebar dragging, eight-edge resizing,
   Sequoia-style tiling (drag to an edge or the top), zoom, genie minimize
   into the Dock, and focus. On phones every window fills the screen.

   chrome: "standard" draws a titlebar; "toolbar" and "none" let the app draw
   its own top area, marking draggable regions with data-drag. */
(function () {
  const OS = window.OS;
  const { clamp, esc } = OS.util;
  const windows = new Map();
  let zTop = 10;
  let focusedId = null;
  let layer;
  let snapPreview;
  let desktopShown = false;

  const GLYPHS = {
    close: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.6 2.6l4.8 4.8m0-4.8L2.6 7.4" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>',
    min: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.2 5h5.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    zoom: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.4 2.4h3.9L2.4 6.3Zm5.2 5.2H3.7l3.9-3.9Z" fill="currentColor"/></svg>',
  };
  const INTERACTIVE = 'button, a, input, textarea, select, label, [contenteditable="true"], [data-no-drag], [role="button"], [role="tab"], [role="option"], summary, .win-lights';

  const isPhone = () => OS.util.isPhone();
  const motion = () => OS.util.motionOn();
  const root = () => document.documentElement;

  function menubarHeight() {
    if (root().classList.contains('menubar-autohide')) return 0;
    return document.getElementById('menubar')?.offsetHeight || 28;
  }
  function dockReserve() {
    if (root().classList.contains('dock-autohide')) return 4;
    const tray = document.querySelector('#dock .dock-tray');
    if (!tray || !tray.offsetParent) return 0;
    return Math.max(0, window.innerHeight - tray.getBoundingClientRect().top + (isPhone() ? 4 : 6));
  }
  function workArea() {
    const top = menubarHeight();
    const bottom = window.innerHeight - dockReserve();
    return { x: 0, y: top, w: window.innerWidth, h: Math.max(160, bottom - top) };
  }
  function rectFor(where) {
    const a = workArea();
    const half = Math.round(a.w / 2);
    if (where === 'left') return { x: 0, y: a.y, w: half, h: a.h };
    if (where === 'right') return { x: half, y: a.y, w: a.w - half, h: a.h };
    return { x: 0, y: a.y, w: a.w, h: a.h };
  }

  function apply(win) {
    const { x, y, w, h } = win.geom;
    Object.assign(win.el.style, { left: `${Math.round(x)}px`, top: `${Math.round(y)}px`, width: `${Math.round(w)}px`, height: `${Math.round(h)}px` });
  }
  function emitWin(win, type, detail) {
    (win.listeners[type] || []).forEach(fn => { try { fn(detail); } catch (error) { console.error(error); } });
  }

  function animateTo(win, rect, done) {
    const from = { ...win.geom };
    win.geom = { ...rect };
    if (!motion() || !win.el.isConnected || win.el.hidden) { apply(win); emitWin(win, 'resize'); done?.(); return; }
    win.el.classList.add('is-animating');
    const frames = [
      { left: `${from.x}px`, top: `${from.y}px`, width: `${from.w}px`, height: `${from.h}px` },
      { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` },
    ];
    const animation = win.el.animate(frames, { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
    apply(win);
    animation.onfinish = animation.oncancel = () => { win.el.classList.remove('is-animating'); emitWin(win, 'resize'); done?.(); };
  }

  function visibleWindows(app) {
    return [...windows.values()]
      .filter(w => !w.closing && !w.minimized && !w.hidden && (!app || w.app === app))
      .sort((a, b) => Number(b.el.style.zIndex) - Number(a.el.style.zIndex));
  }
  function list(app) {
    return [...windows.values()].filter(w => !w.closing && (!app || w.app === app)).sort((a, b) => Number(b.el.style.zIndex) - Number(a.el.style.zIndex));
  }

  function placement(opts) {
    const area = workArea();
    const phone = isPhone();
    const w = clamp(opts.width || 640, Math.min(opts.minWidth || 200, area.w), Math.max(200, area.w - 16));
    const h = clamp(opts.height || 420, Math.min(opts.minHeight || 120, area.h), Math.max(120, area.h - 10));
    if (phone) return rectFor('fill');
    const siblings = visibleWindows(opts.app);
    let x; let y;
    if (opts.x != null && opts.y != null) { x = opts.x; y = opts.y; }
    else if (siblings.length) {
      x = siblings[0].geom.x + 26; y = siblings[0].geom.y + 26;
      if (x + w > area.w - 8 || y + h > area.y + area.h) { x = Math.max(8, (area.w - w) / 2 - 60); y = area.y + 16; }
    } else {
      x = (area.w - w) / 2 + (opts.offsetX || 0);
      y = area.y + Math.max(6, ((area.h - h) / 2) * (opts.centerBias ?? 0.7)) + (opts.offsetY || 0);
    }
    return { x: clamp(x, 0, Math.max(0, area.w - w)), y: clamp(y, area.y, Math.max(area.y, area.y + area.h - h)), w, h };
  }

  function create(opts) {
    const id = OS.util.uid('win');
    const chrome = opts.chrome || 'standard';
    const resizable = opts.resizable !== false;
    const el = document.createElement('section');
    el.className = `win chrome-${chrome}${opts.className ? ` ${opts.className}` : ''}`;
    el.dataset.app = opts.app;
    el.dataset.win = id;
    el.setAttribute('aria-label', opts.title || OS.apps.get(opts.app)?.name || 'Window');
    if (opts.lightsTop != null) el.style.setProperty('--lights-top', `${opts.lightsTop}px`);
    if (opts.lightsLeft != null) el.style.setProperty('--lights-left', `${opts.lightsLeft}px`);
    el.innerHTML = `<div class="win-lights" role="group" aria-label="Window controls">
        <button type="button" class="tl tl-close" data-win-action="close" aria-label="Close window" title="Close">${GLYPHS.close}</button>
        <button type="button" class="tl tl-min" data-win-action="minimize" aria-label="Minimize window" title="Minimize"${opts.minimizable === false ? ' disabled' : ''}>${GLYPHS.min}</button>
        <button type="button" class="tl tl-zoom" data-win-action="zoom" aria-label="Zoom window" title="Zoom"${resizable ? '' : ' disabled'}>${GLYPHS.zoom}</button>
      </div>
      ${chrome === 'standard' ? `<header class="win-titlebar" data-drag><div class="win-title">${opts.titleIcon || ''}<span data-win-title>${esc(opts.title || '')}</span></div></header>` : ''}
      <div class="win-body"></div>
      ${resizable ? ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(d => `<div class="win-resize r-${d}" data-resize="${d}"></div>`).join('') : ''}`;
    const body = el.querySelector('.win-body');
    if (typeof opts.content === 'string') body.innerHTML = opts.content;
    else if (opts.content) body.append(opts.content);

    const win = {
      id, app: opts.app, el, body, opts,
      title: opts.title || '',
      geom: placement(opts),
      prev: null, zoomed: false, tile: null, minimized: false, hidden: false, closing: false,
      listeners: {},
      data: {},
      on(type, fn) { (this.listeners[type] ||= []).push(fn); return () => { this.listeners[type] = this.listeners[type].filter(f => f !== fn); }; },
      setTitle(title) {
        this.title = title;
        const node = el.querySelector('[data-win-title]');
        if (node) node.textContent = title;
        el.setAttribute('aria-label', title);
        OS.emit('window:title', this);
      },
      focus: () => focus(id),
      close: options => close(id, options),
      minimize: () => minimize(id),
      toggleZoom: () => toggleZoom(id),
      tileTo: where => tileTo(id, where),
      center: () => center(id),
      isFocused: () => focusedId === id,
      focusContent: () => focusContent(windows.get(id)),
    };
    if (isPhone()) { win.zoomed = true; el.classList.add('is-zoomed'); }
    windows.set(id, win);
    el.style.zIndex = ++zTop;
    apply(win);
    layer.appendChild(el);
    if (motion()) el.animate([{ opacity: 0, transform: 'scale(.955)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.9,.3,1)' });
    opts.init?.(win);
    focus(id);
    if (opts.focusContent !== false) requestAnimationFrame(() => focusContent(win));
    OS.emit('window:open', win);
    return win;
  }

  function focusContent(win) {
    if (!win || win.closing) return;
    if (win.opts.onFocusRequest) { win.opts.onFocusRequest(win); return; }
    const target = win.body.querySelector('[autofocus], [data-autofocus]');
    target?.focus({ preventScroll: true });
  }

  function focus(id, { raise = true } = {}) {
    const win = windows.get(id);
    if (!win || win.closing) return;
    if (win.hidden) unhideApp(win.app);
    if (win.minimized) unminimize(win);
    if (desktopShown) showDesktop(false);
    if (raise) win.el.style.zIndex = ++zTop;
    if (focusedId !== id) {
      const previous = windows.get(focusedId);
      if (previous) { previous.el.classList.remove('is-focused'); emitWin(previous, 'blur'); }
      focusedId = id;
      win.el.classList.add('is-focused');
      emitWin(win, 'focus');
    }
    OS.apps.setActive(win.app);
    OS.emit('window:focus', win);
  }

  function blurAll() {
    const previous = windows.get(focusedId);
    if (previous) { previous.el.classList.remove('is-focused'); emitWin(previous, 'blur'); }
    focusedId = null;
  }

  function focusNext(app) {
    const next = visibleWindows(app)[0] || (app ? null : visibleWindows()[0]);
    if (next) { focus(next.id); focusContent(next); return next; }
    blurAll();
    return null;
  }

  async function close(id, { force = false } = {}) {
    const win = windows.get(id);
    if (!win || win.closing) return false;
    if (!force && win.opts.onClose) {
      const allowed = await win.opts.onClose(win);
      if (allowed === false) return false;
    }
    win.closing = true;
    emitWin(win, 'close');
    const finish = () => {
      win.el.remove();
      windows.delete(id);
      if (focusedId === id) {
        focusedId = null;
        if (!focusNext(win.app)) OS.emit('app:lastWindowClosed', win.app);
      } else if (!list(win.app).length) {
        OS.emit('app:lastWindowClosed', win.app);
      }
      OS.emit('window:close', win);
    };
    if (motion() && !win.minimized && !win.hidden) {
      const animation = win.el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.94)' }], { duration: 150, easing: 'ease-in' });
      animation.onfinish = finish;
    } else finish();
    return true;
  }

  function minimize(id) {
    const win = windows.get(id);
    if (!win || win.minimized || win.closing || win.opts.minimizable === false) return;
    const target = OS.dock?.iconRect(win.app);
    win.minimized = true;
    const done = () => { win.el.hidden = true; win.el.style.transformOrigin = ''; };
    if (motion() && target) {
      const r = win.el.getBoundingClientRect();
      const dx = target.left + target.width / 2 - (r.left + r.width / 2);
      const dy = target.top + target.height / 2 - (r.top + r.height / 2);
      const genie = OS.settings.get('minimizeEffect') !== 'scale';
      const frames = genie
        ? [
          { transform: 'none', opacity: 1 },
          { transform: `translate(${dx * 0.18}px, ${dy * 0.42}px) scale(.7, .86)`, opacity: 0.95, offset: 0.4 },
          { transform: `translate(${dx}px, ${dy}px) scale(.06, .05)`, opacity: 0.15 },
        ]
        : [{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(.08)`, opacity: 0 }];
      win.el.style.transformOrigin = '50% 50%';
      const animation = win.el.animate(frames, { duration: genie ? 430 : 280, easing: 'cubic-bezier(.45,0,.3,1)' });
      animation.onfinish = done;
      OS.dock?.pulse(win.app);
    } else done();
    if (focusedId === id) { focusedId = null; win.el.classList.remove('is-focused'); emitWin(win, 'blur'); focusNext(); }
    OS.emit('window:minimize', win);
  }

  function unminimize(win) {
    if (!win.minimized) return;
    win.minimized = false;
    win.el.hidden = false;
    const target = OS.dock?.iconRect(win.app);
    if (motion() && target) {
      const r = win.el.getBoundingClientRect();
      const dx = target.left + target.width / 2 - (r.left + r.width / 2);
      const dy = target.top + target.height / 2 - (r.top + r.height / 2);
      win.el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(.06, .05)`, opacity: 0.2 }, { transform: `translate(${dx * 0.18}px, ${dy * 0.42}px) scale(.7, .86)`, opacity: 0.95, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.3,0,.2,1)' });
    }
    OS.emit('window:restore', win);
  }

  function toggleZoom(id) {
    const win = windows.get(id);
    if (!win || win.opts.resizable === false || isPhone()) return;
    if (win.zoomed || win.tile) restorePrevious(win);
    else tileTo(id, 'fill');
  }

  function restorePrevious(win) {
    const area = workArea();
    const prev = win.prev || placement(win.opts);
    win.zoomed = false; win.tile = null; win.prev = null;
    win.el.classList.remove('is-zoomed', 'is-tiled');
    animateTo(win, { x: clamp(prev.x, 0, Math.max(0, area.w - prev.w)), y: clamp(prev.y, area.y, Math.max(area.y, area.y + area.h - 40)), w: Math.min(prev.w, area.w), h: Math.min(prev.h, area.h) });
  }

  function tileTo(id, where) {
    const win = windows.get(id);
    if (!win || isPhone()) return;
    if (where === 'center') { center(id); return; }
    if (where === 'restore') { if (win.zoomed || win.tile) restorePrevious(win); return; }
    if (win.opts.resizable === false) return;
    if (!win.zoomed && !win.tile) win.prev = { ...win.geom };
    win.zoomed = where === 'fill';
    win.tile = where === 'fill' ? null : where;
    win.el.classList.toggle('is-zoomed', win.zoomed);
    win.el.classList.toggle('is-tiled', !!win.tile);
    animateTo(win, rectFor(where));
  }

  function center(id) {
    const win = windows.get(id);
    if (!win || isPhone()) return;
    const area = workArea();
    if (win.zoomed || win.tile) { win.zoomed = false; win.tile = null; win.el.classList.remove('is-zoomed', 'is-tiled'); }
    const w = Math.min(win.geom.w, area.w), h = Math.min(win.geom.h, area.h);
    animateTo(win, { x: (area.w - w) / 2, y: area.y + Math.max(0, (area.h - h) / 2), w, h });
  }

  /* ---------- Hide / Show Desktop ---------- */
  function hideApp(app) {
    list(app).forEach(win => { if (!win.minimized) { win.hidden = true; win.el.hidden = true; } });
    if (windows.get(focusedId)?.app === app) { blurAll(); const next = visibleWindows()[0]; if (next) focus(next.id); else OS.apps.setActive('finder'); }
    OS.emit('app:hidden', app);
  }
  function unhideApp(app) {
    list(app).forEach(win => { if (win.hidden) { win.hidden = false; win.el.hidden = false; } });
  }
  function showDesktop(show = !desktopShown) {
    desktopShown = show;
    layer.classList.toggle('is-desktop-shown', show);
    if (show) blurAll();
    OS.emit('desktop:shown', show);
  }

  /* ---------- Snapping preview ---------- */
  function snapTarget(x, y) {
    if (isPhone()) return null;
    const area = workArea();
    if (y <= Math.max(2, area.y - 6)) return 'fill';
    if (x <= 2) return 'left';
    if (x >= window.innerWidth - 3) return 'right';
    return null;
  }
  function showSnap(where, win) {
    if (!where || win.opts.resizable === false) { snapPreview.classList.remove('is-visible'); return; }
    const r = rectFor(where);
    Object.assign(snapPreview.style, { left: `${r.x + 4}px`, top: `${r.y + 4}px`, width: `${r.w - 8}px`, height: `${r.h - 8}px`, zIndex: Number(win.el.style.zIndex) - 1 });
    snapPreview.classList.add('is-visible');
  }

  /* ---------- Pointer: focus, drag, resize ---------- */
  function startDrag(event, win, handle) {
    const start = { x: event.clientX, y: event.clientY };
    let origin = { ...win.geom };
    let moved = false;
    let snap = null;
    handle.setPointerCapture(event.pointerId);
    const move = e => {
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      if (!moved) {
        moved = true;
        win.el.classList.add('is-dragging');
        OS.menu.closeAll();
        if (win.zoomed || win.tile) {
          const prev = win.prev || placement(win.opts);
          const ratio = clamp((start.x - origin.x) / origin.w, 0.05, 0.95);
          origin = { x: start.x - ratio * prev.w, y: Math.max(workArea().y, start.y - 12), w: prev.w, h: prev.h };
          win.zoomed = false; win.tile = null; win.prev = null;
          win.el.classList.remove('is-zoomed', 'is-tiled');
          win.geom = { ...origin };
          emitWin(win, 'resize');
        }
      }
      const area = workArea();
      win.geom.x = clamp(origin.x + dx, -win.geom.w + 90, window.innerWidth - 90);
      win.geom.y = clamp(origin.y + dy, area.y, window.innerHeight - 36);
      apply(win);
      snap = snapTarget(e.clientX, e.clientY);
      showSnap(snap, win);
    };
    const up = e => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      if (handle.hasPointerCapture?.(e.pointerId)) handle.releasePointerCapture(e.pointerId);
      win.el.classList.remove('is-dragging');
      snapPreview.classList.remove('is-visible');
      if (moved && snap && e.type === 'pointerup') tileTo(win.id, snap);
      else if (moved) emitWin(win, 'move');
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  function startResize(event, win, dir) {
    if (isPhone()) return;
    event.preventDefault();
    const handle = event.target;
    const start = { px: event.clientX, py: event.clientY, ...win.geom };
    const minW = win.opts.minWidth || 240, minH = win.opts.minHeight || 140;
    const maxW = win.opts.maxWidth || Infinity, maxH = win.opts.maxHeight || Infinity;
    const area = workArea();
    handle.setPointerCapture(event.pointerId);
    win.el.classList.add('is-resizing');
    if (win.zoomed || win.tile) { win.zoomed = false; win.tile = null; win.prev = null; win.el.classList.remove('is-zoomed', 'is-tiled'); }
    const move = e => {
      const dx = e.clientX - start.px, dy = e.clientY - start.py;
      let { x, y, w, h } = start;
      if (dir.includes('e')) w = clamp(start.w + dx, minW, maxW);
      if (dir.includes('s')) h = clamp(start.h + dy, minH, maxH);
      if (dir.includes('w')) { w = clamp(start.w - dx, minW, maxW); x = start.x + start.w - w; }
      if (dir.includes('n')) { const top = Math.max(area.y, start.y + dy); h = clamp(start.y + start.h - top, minH, maxH); y = start.y + start.h - h; }
      win.geom = { x, y, w, h };
      apply(win);
      emitWin(win, 'resize');
    };
    const up = e => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      if (handle.hasPointerCapture?.(e.pointerId)) handle.releasePointerCapture(e.pointerId);
      win.el.classList.remove('is-resizing');
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  function onPointerDown(event) {
    const el = event.target.closest('.win');
    const win = el && windows.get(el.dataset.win);
    if (!win || win.closing) return;
    if (focusedId !== win.id || OS.apps.active() !== win.app) focus(win.id);
    if (event.button !== 0) return;
    const resize = event.target.closest('[data-resize]');
    if (resize) { startResize(event, win, resize.dataset.resize); return; }
    const handle = event.target.closest('[data-drag]');
    if (handle && el.contains(handle) && !event.target.closest(INTERACTIVE) && !isPhone()) startDrag(event, win, handle);
  }

  function onClick(event) {
    const button = event.target.closest('[data-win-action]');
    if (!button) return;
    const win = windows.get(button.closest('.win')?.dataset.win);
    if (!win) return;
    const action = button.dataset.winAction;
    if (action === 'close') close(win.id);
    if (action === 'minimize') minimize(win.id);
    if (action === 'zoom') {
      if (event.altKey && !win.zoomed) center(win.id);
      else toggleZoom(win.id);
    }
  }

  function onDoubleClick(event) {
    const handle = event.target.closest('[data-drag]');
    if (!handle || event.target.closest(INTERACTIVE)) return;
    const win = windows.get(handle.closest('.win')?.dataset.win);
    if (!win) return;
    const behavior = OS.settings.get('titlebarDoubleClick');
    if (behavior === 'minimize') minimize(win.id);
    else if (behavior === 'zoom') toggleZoom(win.id);
  }

  /* Sequoia shows tiling options when the pointer rests on the green button. */
  let zoomHoverTimer;
  function onZoomHover(event) {
    const button = event.target.closest?.('.tl-zoom');
    clearTimeout(zoomHoverTimer);
    if (!button || button.disabled || event.pointerType !== 'mouse' || isPhone()) return;
    const win = windows.get(button.closest('.win')?.dataset.win);
    zoomHoverTimer = setTimeout(() => {
      if (!button.matches(':hover') || OS.menu.isOpen()) return;
      OS.menu.open([
        { header: true, label: 'Move & Resize' },
        { label: 'Fill', action: () => tileTo(win.id, 'fill') },
        { label: 'Center', action: () => center(win.id) },
        '-',
        { label: 'Left', action: () => tileTo(win.id, 'left') },
        { label: 'Right', action: () => tileTo(win.id, 'right') },
        '-',
        { label: 'Return to Previous Size', disabled: !win.zoomed && !win.tile, action: () => tileTo(win.id, 'restore') },
      ], { anchorRect: button.getBoundingClientRect(), gap: 6, className: 'menu-compact', label: 'Window tiling' });
    }, 750);
  }

  function relayout() {
    const area = workArea();
    for (const win of windows.values()) {
      if (win.closing) continue;
      if (isPhone()) { win.zoomed = true; win.tile = null; win.el.classList.add('is-zoomed'); win.geom = rectFor('fill'); }
      else if (win.zoomed) win.geom = rectFor('fill');
      else if (win.tile) win.geom = rectFor(win.tile);
      else {
        const g = win.geom;
        const w = Math.min(g.w, area.w - 8), h = Math.min(g.h, area.h);
        win.geom = { w, h, x: clamp(g.x, -w + 90, window.innerWidth - 90), y: clamp(g.y, area.y, Math.max(area.y, window.innerHeight - 60)) };
      }
      apply(win);
      emitWin(win, 'resize');
    }
  }

  OS.wm = {
    create,
    get: id => windows.get(id),
    all: () => list(),
    list,
    visible: visibleWindows,
    focused: () => windows.get(focusedId) || null,
    focus, blurAll, close, minimize, toggleZoom, tileTo, center,
    hideApp, unhideApp, showDesktop,
    isDesktopShown: () => desktopShown,
    workArea,
    /** Raises all of an app's windows, keeping their order, and focuses the top one. */
    bringToFront(app) {
      const appWindows = list(app).filter(w => !w.minimized).reverse();
      appWindows.forEach(w => { if (w.hidden) { w.hidden = false; w.el.hidden = false; } w.el.style.zIndex = ++zTop; });
      const top = appWindows[appWindows.length - 1];
      if (top) { focus(top.id); focusContent(top); }
      return !!top;
    },
    restoreMinimized(app) {
      const win = list(app).find(w => w.minimized);
      if (win) { focus(win.id); focusContent(win); }
      return !!win;
    },
    init() {
      layer = document.getElementById('windows');
      snapPreview = document.createElement('div');
      snapPreview.className = 'snap-preview';
      layer.appendChild(snapPreview);
      layer.addEventListener('pointerdown', onPointerDown);
      layer.addEventListener('click', onClick);
      layer.addEventListener('dblclick', onDoubleClick);
      layer.addEventListener('pointerover', onZoomHover);
      window.addEventListener('resize', OS.util.debounce(relayout, 80));
      OS.on('settings:change', ({ key }) => { if (['dockSize', 'autoHideDock', 'autoHideMenuBar', '*'].includes(key)) requestAnimationFrame(relayout); });
    },
    relayout,
  };
})();
