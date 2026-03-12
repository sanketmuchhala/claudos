/* ===== SPOTLIGHT SEARCH ===== */

var spoApps = [
  { i: '📁', n: 'Finder', a: 'finder' },
  { i: '🧭', n: 'Safari', a: 'safari' },
  { i: '⬛', n: 'Terminal', a: 'terminal' },
  { i: '🧮', n: 'Calculator', a: 'calc' },
  { i: '📝', n: 'Notes', a: 'notes' },
  { i: '🎵', n: 'Music', a: 'music' },
  { i: '📅', n: 'Calendar', a: 'calendar' },
  { i: '🌤️', n: 'Weather', a: 'weather' },
  { i: '🕐', n: 'Clock', a: 'clock' },
  { i: '📈', n: 'Stocks', a: 'stocks' },
  { i: '⚙️', n: 'System Settings', a: 'settings' },
  { i: '📄', n: 'TextEdit', a: 'textedit' },
  { i: '📸', n: 'Photo Booth', a: 'camera' },
  { i: '🖼️', n: 'Photos', a: 'photos' },
  { i: '✅', n: 'Reminders', a: 'todo' },
  { i: 'ℹ️', n: 'About This Mac', a: 'about' }
];

function openSpo() {
  document.getElementById('spo').style.display = 'block';
  var inp = document.getElementById('spoinput');
  inp.value = '';
  inp.focus();
  updSpo('');
}

function closeSpo() {
  document.getElementById('spo').style.display = 'none';
}

function updSpo(q) {
  var r = document.getElementById('spores');
  var f = spoApps.filter(function(a) {
    return a.n.toLowerCase().includes(q.toLowerCase());
  });
  r.innerHTML = f.slice(0, 8).map(function(a, i) {
    return '<div class="sr ' + (i === 0 ? 'sel' : '') + '" onclick="openApp(\'' + a.a + '\');closeSpo()">' +
      '<span class="sr-icon">' + a.i + '</span>' +
      '<div><div class="sr-text">' + a.n + '</div></div>' +
    '</div>';
  }).join('');
}

document.getElementById('spoinput').addEventListener('input', function(e) {
  updSpo(e.target.value);
});

document.getElementById('spoinput').addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeSpo();
  if (e.key === 'Enter') {
    var s = document.querySelector('.sr.sel');
    if (s) s.click();
  }
});
