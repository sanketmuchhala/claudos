/* ===== PHOTOS ===== */

function openPhotos() {
  var colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F1948A', '#82E0AA', '#F8C471', '#AED6F1', '#D7BDE2', '#A3E4D7'];

  var grid = colors.map(function(c, i) {
    return '<div class="gitem" style="background:linear-gradient(' + (45 + i * 22) + 'deg,' + c + ',' + colors[(i + 5) % colors.length] + ')"></div>';
  }).join('');

  mkWin('photos', 'Photos', 540, 430,
    '<div style="padding:10px;border-bottom:1px solid var(--border);display:flex;gap:14px">' +
      '<span style="font-size:13px;font-weight:600;color:var(--accent);cursor:pointer">All Photos</span>' +
      '<span style="font-size:13px;color:var(--text2);cursor:pointer">Favorites</span>' +
      '<span style="font-size:13px;color:var(--text2);cursor:pointer">Albums</span>' +
    '</div>' +
    '<div class="ggrid">' + grid + '</div>'
  );
}
