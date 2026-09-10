/* ===== LAUNCHPAD =====
   Every app in a full-screen grid over the blurred wallpaper. Type to filter,
   arrows to move, Enter to open, Esc or a click on empty space to close. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  let layer = null;
  let index = 0;
  let shown = [];

  function render() {
    const query = layer.querySelector('input').value.trim().toLowerCase();
    shown = OS.apps.list().filter(app => app.id !== 'launchpad' && (!query || app.name.toLowerCase().includes(query) || (app.keywords || []).some(k => k.includes(query))));
    index = Math.min(index, Math.max(0, shown.length - 1));
    layer.querySelector('.launchpad-grid').innerHTML = shown.length
      ? shown.map((app, i) => `<button type="button" class="launchpad-app${i === index && query ? ' is-selected' : ''}" data-app="${esc(app.id)}"><span class="launchpad-icon">${app.iconHtml ? app.iconHtml() : `<img src="${esc(app.icon)}" alt="" draggable="false" />`}</span><span class="launchpad-name">${esc(app.name)}</span></button>`).join('')
      : '<p class="launchpad-empty">No Results</p>';
  }

  function launch(id) {
    close();
    OS.apps.launch(id);
  }

  function open() {
    if (layer) return;
    if (OS.isLocked?.()) return;
    OS.spotlight?.close();
    OS.menu.closeAll();
    layer = OS.util.el(`<div class="launchpad" role="dialog" aria-label="Launchpad">
      <label class="launchpad-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="m14.5 14.5 5.5 5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input type="text" placeholder="Search" aria-label="Search apps" autocomplete="off" spellcheck="false" /></label>
      <div class="launchpad-grid" role="group" aria-label="Applications"></div>
    </div>`);
    document.getElementById('overlays').appendChild(layer);
    index = 0;
    render();
    const input = layer.querySelector('input');
    input.focus();
    input.addEventListener('input', () => { index = 0; render(); });
    layer.addEventListener('click', event => {
      const app = event.target.closest('[data-app]');
      if (app) { launch(app.dataset.app); return; }
      if (!event.target.closest('.launchpad-search')) close();
    });
    layer.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (input.value) { input.value = ''; render(); } else close(); return; }
      if (event.key === 'Enter' && document.activeElement === input && shown[index]) { event.preventDefault(); launch(shown[index].id); return; }
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key) && document.activeElement === input && input.value) {
        event.preventDefault();
        const columns = Math.max(1, Math.round(layer.querySelector('.launchpad-grid').clientWidth / (layer.querySelector('.launchpad-app')?.offsetWidth || 120)));
        const delta = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }[event.key];
        index = Math.max(0, Math.min(shown.length - 1, index + delta));
        render();
      }
    });
    document.getElementById('desktop').classList.add('is-launchpad');
  }

  function close() {
    if (!layer) return;
    const el = layer;
    layer = null;
    el.classList.add('is-leaving');
    document.getElementById('desktop').classList.remove('is-launchpad');
    setTimeout(() => el.remove(), OS.util.motionOn() ? 200 : 0);
  }

  OS.launchpad = { open, close, toggle: () => (layer ? close() : open()), isOpen: () => !!layer };
})();
