/* ===== VIRTUAL FILE SYSTEM =====
   One tree shared by Terminal, Finder, TextEdit, and the desktop.

   The portfolio (projects/, skills/, experience/, about.md, contact.md) is
   generated from the snapshot and is read-only, exactly as in the portfolio
   terminal. Everything a visitor creates lives in an overlay saved in this
   browser. ~ and / name the same home directory. No visitor input reaches a
   real file system, a shell, evaluation, or the network. */
(function () {
  const { matchProject, quoteArgument } = Portfolio.adapter;
  const portfolio = Portfolio.data;
  const encoder = new TextEncoder();
  const PORTFOLIO_DATE = Date.parse(portfolio.provenance?.graphGeneratedAt || '') || Date.now();
  const TRASH = '/.Trash';

  /* ---------- Read-only portfolio tree (from src/terminal/filesystem.ts) ---------- */
  const base = new Map();
  function addBase(path, summary, content, projectId) {
    base.set(path, { path, name: path.split('/').pop() || '~', kind: content === undefined ? 'directory' : 'file', summary, content, projectId, readOnly: true, base: true, created: PORTFOLIO_DATE, modified: PORTFOLIO_DATE });
  }
  addBase('/', 'Portfolio home');
  addBase('/projects', `${portfolio.projects.length} projects`);
  addBase('/skills', `${portfolio.skills.length} skill and domain entries`);
  addBase('/experience', `${portfolio.experience.length} roles`);
  addBase('/about.md', portfolio.person.role, `# ${portfolio.person.name}\n\n${portfolio.person.intro}\n\n${portfolio.person.focus.join(' · ')}`);
  addBase('/contact.md', 'Public contact links', portfolio.links.filter(l => ['email', 'linkedin', 'github', 'portfolio'].includes(l.id)).map(l => `${l.label}: ${l.url}`).join('\n'));
  for (const p of portfolio.projects) {
    const path = `/projects/${p.id}`;
    addBase(path, p.description, undefined, p.id);
    addBase(`${path}/README.md`, 'Overview and public links', `# ${p.name}\n\n${p.description}\n\nStack: ${p.stack.join(', ') || 'Not documented'}\n\n${[p.repository && `Repository: ${p.repository}`, p.demo && `Demo: ${p.demo}`, p.url && `Portfolio context: ${p.url}`].filter(Boolean).join('\n')}`, p.id);
    addBase(`${path}/stack.json`, `${p.stack.length} technologies`, JSON.stringify({ project: p.id, stack: p.stack, skills: p.skills }, null, 2), p.id);
    if (p.architecture) addBase(`${path}/architecture.md`, 'Documented project context', `# ${p.name} · architecture context\n\n${p.architecture}`, p.id);
  }
  for (const s of portfolio.skills) addBase(`/skills/${s.id}.md`, s.category, `# ${s.name}\n\n${s.category}\n\n${s.evidence.map(e => `${e.label} (${e.kind})\n${e.detail || 'Recorded in the portfolio skill map.'}\n${e.url || ''}`).join('\n\n') || 'No supporting sources recorded.'}`);
  for (const e of portfolio.experience) addBase(`/experience/${e.id}.md`, `${e.role} · ${e.organization}`, `# ${e.organization}\n${e.role} · ${e.period}\n\n${e.description}\n\n${e.url || ''}`);

  /* ---------- Writable overlay ---------- */
  let overlay = null;
  const now = () => Date.now();
  const sizeOf = content => encoder.encode(content || '').length;
  const parentOf = path => (path.lastIndexOf('/') <= 0 ? '/' : path.slice(0, path.lastIndexOf('/')));
  const nameOf = path => path.split('/').pop() || '~';
  const join = (dir, name) => (dir === '/' ? `/${name}` : `${dir}/${name}`);
  const byName = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
  const readOnlyError = path => new Error(`${path}: Permission denied. The portfolio is read-only; copy it to Documents to edit.`);

  function seed() {
    const t = now();
    const dir = () => ({ kind: 'directory', created: t, modified: t });
    const link = url => ({ kind: 'file', content: url, created: t, modified: t });
    return {
      nodes: {
        '/Desktop': dir(),
        '/Documents': dir(),
        '/Downloads': dir(),
        '/Documents/readme.txt': { kind: 'file', created: t, modified: t, content: 'Welcome to CloudOS!\n\nThis folder is yours. Terminal and Finder share it, and everything is saved in this browser.\n\nTry in Terminal:\n  cd ~/Documents\n  echo "hello" > hello.txt\n  vim hello.txt\n  open hello.txt\n\nThe portfolio (projects, skills, experience) is read-only. Copy a file here to edit it:\n  cp ~/about.md ~/Documents/\n' },
        '/Desktop/Projects': { kind: 'symlink', target: '/projects', created: t, modified: t },
        '/Desktop/about.md': { kind: 'symlink', target: '/about.md', created: t, modified: t },
        '/Desktop/GitHub.webloc': link('https://github.com/sanketmuchhala'),
        '/Desktop/LeetCode.webloc': link('https://leetcode.com/u/sanketmuchhala/'),
        '/Desktop/Resume.webloc': link(Portfolio.link('resume')?.url || 'https://sanketmuchhala.com/resume/'),
      },
      trash: {},
      tags: {},
    };
  }

  /* CloudOS 1 kept terminal files under /Users/sanket. Moves visitor-created
     entries into the new home; untouched starter files are dropped. */
  function migrateLegacy(legacy) {
    const starter = {
      '/Users/sanket/test.txt': 'Hello World!\nWelcome to CloudOS Terminal.',
      '/Users/sanket/readme.txt': 'Welcome to CloudOS!\n\nThis is a demo terminal with a virtual filesystem.\nTry commands like: ls, cd, mkdir, touch, cat, vim\n',
    };
    const paths = Object.keys(legacy).filter(p => p.startsWith('/Users/sanket/')).sort((a, b) => a.length - b.length);
    for (const oldPath of paths) {
      const entry = legacy[oldPath];
      if (!entry || starter[oldPath] === entry.content) continue;
      let path = oldPath.slice('/Users/sanket'.length);
      if (base.has(path)) path = join(parentOf(path), `${nameOf(path)} (CloudOS 1)`);
      if (overlay.nodes[path] || !overlay.nodes[parentOf(path)] && parentOf(path) !== '/') continue;
      overlay.nodes[path] = entry.type === 'dir' ? { kind: 'directory', created: now(), modified: now() } : { kind: 'file', content: String(entry.content || ''), created: now(), modified: now() };
    }
  }

  function load() {
    if (overlay) return overlay;
    overlay = CloudStorage.get('vfs', null);
    if (!overlay || typeof overlay !== 'object' || !overlay.nodes) {
      overlay = seed();
      const legacy = CloudStorage.get('legacyVfs', null);
      if (legacy) { migrateLegacy(legacy); CloudStorage.delete('legacyVfs'); }
      persist();
    }
    overlay.trash = overlay.trash || {};
    overlay.tags = overlay.tags || {};
    return overlay;
  }

  function persist(changed = []) {
    CloudStorage.set('vfs', overlay);
    OS.emit?.('vfs:change', { paths: changed });
  }

  function overlayNode(path) {
    const entry = load().nodes[path];
    if (!entry) return undefined;
    const name = nameOf(path);
    const node = { path, name, kind: entry.kind, readOnly: false, base: false, created: entry.created, modified: entry.modified };
    if (entry.kind === 'file') {
      node.content = entry.content || '';
      node.summary = /\.webloc$/i.test(name) ? `Link to ${node.content}` : `Text file · ${sizeOf(node.content)} bytes`;
    } else if (entry.kind === 'symlink') {
      node.target = entry.target;
      node.summary = `Alias of ${entry.target === '/' ? '~' : `~${entry.target}`}`;
    } else {
      node.summary = { '/Desktop': 'Your desktop', '/Documents': 'Your documents', '/Downloads': 'Your downloads', [TRASH]: 'Trash' }[path] || 'Folder';
    }
    return node;
  }

  const getNode = path => base.get(path) || overlayNode(path);

  function children(dirPath, all = false) {
    const prefix = dirPath === '/' ? '/' : `${dirPath}/`;
    const direct = path => path !== dirPath && path.startsWith(prefix) && !path.slice(prefix.length).includes('/');
    const fromBase = [...base.values()].filter(n => direct(n.path));
    const fromOverlay = Object.keys(load().nodes).filter(direct).sort((a, b) => byName(nameOf(a), nameOf(b))).map(overlayNode);
    return [...fromBase, ...fromOverlay].filter(n => all || !n.name.startsWith('.'));
  }

  /* ---------- Paths (from src/terminal/filesystem.ts) ---------- */
  function normalizePath(path, cwd = '/') {
    if (path.length > 2048 || [...path].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) throw new Error('Path contains unsupported characters.');
    if (path.startsWith('~') && path !== '~' && !path.startsWith('~/')) throw new Error('Use ~ or ~/path for the virtual home.');
    const rooted = path.startsWith('/') || path.startsWith('~');
    const parts = rooted ? [] : cwd.split('/').filter(Boolean);
    for (const part of path.replace(/^~(?=\/|$)/, '').split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') parts.pop();
      else parts.push(part);
    }
    return '/' + parts.join('/');
  }

  function lookupChild(dir, part) {
    const canonical = dir.path === '/projects' ? matchProject(part)?.id || part : part;
    const exact = join(dir.path, canonical);
    return getNode(exact) || children(dir.path, true).find(n => n.path.toLowerCase() === exact.toLowerCase());
  }

  function follow(node, depth = 0) {
    if (node.kind !== 'symlink') return node;
    if (depth > 8) throw new Error(`${node.path}: too many levels of aliases.`);
    let target;
    try { target = resolve(node.target, '/', { follow: false }); } catch { throw new Error(`${node.path}: the original item can’t be found.`); }
    return follow(target, depth + 1);
  }

  /** Resolves a path. Aliases are followed, except a final one when follow is false. */
  function resolve(path, cwd = '/', { follow: followLast = true } = {}) {
    const normalized = normalizePath(path, cwd);
    let current = getNode('/');
    const parts = normalized.split('/').filter(Boolean);
    parts.forEach((part, index) => {
      if (current.kind === 'file') throw new Error(`${current.path}: is a file, not a directory.`);
      let next = lookupChild(current, part);
      if (!next) throw new Error(`${path}: no such file or directory.`);
      if (next.kind === 'symlink' && (followLast || index < parts.length - 1)) next = follow(next);
      current = next;
    });
    return current;
  }

  function stat(path, cwd, options) {
    try { return resolve(path, cwd, options); } catch { return null; }
  }

  function listDirectory(path, cwd = '/', { all = false } = {}) {
    const node = resolve(path, cwd);
    if (node.kind !== 'directory') throw new Error(`${node.path}: is a file. Use cat ${quoteArgument(node.path)}.`);
    return children(node.path, all);
  }

  /** The kind an item behaves as: aliases report their original's kind. */
  function effectiveKind(node) {
    if (node.kind !== 'symlink') return node.kind;
    try { return follow(node).kind; } catch { return 'broken'; }
  }

  const promptPath = cwd => (cwd === '/' ? '~' : `~${cwd}`);

  function pathCompletions(command, partial, cwd) {
    const slash = partial.lastIndexOf('/');
    const prefixPath = slash >= 0 ? partial.slice(0, slash + 1) : '';
    const prefix = partial.slice(slash + 1).toLowerCase();
    const directoriesOnly = ['cd', 'mkdir'].includes(command);
    try {
      return listDirectory(prefixPath || '.', cwd, { all: prefix.startsWith('.') })
        .map(n => ({ n, kind: effectiveKind(n) }))
        .filter(({ n, kind }) => (!directoriesOnly || kind === 'directory') && n.name.toLowerCase().startsWith(prefix))
        .map(({ n, kind }) => ({ value: prefixPath + n.name + (kind === 'directory' ? '/' : ''), label: n.name + (kind === 'directory' ? '/' : ''), description: n.summary }));
    } catch { return []; }
  }

  /* ---------- Mutations ---------- */
  function validName(name) {
    if (!name || name === '.' || name === '..' || name.length > 255 || name.includes('/')) throw new Error(`“${name}” is not a valid name.`);
  }

  function writableDir(path) {
    const dir = resolve(path, '/');
    if (dir.kind !== 'directory') throw new Error(`${dir.path}: is not a directory.`);
    if (dir.base && dir.path !== '/') throw readOnlyError(dir.path);
    return dir;
  }

  function touchParent(dirPath) {
    const entry = load().nodes[dirPath];
    if (entry) entry.modified = now();
  }

  /** Splits a target into its real (alias-resolved) parent directory and name. */
  function destination(path, cwd) {
    const normalized = normalizePath(path, cwd);
    if (normalized === '/') throw new Error('~: already exists.');
    const parent = writableDir(parentOf(normalized));
    const name = nameOf(normalized);
    validName(name);
    return { parent, name, path: join(parent.path, name) };
  }

  function mkdir(path, cwd = '/', { parents = false } = {}) {
    const normalized = normalizePath(path, cwd);
    if (parents) {
      let current = '/';
      for (const part of normalized.split('/').filter(Boolean)) {
        const existing = stat(join(current, part));
        if (existing) {
          if (existing.kind !== 'directory') throw new Error(`${existing.path}: is a file.`);
          current = existing.path;
          continue;
        }
        current = mkdir(join(current, part)).path;
      }
      return resolve(current);
    }
    const existing = stat(normalized, '/', { follow: false });
    if (existing) throw new Error(`${existing.path}: File exists.`);
    const { parent, path: target } = destination(normalized, '/');
    load().nodes[target] = { kind: 'directory', created: now(), modified: now() };
    touchParent(parent.path);
    persist([target]);
    return overlayNode(target);
  }

  function writeFile(path, content, cwd = '/', { append = false } = {}) {
    const existing = stat(path, cwd);
    if (existing) {
      if (existing.kind === 'directory') throw new Error(`${existing.path}: is a directory.`);
      if (existing.base) throw readOnlyError(existing.path);
      const entry = load().nodes[existing.path];
      entry.content = append ? (entry.content || '') + content : content;
      entry.modified = now();
      persist([existing.path]);
      return overlayNode(existing.path);
    }
    const { parent, path: target } = destination(path, cwd);
    load().nodes[target] = { kind: 'file', content: String(content), created: now(), modified: now() };
    touchParent(parent.path);
    persist([target]);
    return overlayNode(target);
  }

  function touch(path, cwd = '/') {
    const existing = stat(path, cwd);
    if (!existing) return writeFile(path, '', cwd);
    if (existing.base) throw readOnlyError(existing.path);
    load().nodes[existing.path].modified = now();
    persist([existing.path]);
    return overlayNode(existing.path);
  }

  const descendants = path => Object.keys(load().nodes).filter(p => p === path || p.startsWith(`${path}/`));

  function remove(path, cwd = '/', { recursive = false } = {}) {
    const node = resolve(path, cwd, { follow: false });
    if (node.path === '/') throw new Error('~: Permission denied.');
    if (node.base) throw readOnlyError(node.path);
    if (node.kind === 'directory' && !recursive && children(node.path, true).length) throw new Error(`${node.path}: Directory not empty.`);
    const removed = descendants(node.path);
    removed.forEach(p => { delete overlay.nodes[p]; delete overlay.tags[p]; delete overlay.trash[p]; });
    touchParent(parentOf(node.path));
    persist(removed);
    return node;
  }

  /** Moves or renames. An existing directory as the destination receives the item. */
  function move(from, to, cwd = '/') {
    const node = resolve(from, cwd, { follow: false });
    if (node.base) throw readOnlyError(node.path);
    const target = stat(to, cwd);
    const dest = target && target.kind === 'directory' ? { parent: writableDir(target.path), name: node.name } : destination(to, cwd);
    const targetPath = join(dest.parent.path, dest.name);
    if (targetPath === node.path) return node;
    if (targetPath.startsWith(`${node.path}/`)) throw new Error(`Can’t move ${node.name} into itself.`);
    if (getNode(targetPath)) throw new Error(`${targetPath}: File exists.`);
    const moved = descendants(node.path);
    moved.forEach(p => {
      const next = targetPath + p.slice(node.path.length);
      overlay.nodes[next] = overlay.nodes[p];
      delete overlay.nodes[p];
      if (overlay.tags[p]) { overlay.tags[next] = overlay.tags[p]; delete overlay.tags[p]; }
    });
    overlay.nodes[targetPath].modified = now();
    touchParent(parentOf(node.path));
    touchParent(dest.parent.path);
    persist([node.path, targetPath]);
    return overlayNode(targetPath);
  }

  /** Copies files or folders, including read-only portfolio items, into writable space. */
  function copy(from, to, cwd = '/', { recursive = false } = {}) {
    const node = resolve(from, cwd);
    if (node.kind === 'directory' && !recursive) throw new Error(`${node.path}: is a directory (use cp -r).`);
    const target = stat(to, cwd);
    const dest = target && target.kind === 'directory' ? { parent: writableDir(target.path), name: node.name } : destination(to, cwd);
    const targetPath = join(dest.parent.path, dest.name);
    if (getNode(targetPath)) throw new Error(`${targetPath}: File exists.`);
    if (targetPath.startsWith(`${node.path}/`)) throw new Error(`Can’t copy ${node.name} into itself.`);
    const copyNode = (source, destinationPath) => {
      if (source.kind === 'directory') {
        overlay.nodes[destinationPath] = { kind: 'directory', created: now(), modified: now() };
        children(source.path, true).forEach(child => copyNode(child, join(destinationPath, child.name)));
      } else if (source.kind === 'symlink') {
        overlay.nodes[destinationPath] = { kind: 'symlink', target: source.target, created: now(), modified: now() };
      } else {
        overlay.nodes[destinationPath] = { kind: 'file', content: source.content || '', created: now(), modified: now() };
      }
    };
    load();
    copyNode(node, targetPath);
    touchParent(dest.parent.path);
    persist([targetPath]);
    return overlayNode(targetPath);
  }

  /** Finder-style "name 2" when a name is taken. */
  function uniqueName(dirPath, name) {
    if (!getNode(join(dirPath, name)) && !children(dirPath, true).some(n => n.name.toLowerCase() === name.toLowerCase())) return name;
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    for (let i = 2; i < 1000; i++) {
      const candidate = `${stem} ${i}${ext}`;
      if (!children(dirPath, true).some(n => n.name.toLowerCase() === candidate.toLowerCase())) return candidate;
    }
    return `${stem} ${Date.now()}${ext}`;
  }

  function trash(path, cwd = '/') {
    const node = resolve(path, cwd, { follow: false });
    if (node.base) throw readOnlyError(node.path);
    load();
    if (!overlay.nodes[TRASH]) overlay.nodes[TRASH] = { kind: 'directory', created: now(), modified: now() };
    const name = uniqueName(TRASH, node.name);
    const moved = move(node.path, join(TRASH, name));
    overlay.trash[moved.path] = node.path;
    persist([node.path, moved.path]);
    return moved;
  }

  function putBack(trashPath) {
    const original = load().trash[trashPath];
    if (!original) throw new Error('The original location is unknown.');
    let parent = stat(parentOf(original));
    if (!parent || parent.kind !== 'directory' || (parent.base && parent.path !== '/')) parent = resolve('/Desktop');
    const restored = move(trashPath, join(parent.path, uniqueName(parent.path, nameOf(original))));
    delete overlay.trash[trashPath];
    persist([trashPath, restored.path]);
    return restored;
  }

  function emptyTrash() {
    load();
    const removed = descendants(TRASH).filter(p => p !== TRASH);
    removed.forEach(p => { delete overlay.nodes[p]; delete overlay.tags[p]; });
    overlay.trash = {};
    persist(removed);
    return removed.length;
  }

  const trashCount = () => (stat(TRASH) ? children(TRASH, true).length : 0);

  function setTag(path, color, enabled) {
    load();
    const tags = new Set(overlay.tags[path] || []);
    if (enabled) tags.add(color); else tags.delete(color);
    if (tags.size) overlay.tags[path] = [...tags]; else delete overlay.tags[path];
    persist([path]);
  }
  const tagsFor = path => (load().tags[path] || []);
  const taggedPaths = color => Object.keys(load().tags).filter(path => overlay.tags[path].includes(color) && getNode(path));

  /** Name search across the whole tree, for Spotlight and Finder. */
  function search(query, limit = 40) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const all = [...base.values(), ...Object.keys(load().nodes).map(overlayNode)];
    return all.filter(n => n.path !== '/' && !n.path.split('/').some(part => part.startsWith('.')) && n.name.toLowerCase().includes(q))
      .sort((a, b) => (b.name.toLowerCase().startsWith(q) - a.name.toLowerCase().startsWith(q)) || a.path.length - b.path.length)
      .slice(0, limit);
  }

  /** A .webloc file's destination, when it holds a safe URL. */
  function urlFor(node) {
    if (!node || node.kind !== 'file' || !/\.webloc$/i.test(node.name)) return '';
    return OS.util.safeUrl((node.content || '').trim());
  }

  const sizeOfNode = node => (node.kind === 'file' ? sizeOf(node.content) : node.kind === 'directory' ? children(node.path, true).length : 0);

  window.VFS = {
    TRASH,
    normalizePath, resolve, stat, listDirectory, children: (path, all) => children(resolve(path).path, all),
    effectiveKind, follow, promptPath, pathCompletions, parentOf, nameOf, join,
    mkdir, writeFile, touch, remove, move, copy, trash, putBack, emptyTrash, trashCount, uniqueName,
    setTag, tagsFor, taggedPaths, search, urlFor, sizeOf, sizeOfNode,
    isWritableDir: path => { try { writableDir(path); return true; } catch { return false; } },
    read(path, cwd = '/') {
      const node = resolve(path, cwd);
      if (node.kind !== 'file') throw new Error(`${node.path}: is a directory.`);
      return node.content || '';
    },
    reload() { overlay = null; load(); },
  };
})();
