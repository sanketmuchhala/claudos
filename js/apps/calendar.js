/* ===== CALENDAR ===== */

function openCal() {
  mkWin('calendar', 'Calendar', 320, 360, getCalHtml());
}

function getCalHtml() {
  var d = calDate;
  var mo = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  var fd = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  var dm = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  var td = new Date();

  var g = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(function(n) {
    return '<div class="cdn">' + n + '</div>';
  }).join('');

  var pm = new Date(d.getFullYear(), d.getMonth(), 0).getDate();
  for (var i = fd - 1; i >= 0; i--) {
    g += '<div class="cd om">' + (pm - i) + '</div>';
  }
  for (var i = 1; i <= dm; i++) {
    var it = i === td.getDate() && d.getMonth() === td.getMonth() && d.getFullYear() === td.getFullYear();
    g += '<div class="cd ' + (it ? 'today' : '') + '">' + i + '</div>';
  }
  var rem = 42 - (fd + dm);
  for (var i = 1; i <= rem; i++) {
    g += '<div class="cd om">' + i + '</div>';
  }

  return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border)">' +
    '<button style="border:1px solid var(--border);border-radius:6px;padding:3px 9px;cursor:pointer;background:#fff;font-size:13px" onclick="chMo(-1)">◀</button>' +
    '<h3 style="font-size:16px;font-weight:700;color:var(--text)">' + mo + '</h3>' +
    '<button style="border:1px solid var(--border);border-radius:6px;padding:3px 9px;cursor:pointer;background:#fff;font-size:13px" onclick="chMo(1)">▶</button>' +
  '</div>' +
  '<div class="calgrid">' + g + '</div>';
}

function chMo(dir) {
  calDate.setMonth(calDate.getMonth() + dir);
  document.querySelectorAll('.win').forEach(function(w) {
    if (w.dataset.app === 'calendar') {
      w.querySelector('.wbody').innerHTML = getCalHtml();
    }
  });
}
