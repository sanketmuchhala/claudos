/* ===== GLOBAL KEYBOARD SHORTCUTS =====
   Only shortcuts a browser delivers to the page are handled. Copy, paste,
   navigation, zoom, and ⌘W/⌘Q/⌘N stay with the browser. */
(function () {
  const OS = window.OS;

  function onKeyDown(event) {
    if (event.defaultPrevented || event.isComposing) return;
    if (Portfolio.shortcuts.isSearchShortcut(event)) {
      if (OS.isLocked()) return;
      event.preventDefault();
      if (!event.repeat) OS.spotlight.toggle();
      return;
    }
    if (event.key === 'Escape') {
      if (OS.notificationCenter.isOpen()) { OS.notificationCenter.close(); event.preventDefault(); return; }
      if (OS.launchpad.isOpen()) { OS.launchpad.close(); event.preventDefault(); return; }
      if (OS.wm.isDesktopShown()) { OS.wm.showDesktop(false); event.preventDefault(); }
      return;
    }
    // ⌃⌘Q locks the screen when the system lets the keys through.
    if (event.key.toLowerCase() === 'q' && event.ctrlKey && event.metaKey) { event.preventDefault(); OS.lock(); }
    // F11-style reveal: ⌘F3 / F11 shows the desktop.
    if (event.key === 'F11' && !event.metaKey && !event.ctrlKey) { event.preventDefault(); OS.wm.showDesktop(); }
  }

  OS.keyboard = { init: () => document.addEventListener('keydown', onKeyDown) };
})();
