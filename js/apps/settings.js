/* ===== SETTINGS ===== */

function openSettings() {
  const settings = CloudStorage.get('settings', {
    darkMode: false,
    dockSize: 52,
    accentColor: '#007AFF',
    autoHideDock: false,
    autoHideMenuBar: false,
    showRecentApps: true
  });

  const accentColors = ['#007AFF', '#AF52DE', '#FF2D55', '#FF9500', '#34C759'];

  mkWin('settings', 'System Settings', 680, 460,
    '<div style="display:flex;height:100%">' +
      '<div class="ssb">' +
        '<div class="si active" onclick="showPane(\'general\',this)">🖥️ General</div>' +
        '<div class="si" onclick="showPane(\'appearance\',this)">🎨 Appearance</div>' +
        '<div class="si" onclick="showPane(\'dock\',this)">⬇️ Dock</div>' +
        '<div class="si" onclick="showPane(\'display\',this)">🖥️ Display</div>' +
        '<div class="si" onclick="showPane(\'sound\',this)">🔊 Sound</div>' +
        '<div class="si" onclick="showPane(\'network\',this)">📶 Network</div>' +
        '<div class="si" onclick="showPane(\'battery\',this)">🔋 Battery</div>' +
        '<div class="si" onclick="showPane(\'about\',this)">ℹ️ About</div>' +
      '</div>' +
      '<div class="sc" id="spane">' + getGeneralPane(settings, accentColors) + '</div>' +
    '</div>',
    { bs: 'overflow:hidden' }
  );
}

function getGeneralPane(settings, accentColors) {
  return '<h2>General</h2>' +
    '<div class="srow">' +
      '<label>Dark Mode</label>' +
      '<div class="tog ' + (settings.darkMode ? 'on' : '') + '" onclick="toggleDarkMode(this)"></div>' +
    '</div>' +
    '<div class="srow">' +
      '<label>Auto-hide Menu Bar</label>' +
      '<div class="tog ' + (settings.autoHideMenuBar ? 'on' : '') + '" onclick="toggleAutoHideMenuBar(this)"></div>' +
    '</div>' +
    '<div class="srow">' +
      '<label>Accent Color</label>' +
      '<div style="display:flex;gap:6px">' +
        accentColors.map(function(c) {
          const selected = c === settings.accentColor ? ' style="box-shadow:0 0 0 2px ' + c + ', 0 0 0 4px rgba(255,255,255,0.8)"' : '';
          return '<div' + selected + ' style="width:20px;height:20px;border-radius:50%;background:' + c + ';cursor:pointer;transition:box-shadow 0.2s" onclick="setAccentColor(\'' + c + '\',this.parentElement)"></div>';
        }).join('') +
      '</div>' +
    '</div>' +
    '<div class="srow">' +
      '<label>Show Recent Apps</label>' +
      '<div class="tog ' + (settings.showRecentApps ? 'on' : '') + '" onclick="toggleShowRecentApps(this)"></div>' +
    '</div>';
}

