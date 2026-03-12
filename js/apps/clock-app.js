/* ===== CLOCK APP ===== */

function openClk() {
  var numbers = '';
  for (var i = 0; i < 12; i++) {
    var a = (i + 1) * 30;
    var r = 82;
    var x = 100 + r * Math.sin(a * Math.PI / 180) - 6;
    var y = 100 - r * Math.cos(a * Math.PI / 180) - 7;
    numbers += '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;font-size:12px;font-weight:600;color:rgba(255,255,255,.6)">' + (i + 1) + '</div>';
  }

  mkWin('clock', 'Clock', 280, 360,
    '<div class="clockc">' +
      '<div class="cface">' +
        numbers +
        '<div class="chand ch" id="chh"></div>' +
        '<div class="chand cmm" id="chm"></div>' +
        '<div class="chand cs" id="chs"></div>' +
        '<div class="ccenter"></div>' +
      '</div>' +
      '<div class="cdig" id="cdig"></div>' +
      '<div class="cdate" id="cdlbl"></div>' +
    '</div>',
    {
      bs: 'padding:0;overflow:hidden',
      init: function() { updClk(); }
    }
  );
}

function updClk() {
  var n = new Date();
  var h = n.getHours() % 12;
  var m = n.getMinutes();
  var s = n.getSeconds();
  var ms = n.getMilliseconds();
  var ha = (h + m / 60) * 30;
  var ma = (m + s / 60) * 6;
  var sa = (s + ms / 1000) * 6;

  var eh = document.getElementById('chh');
  var em = document.getElementById('chm');
  var es = document.getElementById('chs');
  var ed = document.getElementById('cdig');
  var el = document.getElementById('cdlbl');

  if (eh) eh.style.transform = 'rotate(' + ha + 'deg)';
  if (em) em.style.transform = 'rotate(' + ma + 'deg)';
  if (es) es.style.transform = 'rotate(' + sa + 'deg)';
  if (ed) ed.textContent = n.toLocaleTimeString('en-US', { hour12: true });
  if (el) el.textContent = n.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  requestAnimationFrame(updClk);
}
