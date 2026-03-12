/* ===== FINDER ===== */

function openFinder() {
  const items = [
    { i: '📁', n: 'Desktop' }, { i: '📁', n: 'Documents' }, { i: '📁', n: 'Downloads' },
    { i: '🖼️', n: 'Pictures' }, { i: '🎵', n: 'Music' }, { i: '📁', n: 'Projects' },
    { i: '📄', n: 'README.md' }, { i: '📦', n: 'merchant.live' }, { i: '🐍', n: 'scripts' },
    { i: '📊', n: 'analysis.ipynb' }, { i: '⚙️', n: '.env' }
  ];
  mkWin('finder', 'Finder', 720, 440,
    '<div style="display:flex;height:100%">' +
      '<div class="fsb">' +
        '<div class="fsbl">Favorites</div>' +
        '<div class="fsbi active">📁 Recents</div>' +
        '<div class="fsbi">🏠 Home</div>' +
        '<div class="fsbi">🖥️ Desktop</div>' +
        '<div class="fsbi">📥 Downloads</div>' +
        '<div class="fsbi">📄 Documents</div>' +
        '<div class="fsbl">Locations</div>' +
        '<div class="fsbi">💻 Macintosh HD</div>' +
        '<div class="fsbi">☁️ iCloud Drive</div>' +
        '<div class="fsbi">🌐 Network</div>' +
        '<div class="fsbl">Tags</div>' +
        '<div class="fsbi">🔴 Red</div>' +
        '<div class="fsbi">🔵 Blue</div>' +
      '</div>' +
      '<div class="fcont">' +
        items.map(f => '<div class="fitem"><span class="ficon">' + f.i + '</span><span class="fname">' + f.n + '</span></div>').join('') +
      '</div>' +
    '</div>',
    { bs: 'overflow:hidden' }
  );
}