function showPane(p, el) {
  document.querySelectorAll('.si').forEach(function(x) { x.classList.remove('active'); });
  el.classList.add('active');
  var s = document.getElementById('spane');
  var settings = CloudStorage.get('settings', {});
  var accentColors = ['#007AFF', '#AF52DE', '#FF2D55', '#FF9500', '#34C759'];

  var panes = {
    general: getGeneralPane(settings, accentColors),
    appearance:
      '<h2>Appearance</h2>' +
      '<div class="srow">' +
        '<label>Theme</label>' +
        '<select style="border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-family:var(--font);background:#fff" onchange="setTheme(this.value)">' +
          '<option' + (settings.darkMode ? '' : ' selected') + '>Light</option>' +
          '<option' + (settings.darkMode ? ' selected' : '') + '>Dark</option>' +
          '<option>Auto</option>' +
        '</select>' +
      '</div>' +
      '<div class="srow">' +
        '<label>Wallpaper Tinting</label>' +
        '<div class="tog on" onclick="this.classList.toggle(\'on\')"></div>' +
      '</div>',
    dock:
      '<h2>Dock & Menu Bar</h2>' +
      '<div class="srow">' +
        '<label>Dock Size</label>' +
        '<input type="range" min="30" max="80" value="' + settings.dockSize + '" oninput="setDockSize(this.value)">' +
        '<span style="font-size:13px;color:var(--text2);margin-left:10px" id="dock-size-label">' + settings.dockSize + 'px</span>' +
      '</div>' +
      '<div class="srow">' +
        '<label>Magnification</label>' +
        '<div class="tog on" onclick="this.classList.toggle(\'on\')"></div>' +
      '</div>' +
      '<div class="srow">' +
        '<label>Auto-hide Dock</label>' +
        '<div class="tog ' + (settings.autoHideDock ? 'on' : '') + '" onclick="toggleAutoHideDock(this)"></div>' +
      '</div>',
    display:
      '<h2>Display</h2>' +
      '<div class="srow">' +
        '<label>Brightness</label>' +
        '<input type="range" min="0" max="100" value="80">' +
      '</div>' +
      '<div class="srow">' +
        '<label>Night Shift</label>' +
        '<div class="tog" onclick="this.classList.toggle(\'on\')"></div>' +
      '</div>' +
      '<div class="srow">' +
        '<label>True Tone</label>' +
        '<div class="tog on" onclick="this.classList.toggle(\'on\')"></div>' +
      '</div>',
    sound:
      '<h2>Sound</h2>' +
      '<div class="srow">' +
        '<label>Volume</label>' +
        '<input type="range" min="0" max="100" value="65">' +
      '</div>' +
      '<div class="srow">' +
        '<label>Alert Volume</label>' +
        '<input type="range" min="0" max="100" value="80">' +
      '</div>' +
      '<div class="srow">' +
        '<label>Sound Effects</label>' +
        '<div class="tog on" onclick="this.classList.toggle(\'on\')"></div>' +
      '</div>',
    network:
      '<h2>Network</h2>' +
      '<div class="srow">' +
        '<label>Wi-Fi</label>' +
        '<div class="tog on" onclick="this.classList.toggle(\'on\')"></div>' +
      '</div>' +
      '<div class="srow">' +
        '<label>Network</label>' +
        '<span style="font-size:13px;color:var(--text)">CloudOS-5G</span>' +
      '</div>' +
      '<div class="srow">' +
        '<label>IP Address</label>' +
        '<span style="font-size:13px;color:var(--text2)">192.168.1.42</span>' +
      '</div>',
    battery:
      '<h2>Battery</h2>' +
      '<div style="text-align:center;padding:18px">' +
        '<div style="font-size:44px">🔋</div>' +
        '<div style="font-size:26px;font-weight:700;color:var(--text)">87%</div>' +
        '<div style="font-size:12px;color:var(--text2)">Power Source: Battery</div>' +
      '</div>' +
      '<div class="srow">' +
        '<label>Low Power Mode</label>' +
        '<div class="tog" onclick="this.classList.toggle(\'on\')"></div>' +
      '</div>' +
      '<div class="srow">' +
        '<label>Optimized Charging</label>' +
        '<div class="tog on" onclick="this.classList.toggle(\'on\')"></div>' +
      '</div>',
    about:
      '<h2>About This Mac</h2>' +
      '<div class="abm">' +
        '<div style="font-size:56px">💻</div>' +
        '<h2>CloudOS</h2>' +
        '<div class="ver">Version 14.2.1</div>' +
        '<div class="specs">' +
          'CloudChip M3 Pro<br>' +
          '16 GB Unified Memory<br>' +
          '512 GB SSD<br>' +
          'Storage: ' + CloudStorage.getSizeString() + '<br>' +
          'Display: ' + screen.width + '×' + screen.height +
        '</div>' +
      '</div>'
  };
  s.innerHTML = panes[p] || '';
}

