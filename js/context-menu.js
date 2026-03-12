/* ===== CONTEXT MENU & WALLPAPER ===== */

document.getElementById('desktop').addEventListener('contextmenu', function(e) {
  e.preventDefault();
  var m = document.getElementById('ctx');
  var scale = getOSScale();
  m.innerHTML =
    '<div class="ci" onclick="openApp(\'finder\');hideCtx()">New Finder Window</div>' +
    '<div class="ci" onclick="hideCtx()">Get Info</div>' +
    '<div class="csep"></div>' +
    '<div class="ci" onclick="chWall();hideCtx()">Change Wallpaper</div>' +
    '<div class="csep"></div>' +
    '<div class="ci" onclick="openApp(\'settings\');hideCtx()">System Settings</div>' +
    '<div class="ci" onclick="openApp(\'about\');hideCtx()">About This Mac</div>';
  m.style.cssText = 'display:block;left:' + (e.clientX / scale) + 'px;top:' + (e.clientY / scale) + 'px';
});

function hideCtx() {
  document.getElementById('ctx').style.display = 'none';
}

document.addEventListener('click', hideCtx);

function chWall() {
  wallIdx = (wallIdx + 1) % walls.length;
  document.getElementById('desktop').style.background = walls[wallIdx];
}
