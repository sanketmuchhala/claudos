/* Workspace search, ported from terminal.sanketmuchhala.com
   (src/terminal/search.ts). Spotlight uses it for commands, projects, and skills. */
(function () {
  const P = window.Portfolio;
  const portfolio = P.data;
  const { matchScore } = P.adapter;

  const details = { cd: 'Go to the virtual home directory', cat: 'Read about.md in the shell', project: 'Choose a project in the explorer', connections: 'Open the graph overview', open: 'Show known destinations and usage' };
  const runnable = { cd: 'cd ~', cat: 'cat about.md', project: 'projects', connections: 'graph', open: 'help open' };
  // Commands that need arguments (or would close the window) open their help instead.
  const needsArguments = new Set(['mkdir', 'touch', 'rm', 'cp', 'mv', 'echo', 'vim', 'exit', 'sudo']);

  const entries = [
    ...P.commands.commandRegistry.map(c => ({ kind: 'command', label: c.name, detail: details[c.name] || `${c.usage} · ${c.description}`, command: runnable[c.name] || (needsArguments.has(c.name) ? `help ${c.name}` : c.name), keywords: [c.name, ...(c.aliases || []), c.description] })),
    ...portfolio.projects.map(p => ({ kind: 'project', id: p.id, label: p.name, detail: 'Inspect project · ' + p.description, command: `inspect ${p.id}`, keywords: [p.id, p.name, ...p.aliases, ...p.stack] })),
    ...portfolio.skills.filter(s => s.category !== 'domain').map(s => ({ kind: 'skill', id: s.id, label: s.name, detail: `Explore graph · ${s.category} · ${s.evidence.length} sources`, command: `graph ${s.id}`, keywords: [s.id, s.name, ...s.aliases] })),
  ];

  function searchWorkspace(query) {
    // A named entity takes precedence over another entity that mentions it in
    // metadata: searching Python should offer the Python graph before projects.
    return entries.map(entry => ({ entry, score: matchScore(query, [entry.label]) * 2 + matchScore(query, entry.keywords) })).filter(x => x.score).sort((a, b) => b.score - a.score).slice(0, 30).map(x => x.entry);
  }

  P.searchWorkspace = searchWorkspace;
})();
