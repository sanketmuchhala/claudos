/* ===== VIEWPORT SCALING =====
 *
 * Scales the entire OS to fit any viewport while maintaining
 * a pixel-perfect macOS appearance. For viewports smaller than
 * the reference width, the OS renders at the reference size
 * and uses CSS transform to scale down.
 *
 * This ensures the OS looks identical at all sizes — desktop,
 * tablet, and mobile — just proportionally smaller.
 *
 * Pointer events are adjusted in window-manager.js via getOSScale().
 */

const OS_BASE_WIDTH = 900;

function getOSScale() {
  const root = document.getElementById('os-root');
  if (!root) return 1;
  const transform = getComputedStyle(root).transform;
  if (!transform || transform === 'none') return 1;
  const match = transform.match(/matrix\(([^,]+)/);
  return match ? parseFloat(match[1]) : 1;
}

function scaleOS() {
  const root = document.getElementById('os-root');
  if (!root) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (vw < OS_BASE_WIDTH) {
    const scale = vw / OS_BASE_WIDTH;
    root.style.width = OS_BASE_WIDTH + 'px';
    root.style.height = Math.round(vh / scale) + 'px';
    root.style.transform = 'scale(' + scale + ')';
    root.style.transformOrigin = '0 0';
  } else {
    root.style.width = '100vw';
    root.style.height = '100vh';
    root.style.transform = 'none';
  }
}

window.addEventListener('resize', scaleOS);
scaleOS();
