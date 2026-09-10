/* Portfolio content boundary, ported from terminal.sanketmuchhala.com
   (src/content/adapter.ts, data.ts, media.ts). Lookups, shared matching,
   and relationship traversal over the static snapshot in data.js. */
(function () {
  const P = (window.Portfolio = window.Portfolio || {});
  const portfolio = window.PORTFOLIO_DATA;

  const normalize = value => String(value).toLowerCase().trim();
  const quoteArgument = value => /\s|["'\\]/.test(value) ? `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : value;
  const matchProject = query => portfolio.projects.find(project => [project.id, project.name, ...project.aliases].some(value => normalize(value) === normalize(query)));
  const matchSkill = query => portfolio.skills.find(skill => [skill.id, skill.name, ...skill.aliases].some(value => normalize(value) === normalize(query)));
  const entities = [
    ...portfolio.projects.map(p => ({ id: p.id, name: p.name, kind: 'project', description: p.description })),
    ...portfolio.experience.map(e => ({ id: e.id, name: e.organization, kind: 'experience', description: `${e.role} · ${e.period}` })),
    ...portfolio.skills.map(s => ({ id: s.id, name: s.name, kind: s.category === 'capability' ? 'capability' : s.category === 'domain' ? 'domain' : 'technology', description: s.category })),
  ];
  const matchEntity = query => {
    const id = matchProject(query)?.id || matchSkill(query)?.id;
    return entities.find(e => e.id === id || normalize(e.id) === normalize(query) || normalize(e.name) === normalize(query));
  };
  const relationshipsFor = id => portfolio.relationships.filter(r => r.source === id || r.target === id);
  const entityName = id => entities.find(e => e.id === id)?.name || id;

  /** Shared scoring for Spotlight, explorer, and completion; aliases are searchable. */
  function matchScore(query, values) {
    const q = normalize(query);
    if (!q) return 1;
    return Math.max(0, ...values.map(value => {
      const v = normalize(value);
      return v === q ? 100 : v.startsWith(q) ? 80 : q.split(/\s+/).every(word => v.includes(word)) ? 40 : 0;
    }));
  }

  /* Assets copied from the public portfolio / LanguageLineage repository.
     Project cover art is labeled as a cover, never presented as a screenshot. */
  const logos = {
    LanguageLineage: 'images/portfolio/projects/language-lineage.svg',
    python: 'images/portfolio/logos/python.png', typescript: 'images/portfolio/logos/typescript.png',
    javascript: 'images/portfolio/logos/javascript.png', swift: 'images/portfolio/logos/swift.png',
    'e-iu': 'images/portfolio/logos/indiana.jpeg',
  };
  const media = {
    LanguageLineage: { cover: 'images/portfolio/projects/language-lineage-cover.svg', screenshots: [] },
  };

  P.data = portfolio;
  P.contentCounts = {
    projects: portfolio.projects.length,
    skills: portfolio.skills.filter(skill => skill.category !== 'domain').length,
    experience: portfolio.experience.length,
    relationships: portfolio.relationships.length,
  };
  P.adapter = { normalize, quoteArgument, matchProject, matchSkill, entities, matchEntity, relationshipsFor, entityName, matchScore };
  P.media = { logoFor: id => logos[id], mediaFor: id => media[id] };
  P.link = id => portfolio.links.find(link => link.id === id);
})();
