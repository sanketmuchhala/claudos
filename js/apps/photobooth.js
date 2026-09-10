/* ===== PHOTO BOOTH =====
   Mirrored camera preview with effects, a 3-2-1 countdown, and a flash.
   Photos are saved to Photos (in this browser). The camera turns off when
   the window closes. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  const EFFECTS = [['Normal', 'none'], ['Sepia', 'sepia(1)'], ['Black & White', 'grayscale(1) contrast(1.1)'], ['Glow', 'brightness(1.15) saturate(1.45)'], ['Comic', 'contrast(1.7) saturate(1.9)'], ['X-Ray', 'invert(1) grayscale(1) contrast(1.2)'], ['Thermal', 'hue-rotate(200deg) saturate(3.2) contrast(1.2)']];
  let win = null;
  let stream = null;
  let effect = 0;
  let busy = false;

  function stop() {
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
  }

  function shutter() {
    if (!OS.settings.get('soundEffects')) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3) * 0.5;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
      setTimeout(() => ctx.close(), 400);
    } catch { /* Audio is optional. */ }
  }

  function strip() {
    const photos = CloudStorage.get('photos', []).slice(0, 12);
    win.body.querySelector('[data-strip]').innerHTML = photos.length
      ? photos.map(p => `<button type="button" class="pb-thumb" data-photo="${esc(p.id)}" aria-label="Open photo in Photos"><img src="${esc(p.src)}" alt="" /></button>`).join('')
      : '<p class="pb-hint">Your photos appear here.</p>';
  }

  async function start() {
    const stage = win.body.querySelector('[data-stage]');
    stage.classList.remove('has-error');
    if (!navigator.mediaDevices?.getUserMedia) { showError('This browser doesn’t provide camera access.'); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false });
      if (!win) { stop(); return; }
      const video = win.body.querySelector('video');
      video.srcObject = stream;
      await video.play().catch(() => {});
      win.body.querySelector('[data-capture]').disabled = false;
    } catch (error) {
      showError(error?.name === 'NotAllowedError' ? 'Camera access was denied. Allow the camera in your browser’s site settings, then try again.' : 'No camera is available.');
    }
  }

  function showError(message) {
    const stage = win.body.querySelector('[data-stage]');
    stage.classList.add('has-error');
    stage.querySelector('[data-error]').innerHTML = `<img src="images/icons/apps/photobooth.png" alt="" /><p>${esc(message)}</p><button type="button" class="push-button" data-retry>Try Again</button>`;
    win.body.querySelector('[data-capture]').disabled = true;
  }

  async function capture() {
    const video = win?.body.querySelector('video');
    if (!video || !stream || busy) return;
    busy = true;
    const counter = win.body.querySelector('[data-countdown]');
    for (const n of [3, 2, 1]) {
      counter.textContent = n;
      counter.hidden = false;
      await new Promise(r => setTimeout(r, OS.util.motionOn() ? 700 : 400));
      if (!win) { busy = false; return; }
    }
    counter.hidden = true;
    const flash = win.body.querySelector('[data-flash]');
    flash.classList.remove('is-on');
    void flash.offsetWidth;
    flash.classList.add('is-on');
    shutter();
    const width = 480;
    const height = Math.round(width * (video.videoHeight / video.videoWidth || 0.75));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.filter = EFFECTS[effect][1];
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    const photo = OS.photos.add(canvas.toDataURL('image/jpeg', 0.78));
    if (!photo) OS.notify({ app: 'photobooth', title: 'Couldn’t save the photo', message: 'Browser storage is full. Delete some photos in Photos.' });
    strip();
    busy = false;
  }

  function open() {
    win = OS.wm.create({
      app: 'photobooth', title: 'Photo Booth', width: 680, height: 560, minWidth: 360, minHeight: 360, className: 'photobooth-win',
      content: `<div class="photobooth">
        <div class="pb-stage" data-stage><video playsinline muted aria-label="Camera preview"></video><div class="pb-error" data-error></div><div class="pb-countdown" data-countdown aria-live="assertive" hidden></div><div class="pb-flash" data-flash></div></div>
        <div class="pb-bar">
          <select class="pb-effects" data-effect aria-label="Effect">${EFFECTS.map(([name], i) => `<option value="${i}">${name}</option>`).join('')}</select>
          <button type="button" class="pb-capture" data-capture aria-label="Take photo" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5Z" fill="currentColor"/><circle cx="12" cy="12.4" r="3.6" fill="#b3141e"/></svg></button>
          <button type="button" class="tb-btn pb-library" data-library>Photos</button>
        </div>
        <div class="pb-strip" data-strip aria-label="Recent photos"></div>
      </div>`,
      onClose: () => { stop(); win = null; return true; },
    });
    win.body.addEventListener('click', event => {
      if (event.target.closest('[data-capture]')) capture();
      if (event.target.closest('[data-retry]')) start();
      if (event.target.closest('[data-library]')) OS.apps.launch('photos', { album: 'photobooth' });
      const photo = event.target.closest('[data-photo]');
      if (photo) OS.apps.launch('photos', { album: 'photobooth', photo: photo.dataset.photo });
    });
    win.body.addEventListener('change', event => {
      if (!event.target.matches('[data-effect]')) return;
      effect = Number(event.target.value);
      win.body.querySelector('video').style.filter = EFFECTS[effect][1];
    });
    strip();
    start();
    return win;
  }

  OS.on('photos:change', () => { if (win) strip(); });

  OS.apps.register({
    id: 'photobooth',
    name: 'Photo Booth',
    icon: 'images/icons/apps/photobooth.png',
    keywords: ['camera', 'selfie', 'photo', 'webcam', 'picture'],
    single: true,
    version: '13.1',
    about: 'Take photos with your camera, with effects. They’re saved to Photos in this browser, and the camera turns off when you close the window.',
    help: 'Allow camera access when asked. Pick an effect, then click the red button: a 3-2-1 countdown and flash, and the photo appears in the strip and in Photos.',
    open,
  });
})();
