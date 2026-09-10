/* ===== LAUNCHPAD (app entry) =====
   Launchpad is an overlay, not a window, so it never shows as running. */
(function () {
  window.OS.apps.register({
    id: 'launchpad', name: 'Launchpad', icon: 'images/icons/apps/launchpad.png', launchpad: false, transient: true,
    keywords: ['apps', 'applications', 'all apps'],
    about: 'Every app on one screen.',
    open: () => window.OS.launchpad.toggle(),
  });
})();
