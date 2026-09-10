/* Platform-aware Spotlight bindings, ported from terminal.sanketmuchhala.com
   (src/terminal/shortcuts.ts). Only shortcuts delivered to the page are
   handled; macOS Spotlight or an input method may consume them first. */
(function () {
  const isMacPlatform = platform => /Mac|iPhone|iPad|iPod/i.test(platform);

  function isSearchShortcut(event, platform = navigator.platform) {
    if (event.isComposing || event.keyCode === 229 || event.altKey || event.shiftKey || (event.metaKey && event.ctrlKey)) return false;
    if (event.key.toLowerCase() === 'k') return event.metaKey || event.ctrlKey;
    if (event.key !== ' ' && event.code !== 'Space') return false;
    return isMacPlatform(platform) ? event.metaKey : event.ctrlKey;
  }

  function searchShortcutHints(platform = navigator.platform) {
    return isMacPlatform(platform)
      ? { primary: '⌘ Space', fallback: '⌘ K', aria: 'Meta+Space Meta+K Control+K' }
      : { primary: 'Ctrl Space', fallback: 'Ctrl K', aria: 'Control+Space Control+K Meta+K' };
  }

  window.Portfolio.shortcuts = { isMacPlatform, isSearchShortcut, searchShortcutHints };
})();
