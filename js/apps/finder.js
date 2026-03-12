/* ===== FINDER ===== */

function openFinder() {
  const items = [
    { i: '📁', n: 'Desktop', t: 'd' },
    { i: '📁', n: 'Documents', t: 'd' },
    { i: '📁', n: 'Downloads', t: 'd' },
    { i: '🖼️', n: 'Pictures', t: 'd' },
    { i: '🎵', n: 'Music', t: 'd' },
    { i: '📁', n: 'Projects', t: 'd' },
    { i: '📄', n: 'README.md', t: 'f' },
    { i: '📦', n: 'merchant.live', t: 'd' },
    { i: '🐍', n: 'scripts', t: 'd' },
    { i: '📊', n: 'analysis.ipynb', t: 'f' },
    { i: '⚙️', n: '.env', t: 'f' }
  ];
  mkWin('finder', 'Finder', 720, 440,
    '<div style="display:flex;height:100%">' +
      '<div class="fsb">' +
        '<div class="fsbl">Favorites</div>' +
        '<div class="fsbi active" onclick="finderNavTo(\'Recents\')">📁 Recents</div>' +
        '<div class="fsbi" onclick="finderNavTo(\'Home\')">🏠 Home</div>' +
        '<div class="fsbi" onclick="finderNavTo(\'Desktop\')">🖥️ Desktop</div>' +
        '<div class="fsbi" onclick="finderNavTo(\'Downloads\')">📥 Downloads</div>' +
        '<div class="fsbi" onclick="finderNavTo(\'Documents\')">📄 Documents</div>' +
        '<div class="fsbl">Locations</div>' +
        '<div class="fsbi" onclick="finderNavTo(\'Macintosh HD\')">💻 Macintosh HD</div>' +
        '<div class="fsbi" onclick="finderNavTo(\'iCloud Drive\')">☁️ iCloud Drive</div>' +
        '<div class="fsbi" onclick="finderNavTo(\'Network\')">🌐 Network</div>' +
        '<div class="fsbl">Tags</div>' +
        '<div class="fsbi" onclick="finderNavTo(\'Red\')">🔴 Red</div>' +
        '<div class="fsbi" onclick="finderNavTo(\'Blue\')">🔵 Blue</div>' +
      '</div>' +
      '<div class="fcont">' +
        items.map(function(f) {
          return '<div class="fitem" ondblclick="openFinderItem(\'' + f.n + '\', \'' + f.t + '\')">' +
            '<span class="ficon">' + f.i + '</span>' +
            '<span class="fname">' + f.n + '</span>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>',
    { bs: 'overflow:hidden' }
  );
}

function openFinderItem(name, type) {
  if (type === 'd') {
    // Open folder - show notification for demo
    showNotificationBanner('Finder', 'Opening ' + name, '📁', 2000);
  } else {
    // Open file - dispatch to appropriate app
    const fileActions = {
      'README.md': function() { openTextFile('README.md', '# Welcome to CloudOS\n\nThis is a demo operating system built with HTML, CSS, and JavaScript.\n\n## Features\n- Window management\n- File system simulation\n- App ecosystem\n- CloudStorage persistence\n\nEnjoy exploring!'); },
      'analysis.ipynb': function() { showNotificationBanner('Finder', 'Opening in Jupyter...', '📊', 2000); },
      '.env': function() { openTextFile('.env', '# Environment Variables\nAPI_KEY=demo_key_12345\nDATABASE_URL=postgresql://localhost:5432/cloudos\nDEBUG=true'); }
    };

    if (fileActions[name]) {
      fileActions[name]();
    } else {
      showNotificationBanner('Finder', 'Opened ' + name, '📄', 2000);
    }
  }
}

function openTextFile(filename, content) {
  // Open TextEdit app with file content
  openApp('textedit');
  setTimeout(function() {
    const textarea = document.querySelector('.te');
    if (textarea) {
      textarea.value = content;
    }
  }, 150);
}

function finderNavTo(location) {
  // Update active sidebar item
  document.querySelectorAll('.fsbi').forEach(function(item) {
    item.classList.remove('active');
    if (item.textContent.includes(location)) {
      item.classList.add('active');
    }
  });

  showNotificationBanner('Finder', 'Navigating to ' + location, '📁', 2000);
}
