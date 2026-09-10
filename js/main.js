/* ===== BOOT =====
   Starts the system services, then shows the lock screen. After unlocking,
   the portfolio Terminal opens like it does on terminal.sanketmuchhala.com.
   Links such as ?view=graph&topic=python, ?project=LexOrchestrator, or
   ?app=notes skip the lock screen and open straight to that view. */
(function () {
  const OS = window.OS;
  const params = new URLSearchParams(window.location.search);
  const deepLinkApp = params.get('app') && OS.apps.get(params.get('app')) ? params.get('app') : null;
  const deepLinkView = Portfolio.session.hasViewParams(window.location.search);

  OS.wm.init();
  OS.dock.init();
  OS.menubar.init();
  OS.notificationCenter.init();
  OS.desktop.init();
  OS.appSwitcher.init();
  OS.keyboard.init();
  OS.lockscreen.init();

  let started = false;
  OS.startSession = () => {
    if (deepLinkApp && !started) OS.apps.launch(deepLinkApp);
    if (deepLinkView) {
      OS.apps.launch('terminal', started ? {} : { initial: Portfolio.session.readViewUrl(window.location.search), primary: true });
    } else if (!deepLinkApp && !started && OS.settings.get('openTerminalAtLogin')) {
      OS.apps.launch('terminal', { primary: true });
    }
    started = true;
  };

  if (OS.settings.get('requirePassword') && !deepLinkApp && !deepLinkView) OS.lock({ onUnlock: OS.startSession, boot: true });
  else OS.startSession();

  window.addEventListener('popstate', () => OS.terminal?.restoreFromUrl(window.location.search));
  window.addEventListener('cloudstorage:error', event => {
    OS.notify({ app: 'settings', title: event.detail.quota ? 'Storage is full' : 'Couldn’t save changes', message: event.detail.quota ? 'Delete some photos or files, or reset CloudOS in System Settings ▸ General.' : 'This browser is blocking storage, so changes last only for this visit.' });
  });
  document.documentElement.classList.add('is-ready');
})();
