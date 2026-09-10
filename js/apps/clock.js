/* ===== CLOCK =====
   World Clock (the analog face plus cities), Stopwatch with laps, and a Timer
   that keeps running in the background and notifies when it finishes. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  const CITIES = {
    'America/Los_Angeles': 'Cupertino', 'America/Chicago': 'Chicago', 'America/New_York': 'New York', 'America/Toronto': 'Toronto', 'America/Sao_Paulo': 'São Paulo',
    'Europe/London': 'London', 'Europe/Paris': 'Paris', 'Europe/Berlin': 'Berlin', 'Asia/Dubai': 'Dubai', 'Asia/Kolkata': 'Mumbai',
    'Asia/Singapore': 'Singapore', 'Asia/Hong_Kong': 'Hong Kong', 'Asia/Seoul': 'Seoul', 'Asia/Tokyo': 'Tokyo', 'Australia/Sydney': 'Sydney',
  };
  let win = null;
  let tab = 'world';
  let raf = 0;
  const watch = { running: false, start: 0, elapsed: 0, laps: [], frame: 0 };
  const timer = { total: 0, remaining: 0, running: false, endsAt: 0, interval: 0, label: '' };

  const pad = n => String(n).padStart(2, '0');
  const cities = () => CloudStorage.get('clock', { cities: [] }).cities || [];
  const saveCities = list => CloudStorage.set('clock', { ...CloudStorage.get('clock', {}), cities: list });

  function cityTime(tz) {
    const now = new Date();
    const there = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const here = new Date(now.toLocaleString('en-US'));
    const hours = Math.round((there - here) / 36e5 * 2) / 2;
    const dayDiff = there.getDate() !== here.getDate() ? (there > here ? 'Tomorrow' : 'Yesterday') : 'Today';
    return { time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz }), label: `${dayDiff}, ${hours === 0 ? 'same time' : `${hours > 0 ? '+' : ''}${hours}HRS`}`, there };
  }

  function chime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      const volume = Math.max(0.05, (OS.settings.get('volume') ?? 70) / 250);
      [0, 0.5, 1.0].forEach(offset => [784, 1046].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.value = freq;
        osc.connect(g); g.connect(gain);
        const t = ctx.currentTime + offset + i * 0.12;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(volume, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        osc.start(t); osc.stop(t + 0.4);
      }));
      setTimeout(() => ctx.close(), 2000);
    } catch { /* Audio is optional. */ }
  }

  /* ---------- World clock ---------- */
  function face() {
    let numbers = '';
    for (let i = 1; i <= 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      numbers += `<span class="clk-n" style="left:${50 + 40 * Math.sin(a)}%;top:${50 - 40 * Math.cos(a)}%">${i}</span>`;
    }
    const ticks = Array.from({ length: 60 }, (_, i) => `<i class="clk-tick${i % 5 ? '' : ' is-hour'}" style="transform:rotate(${i * 6}deg)"></i>`).join('');
    return `<div class="clk-face" aria-hidden="true">${ticks}${numbers}<span class="clk-hand clk-h" data-h></span><span class="clk-hand clk-m" data-m></span><span class="clk-hand clk-s" data-s></span><span class="clk-center"></span></div>`;
  }

  function updateHands() {
    raf = 0;
    if (!win || tab !== 'world') return;
    const n = new Date();
    const $ = s => win.body.querySelector(s);
    const h = n.getHours() % 12, m = n.getMinutes(), s = n.getSeconds(), ms = n.getMilliseconds();
    $('[data-h]').style.transform = `rotate(${(h + m / 60) * 30}deg)`;
    $('[data-m]').style.transform = `rotate(${(m + s / 60) * 6}deg)`;
    $('[data-s]').style.transform = `rotate(${(s + (OS.util.motionOn() ? ms / 1000 : 0)) * 6}deg)`;
    const digital = n.toLocaleTimeString('en-US', { hour12: true });
    if ($('[data-digital]').textContent !== digital) {
      $('[data-digital]').textContent = digital;
      $('[data-date]').textContent = n.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      win.body.querySelectorAll('[data-tz]').forEach(row => { const c = cityTime(row.dataset.tz); row.querySelector('.clk-city-time').textContent = c.time; row.querySelector('small').textContent = c.label; });
    }
    raf = requestAnimationFrame(updateHands);
  }

  function worldView() {
    const list = cities();
    const available = Object.keys(CITIES).filter(tz => !list.includes(tz));
    return `<div class="clk-world">
      <div class="clk-local">${face()}<p class="clk-digital" data-digital></p><p class="clk-date" data-date></p></div>
      <div class="clk-cities">${list.map(tz => { const c = cityTime(tz); return `<div class="clk-city" data-tz="${esc(tz)}"><div><strong>${esc(CITIES[tz] || tz.split('/').pop().replace(/_/g, ' '))}</strong><small>${esc(c.label)}</small></div><span class="clk-city-time">${esc(c.time)}</span><button type="button" class="clk-remove" data-remove="${esc(tz)}" aria-label="Remove ${esc(CITIES[tz] || tz)}">×</button></div>`; }).join('')}</div>
      ${available.length ? `<label class="clk-add"><span>Add a city</span><select data-add-city><option value="">Choose…</option>${available.map(tz => `<option value="${esc(tz)}">${esc(CITIES[tz])}</option>`).join('')}</select></label>` : ''}
    </div>`;
  }

  /* ---------- Stopwatch ---------- */
  const watchTime = () => watch.elapsed + (watch.running ? performance.now() - watch.start : 0);
  const fmtWatch = ms => `${pad(Math.floor(ms / 60000))}:${pad(Math.floor(ms / 1000) % 60)}.${pad(Math.floor(ms / 10) % 100)}`;
  function stopwatchView() {
    return `<div class="clk-watch"><p class="clk-watch-time" data-watch>${fmtWatch(watchTime())}</p>
      <div class="clk-buttons"><button type="button" class="clk-round" data-lap>${watch.running || !watchTime() ? 'Lap' : 'Reset'}</button><button type="button" class="clk-round ${watch.running ? 'is-stop' : 'is-start'}" data-startstop>${watch.running ? 'Stop' : 'Start'}</button></div>
      <ol class="clk-laps">${watch.laps.map((lap, i) => `<li><span>Lap ${watch.laps.length - i}</span><span>${fmtWatch(lap)}</span></li>`).join('')}</ol></div>`;
  }
  function watchFrame() {
    watch.frame = 0;
    if (!win || tab !== 'stopwatch' || !watch.running) return;
    const el = win.body.querySelector('[data-watch]');
    if (el) el.textContent = fmtWatch(watchTime());
    watch.frame = requestAnimationFrame(watchFrame);
  }

  /* ---------- Timer ---------- */
  const fmtTimer = s => (s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`);
  function timerView() {
    if (!timer.total) {
      return `<div class="clk-timer"><div class="clk-presets">${[1, 3, 5, 10, 15, 25].map(m => `<button type="button" class="clk-preset" data-preset="${m}">${m} min</button>`).join('')}</div>
        <div class="clk-custom"><label>Minutes<input type="number" min="0" max="599" value="5" data-min /></label><label>Seconds<input type="number" min="0" max="59" value="0" data-sec /></label></div>
        <label class="clk-label">Label<input type="text" placeholder="Timer" data-label maxlength="40" /></label>
        <div class="clk-buttons"><button type="button" class="clk-round is-start" data-timer-start>Start</button></div></div>`;
    }
    const pct = timer.remaining / timer.total;
    return `<div class="clk-timer is-running"><div class="clk-ring" style="--p:${pct}"><div><p class="clk-remaining" data-remaining>${fmtTimer(Math.ceil(timer.remaining))}</p><small>${esc(timer.label || 'Timer')}</small></div></div>
      <div class="clk-buttons"><button type="button" class="clk-round" data-timer-cancel>Cancel</button><button type="button" class="clk-round ${timer.running ? 'is-pause' : 'is-start'}" data-timer-pause>${timer.running ? 'Pause' : 'Resume'}</button></div></div>`;
  }
  function timerTick() {
    if (!timer.running) return;
    timer.remaining = Math.max(0, (timer.endsAt - Date.now()) / 1000);
    if (win && tab === 'timer') {
      const el = win.body.querySelector('[data-remaining]');
      if (el) el.textContent = fmtTimer(Math.ceil(timer.remaining));
      win.body.querySelector('.clk-ring')?.style.setProperty('--p', timer.remaining / timer.total);
    }
    if (timer.remaining <= 0) {
      clearInterval(timer.interval);
      const label = timer.label || 'Timer';
      Object.assign(timer, { total: 0, remaining: 0, running: false });
      OS.apps.setBackground('clock', false);
      chime();
      OS.notify({ app: 'clock', title: label, message: 'Your timer is done.', timeout: 10000 });
      if (win && tab === 'timer') render();
    }
  }
  function startTimer(seconds, label) {
    if (seconds <= 0) return;
    Object.assign(timer, { total: seconds, remaining: seconds, running: true, endsAt: Date.now() + seconds * 1000, label });
    clearInterval(timer.interval);
    timer.interval = setInterval(timerTick, 250);
    OS.apps.setBackground('clock', true);
    render();
  }

  function render() {
    if (!win) return;
    cancelAnimationFrame(raf); raf = 0;
    cancelAnimationFrame(watch.frame); watch.frame = 0;
    win.body.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === tab)));
    const view = win.body.querySelector('[data-view]');
    view.innerHTML = tab === 'world' ? worldView() : tab === 'stopwatch' ? stopwatchView() : timerView();
    if (tab === 'world') updateHands();
    if (tab === 'stopwatch') watchFrame();
  }

  function open() {
    win = OS.wm.create({
      app: 'clock', title: 'Clock', chrome: 'toolbar', width: 420, height: 560, minWidth: 320, minHeight: 440, className: 'clock-win', lightsTop: 19, lightsLeft: 18,
      content: `<div class="clock"><header class="toolbar clk-bar" data-drag><div class="toolbar-flex" data-drag></div><div class="segmented" role="group" aria-label="Clock views"><button type="button" data-tab="world">World Clock</button><button type="button" data-tab="stopwatch">Stopwatch</button><button type="button" data-tab="timer">Timer</button></div><div class="toolbar-flex" data-drag></div></header><div class="clk-view" data-view></div></div>`,
      onClose: () => { cancelAnimationFrame(raf); cancelAnimationFrame(watch.frame); win = null; return true; },
    });
    win.body.addEventListener('click', event => {
      const t = event.target;
      const tabButton = t.closest('[data-tab]');
      if (tabButton) { tab = tabButton.dataset.tab; render(); return; }
      const remove = t.closest('[data-remove]');
      if (remove) { saveCities(cities().filter(tz => tz !== remove.dataset.remove)); render(); return; }
      if (t.closest('[data-startstop]')) {
        if (watch.running) { watch.elapsed = watchTime(); watch.running = false; }
        else { watch.start = performance.now(); watch.running = true; }
        render(); return;
      }
      if (t.closest('[data-lap]')) {
        if (watch.running) watch.laps.unshift(watchTime());
        else { watch.elapsed = 0; watch.laps = []; }
        render(); return;
      }
      const preset = t.closest('[data-preset]');
      if (preset) { startTimer(Number(preset.dataset.preset) * 60, `${preset.dataset.preset} minute timer`); return; }
      if (t.closest('[data-timer-start]')) {
        const seconds = (Number(win.body.querySelector('[data-min]').value) || 0) * 60 + (Number(win.body.querySelector('[data-sec]').value) || 0);
        startTimer(seconds, win.body.querySelector('[data-label]').value.trim());
        return;
      }
      if (t.closest('[data-timer-pause]')) {
        if (timer.running) { timer.running = false; timer.remaining = Math.max(0, (timer.endsAt - Date.now()) / 1000); clearInterval(timer.interval); }
        else { timer.running = true; timer.endsAt = Date.now() + timer.remaining * 1000; timer.interval = setInterval(timerTick, 250); }
        render(); return;
      }
      if (t.closest('[data-timer-cancel]')) { clearInterval(timer.interval); Object.assign(timer, { total: 0, remaining: 0, running: false }); OS.apps.setBackground('clock', false); render(); }
    });
    win.body.addEventListener('change', event => {
      const select = event.target.closest('[data-add-city]');
      if (select?.value) { saveCities([...cities(), select.value]); render(); }
    });
    render();
    return win;
  }

  OS.apps.register({
    id: 'clock',
    name: 'Clock',
    icon: 'images/icons/apps/clock.png',
    keywords: ['time', 'timer', 'stopwatch', 'world clock', 'alarm'],
    single: true,
    version: '1.3',
    about: 'World clocks, a stopwatch with laps, and timers that notify you when they finish — even with the window closed.',
    help: 'Add cities under World Clock. Stopwatch: Start, then Lap or Stop; Reset clears it. Timer: pick a preset or set minutes and seconds; you’ll get a notification and a chime when it’s done.',
    open,
    menus: () => [
      { title: 'View', items: [
        { label: 'World Clock', checked: tab === 'world', action: () => { tab = 'world'; render(); } },
        { label: 'Stopwatch', checked: tab === 'stopwatch', action: () => { tab = 'stopwatch'; render(); } },
        { label: 'Timer', checked: tab === 'timer', action: () => { tab = 'timer'; render(); } },
      ] },
    ],
  });
})();
