/* ===== APP SWITCHER =====
   Hold ⌘ (or ⌥ / Alt) and press Tab to cycle running apps; release to switch.
   Shift or ` goes back, Q quits the highlighted app, Esc cancels. Browsers
   and operating systems may keep some of these keys for themselves. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  let layer = null;
  let apps = [];
  let index = 0;
  let modifier = null;

  function render() {
    layer.innerHTML = `<div class="switcher" role="listbox" aria-label="Running applications">${apps.map((id, i) => {
      const app = OS.apps.get(id);
      return `<div class="switcher-app${i === index ? ' is-selected' : ''}" role="option" aria-selected="${i === index}" data-index="${i}"><span class="switcher-icon">${app.iconHtml ? app.iconHtml() : `<img src="${esc(app.icon)}" alt="" />`}</span>${i === index ? `<span class="switcher-name">${esc(app.name)}</span>` : ''}</div>`;
    }).join('')}</div>`;
  }

  function open(mod, reverse) {
    apps = OS.apps.running().filter(id => OS.apps.get(id));
    if (!apps.length) return;
    modifier = mod;
    index = apps.length > 1 ? (reverse ? apps.length - 1 : 1) : 0;
    layer = document.createElement('div');
    layer.className = 'switcher-layer';
    document.getElementById('overlays').appendChild(layer);
    render();
    layer.addEventListener('pointerover', event => {
      const node = event.target.closest('[data-index]');
      if (node && Number(node.dataset.index) !== index) { index = Number(node.dataset.index); render(); }
    });
    layer.addEventListener('click', event => {
      const node = event.target.closest('[data-index]');
      if (node) { index = Number(node.dataset.index); commit(); }
    });
  }

  function commit() {
    if (!layer) return;
    const id = apps[index];
    cancel();
    if (id) OS.apps.activate(id);
  }

  function cancel() {
    layer?.remove();
    layer = null;
    modifier = null;
  }

  function onKeyDown(event) {
    const mod = event.metaKey ? 'Meta' : event.altKey ? 'Alt' : null;
    if (event.key === 'Tab' && mod && !event.ctrlKey && !OS.isLocked?.()) {
      event.preventDefault();
      if (!layer) open(mod, event.shiftKey);
      else { index = (index + (event.shiftKey ? -1 : 1) + apps.length) % apps.length; render(); }
      return;
    }
    if (!layer) return;
    if (event.key === '`' || event.key === '~') { event.preventDefault(); index = (index - 1 + apps.length) % apps.length; render(); }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); index = (index + (event.key === 'ArrowRight' ? 1 : -1) + apps.length) % apps.length; render(); }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); }
    if (event.key.toLowerCase() === 'q' && apps[index] !== 'finder') {
      event.preventDefault();
      const id = apps[index];
      OS.apps.quit(id).then(() => {
        apps = OS.apps.running().filter(a => OS.apps.get(a));
        if (!apps.length || !layer) { cancel(); return; }
        index = Math.min(index, apps.length - 1);
        render();
      });
    }
    if (event.key === 'Enter') { event.preventDefault(); commit(); }
  }

  function onKeyUp(event) {
    if (layer && event.key === modifier) commit();
  }

  OS.appSwitcher = {
    init() {
      document.addEventListener('keydown', onKeyDown, true);
      document.addEventListener('keyup', onKeyUp, true);
      window.addEventListener('blur', cancel);
    },
    isOpen: () => !!layer,
  };
})();
