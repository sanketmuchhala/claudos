/* ===== MUSIC =====
   A playlist with play/pause, previous/next, seeking, and volume (shared with
   Control Center). No audio files ship with CloudOS, so playback is a timed
   simulation; the app says so. Music keeps playing after its window closes. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  const PLAYLIST = [
    { t: 'Midnight City', a: 'M83', al: 'Hurry Up, We’re Dreaming', d: '4:03' },
    { t: 'Blinding Lights', a: 'The Weeknd', al: 'After Hours', d: '3:20' },
    { t: 'Starboy', a: 'The Weeknd', al: 'Starboy', d: '3:50' },
    { t: 'Take On Me', a: 'a-ha', al: 'Hunting High and Low', d: '3:48' },
    { t: 'Electric Feel', a: 'MGMT', al: 'Oracular Spectacular', d: '3:49' },
    { t: 'Instant Crush', a: 'Daft Punk', al: 'Random Access Memories', d: '5:37' },
    { t: 'Digital Love', a: 'Daft Punk', al: 'Discovery', d: '4:58' },
    { t: 'Redbone', a: 'Childish Gambino', al: '“Awaken, My Love!”', d: '5:26' },
  ];
  const seconds = d => { const [m, s] = d.split(':').map(Number); return m * 60 + s; };
  const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const art = i => `linear-gradient(135deg, hsl(${(i * 47 + 330) % 360} 70% 58%), hsl(${(i * 47 + 20) % 360} 75% 38%))`;
  const TOTAL = PLAYLIST.reduce((sum, t) => sum + seconds(t.d), 0);

  const saved = CloudStorage.get('music', { currentTrack: 0 });
  const state = { index: Math.min(saved.currentTrack || 0, PLAYLIST.length - 1), playing: false, time: 0, timer: null, shuffle: false, repeat: false };
  let win = null;

  const G = {
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9.5-5.5Z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2.5h3v11h-3Zm6 0h3v11h-3Z" fill="currentColor"/></svg>',
    prev: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M14.5 3v10l-6-5Zm-6.5 0v10L2 8Z" fill="currentColor"/></svg>',
    next: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 3v10l6-5Zm6.5 0v10l6-5Z" fill="currentColor"/></svg>',
    shuffle: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 4h2.6l6.3 8h3.1m0-8h-3.1L8.6 6.1M1.5 12h2.6l2.2-2.8M12.2 2.2 14 4l-1.8 1.8m0 4.4L14 12l-1.8 1.8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    repeat: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 7V5.5A1.5 1.5 0 0 1 4.5 4H13m-1.8-1.8L13 4l-1.8 1.8M13 9v1.5a1.5 1.5 0 0 1-1.5 1.5H3m1.8 1.8L3 12l1.8-1.8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    speaker: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7.5h3l4-3.5v12l-4-3.5H3Z" fill="currentColor"/><path d="M13 7a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  };

  function persist() { CloudStorage.set('music', { ...CloudStorage.get('music', {}), currentTrack: state.index }); }
  function emit() { OS.emit('music:change'); }

  function tick() {
    if (!state.playing) return;
    state.time += 0.25;
    if (state.time >= seconds(PLAYLIST[state.index].d)) {
      if (state.repeat) state.time = 0;
      else { next(true); return; }
    }
    renderProgress();
  }

  function setPlaying(on) {
    state.playing = on;
    clearInterval(state.timer);
    if (on) state.timer = setInterval(tick, 250);
    OS.apps.setBackground('music', on);
    render();
    emit();
  }
  function toggle() { setPlaying(!state.playing); }
  function play(index) {
    state.index = index;
    state.time = 0;
    persist();
    setPlaying(true);
  }
  function next(auto = false) {
    const index = state.shuffle ? Math.floor(Math.random() * PLAYLIST.length) : (state.index + 1) % PLAYLIST.length;
    if (auto && !state.shuffle && index === 0 && !state.repeat) { state.index = 0; state.time = 0; persist(); setPlaying(false); return; }
    state.index = index; state.time = 0; persist();
    if (!state.playing && !auto) { render(); emit(); return; }
    setPlaying(true);
  }
  function prev() {
    if (state.time > 3) state.time = 0;
    else { state.index = (state.index - 1 + PLAYLIST.length) % PLAYLIST.length; state.time = 0; persist(); }
    render(); emit();
  }
  function seek(fraction) {
    state.time = OS.util.clamp(fraction, 0, 1) * seconds(PLAYLIST[state.index].d);
    renderProgress();
  }

  function renderProgress() {
    if (!win) return;
    const track = PLAYLIST[state.index];
    const total = seconds(track.d);
    win.body.querySelector('[data-fill]').style.width = `${(state.time / total) * 100}%`;
    win.body.querySelector('[data-elapsed]').textContent = clock(state.time);
    win.body.querySelector('[data-remaining]').textContent = `-${clock(total - state.time)}`;
  }

  function render() {
    if (!win) return;
    const track = PLAYLIST[state.index];
    const $ = s => win.body.querySelector(s);
    $('[data-play]').innerHTML = state.playing ? G.pause : G.play;
    $('[data-play]').setAttribute('aria-label', state.playing ? 'Pause' : 'Play');
    $('[data-lcd-art]').style.background = art(state.index);
    $('[data-lcd-title]').textContent = track.t;
    $('[data-lcd-artist]').textContent = `${track.a} — ${track.al}`;
    $('[data-shuffle]').classList.toggle('is-on', state.shuffle);
    $('[data-repeat]').classList.toggle('is-on', state.repeat);
    $('[data-volume]').value = OS.settings.get('volume');
    win.body.querySelectorAll('[data-row]').forEach(row => {
      const i = Number(row.dataset.row);
      row.classList.toggle('is-current', i === state.index);
      row.classList.toggle('is-playing', i === state.index && state.playing);
    });
    renderProgress();
  }

  function open() {
    win = OS.wm.create({
      app: 'music', title: 'Music', chrome: 'toolbar', width: 900, height: 570, minWidth: 420, minHeight: 360, className: 'music-win', lightsTop: 19, lightsLeft: 18,
      content: `<div class="music">
        <header class="toolbar music-bar" data-drag>
          <div class="music-transport">
            <button type="button" class="tb-btn" data-shuffle aria-label="Shuffle">${G.shuffle}</button>
            <button type="button" class="tb-btn" data-prev aria-label="Previous">${G.prev}</button>
            <button type="button" class="tb-btn music-play" data-play aria-label="Play">${G.play}</button>
            <button type="button" class="tb-btn" data-next aria-label="Next">${G.next}</button>
            <button type="button" class="tb-btn" data-repeat aria-label="Repeat">${G.repeat}</button>
          </div>
          <div class="music-lcd">
            <span class="music-lcd-art" data-lcd-art></span>
            <div class="music-lcd-text"><strong data-lcd-title></strong><span data-lcd-artist></span>
              <div class="music-scrub" data-scrub role="slider" aria-label="Playback position" tabindex="0"><span class="music-elapsed" data-elapsed>0:00</span><span class="music-track"><span class="music-fill" data-fill></span></span><span class="music-remaining" data-remaining></span></div>
            </div>
          </div>
          <label class="music-volume">${G.speaker}<input type="range" min="0" max="100" data-volume aria-label="Volume" /></label>
        </header>
        <div class="music-body">
          <aside class="sidebar music-sidebar" aria-label="Library">
            <div class="sb-section"><h3>Library</h3><button type="button" class="sb-item">Recently Added</button><button type="button" class="sb-item">Artists</button><button type="button" class="sb-item">Albums</button><button type="button" class="sb-item">Songs</button></div>
            <div class="sb-section"><h3>Playlists</h3><button type="button" class="sb-item is-active">♫ Focus Mix</button></div>
          </aside>
          <section class="music-main">
            <div class="music-hero"><span class="music-cover" style="background:${art(3)}">♫</span><div><p class="music-kicker">Playlist</p><h2>Focus Mix</h2><p class="music-meta">Sanket Muchhala · ${PLAYLIST.length} songs, ${Math.round(TOTAL / 60)} minutes</p><div class="music-hero-actions"><button type="button" class="push-button is-accent" data-play-all>${G.play} Play</button><button type="button" class="push-button" data-shuffle-all>${G.shuffle} Shuffle</button></div></div></div>
            <p class="music-note">Playback is simulated — no audio files are included with CloudOS.</p>
            <div class="music-table" role="grid" aria-label="Songs">
              <div class="music-row music-head" role="row"><span>#</span><span>Title</span><span>Artist</span><span>Album</span><span>Time</span></div>
              ${PLAYLIST.map((t, i) => `<div class="music-row" role="row" data-row="${i}" tabindex="0"><span class="music-num"><span class="num">${i + 1}</span><span class="bars" aria-hidden="true"><i></i><i></i><i></i></span></span><span class="music-title"><span class="music-thumb" style="background:${art(i)}"></span>${esc(t.t)}</span><span>${esc(t.a)}</span><span>${esc(t.al)}</span><span>${esc(t.d)}</span></div>`).join('')}
            </div>
          </section>
        </div>
      </div>`,
      onClose: () => { win = null; return true; },
    });
    const body = win.body;
    body.addEventListener('click', event => {
      const t = event.target;
      if (t.closest('[data-play]')) toggle();
      else if (t.closest('[data-next]')) next();
      else if (t.closest('[data-prev]')) prev();
      else if (t.closest('[data-shuffle]')) { state.shuffle = !state.shuffle; render(); }
      else if (t.closest('[data-repeat]')) { state.repeat = !state.repeat; render(); }
      else if (t.closest('[data-play-all]')) { state.shuffle = false; play(0); }
      else if (t.closest('[data-shuffle-all]')) { state.shuffle = true; play(Math.floor(Math.random() * PLAYLIST.length)); }
    });
    body.addEventListener('dblclick', event => {
      const row = event.target.closest('[data-row]');
      if (row) play(Number(row.dataset.row));
    });
    body.addEventListener('keydown', event => {
      const row = event.target.closest('[data-row]');
      if (row && event.key === 'Enter') play(Number(row.dataset.row));
      if (event.key === ' ' && !event.target.closest('input, button')) { event.preventDefault(); toggle(); }
      if (event.target.closest('[data-scrub]') && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        state.time = OS.util.clamp(state.time + (event.key === 'ArrowRight' ? 5 : -5), 0, seconds(PLAYLIST[state.index].d));
        renderProgress();
      }
    });
    body.querySelector('[data-scrub] .music-track').addEventListener('pointerdown', event => {
      const bar = event.currentTarget;
      const update = e => { const r = bar.getBoundingClientRect(); seek((e.clientX - r.left) / r.width); };
      update(event);
      bar.setPointerCapture(event.pointerId);
      bar.onpointermove = update;
      bar.onpointerup = () => { bar.onpointermove = null; };
    });
    body.querySelector('[data-volume]').addEventListener('input', event => OS.settings.set('volume', Number(event.target.value)));
    render();
    return win;
  }

  OS.on('settings:change', ({ key }) => { if (key === 'volume' && win) win.body.querySelector('[data-volume]').value = OS.settings.get('volume'); });

  OS.music = {
    toggle, next: () => next(), prev,
    nowPlaying: () => (state.playing || state.time > 0 ? { title: PLAYLIST[state.index].t, artist: PLAYLIST[state.index].a, art: art(state.index), playing: state.playing } : null),
  };

  OS.apps.register({
    id: 'music',
    name: 'Music',
    icon: 'images/icons/apps/music.png',
    keywords: ['songs', 'playlist', 'audio', 'player', 'itunes'],
    single: true,
    version: '1.5',
    about: 'Sanket’s Focus Mix. Playback is simulated because CloudOS ships no audio files; controls, seeking, shuffle, and repeat all work, and it keeps playing in the background.',
    help: 'Double-click a song to play it. Space plays or pauses. Drag the progress bar to seek. Volume is shared with Control Center, which also has Now Playing controls.',
    open,
    onQuit: () => { setPlaying(false); state.time = 0; emit(); },
    menus: () => [
      { title: 'Controls', items: [
        { label: state.playing ? 'Pause' : 'Play', shortcut: 'Space', action: toggle },
        { label: 'Next', action: () => next() },
        { label: 'Previous', action: prev },
        '-',
        { label: 'Shuffle', checked: state.shuffle, action: () => { state.shuffle = !state.shuffle; render(); } },
        { label: 'Repeat', checked: state.repeat, action: () => { state.repeat = !state.repeat; render(); } },
        '-',
        { label: 'Increase Volume', action: () => OS.settings.set('volume', Math.min(100, OS.settings.get('volume') + 10)) },
        { label: 'Decrease Volume', action: () => OS.settings.set('volume', Math.max(0, OS.settings.get('volume') - 10)) },
      ] },
    ],
  });
})();
