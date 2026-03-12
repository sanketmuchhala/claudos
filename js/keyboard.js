/* ===== KEYBOARD SHORTCUTS ===== */

document.addEventListener('keydown', function(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === ' ') {
    e.preventDefault();
    openSpo();
  }
  if (e.key === 'Escape') {
    closeSpo();
    hideCtx();
    if (ncOpen) toggleNC();
  }
});
