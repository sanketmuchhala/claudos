/* ===== ABOUT THIS MAC ===== */

function openAbout() {
  mkWin('about', 'About This Mac', 380, 320,
    '<div class="abm">' +
      '<div style="font-size:56px">💻</div>' +
      '<h2>CloudOS</h2>' +
      '<div class="ver">Version 14.2.1 (23C71)</div>' +
      '<div class="specs">' +
        'CloudChip M3 Pro<br>' +
        '16 GB Unified Memory<br>' +
        '512 GB SSD Storage<br>' +
        'Serial: CLD-2024-PRO-X1<br>' +
        'Display: ' + screen.width + ' × ' + screen.height + '<br>' +
        'Graphics: CloudGPU 18-core' +
      '</div>' +
    '</div>'
  );
}
