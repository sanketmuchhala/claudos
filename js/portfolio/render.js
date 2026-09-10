/* Transcript and welcome rendering, ported from terminal.sanketmuchhala.com
   (src/ui/render.ts). All content is escaped; only https/mailto links render. */
(function () {
  const P = window.Portfolio;
  const portfolio = P.data;

  const escapeText = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  function linkAttrs(href) {
    try { const url = new URL(href); if (['https:', 'mailto:'].includes(url.protocol)) return `href="${escapeText(url.href)}" target="_blank" rel="noopener noreferrer"`; } catch { /* No untrusted destinations. */ }
    return '';
  }
  const commandButton = (command, label = command, description = '') => `<button type="button" data-command="${escapeText(command)}" class="inline-command"><span>${escapeText(label)}</span>${description ? `<small>${escapeText(description)}</small>` : ''}</button>`;
  function mark(id, name, className = '') {
    const logo = P.media.logoFor(id);
    return `<span class="entity-mark ${className}" aria-hidden="true">${logo ? `<img src="${logo}" alt="" loading="lazy" />` : escapeText(name.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').map(w => w[0]).join('').slice(0, 2) || name.slice(0, 2))}</span>`;
  }
  function renderBlock(block) {
    if (block.type === 'text') return `<p class="output-text tone-${block.tone || 'normal'}">${escapeText(block.text)}</p>`;
    if (block.type === 'code') return `<pre class="file-content language-${block.language}">${escapeText(block.text)}</pre>`;
    if (block.type === 'rows') return `<dl class="output-rows">${block.rows.map(row => `<div><dt>${escapeText(row.label)}</dt><dd>${row.href ? `<a ${linkAttrs(row.href)}>${escapeText(row.value)} ↗</a>` : escapeText(row.value)}</dd></div>`).join('')}</dl>`;
    if (block.type === 'links') return `<div class="output-links">${block.links.map(link => `<a ${linkAttrs(link.url)}>${escapeText(link.label)} ↗</a>`).join('')}</div>`;
    if (block.type === 'commands') return `<div class="output-commands">${block.commands.map(c => commandButton(c.command, c.label, c.description)).join('')}</div>`;
    return `<div class="output-list">${block.items.map(item => `<article class="output-item"><div class="item-head">${item.href ? `<a ${linkAttrs(item.href)}>${escapeText(item.title)} ↗</a>` : item.command ? commandButton(item.command, item.title) : `<span>${escapeText(item.title)}</span>`}${item.meta ? `<small>${escapeText(item.meta)}</small>` : ''}</div>${item.description ? `<p>${escapeText(item.description)}</p>` : ''}${item.command && item.href ? commandButton(item.command, 'Inspect project →') : ''}</article>`).join('')}</div>`;
  }
  function renderResult(result, command, cwd) {
    return `${command ? `<div class="entered-command"><span>${escapeText(VFS.promptPath(cwd))}</span><span class="prompt-glyph">%</span><span>${escapeText(command)}</span></div>` : ''}${result.title ? `<h2 class="result-title">${escapeText(result.title)}</h2>` : ''}<div class="result-blocks">${result.blocks.map(renderBlock).join('')}</div>`;
  }
  function welcome() {
    const selected = ['LexOrchestrator', 'LanguageLineage'].map(id => portfolio.projects.find(p => p.id === id)).filter(Boolean);
    const counts = P.contentCounts;
    return `<article class="welcome terminal-welcome">
      <p class="login-command"><span>visitor@sanket</span> ~ % <span class="typed-command">whoami</span></p>
      <h1>${escapeText(portfolio.person.name)}</h1>
      <p class="terminal-role">${escapeText(portfolio.person.role)}</p>
      <p class="terminal-intro">${escapeText(portfolio.person.intro)}</p>
      <dl class="terminal-profile"><div><dt>focus</dt><dd>${portfolio.person.focus.map(escapeText).join(' · ')}</dd></div><div><dt>index</dt><dd>${counts.projects} projects · ${counts.skills} skills · ${counts.experience} experiences</dd></div></dl>
      <p class="terminal-comment"># selected projects</p>
      <div class="terminal-projects">${selected.map(p => `<div class="selected-project-row"><div>${commandButton(`inspect ${p.id}`, `${p.name}/`)}<span class="terminal-project-stack">${escapeText(p.stack.filter(s => !['CSS', 'HTML', 'JavaScript'].includes(s)).slice(0, 3).join(' · '))}</span></div><p>${escapeText(p.description)}</p></div>`).join('')}</div>
      <p class="terminal-comment"># commands — click a name or type below</p>
      <div class="terminal-shortcuts">${commandButton('projects')}${commandButton('graph')}${commandButton('resume')}${commandButton('contact')}${commandButton('tour', 'tour', 'Take a tour')}${commandButton('help')}</div>
      <p class="terminal-tip">Try <span>ls</span>, <span>cd projects</span>, or <span>cat about.md</span>. Your own files live in <span>~/Documents</span>.</p>
    </article>`;
  }

  P.render = { escapeText, linkAttrs, commandButton, mark, renderBlock, renderResult, welcome };
})();
