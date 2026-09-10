/* ===== SPOTLIGHT =====
   One search across apps, the portfolio (projects, skills, terminal commands
   via the ported searchWorkspace), files, notes, settings, arithmetic, and
   Wikipedia. ↑ ↓ select · Enter opens · Esc clears, then closes. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  let layer = null;
  let input;
  let listEl;
  let previewEl;
  let items = [];
  let index = 0;
  let returnFocus = null;

  const TERMINAL_ICON = 'images/icons/apps/terminal.png';
  const kindIcon = { command: TERMINAL_ICON, project: 'images/icons/files/folder.png', skill: 'images/icons/apps/terminal.png' };

  /* A small arithmetic parser: numbers, + − × ÷ % ^ and parentheses. No eval. */
  function evaluate(query) {
    const src = query.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '').replace(/\s+/g, '');
    if (!/^[\d.+\-*/%^()]+$/.test(src) || !/\d/.test(src) || !/[+\-*/%^]/.test(src.replace(/^[-+]/, ''))) return null;
    let i = 0;
    const peek = () => src[i];
    function number() {
      const match = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
      if (!match) throw new Error('number');
      i += match[0].length;
      return parseFloat(match[0]);
    }
    function primary() {
      if (peek() === '(') { i++; const value = expression(); if (src[i] !== ')') throw new Error('paren'); i++; return value; }
      if (peek() === '-') { i++; return -primary(); }
      if (peek() === '+') { i++; return primary(); }
      return number();
    }
    function power() {
      const base = primary();
      if (peek() === '^') { i++; return Math.pow(base, power()); }
      return base;
    }
    function term() {
      let value = power();
      while (['*', '/', '%'].includes(peek())) {
        const op = src[i++];
        const right = power();
        value = op === '*' ? value * right : op === '/' ? value / right : value % right;
      }
      return value;
    }
    function expression() {
      let value = term();
      while (['+', '-'].includes(peek())) {
        const op = src[i++];
        const right = term();
        value = op === '+' ? value + right : value - right;
      }
      return value;
    }
    try {
      const value = expression();
      return i === src.length && Number.isFinite(value) ? value : null;
    } catch { return null; }
  }
  const formatNumber = value => (Number.isInteger(value) ? value.toLocaleString('en-US') : parseFloat(value.toPrecision(12)).toLocaleString('en-US', { maximumFractionDigits: 10 }));

  const score = (query, values) => Portfolio.adapter.matchScore(query, values.filter(Boolean));

  function appItem(app, s = 0) {
    return { group: 'Applications', title: app.name, subtitle: 'Application', icon: app.icon, score: s, run: () => OS.apps.launch(app.id), preview: () => `<p>${esc(app.about || '')}</p>` };
  }

  function portfolioItem(entry) {
    const project = entry.kind === 'project' ? Portfolio.adapter.matchProject(entry.id) : null;
    const skill = entry.kind === 'skill' ? Portfolio.data.skills.find(s => s.id === entry.id) : null;
    const logo = entry.id && Portfolio.media.logoFor(entry.id);
    return {
      group: entry.kind === 'project' ? 'Portfolio Projects' : entry.kind === 'skill' ? 'Skills' : 'Terminal Commands',
      title: entry.label,
      subtitle: entry.kind === 'project' ? 'Inspect in Terminal' : entry.kind === 'skill' ? 'Explore the skill graph' : entry.command,
      icon: logo || kindIcon[entry.kind],
      badge: entry.kind === 'command' ? '❯' : '',
      run: () => OS.terminal.run(entry.command),
      preview: () => project
        ? `<p>${esc(project.description)}</p><dl><div><dt>Stack</dt><dd>${esc(project.stack.slice(0, 6).join(' · '))}</dd></div><div><dt>Tags</dt><dd>${esc(project.tags.slice(0, 5).join(' · '))}</dd></div></dl><p class="spotlight-action">↵ Inspect in Terminal</p>`
        : skill
          ? `<p>${esc(skill.category)} · ${skill.evidence.length} supporting sources</p>${skill.evidence.slice(0, 4).map(e => `<p class="spotlight-small">${esc(e.label)}</p>`).join('')}<p class="spotlight-action">↵ Open the graph</p>`
          : `<p>${esc(entry.detail)}</p><p class="spotlight-action">↵ Run in Terminal</p>`,
    };
  }

  function suggestions() {
    const recents = OS.apps.running().filter(id => id !== 'finder').slice(0, 3).map(id => OS.apps.get(id)).filter(Boolean);
    const commands = [['whoami', 'Meet Sanket'], ['projects', 'Browse 20 projects'], ['graph', 'Explore the skill map'], ['resume', 'Open the résumé'], ['contact', 'Get in touch']];
    return [
      ...commands.map(([command, detail]) => ({ group: 'Suggestions', title: command, subtitle: detail, icon: TERMINAL_ICON, badge: '❯', run: () => OS.terminal.run(command), preview: () => `<p>${esc(detail)}. Runs <code>${esc(command)}</code> in the portfolio Terminal.</p>` })),
      ...recents.map(app => ({ ...appItem(app), group: 'Recent Applications' })),
    ];
  }

  function search(raw) {
    const query = raw.trim();
    if (!query) return suggestions();
    const results = [];
    const math = evaluate(query);
    if (math !== null) {
      const text = formatNumber(math);
      results.push({ group: 'Calculator', title: `= ${text}`, subtitle: `${query} · Enter copies the result`, icon: 'images/icons/apps/calculator.png', score: 1000, run: () => navigator.clipboard?.writeText(String(math)).then(() => OS.notify({ app: 'calculator', title: 'Copied', message: `${text} is on the clipboard.` })).catch(() => {}), preview: () => `<p class="spotlight-big">${esc(text)}</p><p>${esc(query)}</p>` });
    }
    OS.apps.list().forEach(app => {
      const s = score(query, [app.name]) * 2 + score(query, app.keywords || []);
      if (s) results.push(appItem(app, s));
    });
    Portfolio.searchWorkspace(query).slice(0, 12).forEach(entry => {
      const s = score(query, [entry.label]) * 2 + score(query, entry.keywords);
      results.push({ ...portfolioItem(entry), score: s });
    });
    VFS.search(query, 6).forEach(node => results.push({
      group: 'Documents', title: OS.fs.displayName(node), subtitle: VFS.promptPath(node.path), iconHtml: OS.fs.iconMarkup(node, 'is-small'), score: score(query, [node.name]),
      run: () => OS.fs.open(node.path),
      preview: () => `<p>${esc(OS.fs.kindOf(node))}${node.base ? ' · read only' : ''}</p>${node.kind === 'file' ? `<pre>${esc((node.content || '').slice(0, 360))}</pre>` : ''}`,
    }));
    const q = query.toLowerCase();
    CloudStorage.get('notes', []).filter(n => `${n.title}\n${n.body}`.toLowerCase().includes(q)).slice(0, 4).forEach(note => results.push({
      group: 'Notes', title: note.title || 'New Note', subtitle: OS.util.relativeTime(note.timestamp), icon: 'images/icons/apps/notes.png', score: score(query, [note.title]),
      run: () => OS.apps.launch('notes', { noteId: note.id }),
      preview: () => `<pre class="spotlight-note">${esc(note.body.slice(0, 420))}</pre>`,
    }));
    (OS.settingsPanes || []).forEach(pane => {
      const s = score(query, [pane.name, ...(pane.keywords || [])]);
      if (s) results.push({ group: 'System Settings', title: pane.name, subtitle: 'System Settings', icon: 'images/icons/apps/settings.png', score: s, run: () => OS.apps.launch('settings', { pane: pane.id }), preview: () => `<p>${esc(pane.description || `Open ${pane.name} in System Settings.`)}</p>` });
    });
    results.push({ group: 'Search the Web', title: `Search Wikipedia for “${query}”`, subtitle: 'Opens in Safari', icon: 'images/icons/apps/safari.png', score: 0, run: () => OS.apps.launch('safari', { url: `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}` }), preview: () => '<p>Wikipedia results open inside Safari.</p>' });

    // Top Hit: the best app, project, skill, or pane whose name matches strongly.
    const candidates = results.filter(r => ['Applications', 'Portfolio Projects', 'Skills', 'System Settings'].includes(r.group));
    const best = candidates.sort((a, b) => b.score - a.score)[0];
    if (best && best.score >= 160) best.group = 'Top Hit';
    const order = ['Calculator', 'Top Hit', 'Applications', 'Portfolio Projects', 'Skills', 'Terminal Commands', 'Documents', 'Notes', 'System Settings', 'Search the Web'];
    const limits = { Applications: 5, 'Portfolio Projects': 5, Skills: 4, 'Terminal Commands': 4, Documents: 5, Notes: 4, 'System Settings': 3 };
    const grouped = order.flatMap(group => results.filter(r => r.group === group).sort((a, b) => b.score - a.score).slice(0, limits[group] || 1));
    return grouped;
  }

  function render() {
    const query = input.value;
    items = search(query);
    index = Math.min(index, Math.max(0, items.length - 1));
    let lastGroup = '';
    listEl.innerHTML = items.map((item, i) => {
      const header = item.group !== lastGroup ? `<div class="spotlight-group" role="presentation">${esc(item.group)}</div>` : '';
      lastGroup = item.group;
      const icon = item.iconHtml || `<img src="${esc(item.icon)}" alt="" />`;
      return `${header}<div class="spotlight-item${i === index ? ' is-selected' : ''}" id="spotlight-${i}" role="option" aria-selected="${i === index}" data-index="${i}"><span class="spotlight-icon">${icon}${item.badge ? `<span class="spotlight-badge">${esc(item.badge)}</span>` : ''}</span><span class="spotlight-text"><span>${esc(item.title)}</span><small>${esc(item.subtitle || '')}</small></span></div>`;
    }).join('');
    layer.querySelector('.spotlight').classList.toggle('has-results', items.length > 0);
    input.setAttribute('aria-expanded', String(items.length > 0));
    if (items.length) input.setAttribute('aria-activedescendant', `spotlight-${index}`); else input.removeAttribute('aria-activedescendant');
    renderPreview();
  }

  function renderPreview() {
    const item = items[index];
    if (!item) { previewEl.innerHTML = ''; return; }
    const icon = item.iconHtml ? item.iconHtml.replace('is-small', 'is-large') : `<img src="${esc(item.icon)}" alt="" />`;
    previewEl.innerHTML = `<div class="spotlight-preview-icon">${icon}</div><h3>${esc(item.title)}</h3><p class="spotlight-kind">${esc(item.group === 'Top Hit' ? item.subtitle : item.group)}</p><div class="spotlight-preview-body">${item.preview ? item.preview() : ''}</div>`;
  }

  function select(next) {
    if (!items.length) return;
    index = (next + items.length) % items.length;
    listEl.querySelectorAll('.spotlight-item').forEach(el => {
      const on = Number(el.dataset.index) === index;
      el.classList.toggle('is-selected', on);
      el.setAttribute('aria-selected', String(on));
    });
    input.setAttribute('aria-activedescendant', `spotlight-${index}`);
    listEl.querySelector('.is-selected')?.scrollIntoView({ block: 'nearest' });
    renderPreview();
  }

  function run(i = index) {
    const item = items[i];
    if (!item) return;
    close(false);
    item.run();
  }

  function open() {
    if (layer) { input.focus(); input.select(); return; }
    if (OS.isLocked?.()) return;
    OS.menu.closeAll();
    OS.launchpad?.close();
    returnFocus = document.activeElement;
    layer = OS.util.el(`<div class="spotlight-layer" role="presentation">
      <div class="spotlight" role="dialog" aria-label="Spotlight Search">
        <label class="spotlight-bar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="m14.5 14.5 5.5 5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input type="text" role="combobox" aria-label="Spotlight Search" aria-controls="spotlight-list" aria-autocomplete="list" aria-expanded="false" autocomplete="off" spellcheck="false" placeholder="Spotlight Search" /></label>
        <div class="spotlight-results"><div class="spotlight-list" id="spotlight-list" role="listbox" aria-label="Results"></div><aside class="spotlight-preview"></aside></div>
      </div>
    </div>`);
    document.getElementById('overlays').appendChild(layer);
    input = layer.querySelector('input');
    listEl = layer.querySelector('.spotlight-list');
    previewEl = layer.querySelector('.spotlight-preview');
    index = 0;
    render();
    input.focus();
    input.addEventListener('input', () => { index = 0; render(); });
    input.addEventListener('keydown', event => {
      if (event.isComposing) return;
      if (event.key === 'ArrowDown') { event.preventDefault(); select(index + 1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); select(index - 1); }
      else if (event.key === 'Enter') { event.preventDefault(); run(); }
      else if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        if (input.value) { input.value = ''; index = 0; render(); } else close();
      }
    });
    listEl.addEventListener('pointermove', event => {
      const row = event.target.closest('.spotlight-item');
      if (row && Number(row.dataset.index) !== index) select(Number(row.dataset.index));
    });
    listEl.addEventListener('click', event => {
      const row = event.target.closest('.spotlight-item');
      if (row) run(Number(row.dataset.index));
    });
    layer.addEventListener('pointerdown', event => { if (event.target === layer) close(); });
  }

  function close(restore = true) {
    if (!layer) return;
    const el = layer;
    layer = null;
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), OS.util.motionOn() ? 140 : 0);
    if (restore && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }

  OS.spotlight = {
    open, close,
    toggle: () => (layer ? close() : open()),
    isOpen: () => !!layer,
    evaluate,
  };
})();
