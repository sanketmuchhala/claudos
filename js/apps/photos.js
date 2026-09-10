/* ===== PHOTOS =====
   Your library: Sanket's photo, the wallpapers, project cover art, and
   Photo Booth captures (saved in this browser). Favorites, albums, a viewer,
   and Set as Wallpaper. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  let win = null;
  let album = 'library';
  let viewing = null;

  const builtin = () => [
    { id: 'sanket', src: 'images/photos/sanket.jpg', title: 'Sanket Muchhala', albums: ['library'], created: Date.parse('2022-10-18T12:34:00') },
    { id: 'forest', src: 'images/wallpapers/forest.jpg', title: 'Forest', albums: ['library', 'wallpapers'], created: Date.parse('2026-09-10T00:00:00'), wallpaper: 'forest' },
    { id: 'lineage', src: 'images/portfolio/projects/language-lineage-cover.svg', title: 'LanguageLineage — project cover', albums: ['library', 'projects'], created: Date.parse('2026-09-10T00:00:00'), contain: true },
    ...OS.theme.WALLPAPERS.filter(w => !w.image).map(w => ({ id: `wall-${w.id}`, css: w.background, title: `${w.name} wallpaper`, albums: ['wallpapers'], created: 0, wallpaper: w.id })),
  ];
  const captures = () => CloudStorage.get('photos', []).map(p => ({ ...p, albums: ['library', 'photobooth'], title: p.title || 'Photo Booth' }));
  const all = () => [...captures().sort((a, b) => b.created - a.created), ...builtin()];
  const favorites = () => new Set(CloudStorage.get('favorites', []));

  function inAlbum() {
    const favs = favorites();
    return all().filter(p => (album === 'favorites' ? favs.has(p.id) : p.albums.includes(album)));
  }

  const thumb = p => (p.css ? `<span class="ph-thumb" style="background:${esc(p.css)}"></span>` : `<img class="ph-thumb${p.contain ? ' is-contain' : ''}" src="${esc(p.src)}" alt="${esc(p.title)}" loading="lazy" />`);

  function renderGrid() {
    const items = inAlbum();
    const titles = { library: 'Library', favorites: 'Favorites', photobooth: 'Photo Booth', wallpapers: 'Wallpapers', projects: 'Projects' };
    win.body.querySelectorAll('[data-album]').forEach(b => b.classList.toggle('is-active', b.dataset.album === album));
    win.body.querySelector('[data-title]').textContent = titles[album];
    win.body.querySelector('[data-count]').textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;
    const favs = favorites();
    win.body.querySelector('[data-grid]').innerHTML = items.length
      ? items.map(p => `<button type="button" class="ph-cell" data-photo="${esc(p.id)}" aria-label="${esc(p.title)}">${thumb(p)}${favs.has(p.id) ? '<span class="ph-heart" aria-hidden="true">♥</span>' : ''}</button>`).join('')
      : `<p class="ph-empty">${album === 'photobooth' ? 'Take a photo in Photo Booth and it will appear here.' : album === 'favorites' ? 'Tap ♥ on a photo to add it to Favorites.' : 'No photos'}</p>`;
  }

  function renderViewer() {
    const box = win.body.querySelector('[data-viewer]');
    if (!viewing) { box.hidden = true; box.innerHTML = ''; return; }
    const items = inAlbum();
    const index = items.findIndex(p => p.id === viewing);
    const p = items[index];
    if (!p) { viewing = null; renderViewer(); return; }
    const fav = favorites().has(p.id);
    const capture = p.albums.includes('photobooth');
    box.hidden = false;
    box.innerHTML = `<header class="ph-viewer-bar"><button type="button" class="tb-btn" data-close-viewer aria-label="Back to grid">‹ ${esc(win.body.querySelector('[data-title]').textContent)}</button><span class="ph-viewer-title">${esc(p.title)}<small>${p.created ? esc(OS.util.longDate(p.created)) : ''}</small></span><div class="toolbar-group">
      <button type="button" class="tb-btn${fav ? ' is-on' : ''}" data-favorite aria-pressed="${fav}" aria-label="${fav ? 'Remove from Favorites' : 'Add to Favorites'}">${fav ? '♥' : '♡'}</button>
      <button type="button" class="tb-btn" data-wallpaper>Set as Wallpaper</button>
      ${capture ? '<button type="button" class="tb-btn" data-delete aria-label="Delete photo">Delete</button>' : ''}
    </div></header>
    <div class="ph-stage">${p.css ? `<span class="ph-full is-css" style="background:${esc(p.css)}"></span>` : `<img class="ph-full" src="${esc(p.src)}" alt="${esc(p.title)}" />`}
      <button type="button" class="ph-arrow is-prev" data-step="-1" aria-label="Previous"${index <= 0 ? ' disabled' : ''}>‹</button><button type="button" class="ph-arrow is-next" data-step="1" aria-label="Next"${index >= items.length - 1 ? ' disabled' : ''}>›</button></div>`;
    box.focus({ preventScroll: true });
  }

  async function act(event) {
    const t = event.target;
    const a = t.closest('[data-album]');
    if (a) { album = a.dataset.album; viewing = null; renderGrid(); renderViewer(); return; }
    const cell = t.closest('[data-photo]');
    if (cell) { viewing = cell.dataset.photo; renderViewer(); return; }
    if (t.closest('[data-close-viewer]')) { viewing = null; renderViewer(); return; }
    const step = t.closest('[data-step]');
    if (step) { move(Number(step.dataset.step)); return; }
    if (t.closest('[data-favorite]')) {
      const favs = favorites();
      if (favs.has(viewing)) favs.delete(viewing); else favs.add(viewing);
      CloudStorage.set('favorites', [...favs]);
      renderGrid(); renderViewer(); return;
    }
    if (t.closest('[data-wallpaper]')) {
      const p = all().find(x => x.id === viewing);
      if (!p) return;
      OS.settings.set('wallpaper', p.wallpaper || `photo:${p.id}`);
      OS.notify({ app: 'photos', title: 'Wallpaper changed', message: p.title, timeout: 2500 });
      return;
    }
    if (t.closest('[data-delete]')) {
      const ok = await OS.dialog.confirm({ title: 'Delete this photo?', message: 'It will be removed from Photos and Photo Booth.', confirm: 'Delete', destructive: true, win });
      if (!ok) return;
      const items = inAlbum();
      const index = items.findIndex(p => p.id === viewing);
      CloudStorage.set('photos', CloudStorage.get('photos', []).filter(p => p.id !== viewing));
      if (OS.settings.get('wallpaper') === `photo:${viewing}`) OS.settings.set('wallpaper', 'forest');
      viewing = inAlbum()[Math.min(index, inAlbum().length - 1)]?.id || null;
      OS.emit('photos:change');
      renderGrid(); renderViewer();
    }
  }

  function move(delta) {
    const items = inAlbum();
    const index = items.findIndex(p => p.id === viewing);
    const next = items[index + delta];
    if (next) { viewing = next.id; renderViewer(); }
  }

  function open(args = {}) {
    if (args.album) album = args.album;
    viewing = args.photo || null;
    win = OS.wm.create({
      app: 'photos', title: 'Photos', chrome: 'toolbar', width: 860, height: 560, minWidth: 420, minHeight: 320, className: 'photos-win', lightsTop: 19, lightsLeft: 18,
      content: `<div class="photos">
        <aside class="sidebar" data-drag aria-label="Albums"><div class="sidebar-scroll">
          <div class="sb-section"><h3>Photos</h3><button type="button" class="sb-item" data-album="library">${'<i class="sb-glyph" style="--glyph:url(\'images/icons/sidebar/picturesfolder.png\')" aria-hidden="true"></i>'}Library</button><button type="button" class="sb-item" data-album="favorites"><span class="sb-emoji" aria-hidden="true">♥</span>Favorites</button></div>
          <div class="sb-section"><h3>Albums</h3><button type="button" class="sb-item" data-album="photobooth"><span class="sb-emoji" aria-hidden="true">◉</span>Photo Booth</button><button type="button" class="sb-item" data-album="wallpapers"><span class="sb-emoji" aria-hidden="true">▣</span>Wallpapers</button><button type="button" class="sb-item" data-album="projects"><span class="sb-emoji" aria-hidden="true">◧</span>Projects</button></div>
        </div></aside>
        <section class="ph-main">
          <header class="toolbar" data-drag><h1 class="toolbar-title" data-title>Library</h1><span class="ph-count" data-count></span><div class="toolbar-flex" data-drag></div><button type="button" class="tb-btn" data-open-booth title="Open Photo Booth">Photo Booth</button></header>
          <div class="ph-grid" data-grid></div>
          <section class="ph-viewer" data-viewer tabindex="-1" hidden></section>
        </section>
      </div>`,
      onClose: () => { win = null; return true; },
    });
    win.body.addEventListener('click', event => {
      if (event.target.closest('[data-open-booth]')) { OS.apps.launch('photobooth'); return; }
      act(event);
    });
    win.body.addEventListener('keydown', event => {
      if (!viewing) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); viewing = null; renderViewer(); }
    });
    renderGrid();
    renderViewer();
    return win;
  }

  OS.on('photos:change', () => { if (win) { renderGrid(); renderViewer(); } });

  OS.photos = {
    find: id => captures().find(p => p.id === id) || builtin().find(p => p.id === id),
    add(src) {
      const list = CloudStorage.get('photos', []);
      const photo = { id: `pb${Date.now()}`, src, created: Date.now(), title: 'Photo Booth' };
      list.unshift(photo);
      const ok = CloudStorage.set('photos', list.slice(0, 16));
      OS.emit('photos:change');
      return ok ? photo : null;
    },
  };

  OS.apps.register({
    id: 'photos',
    name: 'Photos',
    icon: 'images/icons/apps/photos.png',
    keywords: ['pictures', 'images', 'gallery', 'album', 'wallpaper'],
    single: true,
    version: '10.0',
    about: 'Your library, favorites, and albums — including photos you take in Photo Booth. Set any photo as your wallpaper.',
    help: 'Click a photo to view it; use ←/→ to move between photos and Esc to go back. ♥ adds to Favorites. “Set as Wallpaper” changes the desktop picture.',
    open,
    onReopen: (w, args) => { if (args.album) { album = args.album; viewing = args.photo || null; renderGrid(); renderViewer(); } },
  });
})();
