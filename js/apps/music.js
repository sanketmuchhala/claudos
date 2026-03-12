/* ===== MUSIC ===== */

function openMusic() {
  mkWin('music', 'Music', 360, 550,
    '<div class="mplayer">' +
      '<div class="mart" id="mart">🎵</div>' +
      '<div class="minfo"><div class="mt" id="mtitle">' + playlist[0].t + '</div><div class="ma" id="martist">' + playlist[0].a + '</div></div>' +
      '<div style="padding:0 28px">' +
        '<div class="mbar"><div class="mfill" id="mfill"></div></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;opacity:.5"><span>1:24</span><span>' + playlist[0].d + '</span></div>' +
      '</div>' +
      '<div class="mctrl">' +
        '<button class="mbtn" onclick="prevTrk()">⏮</button>' +
        '<button class="mbtn play" id="playbtn" onclick="togPlay()">▶</button>' +
        '<button class="mbtn" onclick="nextTrk()">⏭</button>' +
      '</div>' +
      '<div style="flex:1;overflow-y:auto;padding:0 14px 14px">' +
        playlist.map(function(t, i) {
          return '<div class="pli ' + (i === 0 ? 'active' : '') + '" onclick="selTrk(' + i + ')">' +
            '<span style="font-size:11px;opacity:.4;width:18px">' + (i + 1) + '</span>' +
            '<span style="font-size:12px;flex:1">' + t.t + '<br><span style="opacity:.5;font-size:10px">' + t.a + '</span></span>' +
            '<span style="font-size:11px;opacity:.4">' + t.d + '</span>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>',
    { bs: 'padding:0;overflow:hidden' }
  );
}

function togPlay() {
  playing = !playing;
  var b = document.getElementById('playbtn');
  var a = document.getElementById('mart');
  if (b) b.textContent = playing ? '⏸' : '▶';
  if (a) a.classList.toggle('playing', playing);
}

function selTrk(i) {
  curTrack = i;
  document.getElementById('mtitle').textContent = playlist[i].t;
  document.getElementById('martist').textContent = playlist[i].a;
  document.querySelectorAll('.pli').forEach(function(e, j) {
    e.classList.toggle('active', j === i);
  });
}

function nextTrk() { selTrk((curTrack + 1) % playlist.length); }
function prevTrk() { selTrk((curTrack - 1 + playlist.length) % playlist.length); }
