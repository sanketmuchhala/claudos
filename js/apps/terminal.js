/* ===== TERMINAL =====
   The portfolio terminal from terminal.sanketmuchhala.com, one session per
   window. As on that site, closing the last Terminal window keeps the
   session: the Dock icon stays lit and brings it back. Quit ends it. */
(function () {
  const OS = window.OS;
  const sessions = new Map();
  let primaryId = null;
  const FOLDER = '<svg class="win-title-icon" viewBox="0 0 18 16" aria-hidden="true"><path d="M1 3h6l2 2h8v9H1Z" fill="#9aadb3"/><path d="M1 6h16v8H1Z" fill="#bfd1d6"/></svg>';

  const loadHistory = () => CloudStorage.get('terminal', { history: [] }).history || [];
  const saveHistory = list => CloudStorage.autoSave('terminal', { ...CloudStorage.get('terminal', {}), history: list.slice(-80) });

  function focusedSession() {
    const win = OS.wm.focused();
    if (win?.app === 'terminal') return sessions.get(win.id);
    const top = OS.wm.list('terminal')[0];
    return top ? sessions.get(top.id) : null;
  }

  function open(args = {}) {
    const primary = !primaryId;
    const win = OS.wm.create({
      app: 'terminal',
      title: 'sanket — ~ — portfolio',
      titleIcon: FOLDER,
      width: 1060, height: 680, minWidth: 360, minHeight: 240,
      className: 'terminal-win',
      content: '<div class="pterm"></div>',
      onFocusRequest: () => sessions.get(win.id)?.focus(),
      onClose: async closing => {
        const session = sessions.get(closing.id);
        if (session?.hasUnsavedEditor()) {
          const choice = await OS.dialog.ask({ title: 'Do you want to save the changes in the editor?', message: 'Your changes will be lost if you don’t save them.', buttons: ['Don’t Save', 'Cancel'], defaultButton: 'Cancel', win: closing });
          if (choice !== 'Don’t Save') return false;
        }
        if (!OS.apps.get('terminal').quitting && OS.wm.list('terminal').length === 1) {
          // Keep the session, like terminal.sanketmuchhala.com.
          const hide = () => OS.wm.hideApp('terminal');
          if (OS.util.motionOn()) closing.el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.96)' }], { duration: 150, easing: 'ease-in' }).onfinish = hide;
          else hide();
          return false;
        }
        session?.destroy();
        sessions.delete(closing.id);
        if (primaryId === closing.id) primaryId = null;
        return true;
      },
    });
    if (primary) primaryId = win.id;
    const session = Portfolio.session.createSession(win.body.querySelector('.pterm'), {
      uid: win.id,
      primary,
      initial: args.initial,
      loadHistory, saveHistory,
      getTheme: () => OS.theme.terminalTheme(),
      setTheme: theme => OS.settings.set('increaseContrast', theme === 'contrast'),
      getMotion: () => OS.theme.motion(),
      setMotion: value => OS.settings.set('reduceMotion', value === 'off'),
      setTitle: path => win.setTitle(`sanket — ${path} — portfolio`),
      openSearch: () => OS.spotlight.open(),
      isSearchOpen: () => OS.spotlight.isOpen(),
      openURL: url => OS.openURL(url),
      openFile: path => OS.fs.open(path),
      openFolder: path => OS.apps.launch('finder', { path, newWindow: true }),
      launch: id => OS.apps.launch(id),
      close: () => win.close(),
      confirm: options => OS.dialog.ask({ ...options, win, icon: 'images/icons/apps/terminal.png' }),
    });
    sessions.set(win.id, session);
    if (args.run) session.perform(args.run);
    requestAnimationFrame(() => session.focus());
    return win;
  }

  function run(command) {
    let session = focusedSession();
    if (!session || !OS.apps.isRunning('terminal')) {
      OS.apps.launch('terminal', { run: command });
      return;
    }
    OS.apps.activate('terminal');
    const win = OS.wm.list('terminal').find(w => sessions.get(w.id) === session);
    if (win) OS.wm.focus(win.id);
    session.perform(command);
    session.focus();
  }

  const act = command => () => { const s = focusedSession(); if (s) { s.perform(command); s.focus(); } else run(command); };

  OS.apps.register({
    id: 'terminal',
    name: 'Terminal',
    icon: 'images/icons/apps/terminal.png',
    keywords: ['shell', 'console', 'command', 'portfolio', 'zsh', 'cli'],
    version: '2.14',
    about: 'The portfolio shell from terminal.sanketmuchhala.com: browse projects as directories, inspect their details, and follow the skill graph. Your own files live in ~/Documents.',
    help: 'Type help for every command. Tab completes, ↑/↓ recall history, Esc closes suggestions. Try whoami, projects, inspect LexOrchestrator, graph python, or tour. The portfolio is read-only; Desktop, Documents, and Downloads are yours (mkdir, touch, echo > file, vim, cp, mv, rm).',
    settingsPane: 'accessibility',
    keepRunning: true,
    open,
    menus: () => [
      { title: 'Shell', items: [
        { label: 'New Window', shortcut: `${OS.util.mod}N`, action: () => open({ newWindow: true }) },
        '-',
        { label: 'Show Shell', action: act('shell') },
        { label: 'Browse Projects', action: act('projects') },
        { label: 'Skill Graph', action: act('graph') },
        '-',
        { label: 'Clear Scrollback', action: act('clear') },
        '-',
        { label: 'Close Window', shortcut: `${OS.util.mod}W`, action: () => OS.wm.focused()?.app === 'terminal' && OS.wm.focused().close() },
      ] },
      { title: 'Edit', items: [
        { label: 'Undo', shortcut: `${OS.util.mod}Z`, action: () => OS.menu.edit('undo') },
        { label: 'Redo', shortcut: `⇧${OS.util.mod}Z`, action: () => OS.menu.edit('redo') },
        '-',
        { label: 'Cut', shortcut: `${OS.util.mod}X`, action: () => OS.menu.edit('cut') },
        { label: 'Copy', shortcut: `${OS.util.mod}C`, action: () => OS.menu.edit('copy') },
        { label: 'Paste', shortcut: `${OS.util.mod}V`, action: () => OS.menu.edit('paste') },
        { label: 'Select All', shortcut: `${OS.util.mod}A`, action: () => OS.menu.edit('selectAll') },
        '-',
        { label: 'Find in Portfolio…', shortcut: Portfolio.shortcuts.searchShortcutHints().primary, action: () => OS.spotlight.open() },
        { label: 'Focus Command Line', action: () => focusedSession()?.focus() },
      ] },
      { title: 'View', items: [
        { label: 'Shell', action: act('shell') },
        { label: 'Projects', action: act('projects') },
        { label: 'Skill Graph', action: act('graph') },
        '-',
        { label: 'Increase Contrast', checked: !!OS.settings.get('increaseContrast'), action: () => OS.settings.toggle('increaseContrast') },
        { label: 'Reduce Motion', checked: !!OS.settings.get('reduceMotion'), action: () => OS.settings.toggle('reduceMotion') },
      ] },
      { title: 'Help', replace: false, items: [
        { label: 'Terminal Commands', action: act('help') },
        { label: 'Take a Tour', action: act('tour') },
      ] },
    ],
  });

  OS.terminal = {
    run,
    restoreFromUrl(search) { if (primaryId) sessions.get(primaryId)?.restoreFromUrl(search); },
    session: id => sessions.get(id),
  };
})();
