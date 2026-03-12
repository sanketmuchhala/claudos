/* ===== SETTINGS ===== */

function openSettings() {
  var accentColors = ['#007AFF', '#AF52DE', '#FF2D55', '#FF9500', '#34C759'];
  var colorDots = accentColors.map(function(c) {
    return '<div style="width:20px;height:20px;border-radius:50%;background:' + c + ';cursor:pointer" onclick="document.documentElement.style.setProperty(\'--accent\',\'' + c + '\')"></div>';
  }).join('');

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
      '<div class="sc" id="spane">' +
        '<h2>General</h2>' +
        '<div class="srow"><label>Dark Mode</label><div class="tog" onclick="this.classList.toggle(\'on\')"></div></div>' +
        '<div class="srow"><label>Auto-hide Menu Bar</label><div class="tog" onclick="this.classList.toggle(\'on\')"></div></div>' +
        '<div class="srow"><label>Accent Color</label><div style="display:flex;gap:6px">' + colorDots + '</div></div>' +
        '<div class="srow"><label>Show Recent Apps</label><div class="tog on" onclick="this.classList.toggle(\'on\')"></div></div>' +
      '</div>' +
    '</div>',
    { bs: 'overflow:hidden' }
  );
}

function showPane(p, el) {
  document.querySelectorAll('.si').forEach(function(x) { x.classList.remove('active'); });
  el.classList.add('active');
  var s = document.getElementById('spane');
  var panes = {
    general:
      '<h2>General</h2>' +
      '<div class="srow"><label>Dark Mode</label><div class="tog" onclick="this.classList.toggle(\'on\')"></div></div>' +
      '<div class="srow"><label>Auto-hide Menu Bar</label><div class="tog" onclick="this.classList.toggle(\'on\')"></div></div>' +
      '<div class="srow"><label>Show Recent Apps</label><div class="tog on" onclick="this.classList.toggle(\'on\')"></div></div>',
    appearance:
      '<h2>Appearance</h2>' +
      '<div class="srow"><label>Theme</label><select style="border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-family:var(--font);background:#fff"><option>Light</option><option>Dark</option><option>Auto</option></select></div>' +
      '<div class="srow"><label>Wallpaper Tinting</label><div class="tog on" onclick="this.classList.toggle(\'on\')"></div></div>',
    dock:
      '<h2>Dock & Menu Bar</h2>' +
      '<div class="srow"><label>Dock Size</label><input type="range" min="30" max="80" value="52"></div>' +
      '<div class="srow"><label>Magnification</label><div class="tog on" onclick="this.classList.toggle(\'on\')"></div></div>' +
      '<div class="srow"><label>Auto-hide Dock</label><div class="tog" onclick="this.classList.toggle(\'on\')"></div></div>',
    display:
      '<h2>Display</h2>' +
      '<div class="srow"><label>Brightness</label><input type="range" min="0" max="100" value="80"></div>' +
      '<div class="srow"><label>Night Shift</label><div class="tog" onclick="this.classList.toggle(\'on\')"></div></div>' +
      '<div class="srow"><label>True Tone</label><div class="tog on" onclick="this.classList.toggle(\'on\')"></div></div>',
    sound:
      '<h2>Sound</h2>' +
      '<div class="srow"><label>Volume</label><input type="range" min="0" max="100" value="65"></div>' +
      '<div class="srow"><label>Alert Volume</label><input type="range" min="0" max="100" value="80"></div>' +
      '<div class="srow"><label>Sound Effects</label><div class="tog on" onclick="this.classList.toggle(\'on\')"></div></div>',
    network:
      '<h2>Network</h2>' +
      '<div class="srow"><label>Wi-Fi</label><div class="tog on" onclick="this.classList.toggle(\'on\')"></div></div>' +
      '<div class="srow"><label>Network</label><span style="font-size:13px;color:var(--text)">CloudOS-5G</span></div>' +
      '<div class="srow"><label>IP Address</label><span style="font-size:13px;color:var(--text2)">192.168.1.42</span></div>',
    battery:
      '<h2>Battery</h2>' +
      '<div style="text-align:center;padding:18px"><div style="font-size:44px">🔋</div><div style="font-size:26px;font-weight:700;color:var(--text)">87%</div><div style="font-size:12px;color:var(--text2)">Power Source: Battery</div></div>' +
      '<div class="srow"><label>Low Power Mode</label><div class="tog" onclick="this.classList.toggle(\'on\')"></div></div>' +
      '<div class="srow"><label>Optimized Charging</label><div class="tog on" onclick="this.classList.toggle(\'on\')"></div></div>',
    about:
      '<h2>About This Mac</h2>' +
      '<div class="abm"><div style="font-size:56px">💻</div><h2>CloudOS</h2><div class="ver">Version 14.2.1</div><div class="specs">CloudChip M3 Pro<br>16 GB Unified Memory<br>512 GB SSD<br>Display: ' + screen.width + '×' + screen.height + '</div></div>'
  };
  s.innerHTML = panes[p] || '';
}
