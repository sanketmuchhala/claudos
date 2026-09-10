/* ===== ABOUT THIS MAC ===== */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;

  function open() {
    const rows = [
      ['Chip', 'CloudChip M3 Pro'],
      ['Memory', '16 GB'],
      ['Startup disk', 'Macintosh HD'],
      ['Display', `${screen.width} × ${screen.height} · ${window.devicePixelRatio || 1}×`],
      ['Graphics', 'CloudGPU 18-core'],
      ['Serial number', 'CLD-2024-PRO-X1'],
      ['CloudOS', 'Sequoia 15.0'],
      ['Storage used', CloudStorage.getSizeString()],
    ];
    const win = OS.wm.create({
      app: 'about', title: 'About This Mac', chrome: 'none', width: 290, height: 492, resizable: false, minimizable: false, className: 'about-mac', lightsTop: 12, lightsLeft: 12,
      content: `<div class="about-mac-body" data-drag>
        <img class="about-mac-art" src="images/icons/files/macbook.png" alt="" />
        <h2>CloudOS</h2><p class="about-mac-sub">Sequoia-inspired portfolio desktop</p>
        <dl class="about-mac-rows">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        <button type="button" class="push-button" data-more>More Info…</button>
        <p class="about-mac-legal">Designed and built by ${esc(Portfolio.data.person.name)}.<br>Not affiliated with Apple Inc.</p>
      </div>`,
    });
    win.body.addEventListener('click', event => { if (event.target.closest('[data-more]')) OS.apps.launch('settings', { pane: 'general' }); });
    return win;
  }

  OS.apps.register({
    id: 'about', name: 'About This Mac', icon: 'images/icons/files/macbook.png', single: true, launchpad: false,
    keywords: ['system', 'mac', 'version', 'specs'], about: 'Details about this CloudOS computer.', open,
  });
})();
