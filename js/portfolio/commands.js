/* Command registry, ported from terminal.sanketmuchhala.com
   (src/terminal/commands.ts), extended with CloudOS's file and system
   commands. Handlers are deterministic: they return a result and an optional
   action, and never run visitor input. */
(function () {
  const P = window.Portfolio;
  const portfolio = P.data;
  const { matchProject, matchSkill, matchEntity, normalize, quoteArgument, matchScore } = P.adapter;
  const parseCommand = P.parseCommand;
  const startedAt = Date.now();

  const publicLink = id => portfolio.links.find(link => link.id === id);
  const text = (value, tone) => ({ type: 'text', text: value, ...(tone ? { tone } : {}) });
  const suggestions = commands => ({ type: 'commands', commands: commands.map(command => ({ label: command, command })) });
  const result = (title, blocks) => ({ title, blocks });
  const error = (message, alternatives = ['help']) => ({
    title: 'error', error: true,
    blocks: [text(message, 'error'), ...(alternatives.length ? [suggestions(alternatives)] : [])],
  });
  const usageError = (command, message = 'Those arguments are not supported.') => error(`${message} Usage: ${command}`, [`help ${command.split(' ')[0]}`]);
  const allTags = () => [...new Set(portfolio.projects.flatMap(project => project.tags))].sort();

  function showLinks(title, ids) {
    const links = ids.flatMap(id => {
      const link = publicLink(id);
      return link ? [{ label: link.label, url: link.url }] : [];
    });
    return result(title, links.length ? [{ type: 'links', links }] : [text('No public link is available in the portfolio data yet.', 'muted')]);
  }

  function showProjects(args) {
    let tag;
    if (args.length) {
      if (args.length !== 2 || args[0] !== '--tag' || !args[1] || args[1].startsWith('--')) return usageError('projects [--tag <tag>]');
      tag = normalize(args[1]);
    }
    const projects = portfolio.projects.filter(project => !tag || project.tags.some(value => normalize(value) === tag));
    if (!projects.length) return result('No matching projects', [
      text(tag ? `No projects have the tag “${tag}”.` : 'No projects are available yet.', 'muted'),
      text(`Available tags: ${allTags().join(', ') || 'none'}.`, 'muted'),
      suggestions(['projects']),
    ]);
    return { ...result(`${projects.length} project${projects.length === 1 ? '' : 's'}${tag ? ` · ${tag}` : ''}`, [
      { type: 'list', items: projects.map(project => ({
        title: project.name, description: project.description,
        meta: `${project.id}  ·  ${project.tags.join(' / ')}`,
        command: `project ${quoteArgument(project.id)}`,
      })) },
      text('Select a project or use project <slug> to inspect its stack, links, and related skills.', 'muted'),
    ]), action: { type: 'projects', tag } };
  }

  function showProject(args) {
    if (args.length !== 1 || !args[0]) return usageError('project <slug>');
    const project = matchProject(args[0]);
    if (!project) return error(`No project matches “${args[0]}”. Use projects to see the available identifiers.`, ['projects']);
    const linkedUrls = new Set();
    const links = [
      ...(project.demo ? [{ label: 'Live demo', url: project.demo }] : []),
      ...(project.repository ? [{ label: 'Repository', url: project.repository }] : []),
      ...(project.url ? [{ label: project.url === publicLink('skill-map')?.url ? 'Skill-map entry' : 'Public project context', url: project.url }] : []),
    ].filter(link => {
      if (linkedUrls.has(link.url)) return false;
      linkedUrls.add(link.url);
      return true;
    });
    const skills = project.skills.map(id => portfolio.skills.find(skill => skill.id === id)).filter(skill => skill !== undefined);
    return { ...result(project.name, [
      text(project.description),
      { type: 'rows', rows: [
        { label: 'Identifier', value: project.id },
        { label: 'Stack', value: project.stack.join(' · ') || 'Not specified in the public source' },
        { label: 'Tags', value: project.tags.join(' · ') || 'Uncategorized' },
      ] },
      text(project.architecture ? `Architecture: ${project.architecture}` : 'Architecture details are not documented in the public portfolio.', 'muted'),
      ...(links.length ? [{ type: 'links', links }] : [text('No public repository or demo link is listed for this project.', 'muted')]),
      ...(skills.length ? [text('Related skills', 'muted'), { type: 'commands', commands: skills.map(skill => ({ label: skill.name, command: `skills ${quoteArgument(skill.id)} --evidence` })) }] : []),
    ]), action: { type: 'inspect', id: project.id } };
  }

  function showSkills(args) {
    const queries = [];
    let evidence = false;
    for (const argument of args) {
      if (argument === '--evidence' && !evidence) evidence = true;
      else if (argument.startsWith('-') || !argument) return usageError('skills [query] [--evidence]');
      else queries.push(argument);
    }
    if (queries.length > 1) return usageError('skills [query] [--evidence]', 'Wrap a multi-word skill in quotes.');
    const query = normalize(queries[0] || '');
    const exactMatch = query ? matchSkill(query) : undefined;
    const skills = exactMatch ? [exactMatch] : portfolio.skills.filter(skill => query ? [skill.id, skill.name, skill.category, ...skill.aliases].some(value => normalize(value).includes(query)) : skill.category !== 'domain');
    if (!skills.length) return result('No matching skills', [text(`No skills match “${queries[0]}”.`, 'muted'), suggestions(['skills', 'skills python --evidence'])]);
    const blocks = [{ type: 'list', items: skills.map(skill => ({
      title: skill.name, meta: skill.category,
      description: `${skill.evidence.length} supporting ${skill.evidence.length === 1 ? 'source' : 'sources'}`,
      ...(!evidence ? { command: `skills ${quoteArgument(skill.id)} --evidence` } : {}),
    })) }];
    if (evidence) {
      for (const skill of skills) {
        blocks.push(text(`${skill.name} · evidence`, 'accent'));
        if (!skill.evidence.length) {
          blocks.push(text('No supporting project or experience is linked in the current dataset.', 'muted'));
          continue;
        }
        blocks.push({ type: 'list', items: skill.evidence.map(source => ({
          title: source.label, description: source.detail, meta: source.kind,
          ...(source.url ? { href: source.url } : {}),
          ...(source.kind === 'project' && matchProject(source.id) ? { command: `project ${quoteArgument(source.id)}` } : {}),
        })) });
      }
    } else blocks.push(text('Inspect supporting work with skills <query> --evidence.', 'muted'));
    return result(`${skills.length} skill${skills.length === 1 ? '' : 's'}${query ? ` · ${queries[0]}` : ''}`, blocks);
  }

  function entityName(id) {
    return portfolio.projects.find(project => project.id === id)?.name
      || portfolio.skills.find(skill => skill.id === id)?.name
      || portfolio.experience.find(experience => experience.id === id)?.organization
      || id;
  }

  function showConnections(args) {
    if (args.length !== 1 || !args[0]) return usageError('connections <topic>');
    const query = normalize(args[0]);
    const exact = matchProject(query)?.id || matchSkill(query)?.id || portfolio.experience.find(experience => [experience.id, experience.organization].some(value => normalize(value) === query))?.id;
    const ids = new Set(exact ? [exact] : [
      ...portfolio.projects.filter(project => [project.id, project.name, ...project.aliases].some(value => normalize(value).includes(query))).map(project => project.id),
      ...portfolio.skills.filter(skill => [skill.id, skill.name, ...skill.aliases].some(value => normalize(value).includes(query))).map(skill => skill.id),
      ...portfolio.experience.filter(experience => [experience.id, experience.organization, experience.role].some(value => normalize(value).includes(query))).map(experience => experience.id),
    ]);
    const relationships = portfolio.relationships.filter(relationship => ids.has(relationship.source) || ids.has(relationship.target));
    if (!relationships.length) return result('No recorded connections', [text(`The shared portfolio dataset has no connections for “${args[0]}”.`, 'muted'), suggestions(['connections rag', 'skills', 'open skill-map'])]);
    const visible = relationships.slice(0, 40);
    return { ...result(`${relationships.length} connection${relationships.length === 1 ? '' : 's'} · ${exact ? entityName(exact) : args[0]}`, [
      text('Relationships from the shared portfolio skill map.', 'muted'),
      { type: 'list', items: visible.map(relationship => ({
        title: `${entityName(relationship.source)} → ${entityName(relationship.target)}`,
        description: relationship.context,
        meta: relationship.label,
        ...(relationship.evidenceUrl ? { href: relationship.evidenceUrl } : {}),
      })) },
      ...(visible.length < relationships.length ? [text(`Showing the first ${visible.length} of ${relationships.length}. Explore the full graph in the skill map.`, 'muted')] : []),
      suggestions(['open skill-map']),
    ]), ...(exact ? { action: { type: 'graph', id: exact } } : {}) };
  }

  /** Destinations come only from committed public content. Visitor URLs are never accepted. */
  function resolveDestination(target) {
    const normalized = normalize(target);
    const aliases = new Map([['main', 'portfolio'], ['home', 'portfolio'], ['website', 'portfolio'], ['skillmap', 'skill-map'], ['map', 'skill-map'], ['cv', 'resume'], ['contact', 'email']]);
    const link = publicLink(aliases.get(normalized) || normalized);
    if (link && isAllowedPublicUrl(link.url)) return { label: link.label, url: link.url };
    const project = matchProject(target);
    const url = project?.demo || project?.url || project?.repository;
    return project && url && isAllowedPublicUrl(url) ? { label: project.name, url } : undefined;
  }

  function isAllowedPublicUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'mailto:';
    } catch { return false; }
  }

  function noArguments(command, args, run) {
    return args.length ? usageError(command) : run();
  }

  function filesystemResult(run, command) {
    try { return run(); } catch (err) { return error(err instanceof Error ? err.message : 'Unable to read that virtual path.', [`help ${command}`, 'ls']); }
  }

  const bytes = content => VFS.sizeOf(content);
  const shown = path => VFS.promptPath(path);
  const flagsAndArgs = args => ({ flags: args.filter(a => /^-[a-z]+$/i.test(a)).join('').replace(/-/g, ''), rest: args.filter(a => !/^-[a-z]+$/i.test(a)) });
  const openCommandFor = node => {
    const kind = VFS.effectiveKind(node);
    if (kind === 'directory') return `cd ${quoteArgument(node.path)}`;
    if (VFS.urlFor(node)) return `open ${quoteArgument(node.path)}`;
    return `cat ${quoteArgument(node.path)}`;
  };
  const titleFor = node => node.name + (node.kind === 'symlink' ? '@' : node.kind === 'directory' ? '/' : '');

  const filesystemCommands = [
    { name: 'ls', aliases: ['ll'], group: 'Explore', usage: 'ls [-l] [-a] [path]', description: 'List the current or specified directory. -l includes metadata; -a shows hidden items.', examples: ['ls', 'ls -l /projects', 'ls ~/Desktop'], run: (args, ctx) => filesystemResult(() => {
      const { flags, rest } = flagsAndArgs(args);
      const detailed = flags.includes('l') || ctx.invokedAs === 'll';
      if (rest.length > 1 || /[^la]/.test(flags)) return usageError('ls [-l] [-a] [path]');
      const path = VFS.resolve(rest[0] || '.', ctx.cwd);
      const entries = VFS.listDirectory(path.path, '/', { all: flags.includes('a') });
      if (!entries.length) return result(path.path, [text('This folder is empty.', 'muted')]);
      return result(path.path, [{ type: 'list', items: entries.map(n => ({
        title: titleFor(n),
        ...(detailed ? {
          description: n.summary,
          meta: n.kind === 'directory' ? `directory${n.base ? ' · read only' : ''}` : n.kind === 'symlink' ? `alias → ${shown(n.target)}` : `text · ${bytes(n.content)} bytes${n.base ? '' : ` · ${OS.util.relativeTime(n.modified).toLowerCase()}`}`,
        } : { meta: n.kind === 'symlink' ? 'alias' : n.kind }),
        command: openCommandFor(n),
      })) }]);
    }, 'ls') },
    { name: 'cd', group: 'Terminal', usage: 'cd [path]', description: 'Change directory. Bare cd, ~, and / return home; . stays and .. goes up.', examples: ['cd projects', 'cd ~/Documents', 'cd /'], run: (args, ctx) => filesystemResult(() => {
      if (args.length > 1) return usageError('cd [path]', 'Quote names containing spaces.');
      if (args[0] === '...') return error('Use two dots to move to the parent directory.', ['cd ..']);
      const node = VFS.resolve(args[0] || '/', ctx.cwd);
      if (node.kind !== 'directory') return error(`${node.path}: is a file. Read it with cat.`, [`cat ${quoteArgument(node.path)}`]);
      return { title: node.path, blocks: [text(node.summary, 'muted'), ...(node.projectId ? [suggestions([`inspect ${node.projectId}`, 'cat README.md'])] : [])], action: { type: 'directory', path: node.path } };
    }, 'cd') },
    { name: 'pwd', group: 'Terminal', usage: 'pwd', description: 'Print the absolute virtual directory. / and ~ refer to the same home.', examples: ['pwd'], run: (args, ctx) => noArguments('pwd', args, () => result(ctx.cwd || '/', [])) },
    { name: 'cat', group: 'Explore', usage: 'cat <path>', description: 'Read a text file: Markdown, JSON, or your own notes.', examples: ['cat about.md', 'cat /projects/LexOrchestrator/README.md'], run: (args, ctx) => filesystemResult(() => {
      if (args.length !== 1) return usageError('cat <path>');
      const node = VFS.resolve(args[0], ctx.cwd);
      if (node.kind !== 'file') return error(`${node.path}: is a directory. List its contents with ls.`, [`ls ${quoteArgument(node.path)}`]);
      if (!node.content) return result(node.path, [text('This file is empty.', 'muted')]);
      return result(node.path, [{ type: 'code', text: node.content, language: node.name.endsWith('.json') ? 'json' : 'markdown' }]);
    }, 'cat') },
    { name: 'tree', group: 'Explore', usage: 'tree [path]', description: 'Show a clickable directory tree. Large trees are limited to 70 entries; choose a directory to explore further.', examples: ['tree', 'tree /projects/LexOrchestrator'], run: (args, ctx) => filesystemResult(() => {
      if (args.length > 1) return usageError('tree [path]');
      const root = VFS.resolve(args[0] || '.', ctx.cwd);
      const items = [];
      function visit(path, depth) {
        const children = VFS.listDirectory(path);
        const preview = root.path === '/' && depth > 0 ? children.slice(0, 5) : children;
        for (const n of preview) {
          if (items.length >= 70) return;
          items.push({ title: `${'  '.repeat(depth)}↳ ${titleFor(n)}`, command: openCommandFor(n) });
          if (n.kind === 'directory' && (root.path !== '/' || depth < 1)) visit(n.path, depth + 1);
        }
        if (preview.length < children.length) items.push({ title: `${'  '.repeat(depth)}↳ … ${children.length - preview.length} more entries`, command: `tree ${quoteArgument(path)}` });
      }
      visit(root.path, 0);
      return result(root.path, [{ type: 'list', items }, ...(items.length === 70 ? [text('Showing 70 entries. Use tree <directory> for a smaller branch.', 'muted')] : [])]);
    }, 'tree') },
  ];

  /* ---------- CloudOS file commands: writes go to the visitor's own space ---------- */
  const fileCommands = [
    { name: 'mkdir', group: 'Files', usage: 'mkdir [-p] <directory>', description: 'Create folders in your space: ~, Desktop, Documents, or Downloads.', examples: ['mkdir ~/Documents/ideas', 'mkdir -p ~/Documents/2026/notes'], run: (args, ctx) => filesystemResult(() => {
      const { flags, rest } = flagsAndArgs(args);
      if (!rest.length || /[^p]/.test(flags)) return usageError('mkdir [-p] <directory>');
      const made = rest.map(name => VFS.mkdir(name, ctx.cwd, { parents: flags.includes('p') }));
      return { title: '', blocks: [text(`Created ${made.map(n => `${shown(n.path)}/`).join(', ')}`, 'muted')], action: { type: 'changed' } };
    }, 'mkdir') },
    { name: 'touch', group: 'Files', usage: 'touch <file>', description: 'Create an empty file, or update its modified time.', examples: ['touch ~/Documents/todo.txt'], run: (args, ctx) => filesystemResult(() => {
      if (!args.length || args.some(a => a.startsWith('-'))) return usageError('touch <file>');
      const touched = args.map(name => VFS.touch(name, ctx.cwd));
      return { title: '', blocks: [text(`Touched ${touched.map(n => shown(n.path)).join(', ')}`, 'muted')], action: { type: 'changed' } };
    }, 'touch') },
    { name: 'rm', group: 'Files', usage: 'rm [-r] <path>', description: 'Delete your files. Folders need -r. The portfolio itself is read-only.', examples: ['rm ~/Documents/todo.txt', 'rm -r ~/Documents/ideas'], run: (args, ctx) => filesystemResult(() => {
      const { flags, rest } = flagsAndArgs(args);
      if (!rest.length || /[^rf]/.test(flags)) return usageError('rm [-r] <path>');
      const recursive = flags.includes('r');
      const removed = rest.map(name => {
        const node = VFS.resolve(name, ctx.cwd, { follow: false });
        if (node.kind === 'directory' && !recursive) throw new Error(`${shown(node.path)}: is a directory. Use rm -r to delete folders.`);
        return VFS.remove(name, ctx.cwd, { recursive: true });
      });
      return { title: '', blocks: [text(`Deleted ${removed.map(n => shown(n.path)).join(', ')}`, 'muted')], action: { type: 'changed' } };
    }, 'rm') },
    { name: 'cp', group: 'Files', usage: 'cp [-r] <source> <destination>', description: 'Copy a file or folder. Portfolio files can be copied into your space to edit.', examples: ['cp about.md ~/Documents/', 'cp -r projects/LexOrchestrator ~/Documents/'], run: (args, ctx) => filesystemResult(() => {
      const { flags, rest } = flagsAndArgs(args);
      if (rest.length !== 2 || /[^rR]/.test(flags)) return usageError('cp [-r] <source> <destination>');
      const copied = VFS.copy(rest[0], rest[1], ctx.cwd, { recursive: /r/i.test(flags) });
      return { title: '', blocks: [text(`Copied to ${shown(copied.path)}`, 'muted'), suggestions([openCommandFor(copied)])], action: { type: 'changed' } };
    }, 'cp') },
    { name: 'mv', group: 'Files', usage: 'mv <source> <destination>', description: 'Move or rename your files and folders.', examples: ['mv ~/Documents/todo.txt ~/Desktop/', 'mv notes.txt ideas.txt'], run: (args, ctx) => filesystemResult(() => {
      if (args.length !== 2 || args.some(a => a.startsWith('-'))) return usageError('mv <source> <destination>');
      const moved = VFS.move(args[0], args[1], ctx.cwd);
      return { title: '', blocks: [text(`Moved to ${shown(moved.path)}`, 'muted')], action: { type: 'changed' } };
    }, 'mv') },
    { name: 'echo', group: 'Files', usage: 'echo [text] [> file | >> file]', description: 'Print text, or write it to a file with > (replace) or >> (append).', examples: ['echo hello', 'echo "a new idea" >> ~/Documents/ideas.txt'], run: (args, ctx) => filesystemResult(() => {
      const index = args.findIndex(a => a === '>' || a === '>>');
      if (index === -1) return { title: '', blocks: [{ type: 'code', text: args.join(' '), language: 'text' }] };
      if (index !== args.length - 2) return usageError('echo [text] [> file | >> file]');
      const node = VFS.writeFile(args[index + 1], `${args.slice(0, index).join(' ')}\n`, ctx.cwd, { append: args[index] === '>>' });
      return { title: '', blocks: [text(`${args[index] === '>>' ? 'Appended to' : 'Wrote'} ${shown(node.path)} · ${bytes(node.content)} bytes`, 'muted')], action: { type: 'changed' } };
    }, 'echo') },
    { name: 'vim', aliases: ['vi', 'nano', 'edit'], group: 'Files', usage: 'vim <file>', description: 'Edit a text file in the terminal. ⌘/Ctrl S saves, Esc exits. Portfolio files open read-only.', examples: ['vim ~/Documents/readme.txt', 'nano notes.txt'], run: (args, ctx) => filesystemResult(() => {
      if (args.length !== 1 || args[0].startsWith('-')) return usageError('vim <file>');
      const existing = VFS.stat(args[0], ctx.cwd);
      if (existing?.kind === 'directory') return error(`${shown(existing.path)}: is a directory.`, [`ls ${quoteArgument(existing.path)}`]);
      const path = existing ? existing.path : VFS.normalizePath(args[0], ctx.cwd);
      if (!existing && !VFS.isWritableDir(VFS.parentOf(path))) return error(`${shown(VFS.parentOf(path))}: Permission denied. Create files in ~, Desktop, Documents, or Downloads.`, ['cd ~/Documents']);
      return { title: '', blocks: [], action: { type: 'edit', path, readOnly: !!existing?.base } };
    }, 'vim') },
  ];

  /* ---------- CloudOS system commands ---------- */
  function uptimeText() {
    const minutes = Math.max(0, Math.floor((Date.now() - startedAt) / 60e3));
    const clock = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const span = minutes < 60 ? `${minutes} min${minutes === 1 ? '' : 's'}` : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
    return `${clock}  up ${span}, 1 user, load averages: 1.08 1.14 1.21`;
  }
  function calendarText(date = new Date()) {
    const title = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const first = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    let grid = `${title.padStart(Math.floor((20 + title.length) / 2))}\nSu Mo Tu We Th Fr Sa\n${'   '.repeat(first)}`;
    for (let day = 1; day <= days; day++) {
      grid += String(day).padStart(2) + ((day + first) % 7 === 0 ? '\n' : ' ');
    }
    return grid.trimEnd();
  }
  const systemCommands = [
    { name: 'date', group: 'Terminal', usage: 'date', description: 'Print the current local date and time.', examples: ['date'], run: args => noArguments('date', args, () => ({ title: '', blocks: [{ type: 'code', text: new Date().toString().replace(/ \(.+\)$/, ''), language: 'text' }] })) },
    { name: 'cal', group: 'Terminal', usage: 'cal', description: 'Show this month’s calendar.', examples: ['cal'], run: args => noArguments('cal', args, () => ({ title: '', blocks: [{ type: 'code', text: calendarText(), language: 'text' }] })) },
    { name: 'uptime', group: 'Terminal', usage: 'uptime', description: 'How long this CloudOS session has been running.', examples: ['uptime'], run: args => noArguments('uptime', args, () => ({ title: '', blocks: [{ type: 'code', text: uptimeText(), language: 'text' }] })) },
    { name: 'uname', group: 'Terminal', usage: 'uname [-a]', description: 'Print system information.', examples: ['uname', 'uname -a'], run: args => {
      if (args.length > 1 || (args[0] && args[0] !== '-a')) return usageError('uname [-a]');
      return { title: '', blocks: [{ type: 'code', text: args[0] ? 'CloudOS sanket.local 15.0.0 CloudOS Kernel Version 15.0.0: Sequoia-inspired portfolio desktop; arm64' : 'CloudOS', language: 'text' }] };
    } },
    { name: 'exit', group: 'Terminal', usage: 'exit', description: 'Close this Terminal window.', examples: ['exit'], run: args => noArguments('exit', args, () => ({ title: 'Saving session… completed.', blocks: [], action: { type: 'exit' } })) },
    { name: 'sudo', group: 'Terminal', usage: 'sudo <command>', description: 'Not available: this is a read-only visitor shell.', examples: ['sudo ls'], run: () => error('visitor is not in the sudoers file. This incident will be reported.', ['whoami']) },
  ];

  const commandRegistry = [
    ...filesystemCommands,
    { name: 'graph', group: 'Explore', usage: 'graph [topic-or-project]', description: 'Explore the skill map inside this workspace.', examples: ['graph', 'graph python', 'graph MatterGraph'], run: args => {
      if (args.length > 1) return usageError('graph [topic-or-project]');
      const entity = args[0] ? matchEntity(args[0]) : undefined;
      if (args[0] && !entity) return error(`No graph entity matches “${args[0]}”.`, ['graph', 'graph python']);
      return { title: entity ? `Graph · ${entity.name}` : 'Portfolio graph', blocks: [text('Explore recorded relationships and their supporting work.', 'muted')], action: { type: 'graph', id: entity?.id } };
    } },
    { name: 'tour', group: 'Discover', usage: 'tour', description: 'A short guided introduction, project, skills, and graph.', examples: ['tour'], run: args => noArguments('tour', args, () => ({ title: 'Take a tour', blocks: [], action: { type: 'tour' } })) },
    { name: 'shell', group: 'Terminal', usage: 'shell', description: 'Return to the shell with your draft and directory intact.', examples: ['shell'], run: args => noArguments('shell', args, () => ({ title: 'Shell', blocks: [], action: { type: 'shell' } })) },
    { name: 'help', aliases: ['man'], group: 'Discover', usage: 'help [command]', description: 'Commands, examples, and keyboard shortcuts.', examples: ['help', 'help projects'], run: args => {
      if (args.length > 1) return usageError('help [command]');
      if (args.length === 1) {
        const command = findCommand(args[0]);
        if (!command) return error(`No help is available for “${args[0]}”.`, ['help']);
        return commandHelp(command);
      }
      return result('A few ways to explore', [
        text('The portfolio is a read-only virtual directory; ~ is the virtual home (/). Desktop, Documents, and Downloads are yours: files you create there are saved in this browser and appear in Finder. Quote names containing spaces. Every command supports --help.'),
        ...['Discover', 'Explore', 'Connect', 'Files', 'Terminal'].flatMap(group => [
          text(group, 'accent'),
          { type: 'rows', rows: commandRegistry.filter(command => command.group === group).map(command => ({ label: command.usage, value: command.description })) },
        ]),
        text('Enter runs · Tab completes · Escape closes suggestions · ↑/↓ recalls history when suggestions are closed · Shift+Tab moves focus · Ctrl+C clears input when no text is selected.', 'muted'),
        suggestions(['projects --tag ai', 'skills python --evidence', 'connections rag']),
      ]);
    } },
    { name: 'whoami', aliases: ['about'], group: 'Discover', usage: 'whoami', description: 'Meet Sanket and explore his focus.', examples: ['whoami', 'about'], run: args => noArguments('whoami', args, () => result(portfolio.person.name, [text(portfolio.person.intro), { type: 'rows', rows: [{ label: 'Role', value: portfolio.person.role }, { label: 'Focus', value: portfolio.person.focus.join(' · ') }] }, suggestions(['projects', 'experience', 'contact'])])) },
    { name: 'projects', group: 'Explore', usage: 'projects [--tag <tag>]', description: 'Browse projects or filter by a tag.', examples: ['projects', 'projects --tag ai'], run: showProjects },
    { name: 'project', aliases: ['inspect'], group: 'Explore', usage: 'project <slug>', description: 'Purpose, stack, architecture, links, and skills.', examples: ['project MatterGraph', 'inspect LanguageLineage'], run: showProject },
    { name: 'skills', group: 'Explore', usage: 'skills [query] [--evidence]', description: 'Find skills and the work that supports them.', examples: ['skills', 'skills python --evidence'], run: showSkills },
    { name: 'connections', group: 'Explore', usage: 'connections <topic>', description: 'Explore relationships in the portfolio skill map.', examples: ['connections rag'], run: showConnections },
    { name: 'experience', group: 'Discover', usage: 'experience', description: 'Professional experience from the main portfolio.', examples: ['experience'], run: args => noArguments('experience', args, () => result('Experience', portfolio.experience.length ? [{ type: 'list', items: portfolio.experience.map(experience => ({ title: `${experience.role} · ${experience.organization}`, description: experience.description, meta: experience.period, ...(experience.url ? { href: experience.url } : {}) })) }] : [text('No professional experience is listed in the public dataset yet.', 'muted')])) },
    { name: 'resume', group: 'Connect', usage: 'resume', description: 'Open the current public résumé.', examples: ['resume'], run: args => noArguments('resume', args, () => showLinks('Résumé', ['resume', 'resume-pdf'])) },
    { name: 'contact', group: 'Connect', usage: 'contact', description: 'Verified public email and social links.', examples: ['contact'], run: args => noArguments('contact', args, () => showLinks('Let’s connect', ['email', 'linkedin', 'github'])) },
    { name: 'github', group: 'Connect', usage: 'github', description: 'Visit Sanket’s GitHub profile.', examples: ['github'], run: args => noArguments('github', args, () => showLinks('GitHub', ['github'])) },
    { name: 'open', group: 'Connect', usage: 'open <target> | open -a <app>', description: 'Open a destination or project, a file or folder in its app, or an app with -a.', examples: ['open skill-map', 'open MatterGraph', 'open ~/Documents', 'open -a Notes'], run: (args, ctx) => {
      if (args[0] === '-a') {
        if (args.length !== 2) return usageError('open -a <app>');
        const app = OS.apps?.find(args[1]);
        if (!app) return error(`Unable to find application named “${args[1]}”.`, ['open -a Notes', 'open -a Finder']);
        return { title: `Opening ${app.name}`, blocks: [], action: { type: 'launch', app: app.id } };
      }
      if (args.length !== 1 || !args[0]) return usageError('open <target>');
      // Path-like targets open files and folders; bare names prefer portfolio destinations.
      const looksLikePath = ['.', '..'].includes(args[0]) || /[/~]/.test(args[0]) || /\.\w+$/.test(args[0]);
      const node = looksLikePath || !resolveDestination(args[0]) ? VFS.stat(args[0], ctx.cwd) : null;
      if (node) {
        const url = VFS.urlFor(node);
        if (url) return { title: `Open ${node.name.replace(/\.webloc$/i, '')}`, blocks: [{ type: 'links', links: [{ label: url, url }] }], action: { type: 'navigate', url } };
        const kind = VFS.effectiveKind(node);
        return { title: `Opening ${shown(node.path)}`, blocks: [text(kind === 'directory' ? 'Opening in Finder.' : 'Opening in TextEdit.', 'muted')], action: { type: kind === 'directory' ? 'openFolder' : 'openFile', path: node.path } };
      }
      const destination = resolveDestination(args[0]);
      if (!destination) return error(`“${args[0]}” is not a recognized destination. Use a portfolio link, a project identifier, or a path.`, ['open portfolio', 'open skill-map', 'projects']);
      return { title: `Open ${destination.label}`, blocks: [text('Opening this destination. If your browser blocks it, use the link below.', 'muted'), { type: 'links', links: [destination] }], action: { type: 'navigate', url: destination.url } };
    } },
    { name: 'theme', group: 'Terminal', usage: 'theme [forest|contrast]', description: 'Choose the forest or opaque contrast theme.', examples: ['theme', 'theme contrast', 'theme forest'], run: (args, context) => {
      if (!args.length) return result('Appearance', [text(`Current theme: ${context.theme}.`, 'muted'), { type: 'commands', commands: [{ label: 'forest', command: 'theme forest', description: 'Sage accents and an atmospheric forest backdrop.' }, { label: 'contrast', command: 'theme contrast', description: 'Opaque surfaces and brighter text.' }] }]);
      if (args.length !== 1 || !['forest', 'contrast'].includes(args[0])) return usageError('theme [forest|contrast]');
      const theme = args[0];
      return { title: 'Appearance updated', blocks: [text(`The ${theme} theme is now active.`)], action: { type: 'theme', theme } };
    } },
    { name: 'clear', group: 'Terminal', usage: 'clear', description: 'Clear the transcript and keep exploring.', examples: ['clear'], run: args => noArguments('clear', args, () => ({ title: 'Transcript cleared', blocks: [], action: { type: 'clear' } })) },
    { name: 'history', group: 'Terminal', usage: 'history', description: 'Commands you have run, kept across visits in this browser.', examples: ['history'], run: (args, context) => noArguments('history', args, () => result('Session history', context.history.length ? [{ type: 'rows', rows: context.history.map((command, index) => ({ label: String(index + 1).padStart(2, '0'), value: command })) }] : [text('No commands in this session yet. Try projects to get started.', 'muted')])) },
    ...fileCommands,
    ...systemCommands,
  ];

  function findCommand(name) {
    return commandRegistry.find(command => command.name === normalize(name) || command.aliases?.includes(normalize(name)));
  }

  function commandHelp(command) {
    return result(command.usage, [
      text(command.description),
      ...(command.aliases?.length ? [text(`Aliases: ${command.aliases.join(', ')}`, 'muted')] : []),
      ...(command.name === 'projects' ? [text(`Available tags: ${allTags().join(', ')}`, 'muted')] : []),
      ...(command.name === 'open' ? [text(`Destinations: ${portfolio.links.map(link => link.id).join(', ')}, a project identifier, or a path. Apps: ${(OS.apps?.list() || []).map(app => app.name).join(', ')}.`, 'muted')] : []),
      ...(command.name === 'skills' ? [text('Queries match skill names, aliases, or categories. Quote queries containing spaces.', 'muted')] : []),
      text('Examples', 'muted'),
      suggestions(command.examples),
    ]);
  }

  function executeCommand(input, context) {
    const parsed = parseCommand(input);
    if (!parsed.ok) return error(parsed.error);
    if (!parsed.tokens.length) return result('Ready when you are', [text('Try help, or choose a suggested command.', 'muted')]);
    const [name, ...args] = parsed.tokens;
    const command = findCommand(name);
    if (!command) {
      const alternatives = commandRegistry.filter(entry => entry.name.startsWith(normalize(name).slice(0, 2))).map(entry => entry.name).slice(0, 3);
      return error(`Command “${name}” is not available.${alternatives.length ? ' Try one of these:' : ' Type help to see what you can do.'}`, alternatives.length ? alternatives : ['help']);
    }
    if (args.length === 1 && ['--help', '-h'].includes(args[0])) return commandHelp(command);
    return command.run(args, { ...context, invokedAs: normalize(name) });
  }

  const PATH_COMMANDS = ['cd', 'cat', 'ls', 'll', 'tree', 'rm', 'cp', 'mv', 'vim', 'vi', 'nano', 'edit', 'touch', 'mkdir', 'open'];

  function candidatesFor(name, previous) {
    const command = findCommand(name)?.name;
    const entry = (value, description, label = value) => ({ value, label, description });
    if (command === 'project' && !previous.length) return portfolio.projects.flatMap(project => [entry(project.id, project.description, project.name), ...project.aliases.map(alias => entry(alias, `Inspect ${project.name}`, alias))]);
    if (command === 'skills') {
      if (!previous.length || previous.length === 1 && previous[0] === '--evidence') return [
        ...portfolio.skills.map(skill => entry(skill.id, skill.category, skill.name)),
        ...(previous.includes('--evidence') ? [] : [entry('--evidence', 'Show supporting projects and experience')]),
      ];
      if (previous.length === 1) return [entry('--evidence', 'Show supporting projects and experience')];
    }
    if ((command === 'connections' || command === 'graph') && !previous.length) return [
      ...portfolio.skills.flatMap(skill => [entry(skill.id, `Connections for ${skill.name}`, skill.name), ...skill.aliases.map(alias => entry(alias, `Connections for ${skill.name}`))]),
      ...portfolio.projects.map(project => entry(project.id, `Connections for ${project.name}`, project.name)),
    ];
    if (command === 'projects') {
      if (!previous.length) return [entry('--tag', `Filter by ${allTags().join(', ')}`)];
      if (previous.length === 1 && previous[0] === '--tag') return allTags().map(tag => entry(tag, `${portfolio.projects.filter(project => project.tags.includes(tag)).length} projects`));
    }
    if (command === 'open' && !previous.length) return [
      ...portfolio.links.map(link => entry(link.id, link.label)),
      ...portfolio.projects.filter(project => resolveDestination(project.id)).map(project => entry(project.id, `Open ${project.name}`, project.name)),
      entry('-a', 'Open an app, such as Notes or Finder'),
    ];
    if (command === 'open' && previous.length === 1 && previous[0] === '-a') return (OS.apps?.list() || []).map(app => entry(app.name, `Open ${app.name}`));
    if (command === 'theme' && !previous.length) return [entry('forest', 'Sage accents and forest backdrop'), entry('contrast', 'Opaque surfaces and brighter text')];
    if (command === 'help' && !previous.length) return commandRegistry.map(definition => entry(definition.name, definition.description));
    return [];
  }

  function wantsPath(name, argumentsSoFar) {
    const command = name.toLowerCase();
    if (!PATH_COMMANDS.includes(command)) return false;
    const positional = argumentsSoFar.filter(argument => !argument.startsWith('-'));
    if (command === 'open' && argumentsSoFar[0] === '-a') return false;
    return positional.length === 0 || (['cp', 'mv'].includes(command) && positional.length === 1) || (['rm', 'touch', 'mkdir'].includes(command));
  }

  /** Each completion contains the full replacement input; no command is run by completing. */
  function complete(input, cwd = '/') {
    let parsed = parseCommand(input);
    const pathCommand = new RegExp(`^(${PATH_COMMANDS.join('|')})\\s`);
    if (!parsed.ok && pathCommand.test(input)) {
      for (const quote of ['"', "'"]) { const attempt = parseCommand(input + quote); if (attempt.ok) { parsed = attempt; break; } }
    }
    if (!parsed.ok) return [];
    const tokens = parsed.tokens;
    const hasTrailingSpace = /\s$/.test(input);
    if (tokens.length === 0 || tokens.length === 1 && !hasTrailingSpace) {
      const prefix = normalize(tokens[0] || '');
      return commandRegistry.flatMap(command => [command.name, ...(command.aliases || [])].map(name => ({ value: `${name} `, label: name, description: command.description }))).filter(entry => matchScore(prefix, [entry.label]) > 0).sort((a, b) => matchScore(prefix, [b.label]) - matchScore(prefix, [a.label])).slice(0, 8);
    }
    const name = tokens[0];
    const argumentsSoFar = tokens.slice(1);
    const partial = hasTrailingSpace ? '' : argumentsSoFar.pop() || '';
    const candidates = [
      ...(wantsPath(name, argumentsSoFar) ? VFS.pathCompletions(name.toLowerCase(), partial, cwd) : []),
      ...(name.toLowerCase() !== 'open' && wantsPath(name, argumentsSoFar) ? [] : candidatesFor(name, argumentsSoFar)),
      ...(findCommand(name) && argumentsSoFar.length === 0 ? [{ value: '--help', label: '--help', description: `Usage and examples for ${name}` }] : []),
    ];
    const prefix = normalize(partial);
    const base = [name, ...argumentsSoFar].map(quoteArgument).join(' ');
    const seen = new Set();
    return candidates
      .filter(candidate => matchScore(prefix, [candidate.value, candidate.label]) > 0)
      .filter(candidate => {
        const key = normalize(candidate.value);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8)
      .map(candidate => ({ ...candidate, value: `${base} ${quoteArgument(candidate.value)}${candidate.value === '--tag' || candidate.value === '--evidence' || candidate.value === '-a' ? ' ' : ''}` }));
  }

  P.commands = { commandRegistry, executeCommand, complete, resolveDestination, findCommand };
})();
