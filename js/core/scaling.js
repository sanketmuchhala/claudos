/* ===== VIEWPORT SCALING =====
 *
 * Enforces a fixed 16:10 MacBook aspect ratio (1280x800) when the ?mode=mac 
 * or ?embed=true URL parameter is present. This is designed for embedding 
 * the OS in iframe mockups on portfolio websites.
 *
 * It uses CSS transforms to perfectly scale and letterbox the OS to fit 
 * within the parent container's dimensions without breaking the UI.
 */
(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const isMacMode = urlParams.has('mode') && urlParams.get('mode') === 'mac' || urlParams.has('embed');

  if (!isMacMode) return;

  const MAC_WIDTH = 1280;
  const MAC_HEIGHT = 800;

  function scaleOS() {
    const os = document.getElementById('os');
    if (!os) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Calculate scale to fit exactly within the viewport
    const scale = Math.min(vw / MAC_WIDTH, vh / MAC_HEIGHT);

    // Apply fixed dimensions and centered scale
    os.style.width = `${MAC_WIDTH}px`;
    os.style.height = `${MAC_HEIGHT}px`;
    os.style.position = 'fixed';
    os.style.left = '50%';
    os.style.top = '50%';
    os.style.transform = `translate(-50%, -50%) scale(${scale})`;
    os.style.transformOrigin = 'center center';
  }

  window.addEventListener('resize', scaleOS);
  // Run once immediately, and again on DOMContentLoaded just in case
  scaleOS();
  document.addEventListener('DOMContentLoaded', scaleOS);
})();
