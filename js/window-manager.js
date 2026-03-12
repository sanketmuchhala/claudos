/* ===== WINDOW MANAGEMENT SYSTEM ===== */

function mkWin(app, title, w, h, content, opts = {}) {
  const id = 'w' + (++wid);
  const c = document.getElementById('wins');
  const x = 60 + Math.random() * 250;
  const y = 50 + Math.random() * 120;
  const el = document.createElement('div');
  el.className = 'win';
  el.id = id;
  el.dataset.app = app;
  el.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;z-index:' + (++zTop);
  el.innerHTML =
    '<div class="titlebar" onmousedown="startDrag(event,\'' + id + '\')">' +
      '<div class="tl">' +
        '<div class="tb tc" onclick="closeWin(\'' + id + '\')"></div>' +
        '<div class="tb tm" onclick="minWin(\'' + id + '\')"></div>' +
        '<div class="tb tx" onclick="maxWin(\'' + id + '\')"></div>' +
      '</div>' +
      '<span class="wtitle">' + title + '</span>' +
    '</div>' +
    '<div class="wbody" style="' + (opts.bs || '') + '">' + content + '</div>' +
    '<div class="wresize" onmousedown="startResize(event,\'' + id + '\')"></div>';
  c.appendChild(el);
  el.addEventListener('mousedown', () => focusWin(id));
  wins[id] = { app, title, el, min: false, max: false, prev: '' };
  focusWin(id);
  markDock(app, true);
  if (opts.init) setTimeout(() => opts.init(el), 50);
  return id;
}

function focusWin(id) {
  if (!wins[id]) return;
  wins[id].el.style.zIndex = ++zTop;
  activeWin = id;
  document.getElementById('activeApp').textContent = wins[id].title;
}

function closeWin(id) {
  const w = wins[id];
  if (!w) return;
  w.el.classList.add('closing');
  setTimeout(() => {
    w.el.remove();
    const a = w.app;
    delete wins[id];
    if (!Object.values(wins).some(x => x.app === a)) markDock(a, false);
    if (activeWin === id) {
      const r = Object.keys(wins);
      if (r.length) focusWin(r.pop());
      else document.getElementById('activeApp').textContent = 'Finder';
    }
  }, 200);
}

function minWin(id) {
  const w = wins[id];
  if (!w) return;
  w.el.classList.add('minimizing');
  setTimeout(() => {
    w.el.style.display = 'none';
    w.el.classList.remove('minimizing');
    w.min = true;
  }, 400);
}

function maxWin(id) {
  const w = wins[id];
  if (!w) return;
  if (w.max) {
    w.el.style.cssText = w.prev;
    w.el.style.zIndex = zTop;
    w.max = false;
  } else {
    w.prev = w.el.style.cssText;
    const root = document.getElementById('os-root');
    const rw = root.offsetWidth;
    const rh = root.offsetHeight;
    w.el.style.cssText = 'left:0;top:28px;width:' + rw + 'px;height:' + (rh - 96) + 'px;z-index:' + zTop + ';border-radius:0';
    w.max = true;
  }
}

function startDrag(e, id) {
  if (e.target.classList.contains('tb')) return;
  e.preventDefault();
  const el = wins[id].el;
  focusWin(id);
  const scale = getOSScale();
  const sx = e.clientX / scale - el.offsetLeft;
  const sy = e.clientY / scale - el.offsetTop;
  const mv = function(e2) {
    el.style.left = (e2.clientX / scale - sx) + 'px';
    el.style.top = (e2.clientY / scale - sy) + 'px';
  };
  const up = function() {
    document.removeEventListener('mousemove', mv);
    document.removeEventListener('mouseup', up);
  };
  document.addEventListener('mousemove', mv);
  document.addEventListener('mouseup', up);
}

function startResize(e, id) {
  e.preventDefault();
  const el = wins[id].el;
  focusWin(id);
  const scale = getOSScale();
  const sx = e.clientX / scale;
  const sy = e.clientY / scale;
  const sw = el.offsetWidth;
  const sh = el.offsetHeight;
  const mv = function(e2) {
    el.style.width = Math.max(280, sw + e2.clientX / scale - sx) + 'px';
    el.style.height = Math.max(180, sh + e2.clientY / scale - sy) + 'px';
  };
  const up = function() {
    document.removeEventListener('mousemove', mv);
    document.removeEventListener('mouseup', up);
  };
  document.addEventListener('mousemove', mv);
  document.addEventListener('mouseup', up);
}

function markDock(app, open) {
  document.querySelectorAll('.di').forEach(d => {
    if (d.onclick && d.onclick.toString().includes("'" + app + "'")) {
      d.classList.toggle('open', open);
    }
  });
}
