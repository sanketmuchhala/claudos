/* Project explorer and inspector, ported from terminal.sanketmuchhala.com
   (src/ui/projects.ts). Element IDs carry the session prefix so several
   Terminal windows can be open at once. */
(function () {
  const P = window.Portfolio;
  const portfolio = P.data;
  const { matchProject, matchScore, relationshipsFor, entityName } = P.adapter;
  const { commandButton, escapeText: esc, linkAttrs, mark } = P.render;

  function mountExplorer(host, inspect, tag, uid) {
    const projects = portfolio.projects.filter(p => !tag || p.tags.includes(tag));
    let selected = projects[0]?.id;
    host.innerHTML = `<section class="explorer"><div class="view-heading"><div><p class="eyebrow">~/projects</p><h2>projects</h2></div><button data-command="shell" class="quiet-button">Back to shell</button></div><label class="search-field"><span>⌕</span><input data-project-search aria-label="Search projects" placeholder="Search projects, technologies, or ideas…" autocomplete="off" /></label><p class="view-hint">${tag ? esc(tag) + ' · ' : ''}↑ ↓ select · Enter inspects <span data-project-count></span></p><div class="explorer-layout"><div class="project-results" role="listbox" aria-label="Projects" tabindex="0"></div><article class="project-preview" aria-label="Selected project preview"></article></div></section>`;
    const search = host.querySelector('[data-project-search]');
    const list = host.querySelector('.project-results');
    const preview = host.querySelector('.project-preview');
    let filtered = projects;
    function updatePreview() {
      const p = matchProject(selected || '');
      list.querySelectorAll('[role=option]').forEach(el => { el.setAttribute('aria-selected', String(el.dataset.project === selected)); });
      list.setAttribute('aria-activedescendant', `${uid}-explore-${selected}`);
      if (!p) { preview.innerHTML = '<p class="muted">Try another project name or technology.</p>'; return; }
      preview.innerHTML = `<p class="eyebrow">preview</p>${mark(p.id, p.name, 'large-mark')}<h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><div class="stack-tags">${p.stack.slice(0, 6).map(s => `<span>${esc(s)}</span>`).join('')}</div><p class="muted">${p.skills.length} connected skills</p><button class="text-action" data-inspect="${esc(p.id)}">Inspect project →</button>`;
    }
    function filter() {
      filtered = projects.map(p => ({ p, score: matchScore(search.value, [p.name, p.id, p.description, ...p.stack, ...p.aliases, ...p.tags]) })).filter(x => x.score).sort((a, b) => b.score - a.score).map(x => x.p);
      if (!filtered.some(p => p.id === selected)) selected = filtered[0]?.id;
      list.innerHTML = filtered.length ? filtered.map(p => `<div class="project-result" id="${uid}-explore-${esc(p.id)}" role="option" aria-selected="${p.id === selected}" data-project="${esc(p.id)}">${mark(p.id, p.name)}<span><strong>${esc(p.name)}</strong><small>${esc(p.stack.slice(0, 3).join(' · '))}</small><span class="mobile-project-description">${esc(p.description)}</span></span><button aria-label="Inspect ${esc(p.name)}" data-inspect="${esc(p.id)}" class="result-inspect">↗</button></div>`).join('') : '<p class="empty-state">No matching projects. Try Python or graph.</p>';
      host.querySelector('[data-project-count]').textContent = `${filtered.length} results`;
      updatePreview();
    }
    const controller = new AbortController();
    host.addEventListener('click', event => {
      const target = event.target;
      const open = target.closest('[data-inspect]');
      if (open) { inspect(open.dataset.inspect); return; }
      const row = target.closest('[data-project]');
      if (row) { selected = row.dataset.project; updatePreview(); list.focus(); }
    }, { signal: controller.signal });
    host.addEventListener('keydown', event => {
      if (event.isComposing) return;
      if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
        event.preventDefault();
        if (event.key === 'Enter') { if (selected) inspect(selected); return; }
        const index = filtered.findIndex(p => p.id === selected);
        selected = filtered[(index + (event.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length]?.id;
        updatePreview(); list.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' });
      }
    }, { signal: controller.signal });
    search.addEventListener('input', filter, { signal: controller.signal });
    filter();
    return () => controller.abort();
  }

  function renderInspector(host, id, uid) {
    const project = matchProject(id);
    const media = P.media.mediaFor(id);
    const evidence = relationshipsFor(id).filter(r => r.source === id);
    const tabs = ['Overview', ...(project.stack.length ? ['Stack'] : []), ...(evidence.length ? ['Evidence'] : [])];
    host.innerHTML = `<header class="inspector-header"><span class="eyebrow">Project inspector</span><button class="quiet-button" data-close-inspector aria-label="Close project inspector"><span class="desktop-close">Close</span><span class="mobile-back">← Back</span> <span aria-hidden="true">×</span></button></header><div class="inspector-content" data-inspector-scroll><div class="inspector-identity">${mark(id, project.name)}<span>~/projects/<br><small>${esc(id)}</small></span></div><h2 tabindex="-1" data-inspector-title>${esc(project.name)}</h2><p class="inspector-description">${esc(project.description)}</p><nav class="inspector-tabs" role="tablist" aria-label="Project details">${tabs.map((tab, i) => `<button role="tab" id="${uid}-tab-${tab}" data-tab="${tab}" aria-controls="${uid}-project-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${tab}</button>`).join('')}</nav><div id="${uid}-project-panel" role="tabpanel" aria-labelledby="${uid}-tab-Overview" tabindex="0"></div></div><footer class="inspector-footer"><button class="text-action" data-copy-link>Copy view link ↗</button>${commandButton(`graph ${id}`, 'Explore connections →')}</footer>`;
    const panel = host.querySelector('[role=tabpanel]');
    function setTab(tab) {
      host.querySelectorAll('[role=tab]').forEach(button => { const active = button.dataset.tab === tab; button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1; });
      panel.setAttribute('aria-labelledby', `${uid}-tab-${tab}`);
      if (tab === 'Overview') panel.innerHTML = `${media?.cover ? `<figure class="inspector-hero"><img src="${media.cover}" alt="${esc(project.name)} project cover" loading="lazy" /><figcaption>Project cover · from the project repository</figcaption></figure>` : ''}${media?.screenshots.length ? `<div class="preview-images">${media.screenshots.map(s => `<button data-preview="${s.src}" aria-label="Expand ${esc(s.alt)}"><img loading="lazy" src="${s.src}" alt="${esc(s.alt)}" /></button>`).join('')}</div>` : '<p class="asset-note">No public screenshots are included for this project.</p>'}<h3>Project context</h3><p>${esc(project.architecture || 'Architecture details are not documented in the public portfolio.')}</p><div class="inspector-links">${project.repository ? `<a ${linkAttrs(project.repository)}>Repository ↗</a>` : ''}${project.demo ? `<a ${linkAttrs(project.demo)}>Live demo ↗</a>` : ''}${!project.repository && !project.demo ? `<p class="muted">No public repository or demo is listed.</p>` : ''}${project.url ? `<a ${linkAttrs(project.url)}>Portfolio context ↗</a>` : ''}</div>`;
      if (tab === 'Stack') panel.innerHTML = `<p class="muted">Technologies recorded in the shared portfolio.</p><div class="inspector-stack">${project.stack.map(name => { const skill = portfolio.skills.find(s => s.name === name); return skill ? `<button data-command="graph ${esc(skill.id)}">${mark(skill.id, name)}<span>${esc(name)}<small>${esc(skill.category)}</small></span><span>→</span></button>` : `<p>${esc(name)}</p>`; }).join('')}</div>`;
      if (tab === 'Evidence') panel.innerHTML = `<p class="muted">Recorded relationships, with the source behind each connection.</p><div class="evidence-list">${evidence.map(r => `<article><p><span class="relation-label">${esc(r.label)}</span> ${commandButton(`graph ${r.target}`, entityName(r.target))}</p><p class="muted">${esc(r.context || 'Recorded in the shared portfolio skill map.')}</p>${r.evidenceUrl ? `<a ${linkAttrs(r.evidenceUrl)}>View evidence ↗</a>` : ''}</article>`).join('')}</div>`;
    }
    const controller = new AbortController();
    host.addEventListener('click', event => {
      const button = event.target.closest('[role=tab]');
      if (button) setTab(button.dataset.tab);
      const image = event.target.closest('[data-preview]');
      if (image) { const hero = host.querySelector('.inspector-hero img'); if (hero) { hero.src = image.dataset.preview; hero.alt = image.querySelector('img').alt; } }
    }, { signal: controller.signal });
    host.querySelector('[role=tablist]').addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const buttons = [...host.querySelectorAll('[role=tab]')];
      const index = buttons.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      setTab(tabs[next]); buttons[next].focus();
    }, { signal: controller.signal });
    setTab('Overview');
    return () => controller.abort();
  }

  P.projects = { mountExplorer, renderInspector };
})();
