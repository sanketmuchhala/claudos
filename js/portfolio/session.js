/* Portfolio terminal session, ported from terminal.sanketmuchhala.com
   (src/main.ts and src/terminal/state.ts). One session runs inside each
   Terminal window. CloudOS owns the desktop, Dock, menus, and Spotlight; the
   session renders the workspace and asks the OS (through `api`) to open
   URLs, files, and apps. */
(function () {
  const P = window.Portfolio;
  const { executeCommand, complete } = P.commands;
  const { renderResult, welcome, escapeText: esc } = P.render;
  const { mountExplorer, renderInspector } = P.projects;
  const { matchProject, matchEntity } = P.adapter;

  /* ---------- State (src/terminal/state.ts) ---------- */
  function createState() {
    return { cwd: '/', input: '', draft: '', history: [], historyCursor: 0, transcript: [], activeView: 'shell', overlay: 'none', theme: 'forest', maximized: false };
  }
  /** View transitions never discard the input draft, transcript, or directory. */
  function applyAction(state, action) {
    if (!action) return state;
    switch (action.type) {
      case 'directory': return { ...state, cwd: action.path, activeView: 'shell', selectedProject: undefined };
      case 'inspect': return { ...state, selectedProject: matchProject(action.id)?.id, overlay: 'none' };
      case 'projects': return { ...state, activeView: 'projects', selectedProject: undefined, overlay: 'none' };
      case 'graph': return { ...state, activeView: 'graph', graphTopic: action.id, selectedProject: undefined, overlay: 'none' };
      case 'shell': return { ...state, activeView: 'shell', selectedProject: undefined, overlay: 'none' };
      case 'clear': return { ...state, transcript: [], activeView: 'shell', selectedProject: undefined };
      case 'theme': return { ...state, theme: action.theme };
      default: return state;
    }
  }
  function readViewUrl(search) {
    const params = new URLSearchParams(search);
    const project = params.get('project');
    const topic = params.get('topic');
    const entity = topic ? matchEntity(topic) : undefined;
    const view = params.get('view');
    return { activeView: view === 'graph' && (!topic || entity) ? 'graph' : view === 'projects' ? 'projects' : 'shell', selectedProject: project ? matchProject(project)?.id : undefined, graphTopic: entity?.id };
  }
  function writeViewUrl(state, search = '') {
    const params = new URLSearchParams(search);
    ['view', 'topic', 'project'].forEach(key => params.delete(key));
    if (state.activeView !== 'shell') params.set('view', state.activeView);
    if (state.activeView === 'graph' && state.graphTopic) params.set('topic', state.graphTopic);
    if (state.selectedProject) params.set('project', state.selectedProject);
    const query = params.toString();
    return query ? `?${query}` : '';
  }
  const hasViewParams = search => ['view', 'topic', 'project'].some(key => new URLSearchParams(search).has(key));

  /* ---------- Session (src/main.ts) ---------- */
  function createSession(host, api) {
    const uid = api.uid;
    let state = { ...createState(), ...(api.initial || {}) };
    state.history = api.loadHistory();
    state.historyCursor = state.history.length;
    state.theme = api.getTheme();
    let sequence = 0;
    let completionIndex = 0;
    let completions = [];
    let viewCleanup;
    let inspectorCleanup;
    let viewVersion = 0;
    let initiator = null;
    let tourStep = -1;
    let copiedTimer;
    let inspectorShellScroll = 0;
    let editor = null;
    let wasNarrow = false;
    const hints = P.shortcuts.searchShortcutHints();

    host.innerHTML = `<div class="pterm-root">
      <div class="tour-bar" data-tour hidden></div>
      <div class="workspace"><div class="main-column">
        <nav class="workspace-tabs" aria-label="Workspace views"><button data-command="shell" data-view-tab="shell" aria-current="page"><span>❯</span> Shell</button><button data-command="projects" data-view-tab="projects"><span>▱</span> Projects</button><button data-command="graph" data-view-tab="graph"><span>⌘</span> Graph</button><span class="tab-path" data-tab-path>~</span></nav>
        <div class="view-area"><div class="transcript" data-transcript role="log" aria-label="Terminal transcript" aria-live="polite" aria-relevant="additions"></div><div class="workspace-view" data-workspace-view hidden></div></div>
        <div class="command-dock"><div class="completion-menu" id="${uid}-completions" data-completion role="listbox" aria-label="Command suggestions" hidden></div><form class="prompt-form" data-form><label class="sr-only" for="${uid}-command-input">Terminal command</label><span class="prompt-user" aria-hidden="true">visitor@sanket </span><span class="prompt-path" data-prompt-path title="Virtual home">~</span><span class="prompt-glyph" aria-hidden="true">%</span><input id="${uid}-command-input" class="command-input" data-input autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="send" maxlength="2049" role="combobox" aria-expanded="false" aria-controls="${uid}-completions" aria-autocomplete="list" aria-describedby="${uid}-command-hint" placeholder="" /><button class="run-button" type="submit" aria-label="Run command">↵</button></form><p id="${uid}-command-hint" class="command-hint">help · Tab completes <span>· ↑ ↓ history · Esc closes suggestions</span></p></div>
      </div><aside class="inspector" data-inspector aria-label="Project inspector" hidden></aside></div>
      <footer class="statusbar"><span class="status-location"><span class="status-dot" aria-hidden="true"></span><span data-status-path>~</span></span><span data-status-view>shell</span><div class="status-actions"><button data-theme-control>forest</button><button data-motion-control>motion: auto</button><button class="status-keyboard" data-palette title="Search the portfolio with Spotlight" aria-keyshortcuts="${hints.aria}">${hints.primary} · ${hints.fallback} search</button></div></footer>
      <section class="term-editor" data-editor aria-label="Text editor" hidden></section>
      <div class="sr-only" role="status" data-announcement></div>
    </div>`;
    const root = host.querySelector('.pterm-root');
    const $ = selector => root.querySelector(selector);
    const input = $('[data-input]');
    const transcript = $('[data-transcript]');
    const pane = $('[data-workspace-view]');
    const inspector = $('[data-inspector]');
    const menu = $('[data-completion]');
    const isNarrow = () => host.clientWidth > 0 && host.clientWidth <= 1000;
    transcript.innerHTML = welcome();

    function announce(text) { $('[data-announcement]').textContent = text; }
    function updatePreferences() {
      state.theme = api.getTheme();
      const motion = api.getMotion();
      const reduced = document.documentElement.dataset.motion === 'off';
      $('[data-theme-control]').textContent = state.theme;
      $('[data-theme-control]').setAttribute('aria-label', `Theme: ${state.theme}. Switch to ${state.theme === 'forest' ? 'contrast' : 'forest'}`);
      $('[data-motion-control]').textContent = `motion: ${motion === 'off' ? 'off' : reduced ? 'reduced' : 'auto'}`;
      $('[data-motion-control]').setAttribute('aria-label', `Motion preference: ${motion}. ${motion === 'off' ? 'Use device preference' : 'Turn off motion'}`);
    }
    function syncStatus() {
      $('.workspace-tabs').hidden = state.activeView === 'shell';
      const shown = VFS.promptPath(state.cwd);
      $('[data-prompt-path]').textContent = shown; $('[data-prompt-path]').title = `Virtual directory: ${state.cwd}`;
      $('[data-status-path]').textContent = shown; $('[data-tab-path]').textContent = shown;
      api.setTitle(shown);
      $('[data-status-view]').textContent = state.selectedProject ? `inspect · ${matchProject(state.selectedProject)?.name}` : state.activeView;
      root.querySelectorAll('[data-view-tab]').forEach(el => { if (el.dataset.viewTab === state.activeView) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
      $('.workspace').classList.toggle('has-inspector', !!state.selectedProject);
      $('.main-column').inert = !!state.selectedProject && isNarrow();
      updatePreferences();
    }
    function viewLink() {
      return `${window.location.origin}${window.location.pathname}${writeViewUrl(state)}`;
    }
    function syncUrl() {
      if (!api.primary) return;
      const next = `${window.location.pathname}${writeViewUrl(state, window.location.search)}${window.location.hash}`;
      if (next !== window.location.pathname + window.location.search + window.location.hash) window.history.pushState({}, '', next);
    }
    function restoreFocus(target) {
      if (target?.isConnected && target.getClientRects().length && !target.closest('[inert]')) target.focus({ preventScroll: true });
      else if (state.selectedProject && isNarrow()) $('[data-close-inspector]')?.focus({ preventScroll: true });
      else input.focus({ preventScroll: true });
    }
    function closeCompletion() { menu.hidden = true; state.overlay = 'none'; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
    function placeCompletion() {
      if (menu.hidden) return;
      const surface = root.getBoundingClientRect();
      const dock = $('.command-dock').getBoundingClientRect();
      const above = dock.top - surface.top - ($('.tour-bar').hidden ? 0 : $('.tour-bar').offsetHeight) - 12;
      const below = surface.bottom - $('.statusbar').offsetHeight - dock.bottom - 12;
      const useAbove = above >= 160 || above >= below;
      menu.dataset.placement = useAbove ? 'above' : 'below';
      menu.style.bottom = useAbove ? 'calc(100% + 5px)' : 'auto';
      menu.style.top = useAbove ? 'auto' : 'calc(100% + 5px)';
      menu.style.maxHeight = `${Math.max(44, Math.min(230, useAbove ? above : below))}px`;
    }
    function updateCompletion() {
      if (api.isSearchOpen() || document.activeElement !== input) return;
      completions = input.value.trim() ? complete(input.value, state.cwd) : []; completionIndex = 0;
      if (!completions.length) { closeCompletion(); return; }
      state.overlay = 'completion';
      menu.innerHTML = `<div class="completion-caption">Complete command <span>Tab ↹</span></div>${completions.map((o, i) => `<div id="${uid}-completion-${i}" role="option" aria-selected="${i === 0}" data-complete="${i}" class="completion-option"><span>${esc(o.label)}</span><small>${esc(o.description)}</small></div>`).join('')}`;
      menu.hidden = false; input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-activedescendant', `${uid}-completion-0`);
      placeCompletion();
    }
    function acceptCompletion() {
      const option = completions[completionIndex]; if (!option) return;
      input.value = option.value; state.input = input.value; state.draft = input.value;
      closeCompletion(); input.focus();
    }
    function selectCompletion(delta) {
      completionIndex = (completionIndex + delta + completions.length) % completions.length;
      menu.querySelectorAll('[role=option]').forEach((el, i) => el.setAttribute('aria-selected', String(i === completionIndex)));
      const selected = menu.querySelector(`#${uid}-completion-${completionIndex}`);
      input.setAttribute('aria-activedescendant', selected.id); selected.scrollIntoView({ block: 'nearest' });
    }
    function appendResult(command, result, cwd) {
      state.transcript.push({ id: ++sequence, command, result, cwd });
      const el = document.createElement('article'); el.className = `transcript-entry${result.error ? ' is-error' : ''}`;
      const compact = result.action && ['inspect', 'projects', 'graph'].includes(result.action.type);
      el.innerHTML = renderResult(compact ? { ...result, blocks: result.blocks.filter(b => b.type === 'text').slice(0, 1) } : result, command, cwd); transcript.append(el);
      if (state.transcript.length > 100) { state.transcript.shift(); transcript.querySelector('.transcript-entry')?.remove(); }
      transcript.scrollTop = transcript.scrollHeight;
    }
    function renderView(tag) {
      viewVersion++; viewCleanup?.(); viewCleanup = undefined;
      transcript.hidden = state.activeView !== 'shell'; pane.hidden = state.activeView === 'shell';
      if (state.activeView === 'projects') viewCleanup = mountExplorer(pane, id => perform(`inspect ${id}`), tag, uid);
      if (state.activeView === 'graph') {
        viewCleanup = P.graph.mountGraph(pane, state.graphTopic, { select: id => { state.graphTopic = id; syncUrl(); }, inspect: id => perform(`inspect ${id}`) });
      }
      syncStatus();
    }
    function updateInspector(focus = true) {
      inspectorCleanup?.(); inspectorCleanup = undefined; inspector.hidden = !state.selectedProject;
      if (state.selectedProject) { inspectorCleanup = renderInspector(inspector, state.selectedProject, uid); if (focus) $('[data-inspector-title]').focus({ preventScroll: true }); }
      syncStatus();
    }
    function closeInspector() { state.selectedProject = undefined; updateInspector(false); transcript.scrollTop = inspectorShellScroll; syncUrl(); restoreFocus(initiator); }

    function perform(command, submitted = false) {
      const trimmed = command.trim(); if (!trimmed) return;
      const previousView = state.activeView;
      const result = executeCommand(trimmed, { history: state.history, theme: state.theme, cwd: state.cwd });
      const action = result.action; const source = document.activeElement; closeCompletion();
      if (action?.type === 'inspect' && !state.selectedProject) inspectorShellScroll = transcript.scrollTop;
      if (submitted) { input.value = ''; state.input = ''; state.draft = ''; }
      state.history = [...state.history, trimmed].slice(-80); state.historyCursor = state.history.length;
      api.saveHistory(state.history);
      const textual = !action || action.type === 'changed';
      if (submitted || textual || ['directory', 'theme', 'navigate', 'openFile', 'openFolder', 'launch'].includes(action.type)) appendResult(trimmed, result, state.cwd);
      state = applyAction(state, action);
      if (textual) { state.activeView = 'shell'; state.selectedProject = undefined; updateInspector(false); }
      if (action?.type === 'clear') { transcript.innerHTML = ''; announce('Transcript cleared. Directory unchanged.'); }
      if (action?.type === 'theme') api.setTheme(action.theme);
      if (action?.type === 'navigate') api.openURL(action.url);
      if (action?.type === 'openFile') api.openFile(action.path);
      if (action?.type === 'openFolder') api.openFolder(action.path);
      if (action?.type === 'launch') api.launch(action.app);
      if (action?.type === 'edit') openEditor(action.path, action.readOnly);
      if (action?.type === 'exit') { api.close(); return; }
      if (action?.type === 'inspect') { if (!inspector.contains(source)) initiator = source; updateInspector(); }
      else if (action && ['projects', 'graph', 'shell', 'directory', 'clear'].includes(action.type)) updateInspector(false);
      if (state.activeView !== previousView || action?.type === 'graph' || action?.type === 'projects') renderView(action?.type === 'projects' ? action.tag : undefined);
      if (submitted && state.activeView === 'shell') transcript.scrollTop = transcript.scrollHeight;
      if (action?.type === 'tour') { tourStep = 0; showTour(); }
      syncStatus(); syncUrl();
      if (submitted && !['inspect', 'tour', 'edit'].includes(action?.type)) input.focus({ preventScroll: true });
    }

    function showTour() {
      const project = P.data.projects[0]; const skill = project.skills.includes('python') ? 'python' : project.skills[0];
      const steps = [['Meet Sanket', P.data.person.intro], [project.name, project.description], ['The skills behind the work', 'Stack entries lead to the same evidence and relationships used throughout this portfolio.'], ['Follow the connections', 'Select a neighbor, read its source, or inspect a project. This map is yours to explore.']];
      const bar = $('[data-tour]'); bar.hidden = tourStep < 0; if (tourStep < 0) return;
      if (tourStep === 0) { perform('shell'); if (!transcript.querySelector('.welcome')) transcript.insertAdjacentHTML('afterbegin', welcome()); transcript.scrollTop = 0; }
      if (tourStep === 1 || tourStep === 2) { perform(`inspect ${project.id}`); if (tourStep === 2) root.querySelector(`#${uid}-tab-Stack`)?.click(); }
      if (tourStep === 3) perform(`graph ${skill}`);
      bar.innerHTML = `<span class="tour-count">${tourStep + 1} / ${steps.length}</span><div><strong>${esc(steps[tourStep][0])}</strong><p>${esc(steps[tourStep][1])}</p></div><button class="text-action" data-tour-next>${tourStep === steps.length - 1 ? 'Finish' : 'Next'} →</button><button class="quiet-button" data-tour-exit aria-label="Exit tour">×</button>`;
      $('[data-tour-next]').focus({ preventScroll: true });
    }

    /* ---------- vim / nano: a small editor over the workspace ---------- */
    function openEditor(path, readOnly) {
      const existing = VFS.stat(path);
      const original = existing?.content || '';
      const name = VFS.nameOf(path);
      const box = $('[data-editor]');
      box.innerHTML = `<header class="editor-bar"><span>${esc(readOnly ? 'view' : 'vim')} — ${esc(VFS.promptPath(path))}</span><span data-editor-state>${existing ? '' : '[New]'}${readOnly ? ' [readonly]' : ''}</span></header><textarea class="editor-text" spellcheck="false" aria-label="Contents of ${esc(name)}"${readOnly ? ' readonly' : ''}></textarea><footer class="editor-status"><span data-editor-mode>${readOnly ? '-- READ ONLY --' : '-- INSERT --'}</span><span>${readOnly ? 'Esc closes · copy it to ~/Documents to edit' : `${OS.util.mod}S saves · Esc closes`}</span></footer>`;
      const area = box.querySelector('textarea');
      area.value = original;
      editor = { path, readOnly, saved: original, area, name };
      box.hidden = false;
      closeCompletion();
      area.focus();
      area.setSelectionRange(0, 0);
      const markState = () => { box.querySelector('[data-editor-state]').textContent = `${area.value !== editor.saved ? '[+]' : ''}${readOnly ? ' [readonly]' : ''}`; };
      area.addEventListener('input', markState);
      area.addEventListener('keydown', async event => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); saveEditor(); markState(); return; }
        if (event.key === 'Escape' || (event.ctrlKey && event.key.toLowerCase() === 'x')) {
          event.preventDefault(); event.stopPropagation();
          await closeEditor();
        }
        if (event.key === 'Tab' && !event.shiftKey) {
          event.preventDefault();
          const { selectionStart: s, selectionEnd: e } = area;
          area.setRangeText('  ', s, e, 'end'); markState();
        }
      });
    }
    function saveEditor() {
      if (!editor || editor.readOnly) return false;
      try {
        const node = VFS.writeFile(editor.path, editor.area.value);
        editor.saved = editor.area.value;
        editor.path = node.path;
        editor.didSave = true;
        const lines = editor.saved ? editor.saved.split('\n').length : 0;
        $('[data-editor-mode]').textContent = `"${editor.name}" ${lines}L, ${VFS.sizeOf(editor.saved)}B written`;
        return true;
      } catch (err) {
        $('[data-editor-mode]').textContent = err.message;
        return false;
      }
    }
    async function closeEditor() {
      if (!editor) return;
      if (!editor.readOnly && editor.area.value !== editor.saved) {
        const choice = await api.confirm({ title: `Do you want to save the changes you made to “${editor.name}”?`, message: 'Your changes will be lost if you don’t save them.', buttons: ['Save', 'Don’t Save', 'Cancel'] });
        if (choice === 'Cancel' || choice === null) { editor.area.focus(); return; }
        if (choice === 'Save' && !saveEditor()) { editor.area.focus(); return; }
      }
      const { name, saved, path, didSave: wrote } = editor;
      editor = null;
      const box = $('[data-editor]');
      box.hidden = true; box.innerHTML = '';
      if (wrote) appendResult(`vim ${name}`, { title: '', blocks: [{ type: 'text', text: `“${VFS.promptPath(path)}” saved · ${VFS.sizeOf(saved)} bytes`, tone: 'muted' }] }, state.cwd);
      input.focus({ preventScroll: true });
    }

    /* ---------- Events ---------- */
    const controller = new AbortController();
    const signal = controller.signal;
    input.addEventListener('input', event => { state.input = input.value; state.draft = input.value; state.historyCursor = state.history.length; if (!event.isComposing) updateCompletion(); }, { signal });
    input.addEventListener('compositionend', updateCompletion, { signal });
    input.addEventListener('keydown', event => {
      if (event.isComposing) return;
      if (event.ctrlKey && event.key.toLowerCase() === 'c' && input.selectionStart === input.selectionEnd && !window.getSelection()?.toString()) {
        event.preventDefault(); input.value = ''; state.input = ''; state.draft = ''; closeCompletion(); return;
      }
      if (event.key === 'Tab' && !event.shiftKey && !menu.hidden) { event.preventDefault(); acceptCompletion(); return; }
      if (['ArrowUp', 'ArrowDown'].includes(event.key) && !event.altKey && !event.metaKey && !event.ctrlKey) {
        event.preventDefault(); if (!menu.hidden) { selectCompletion(event.key === 'ArrowDown' ? 1 : -1); return; }
        state.historyCursor = Math.max(0, Math.min(state.history.length, state.historyCursor + (event.key === 'ArrowUp' ? -1 : 1)));
        input.value = state.historyCursor === state.history.length ? state.draft : state.history[state.historyCursor] || ''; state.input = input.value;
      }
    }, { signal });
    $('[data-form]').addEventListener('submit', event => { event.preventDefault(); perform(input.value, true); }, { signal });
    menu.addEventListener('pointerdown', event => event.preventDefault(), { signal });
    input.addEventListener('blur', () => { if (!api.isSearchOpen()) closeCompletion(); }, { signal });

    root.addEventListener('keydown', event => {
      if (event.isComposing || event.defaultPrevented || event.key !== 'Escape' || editor) return;
      if (!menu.hidden) { closeCompletion(); event.preventDefault(); return; }
      if (tourStep >= 0) { tourStep = -1; showTour(); restoreFocus(input); event.preventDefault(); return; }
      if (state.selectedProject) { closeInspector(); event.preventDefault(); return; }
      if (state.activeView !== 'shell') { perform('shell'); input.focus(); event.preventDefault(); }
    }, { signal });

    root.addEventListener('click', event => {
      const target = event.target;
      const link = target.closest('a[href]');
      if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) { event.preventDefault(); api.openURL(link.href); return; }
      const completion = target.closest('[data-complete]'); if (completion) { completionIndex = Number(completion.dataset.complete); acceptCompletion(); return; }
      if (target.closest('[data-palette]')) { api.openSearch(); return; }
      if (target.closest('[data-close-inspector]')) closeInspector();
      const command = target.closest('[data-command]'); if (command) perform(command.dataset.command);
      if (target.closest('[data-theme-control]')) api.setTheme(state.theme === 'forest' ? 'contrast' : 'forest');
      if (target.closest('[data-motion-control]')) api.setMotion(api.getMotion() === 'off' ? 'auto' : 'off');
      if (target.closest('[data-tour-next]')) { tourStep = tourStep >= 3 ? -1 : tourStep + 1; showTour(); if (tourStep < 0) input.focus(); }
      if (target.closest('[data-tour-exit]')) { tourStep = -1; showTour(); input.focus(); }
      if (target.closest('[data-copy-link]')) {
        const button = target.closest('[data-copy-link]');
        navigator.clipboard.writeText(viewLink()).then(() => { button.textContent = 'Link copied'; announce('View link copied.'); clearTimeout(copiedTimer); copiedTimer = setTimeout(() => { if (button.isConnected) button.textContent = 'Copy view link ↗'; }, 2000); }).catch(() => { announce('Copy the current address from the browser address bar.'); button.textContent = 'Copy the browser address'; });
      }
    }, { signal });

    const resize = new ResizeObserver(() => {
      placeCompletion();
      const narrow = isNarrow();
      if (narrow !== wasNarrow) {
        wasNarrow = narrow;
        syncStatus();
        if (state.selectedProject && narrow) $('[data-close-inspector]')?.focus();
      }
    });
    resize.observe(host);
    const offSettings = OS.on('settings:change', updatePreferences);

    wasNarrow = isNarrow();
    syncStatus(); renderView(); updateInspector(false);

    return {
      uid,
      perform: command => perform(command),
      focus() {
        if (editor) editor.area.focus({ preventScroll: true });
        else restoreFocus(state.selectedProject && isNarrow() ? $('[data-close-inspector]') : input);
      },
      get state() { return state; },
      get cwd() { return state.cwd; },
      /** Restores the view from the address bar (Back/Forward). */
      restoreFromUrl(search) {
        state = { ...state, ...readViewUrl(search) }; closeCompletion(); renderView(); updateInspector(false);
      },
      refresh: updatePreferences,
      closeCompletion,
      hasUnsavedEditor: () => !!editor && !editor.readOnly && editor.area.value !== editor.saved,
      destroy() {
        controller.abort(); resize.disconnect(); offSettings();
        viewCleanup?.(); inspectorCleanup?.(); clearTimeout(copiedTimer);
      },
    };
  }

  P.session = { createSession, readViewUrl, writeViewUrl, hasViewParams, applyAction, createState };
})();