// Toggle functions that actually work
function toggleDarkMode(toggle) {
  toggle.classList.toggle('on');
  const enabled = toggle.classList.contains('on');

  if (enabled) {
    document.documentElement.style.setProperty('--glass', 'rgba(30,30,30,0.75)');
    document.documentElement.style.setProperty('--text', '#f5f5f7');
    document.documentElement.style.setProperty('--text2', '#a1a1a6');
    document.documentElement.style.setProperty('--border', 'rgba(255,255,255,0.2)');
    document.body.style.background = '#000';
  } else {
    document.documentElement.style.setProperty('--glass', 'rgba(255,255,255,0.72)');
    document.documentElement.style.setProperty('--text', '#1d1d1f');
    document.documentElement.style.setProperty('--text2', '#86868b');
    document.documentElement.style.setProperty('--border', 'rgba(0,0,0,0.1)');
    document.body.style.background = '';
  }

  const settings = CloudStorage.get('settings', {});
  settings.darkMode = enabled;
  CloudStorage.set('settings', settings);

  showNotificationBanner('Settings', 'Dark mode ' + (enabled ? 'enabled' : 'disabled'), '⚙️', 2000);
}

function setTheme(value) {
  if (value === 'Dark') {
    const toggle = document.querySelector('.tog');
    if (toggle && !toggle.classList.contains('on')) {
      toggle.classList.add('on');
      toggleDarkMode(toggle);
    }
  } else if (value === 'Light') {
    const toggle = document.querySelector('.tog');
    if (toggle && toggle.classList.contains('on')) {
      toggle.classList.remove('on');
      toggleDarkMode(toggle);
    }
  }
}

function setAccentColor(color, container) {
  document.documentElement.style.setProperty('--accent', color);

  const settings = CloudStorage.get('settings', {});
  settings.accentColor = color;
  CloudStorage.set('settings', settings);

  // Update selected indicator
  container.querySelectorAll('div').forEach(function(div) {
    div.style.boxShadow = '';
  });
  event.target.style.boxShadow = '0 0 0 2px ' + color + ', 0 0 0 4px rgba(255,255,255,0.8)';

  showNotificationBanner('Settings', 'Accent color updated', '⚙️', 2000);
}

function setDockSize(value) {
  document.documentElement.style.setProperty('--dock-icon-size', value + 'px');

  const label = document.getElementById('dock-size-label');
  if (label) label.textContent = value + 'px';

  const settings = CloudStorage.get('settings', {});
  settings.dockSize = parseInt(value);
  CloudStorage.autoSave('settings', settings);
}

function toggleAutoHideDock(toggle) {
  toggle.classList.toggle('on');
  const enabled = toggle.classList.contains('on');

  const dock = document.getElementById('dock');
  if (enabled) {
    dock.style.transform = 'translateX(-50%) translateY(100%)';
    dock.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

    // Show on hover
    dock.addEventListener('mouseenter', function() {
      dock.style.transform = 'translateX(-50%) translateY(0)';
    });
    dock.addEventListener('mouseleave', function() {
      dock.style.transform = 'translateX(-50%) translateY(100%)';
    });
  } else {
    dock.style.transform = 'translateX(-50%) translateY(0)';
  }

  const settings = CloudStorage.get('settings', {});
  settings.autoHideDock = enabled;
  CloudStorage.set('settings', settings);
}

function toggleAutoHideMenuBar(toggle) {
  toggle.classList.toggle('on');
  const enabled = toggle.classList.contains('on');

  const settings = CloudStorage.get('settings', {});
  settings.autoHideMenuBar = enabled;
  CloudStorage.set('settings', settings);

  showNotificationBanner('Settings', 'Auto-hide menu bar ' + (enabled ? 'enabled' : 'disabled'), '⚙️', 2000);
}

function toggleShowRecentApps(toggle) {
  toggle.classList.toggle('on');
  const enabled = toggle.classList.contains('on');

  const settings = CloudStorage.get('settings', {});
  settings.showRecentApps = enabled;
  CloudStorage.set('settings', settings);
}
