/* ===== SAFARI =====
   A start page of favorites, an address bar, back/forward history, reload,
   and sharing. Sites that refuse to be framed (GitHub, LinkedIn, LeetCode…)
   get a page explaining why, with a button to open them in a real tab. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  const safaris = new Map();

  const link = id => Portfolio.link(id)?.url;
  const FAVORITES = [
    { title: 'Portfolio', url: link('portfolio') || 'https://sanketmuchhala.com/', color: '#2f6f5a' },
    { title: 'Projects', url: link('projects') || 'https://sanketmuchhala.com/projects/', color: '#3a5a8c' },
    { title: 'Skill Map', url: link('skill-map') || 'https://sanketmuchhala.com/skill-map/', color: '#7a4b9c' },
    { title: 'Résumé', url: link('resume') || 'https://sanketmuchhala.com/resume/', color: '#9c5b2e' },
    { title: 'Terminal', url: 'https://terminal.sanketmuchhala.com/', color: '#1e1e1e' },
    { title: 'GitHub', url: link('github') || 'https://github.com/sanketmuchhala', color: '#24292f' },
    { title: 'LinkedIn', url: link('linkedin') || 'https://www.linkedin.com/in/sanketmuchhala/', color: '#0a66c2' },
    { title: 'LeetCode', url: 'https://leetcode.com/u/sanketmuchhala/', color: '#e89a1a' },
    { title: 'Wikipedia', url: 'https://en.wikipedia.org/', color: '#5b5b5b' },
  ];
  const hostOf = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

  function normalize(input) {
    const value = input.trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return OS.util.safeUrl(value.replace(/^http:/i, 'https:'));
    if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(value) && !/\s/.test(value)) return OS.util.safeUrl(`https://${value}`);
    return `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(value)}`;
  }

  function startPage() {
    const projects = Portfolio.data.projects.filter(p => p.demo).slice(0, 6);
    return `<div class="safari-start-inner">
      <h2>Favorites</h2>
      <div class="safari-favs">${FAVORITES.map(f => `<button type="button" class="safari-fav" data-go="${esc(f.url)}"><span class="safari-tile" style="--tile:${f.color}">${esc(f.title[0])}</span><span>${esc(f.title)}</span></button>`).join('')}</div>
      <h2>Live project demos</h2>
      <div class="safari-cards">${projects.map(p => `<button type="button" class="safari-card" data-go="${esc(p.demo)}"><strong>${esc(p.name)}</strong><span>${esc(p.description)}</span><small>${esc(hostOf(p.demo))}</small></button>`).join('')}</div>
      <p class="safari-note">Some sites don’t allow themselves to be shown inside another page. Safari opens those in a new browser tab.</p>
    </div>`;
  }

  function create(args = {}) {
    const state = { history: [], index: -1 };
    const win = OS.wm.create({
      app: 'safari', title: 'Start Page', chrome: 'toolbar', width: 1000, height: 640, minWidth: 420, minHeight: 300, className: 'safari-win', lightsTop: 19, lightsLeft: 18,
      content: `<div class="safari">
        <header class="toolbar safari-toolbar" data-drag>
          <div class="toolbar-group safari-nav"><button type="button" class="tb-btn" data-nav="back" aria-label="Back">‹</button><button type="button" class="tb-btn" data-nav="forward" aria-label="Forward">›</button></div>
          <div class="toolbar-flex" data-drag></div>
          <form class="safari-address" data-form><svg class="safari-lock" viewBox="0 0 12 14" aria-hidden="true"><rect x="1.5" y="6" width="9" height="7" rx="1.6" fill="currentColor"/><path d="M3.5 6V4.3a2.5 2.5 0 0 1 5 0V6" fill="none" stroke="currentColor" stroke-width="1.4"/></svg><input type="text" data-address aria-label="Address and search" placeholder="Search or enter website name" spellcheck="false" autocomplete="off" /><button type="button" class="safari-reload" data-reload aria-label="Reload page"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v3.2H9.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button></form>
          <div class="toolbar-flex" data-drag></div>
          <div class="toolbar-group"><button type="button" class="tb-btn" data-share aria-label="Copy link" title="Copy link"><svg viewBox="0 0 16 18" aria-hidden="true"><path d="M8 11V1.8M4.8 4.6 8 1.5l3.2 3.1M5 7.5H3.5v8.5h9V7.5H11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button type="button" class="tb-btn" data-external aria-label="Open in a new browser tab" title="Open in a new browser tab"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5M12 10v3.5H2.5V4H6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button type="button" class="tb-btn" data-home aria-label="Start Page" title="Start Page"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h5v5H2Zm7 0h5v5H9ZM2 9h5v5H2Zm7 0h5v5H9Z" fill="none" stroke="currentColor" stroke-width="1.3"/></svg></button></div>
        </header>
        <div class="safari-view">
          <div class="safari-start" data-start>${startPage()}</div>
          <iframe data-frame title="Web page" hidden sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen; clipboard-write"></iframe>
          <div class="safari-blocked" data-blocked hidden></div>
          <div class="safari-progress" data-progress></div>
        </div>
      </div>`,
      onFocusRequest: () => { if (state.index < 0) win.body.querySelector('[data-address]').focus(); },
      onClose: () => { safaris.delete(win.id); return true; },
    });
    const $ = selector => win.body.querySelector(selector);
    const frame = $('[data-frame]');
    const address = $('[data-address]');
    const progress = $('[data-progress]');

    function show(url) {
      const start = $('[data-start]');
      const blocked = $('[data-blocked]');
      progress.classList.remove('is-loading');
      if (!url) {
        start.hidden = false; frame.hidden = true; blocked.hidden = true;
        frame.removeAttribute('src');
        address.value = '';
        win.setTitle('Start Page');
      } else if (OS.isFrameBlocked(hostOf(url))) {
        start.hidden = true; frame.hidden = true; blocked.hidden = false;
        frame.removeAttribute('src');
        blocked.innerHTML = `<div class="safari-blocked-inner"><img src="images/icons/apps/safari.png" alt="" /><h2>Safari can’t show “${esc(hostOf(url))}” here</h2><p>This website doesn’t allow itself to be displayed inside another page, so it has to open in its own browser tab.</p><button type="button" class="push-button is-default" data-open-tab="${esc(url)}">Open in New Tab ↗</button></div>`;
        address.value = url;
        win.setTitle(hostOf(url));
      } else {
        start.hidden = true; blocked.hidden = true; frame.hidden = false;
        if (frame.getAttribute('src') !== url) {
          progress.classList.add('is-loading');
          frame.src = url;
        }
        address.value = url;
        win.setTitle(hostOf(url));
      }
      $('[data-nav="back"]').disabled = state.index <= 0 && !(state.index === 0 && state.history[0]);
      $('[data-nav="forward"]').disabled = state.index >= state.history.length - 1;
    }

    function navigate(url) {
      state.history = state.history.slice(0, state.index + 1);
      state.history.push(url);
      state.index = state.history.length - 1;
      show(url);
    }
    function back() {
      if (state.index > 0) { state.index--; show(state.history[state.index]); }
      else if (state.index === 0) { state.index = -1; show(null); }
    }
    function forward() {
      if (state.index < state.history.length - 1) { state.index++; show(state.history[state.index]); }
    }
    const currentUrl = () => (state.index >= 0 ? state.history[state.index] : null);

    frame.addEventListener('load', () => progress.classList.remove('is-loading'));
    $('[data-form]').addEventListener('submit', event => {
      event.preventDefault();
      const url = normalize(address.value);
      if (url) { navigate(url); address.blur(); }
    });
    address.addEventListener('focus', () => address.select());
    win.body.addEventListener('click', event => {
      const t = event.target;
      const go = t.closest('[data-go]');
      if (go) {
        if (OS.isFrameBlocked(hostOf(go.dataset.go))) window.open(go.dataset.go, '_blank', 'noopener,noreferrer');
        else navigate(go.dataset.go);
        return;
      }
      const nav = t.closest('[data-nav]');
      if (nav) { if (nav.dataset.nav === 'back') back(); else forward(); return; }
      if (t.closest('[data-reload]')) { const url = currentUrl(); if (url && !frame.hidden) { progress.classList.add('is-loading'); frame.src = 'about:blank'; setTimeout(() => { frame.src = url; }, 30); } return; }
      if (t.closest('[data-home]')) { navigateStart(); return; }
      if (t.closest('[data-external]')) { window.open(currentUrl() || link('portfolio'), '_blank', 'noopener,noreferrer'); return; }
      const tab = t.closest('[data-open-tab]');
      if (tab) { window.open(tab.dataset.openTab, '_blank', 'noopener,noreferrer'); return; }
      if (t.closest('[data-share]')) {
        const url = currentUrl();
        if (url) navigator.clipboard?.writeText(url).then(() => OS.notify({ app: 'safari', title: 'Link copied', message: url })).catch(() => {});
      }
    });
    function navigateStart() {
      state.history = state.history.slice(0, state.index + 1);
      state.index = -1;
      show(null);
    }

    safaris.set(win.id, { navigate, back, forward, reload: () => $('[data-reload]').click(), focusAddress: () => { address.focus(); address.select(); }, navigateStart, currentUrl, state });
    if (args.url) navigate(args.url); else show(null);
    return win;
  }

  const current = () => { const win = OS.wm.focused(); return win?.app === 'safari' ? safaris.get(win.id) : null; };

  OS.apps.register({
    id: 'safari',
    name: 'Safari',
    icon: 'images/icons/apps/safari.png',
    keywords: ['web', 'browser', 'internet', 'portfolio', 'website'],
    version: '18.0',
    about: 'Browse Sanket’s portfolio, skill map, résumé, and live project demos without leaving CloudOS.',
    help: 'Type an address or a search in the address bar. Sites that don’t allow framing, like GitHub and LinkedIn, open in a new browser tab. The ↗ button opens the current page in a real tab.',
    open(args = {}) {
      if (args.url && !args.newWindow) {
        const target = current() || [...safaris.values()][0];
        if (target) {
          const win = OS.wm.list('safari').find(w => safaris.get(w.id) === target);
          if (win) { OS.wm.focus(win.id); target.navigate(args.url); return win; }
        }
      }
      if (!args.newWindow && !args.url && OS.wm.list('safari').length) { const win = OS.wm.list('safari')[0]; OS.wm.focus(win.id); return win; }
      return create(args);
    },
    menus: ({ win }) => {
      const s = win && safaris.get(win.id);
      return [
        { title: 'File', items: [
          { label: 'New Window', shortcut: `${OS.util.mod}N`, action: () => create({}) },
          { label: 'Open Location…', shortcut: `${OS.util.mod}L`, disabled: !s, action: () => s?.focusAddress() },
          { label: 'Open in New Browser Tab', disabled: !s?.currentUrl(), action: () => window.open(s.currentUrl(), '_blank', 'noopener,noreferrer') },
          '-',
          { label: 'Close Window', shortcut: `${OS.util.mod}W`, disabled: !win, action: () => win?.close() },
        ] },
        { title: 'View', items: [
          { label: 'Reload Page', shortcut: `${OS.util.mod}R`, disabled: !s?.currentUrl(), action: () => s?.reload() },
          { label: 'Show Start Page', disabled: !s, action: () => s?.navigateStart() },
          '-',
          document.fullscreenElement ? { label: 'Exit Full Screen', action: () => document.exitFullscreen?.() } : { label: 'Enter Full Screen', action: () => document.documentElement.requestFullscreen?.().catch(() => {}) },
        ] },
        { title: 'History', items: [
          { label: 'Back', shortcut: `${OS.util.mod}[`, disabled: !s || s.state.index < 0, action: () => s?.back() },
          { label: 'Forward', shortcut: `${OS.util.mod}]`, disabled: !s || s.state.index >= s.state.history.length - 1, action: () => s?.forward() },
          { label: 'Home', action: () => (s ? s.navigate(link('portfolio')) : create({ url: link('portfolio') })) },
          '-',
          { header: true, label: 'Recently Visited' },
          ...(s?.state.history.length ? [...new Set(s.state.history)].slice(-8).reverse().map(url => ({ label: hostOf(url), action: () => s.navigate(url) })) : [{ label: 'No history yet', disabled: true }]),
        ] },
        { title: 'Bookmarks', items: FAVORITES.map(f => ({ label: f.title, action: () => (s ? s.navigate(f.url) : OS.openURL(f.url)) })) },
      ];
    },
  });
})();
