/* ===== STOCKS ===== */

function openStocks() {
  var rows = stocks.map(function(s) {
    var up = parseFloat(s.c) >= 0;
    var pts = '';
    for (var i = 0; i < 8; i++) {
      pts += (i * 7) + ',' + (12 + Math.random() * 14);
      if (i < 7) pts += ' ';
    }
    return '<div class="stk">' +
      '<div class="stki"><div class="stks">' + s.s + '</div><div class="stkn">' + s.n + '</div></div>' +
      '<svg width="50" height="26" viewBox="0 0 49 26"><polyline points="' + pts + '" fill="none" stroke="' + (up ? '#34C759' : '#FF3B30') + '" stroke-width="1.5"/></svg>' +
      '<div style="text-align:right"><div class="stkp">$' + s.p + '</div><div class="stkc ' + (up ? 'up' : 'dn') + '">' + s.c + ' (' + s.pct + '%)</div></div>' +
    '</div>';
  }).join('');

  mkWin('stocks', 'Stocks', 400, 480, '<div style="padding:6px">' + rows + '</div>');
}
