/* ===== CONTROL CENTER =====
   Every control changes something real in CloudOS: Focus silences banners,
   Display dims the screen, Sound sets Music's volume, and the bottom row
   switches appearance, motion, the terminal's contrast theme, and Show Desktop.
   Wi-Fi, Bluetooth, and AirDrop are preferences; Wi-Fi also shows whether
   this browser is actually online. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  let panel = null;
  let anchor = null;

  const G = {
    wifi: '<svg viewBox="0 0 20 16" aria-hidden="true"><path d="M10 13.6a1.5 1.5 0 1 0 0 .01ZM5.9 10.2a5.8 5.8 0 0 1 8.2 0l-1.2 1.2a4.1 4.1 0 0 0-5.8 0Zm-2.7-2.7a9.6 9.6 0 0 1 13.6 0l-1.2 1.2a7.9 7.9 0 0 0-11.2 0ZM.5 4.8a13.4 13.4 0 0 1 19 0l-1.2 1.2a11.7 11.7 0 0 0-16.6 0Z" fill="currentColor"/></svg>',
    bluetooth: '<svg viewBox="0 0 16 20" aria-hidden="true"><path d="M3 5.5l9 8-4.5 4V2.5l4.5 4-9 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    airdrop: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="2.2" fill="currentColor"/><path d="M5.2 14.8a6.8 6.8 0 1 1 9.6 0M2.6 17.4a10.4 10.4 0 1 1 14.8 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    focus: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13.8 12.6A6.4 6.4 0 0 1 7.4 3.1 7 7 0 1 0 16.9 12.6a6.4 6.4 0 0 1-3.1 0Z" fill="currentColor"/></svg>',
    sun: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.4" fill="currentColor"/><path d="M10 1.8v2.1m0 12.2v2.1M1.8 10h2.1m12.2 0h2.1M4.2 4.2l1.5 1.5m8.6 8.6 1.5 1.5m0-11.6-1.5 1.5m-8.6 8.6-1.5 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    speaker: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7.5h3l4-3.5v12l-4-3.5H3Z" fill="currentColor"/><path d="M13 7a4 4 0 0 1 0 6m2.3-8.3a7.3 7.3 0 0 1 0 10.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    moon: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 3a7 7 0 0 1 0 14Z" fill="currentColor"/></svg>',
    motion: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7h9m-9 6h14M12 4l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    contrast: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 3h3.5A3.5 3.5 0 0 1 17 6.5v7a3.5 3.5 0 0 1-3.5 3.5H10Z" fill="currentColor"/></svg>',
    desktop: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="3.5" width="15" height="10.5" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 17h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9.5-5.5Z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2.5h3v11h-3Zm6 0h3v11h-3Z" fill="currentColor"/></svg>',
    next: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 3v10l6-5Zm6.5 0v10l6-5Z" fill="currentColor"/></svg>',
  };

  const airdropLabel = { contacts: 'Contacts Only', everyone: 'Everyone for 10 Minutes', off: 'Off' };

  function render() {
    const s = OS.settings.all();
    const online = navigator.onLine;
    const track = OS.music?.nowPlaying?.();
    const tile = (key, glyph, title, subtitle, on) => `<button type="button" class="cc-row" data-cc="${key}" aria-pressed="${!!on}"><span class="cc-bubble${on ? ' is-on' : ''}">${glyph}</span><span><strong>${esc(title)}</strong><small>${esc(subtitle)}</small></span></button>`;
    const small = (key, glyph, title, on) => `<button type="button" class="cc-module cc-small" data-cc="${key}" aria-pressed="${!!on}"><span class="cc-bubble${on ? ' is-on' : ''}">${glyph}</span><strong>${esc(title)}</strong></button>`;
    panel.innerHTML = `
      <div class="cc-grid">
        <div class="cc-module cc-connect">
          ${tile('wifi', G.wifi, 'Wi-Fi', s.wifi ? (online ? 'Online' : 'No internet') : 'Off', s.wifi)}
          ${tile('bluetooth', G.bluetooth, 'Bluetooth', s.bluetooth ? 'On' : 'Off', s.bluetooth)}
          ${tile('airdrop', G.airdrop, 'AirDrop', airdropLabel[s.airdrop] || 'Contacts Only', s.airdrop !== 'off')}
        </div>
        <div class="cc-stack">
          <button type="button" class="cc-module cc-focus" data-cc="focus" aria-pressed="${!!s.doNotDisturb}"><span class="cc-bubble${s.doNotDisturb ? ' is-on is-focus' : ''}">${G.focus}</span><span><strong>Focus</strong><small>${s.doNotDisturb ? 'Do Not Disturb' : 'Off'}</small></span></button>
          <div class="cc-pair">${small('appearance', G.moon, OS.theme.appearance() === 'dark' ? 'Dark Mode' : 'Light Mode', OS.theme.appearance() === 'dark')}${small('desktop', G.desktop, 'Show Desktop', OS.wm.isDesktopShown())}</div>
        </div>
        <label class="cc-module cc-slider-module"><strong>Display</strong><span class="cc-slider">${G.sun}<input type="range" min="30" max="100" value="${s.brightness}" data-cc-range="brightness" aria-label="Display brightness" /></span></label>
        <label class="cc-module cc-slider-module"><strong>Sound</strong><span class="cc-slider">${G.speaker}<input type="range" min="0" max="100" value="${s.volume}" data-cc-range="volume" aria-label="Output volume" /></span></label>
        <div class="cc-module cc-music">
          <button type="button" class="cc-music-info" data-cc="music"><span class="cc-art" style="${track ? `background:${esc(track.art)}` : ''}">${track ? '' : `<img src="images/icons/apps/music.png" alt="" />`}</span><span><strong>${esc(track ? track.title : 'Not Playing')}</strong><small>${esc(track ? track.artist : 'Music')}</small></span></button>
          <button type="button" class="cc-music-btn" data-cc="play" aria-label="${track?.playing ? 'Pause' : 'Play'}">${track?.playing ? G.pause : G.play}</button>
          <button type="button" class="cc-music-btn" data-cc="next" aria-label="Next track">${G.next}</button>
        </div>
        <div class="cc-pair cc-wide">${small('motion', G.motion, 'Reduce Motion', s.reduceMotion)}${small('contrast', G.contrast, 'Increase Contrast', s.increaseContrast)}</div>
        <button type="button" class="cc-module cc-night" data-cc="night" aria-pressed="${!!s.nightShift}"><span class="cc-bubble${s.nightShift ? ' is-on is-warm' : ''}">${G.sun}</span><strong>Night Shift</strong><small>${s.nightShift ? 'On' : 'Off'}</small></button>
      </div>
      <button type="button" class="cc-edit" data-cc="settings">Control Center Settings…</button>`;
  }

  function onClick(event) {
    const button = event.target.closest('[data-cc]');
    if (!button) return;
    const key = button.dataset.cc;
    if (key === 'wifi') OS.settings.toggle('wifi');
    if (key === 'bluetooth') OS.settings.toggle('bluetooth');
    if (key === 'airdrop') { const order = ['contacts', 'everyone', 'off']; OS.settings.set('airdrop', order[(order.indexOf(OS.settings.get('airdrop')) + 1) % order.length]); }
    if (key === 'focus') OS.settings.toggle('doNotDisturb');
    if (key === 'appearance') OS.settings.set('appearance', OS.theme.appearance() === 'dark' ? 'light' : 'dark');
    if (key === 'motion') OS.settings.toggle('reduceMotion');
    if (key === 'contrast') OS.settings.toggle('increaseContrast');
    if (key === 'night') OS.settings.toggle('nightShift');
    if (key === 'desktop') { close(); OS.wm.showDesktop(); return; }
    if (key === 'music') { close(); OS.apps.launch('music'); return; }
    if (key === 'play') { if (OS.music?.toggle) OS.music.toggle(); else OS.apps.launch('music'); }
    if (key === 'next') OS.music?.next?.();
    if (key === 'settings') { close(); OS.apps.launch('settings', { pane: 'control-center' }); return; }
    render();
  }

  function onInput(event) {
    const range = event.target.closest('[data-cc-range]');
    if (range) OS.settings.set(range.dataset.ccRange, Number(range.value));
  }

  function onOutside(event) {
    if (panel?.contains(event.target) || anchor?.contains(event.target)) return;
    close();
  }

  function open(button) {
    if (panel) return;
    OS.notificationCenter?.close();
    OS.menu.closeAll();
    anchor = button || document.querySelector('[data-status="control"]');
    panel = document.createElement('div');
    panel.className = 'control-center';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Control Center');
    document.getElementById('overlays').appendChild(panel);
    render();
    const rect = anchor.getBoundingClientRect();
    panel.style.top = `${rect.bottom + 6}px`;
    panel.style.right = `${Math.max(6, window.innerWidth - rect.right - 8)}px`;
    panel.addEventListener('click', onClick);
    panel.addEventListener('input', onInput);
    anchor.classList.add('is-open');
    setTimeout(() => document.addEventListener('pointerdown', onOutside, true));
    document.addEventListener('keydown', onKey, true);
    panel.querySelector('button')?.focus({ preventScroll: true });
  }

  function onKey(event) {
    if (event.key === 'Escape' && panel) { event.preventDefault(); event.stopPropagation(); const a = anchor; close(); a?.focus(); }
  }

  function close() {
    if (!panel) return;
    const el = panel;
    panel = null;
    anchor?.classList.remove('is-open');
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), OS.util.motionOn() ? 180 : 0);
    document.removeEventListener('pointerdown', onOutside, true);
    document.removeEventListener('keydown', onKey, true);
  }

  OS.on('settings:change', () => { if (panel && !panel.contains(document.activeElement?.closest('input'))) render(); });
  OS.on('music:change', () => { if (panel) render(); });
  OS.controlCenter = { toggle: button => (panel ? close() : open(button)), open, close, isOpen: () => !!panel };
})();
