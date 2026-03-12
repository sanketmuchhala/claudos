/* ===== PHOTO BOOTH / CAMERA ===== */

function openCam() {
  mkWin('camera', 'Photo Booth', 480, 380,
    '<div style="display:flex;flex-direction:column;height:100%;background:#1a1a1a">' +
      '<div style="flex:1;display:flex;align-items:center;justify-content:center">' +
        '<video id="pbv" autoplay playsinline style="max-width:100%;max-height:100%;transform:scaleX(-1);border-radius:4px"></video>' +
      '</div>' +
      '<div style="padding:14px;display:flex;justify-content:center">' +
        '<div style="width:52px;height:52px;border-radius:50%;border:3px solid #fff;background:rgba(255,255,255,0.2);cursor:pointer" onclick="capture()"></div>' +
      '</div>' +
    '</div>',
    {
      bs: 'padding:0;overflow:hidden',
      init: function() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ video: true }).then(function(s) {
            var v = document.getElementById('pbv');
            if (v) v.srcObject = s;
          }).catch(function() {
            var vf = document.querySelector('#pbv');
            if (vf && vf.parentElement) {
              vf.parentElement.innerHTML = '<div style="color:#fff;font-size:13px;text-align:center;padding:36px">📸 Camera access required<br><span style="opacity:.4;font-size:11px">Allow camera to use Photo Booth</span></div>';
            }
          });
        }
      }
    }
  );
}

function capture() {
  var v = document.getElementById('pbv');
  if (!v) return;
  v.parentElement.style.background = '#fff';
  setTimeout(function() { v.parentElement.style.background = ''; }, 150);
}
