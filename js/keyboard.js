/* ===== KEYBOARD SHORTCUTS ===== */

document.addEventListener('keydown', function(e) {
  // Cmd+Space or Ctrl+Space for Spotlight
  if ((e.metaKey || e.ctrlKey) && e.key === ' ') {
    e.preventDefault();
    openSpo();
  }

  // Cmd+Tab for App Switcher
  if (e.metaKey && e.key === 'Tab') {
    e.preventDefault();
    if (!appSwitcher.open) {
      openAppSwitcher();
    } else {
      cycleSwitcher(e.shiftKey ? -1 : 1);
    }
  }

  // Escape key
  if (e.key === 'Escape') {
    closeSpo();
    hideCtx();
    if (ncOpen) toggleNC();

    // Close app switcher if open
    if (appSwitcher.open) {
      closeAppSwitcher();
    }
  }
});

// Handle Cmd key release for app switcher
document.addEventListener('keyup', function(e) {
  if (e.key === 'Meta' && appSwitcher.open) {
    closeAppSwitcher();
  }
});
