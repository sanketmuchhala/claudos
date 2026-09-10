/* Portfolio graph, ported from terminal.sanketmuchhala.com (src/ui/graph.ts).
   Deterministic layouts: no simulation, perpetual animation, or network
   requests. The compact layout follows the window's width, not the screen's. */
(function () {
  const P = window.Portfolio;
  const portfolio = P.data;
  const { entities, entityName, matchEntity, relationshipsFor } = P.adapter;
  const { escapeText: esc, linkAttrs, mark, commandButton } = P.render;

  function neighborhood(id, limit) {
    const relations = relationshipsFor(id);
    const ids = [...new Set(relations.map(r => r.source === id ? r.target : r.source))];
    return { neighbors: ids.slice(0, limit).map(nid => entities.find(e => e.id === nid)).filter(Boolean), total: ids.length, relations };
  }

  function mountGraph(host, initial, callbacks) {
    let selected = initial ? matchEntity(initial)?.id : undefined;
    const phone = host.clientWidth <= 600;
    const width = phone ? 500 : Math.max(650, host.clientWidth - 56);
    let height = phone ? 530 : 410;
    let limit = 6;
    let scale = 1;
    let pan = { x: 0, y: 0 };
    let dragged = false;
    let previousDistance = 0;
    const pointers = new Map();
    const controller = new AbortController();
    const signal = controller.signal;
    host.innerHTML = `<section class="graph-view"><div class="view-heading"><div><p class="eyebrow">graph</p><h2>skill-map</h2></div><button class="quiet-button" data-command="shell">Back to shell</button></div><div class="graph-toolbar"><div class="graph-legend"><span>Projects</span><span>Experience</span><span>Technologies</span><span>Capabilities</span></div><div class="graph-controls" role="group" aria-label="Graph controls"><button data-zoom="in" aria-label="Zoom in">+</button><button data-zoom="out" aria-label="Zoom out">−</button><button data-fit>Fit</button><button data-reset>Reset</button></div></div><div class="graph-context" data-graph-context></div><div class="graph-canvas"><svg viewBox="0 0 ${width} ${height}" role="group" aria-label="Interactive portfolio graph. Use Tab to reach nodes or the relationship list below." tabindex="0"><g data-graph-transform></g></svg><span class="graph-gesture">Drag to pan · scroll to zoom</span><span class="graph-scale">100%</span></div><div class="graph-detail" data-graph-detail></div><details class="graph-relationships"><summary>Browse relationships as a list</summary><div data-graph-list></div></details></section>`;
    const svg = host.querySelector('svg');
    const transform = host.querySelector('[data-graph-transform]');
    const detail = host.querySelector('[data-graph-detail]');
    const list = host.querySelector('[data-graph-list]');
    function updateTransform() {
      transform.setAttribute('transform', `translate(${pan.x} ${pan.y}) translate(${width / 2} ${height / 2}) scale(${scale}) translate(${-width / 2} ${-height / 2})`);
      host.querySelector('.graph-scale').textContent = `${Math.round(scale * 100)}%`;
    }
    function fit() { scale = 1; pan = { x: 0, y: 0 }; updateTransform(); }
    function layout() {
      if (selected) {
        const root = entities.find(e => e.id === selected);
        const neighbors = neighborhood(selected, limit).neighbors;
        return [{ ...root, x: width / 2, y: height / 2 - 10, root: true }, ...neighbors.map((entity, i) => {
          const side = i % 2;
          const count = Math.ceil((neighbors.length - side) / 2);
          return { ...entity, x: side ? width - (phone ? 88 : 155) : phone ? 88 : 155, y: 35 + (Math.floor(i / 2) + .5) * ((height - 115) / count) };
        })];
      }
      const groups = [
        { kind: 'project', ids: ['LexOrchestrator', 'LanguageLineage', 'matter-graph-legal-ai', 'Nerdplexity'], x: phone ? 85 : 145, ys: phone ? [95, 255, 415] : [70, 177, 284] },
        { kind: 'experience', ids: ['e-progressive', 'e-iu', 'e-ibm'], x: width / 2, ys: phone ? [85] : [55, 157] },
        { kind: 'technology', ids: ['python', 'typescript', 'react', 'docker'], x: width - (phone ? 85 : 145), ys: phone ? [95, 255, 415] : [70, 177, 284] },
        { kind: 'capability', ids: ['cap-rag', 'cap-agent-orchestration'], x: width / 2, ys: phone ? [415] : [248, 337] },
      ];
      return groups.flatMap(g => g.ids.slice(0, g.ys.length).map((id, i) => ({ ...entities.find(e => e.id === id), x: g.x, y: g.ys[i] }))).filter(e => e.id);
    }
    function labelLines(name, max = 19) {
      const words = name.split(' '); const lines = []; let line = '';
      for (const word of words) { if ((line + ' ' + word).trim().length > max && line) { lines.push(line); line = word; } else line = (line + ' ' + word).trim(); }
      if (line) lines.push(line);
      return lines.slice(0, 2).map((l, i) => i === 1 && lines.length > 2 ? l + '…' : l);
    }
    function render() {
      height = phone ? 530 : 410;
      if (selected) height = Math.max(height, Math.ceil(Math.min(limit, neighborhood(selected, limit).total) / 2) * 110 + 100);
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.style.height = `${phone ? Math.max(370, height * .7) : height}px`;
      const nodes = layout(); const positions = new Map(nodes.map(n => [n.id, n]));
      const relations = selected ? neighborhood(selected, limit).relations : portfolio.relationships;
      const visible = relations.filter(r => positions.has(r.source) && positions.has(r.target));
      const edges = visible.map(r => { const a = positions.get(r.source); const b = positions.get(r.target); const bend = (a.x + b.x) / 2; return `<path class="graph-edge edge-${r.label.replace(/ /g, '-')}" d="M ${a.x} ${a.y} C ${bend} ${a.y} ${bend} ${b.y} ${b.x} ${b.y}"><title>${esc(entityName(r.source))} ${esc(r.label)} ${esc(entityName(r.target))}</title></path>`; }).join('');
      transform.innerHTML = `<g class="graph-edges" aria-hidden="true">${edges}</g>${nodes.map(n => {
        const r = n.root ? 37 : 26; const logo = P.media.logoFor(n.id);
        return `<g class="graph-node kind-${n.kind}${n.root ? ' root-node' : ''}" transform="translate(${n.x} ${n.y})" data-node="${esc(n.id)}" role="button" tabindex="0" aria-label="Explore ${esc(n.name)}${n.root ? ', selected' : ''}" aria-pressed="${!!n.root}"><circle class="node-halo" r="${r + 7}"/><circle class="node-surface" r="${r}"/>${logo ? `<image href="${logo}" x="${-r * .76}" y="${-r * .76}" width="${r * 1.52}" height="${r * 1.52}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"/>` : `<text class="node-initials" text-anchor="middle" dominant-baseline="central" aria-hidden="true">${esc(n.name.split(/\s/).map(w => w[0]).join('').slice(0, 2).toUpperCase())}</text>`}<text class="node-label" text-anchor="middle" y="${r + 20}" aria-hidden="true">${labelLines(n.name, phone ? 16 : 22).map((line, i) => `<tspan x="0" dy="${i ? 14 : 0}">${esc(line)}</tspan>`).join('')}</text><title>${esc(n.name)} · ${n.kind}</title></g>`;
      }).join('')}`;
      if (selected) {
        const entity = entities.find(e => e.id === selected);
        const neighborhoodData = neighborhood(selected, limit);
        const source = neighborhoodData.relations.find(r => r.source === 'LexOrchestrator') || neighborhoodData.relations[0];
        host.querySelector('[data-graph-context]').innerHTML = `<span>${esc(entity.name)} <small>· ${neighborhoodData.total} direct relationships</small></span><button class="text-action" data-read-evidence>Read evidence ↓</button>${source?.evidenceUrl ? `<a ${linkAttrs(source.evidenceUrl)}>${esc(entityName(source.source))} ${esc(source.label)} ${esc(entityName(source.target))} ↗</a>` : ''}`;
        detail.innerHTML = `<div class="graph-selection">${mark(entity.id, entity.name)}<div><p class="eyebrow">${entity.kind} / selected</p><h3>${esc(entity.name)}</h3></div>${entity.kind === 'project' ? `<button class="text-action" data-graph-inspect="${esc(entity.id)}">Inspect project ↗</button>` : ''}</div><p>${esc(entity.description)}</p><div class="graph-evidence-note"><span>${visible.length} of ${neighborhoodData.total} direct relationships shown</span>${neighborhoodData.total > limit ? '<button class="text-action" data-expand>Expand neighborhood +</button>' : ''}</div><p class="relationship-key"><span>— uses / used</span><span>┄ implements / demonstrates</span><span>·· related / domain</span></p>`;
        list.innerHTML = neighborhoodData.relations.map(r => `<article><div><button data-select="${esc(r.source)}">${esc(entityName(r.source))}</button><span class="relation-label">${esc(r.label)}</span><button data-select="${esc(r.target)}">${esc(entityName(r.target))}</button></div><p>${esc(r.context || 'Recorded in the shared skill map.')}</p>${r.evidenceUrl ? `<a ${linkAttrs(r.evidenceUrl)}>Evidence ↗</a>` : ''}${entities.find(e => e.id === r.source)?.kind === 'project' ? `<button class="text-action" data-graph-inspect="${esc(r.source)}">Inspect project →</button>` : ''}</article>`).join('') || '<p>No recorded relationships.</p>';
      } else {
        host.querySelector('[data-graph-context]').innerHTML = `<span>${nodes.length} selected entities <small>of ${entities.length} in the portfolio</small></span><button class="text-action" data-read-evidence>Explore all entities ↓</button>`;
        detail.innerHTML = `<h3>projects → skills ← experience</h3><p>Select a node to focus its neighborhood. Connections describe recorded usage and context, without proficiency scores.</p><div class="graph-overview-actions">${commandButton('graph python', 'Start with Python →')}${commandButton('graph LexOrchestrator', 'Follow LexOrchestrator →')}</div>`;
        list.innerHTML = `<div class="graph-entity-list">${entities.filter(e => e.kind !== 'domain').map(e => `<button data-select="${esc(e.id)}">${mark(e.id, e.name)}<span>${esc(e.name)}<small>${e.kind}</small></span></button>`).join('')}</div>`;
      }
      updateTransform();
    }
    function select(id) {
      const entity = matchEntity(id); if (!entity) return;
      selected = entity.id; limit = 6; fit(); render(); callbacks.select(selected);
      // The visible list supplies the same keyboard route as the graph nodes.
      const selectedNode = [...svg.querySelectorAll('[data-node]')].find(n => n.dataset.node === selected); selectedNode?.focus({ preventScroll: true });
    }
    host.addEventListener('click', event => {
      const target = event.target;
      if (target.closest('[data-read-evidence]')) { const details = host.querySelector('details'); details.open = true; details.scrollIntoView({ block: 'start' }); details.querySelector('summary')?.focus(); }
      if (target.closest('[data-fit]')) fit();
      if (target.closest('[data-reset]')) { selected = undefined; limit = 6; fit(); render(); callbacks.select(undefined); }
      const zoom = target.closest('[data-zoom]'); if (zoom) { scale = Math.max(.5, Math.min(2.5, scale * (zoom.dataset.zoom === 'in' ? 1.2 : 1 / 1.2))); updateTransform(); }
      if (target.closest('[data-expand]')) { limit += phone ? 4 : 8; render(); }
      const inspect = target.closest('[data-graph-inspect]'); if (inspect) callbacks.inspect(inspect.dataset.graphInspect);
      const entity = target.closest('[data-select]'); if (entity) select(entity.dataset.select);
      // Pointer selection is handled once on pointerup. A touch-generated click
      // can otherwise activate a different node after the neighborhood moves.
    }, { signal });
    svg.addEventListener('keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const node = event.target.closest('[data-node]');
      if (node && ['Enter', ' '].includes(event.key)) { event.preventDefault(); select(node.dataset.node); }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); pan.x += event.key === 'ArrowRight' ? 25 : event.key === 'ArrowLeft' ? -25 : 0; pan.y += event.key === 'ArrowDown' ? 25 : event.key === 'ArrowUp' ? -25 : 0; updateTransform(); }
      if (['+', '-', '='].includes(event.key)) { event.preventDefault(); scale = Math.max(.5, Math.min(2.5, scale * (event.key === '-' ? .85 : 1.15))); updateTransform(); }
      if (event.key === '0') fit();
    }, { signal });
    svg.addEventListener('wheel', event => {
      if (event.ctrlKey || event.metaKey) return; // Preserve browser zoom shortcuts.
      event.preventDefault(); scale = Math.max(.5, Math.min(2.5, scale * (event.deltaY > 0 ? .93 : 1.07))); updateTransform();
    }, { passive: false, signal });
    svg.addEventListener('pointerdown', event => { pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); dragged = false; previousDistance = 0; svg.setPointerCapture(event.pointerId); }, { signal });
    svg.addEventListener('pointermove', event => {
      const previous = pointers.get(event.pointerId); if (!previous) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]; const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (previousDistance) { scale = Math.max(.5, Math.min(2.5, scale * distance / previousDistance)); updateTransform(); }
        previousDistance = distance; dragged = true; return;
      }
      const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragged = true;
      if (dragged) { const rect = svg.getBoundingClientRect(); const ratio = Math.max(width / rect.width, height / rect.height); pan.x = Math.max(-width, Math.min(width, pan.x + dx * ratio)); pan.y = Math.max(-height, Math.min(height, pan.y + dy * ratio)); updateTransform(); }
    }, { signal });
    const release = event => {
      if (event.type === 'pointerup' && !dragged && pointers.size === 1) {
        const node = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-node]');
        if (node?.dataset.node) select(node.dataset.node);
      }
      pointers.delete(event.pointerId); previousDistance = 0;
    };
    svg.addEventListener('pointerup', release, { signal }); svg.addEventListener('pointercancel', release, { signal });
    render();
    return () => { controller.abort(); pointers.clear(); };
  }

  P.graph = { mountGraph, neighborhood };
})();
