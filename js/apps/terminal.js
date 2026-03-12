/* ===== TERMINAL ===== */

let termState = {
  cwd: '/Users/sanket',
  history: [],
  historyIndex: -1
};

function openTerm() {
  // Load terminal state from CloudStorage
  const saved = CloudStorage.get('terminal', {
    currentPath: '/Users/sanket',
    history: [],
    vfs: null
  });

  termState.cwd = saved.currentPath;
  termState.history = saved.history || [];

  // Initialize VFS if not exists
  initVFS();

  mkWin('terminal', 'Terminal — zsh', 680, 450,
    '<div class="term" id="tb' + (wid + 1) + '">' +
      '<div class="tline" style="color:#FFCC00">Welcome to CloudOS Terminal v2.0</div>' +
      '<div class="tline" style="color:#666">Type \'help\' for available commands</div>' +
      '<div class="tline">&nbsp;</div>' +
      '<div class="tinline"><span class="tprompt">' + getPrompt() + '</span><input class="tinp" autofocus></div>' +
    '</div>',
    {
      bs: 'padding:0;overflow:hidden',
      init: function(el) {
        setupTerminal(el);
      }
    }
  );
}

function setupTerminal(el) {
  const inp = el.querySelector('.tinp');
  const body = el.querySelector('.term');

  inp.focus();
  el.querySelector('.wbody').addEventListener('click', function() { inp.focus(); });

  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const cmd = inp.value.trim();
      inp.value = '';
      runCmd(cmd, body, inp);
      termState.historyIndex = -1;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (termState.history.length > 0) {
        if (termState.historyIndex === -1) {
          termState.historyIndex = termState.history.length - 1;
        } else if (termState.historyIndex > 0) {
          termState.historyIndex--;
        }
        inp.value = termState.history[termState.historyIndex] || '';
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (termState.historyIndex !== -1) {
        termState.historyIndex++;
        if (termState.historyIndex >= termState.history.length) {
          termState.historyIndex = -1;
          inp.value = '';
        } else {
          inp.value = termState.history[termState.historyIndex];
        }
      }
    }
  });
}

function initVFS() {
  const terminal = CloudStorage.get('terminal', {});
  if (!terminal.vfs) {
    terminal.vfs = {
      '/Users/sanket': {
        type: 'dir',
        children: ['Desktop', 'Documents', 'Downloads', 'readme.txt']
      },
      '/Users/sanket/Desktop': { type: 'dir', children: [] },
      '/Users/sanket/Documents': { type: 'dir', children: [] },
      '/Users/sanket/Downloads': { type: 'dir', children: [] },
      '/Users/sanket/readme.txt': {
        type: 'file',
        content: 'Welcome to CloudOS!\n\nThis is a demo terminal with a virtual filesystem.\nTry commands like: ls, cd, mkdir, touch, cat, vim\n',
        size: 120
      }
    };
    terminal.currentPath = '/Users/sanket';
    terminal.history = [];
    CloudStorage.set('terminal', terminal);
  }
}

function getPrompt() {
  const parts = termState.cwd.split('/');
  const dir = parts[parts.length - 1] || '~';
  return 'sanket@cloudos ' + (dir === 'sanket' ? '~' : dir) + ' % ';
}

function runCmd(cmd, body, inp) {
  // Add command to output
  const il = inp.parentElement;
  const out = document.createElement('div');
  out.className = 'tline';
  out.style.color = '#999';
  out.textContent = getPrompt() + cmd;
  body.insertBefore(out, il);

  let result = '';
  const parts = cmd.trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (!cmd) {
    // Empty command
  } else if (command === 'help') {
    result = 'Available commands:\n' +
      '  ls [path]       - List directory contents\n' +
      '  cd <path>       - Change directory\n' +
      '  pwd             - Print working directory\n' +
      '  mkdir <name>    - Create directory\n' +
      '  touch <name>    - Create empty file\n' +
      '  cat <file>      - Display file contents\n' +
      '  vim <file>      - Edit file\n' +
      '  rm <path>       - Remove file or directory\n' +
      '  echo <text>     - Print text\n' +
      '  clear           - Clear terminal\n' +
      '  history         - Show command history\n' +
      '  date, whoami, uname, uptime, cal';
  } else if (command === 'ls') {
    result = cmdLs(args[0]);
  } else if (command === 'cd') {
    result = cmdCd(args[0]);
    updatePrompt(inp);
  } else if (command === 'pwd') {
    result = termState.cwd;
  } else if (command === 'mkdir') {
    result = cmdMkdir(args[0]);
  } else if (command === 'touch') {
    result = cmdTouch(args[0]);
  } else if (command === 'cat') {
    result = cmdCat(args[0]);
  } else if (command === 'vim') {
    openVimEditor(args[0], body);
    return;
  } else if (command === 'rm') {
    result = cmdRm(args[0]);
  } else if (command === 'echo') {
    result = args.join(' ');
  } else if (command === 'clear') {
    body.querySelectorAll('.tline').forEach(function(l) { l.remove(); });
    body.scrollTop = 0;
    return;
  } else if (command === 'history') {
    result = termState.history.map(function(h, i) {
      return '  ' + (i + 1) + '  ' + h;
    }).join('\n') || '(empty)';
  } else if (command === 'date') {
    result = new Date().toString();
  } else if (command === 'whoami') {
    result = 'sanket';
  } else if (command === 'uname') {
    result = 'CloudOS 14.2.1 Darwin Kernel Version 23.2.0 x86_64';
  } else if (command === 'uptime') {
    result = 'up ' + (Math.floor(Math.random() * 30) + 1) + ' days, ' + Math.floor(Math.random() * 24) + ':' + String(Math.floor(Math.random() * 60)).padStart(2, '0');
  } else if (command === 'cal') {
    const d = new Date();
    result = '     ' + d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + '\nSu Mo Tu We Th Fr Sa\n';
    const f = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
    const la = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    let line = '   '.repeat(f);
    for (let i = 1; i <= la; i++) {
      line += String(i).padStart(2) + ' ';
      if ((i + f) % 7 === 0) line += '\n';
    }
    result += line;
  } else {
    result = 'zsh: command not found: ' + command;
  }

  // Save command to history
  if (cmd) {
    termState.history.push(cmd);
    const terminal = CloudStorage.get('terminal', {});
    terminal.history = termState.history.slice(-100); // Keep last 100
    CloudStorage.autoSave('terminal', terminal);
  }

  // Display result
  if (result) {
    const res = document.createElement('div');
    res.className = 'tline';
    res.textContent = result;
    res.style.whiteSpace = 'pre-wrap';
    body.insertBefore(res, il);
  }

  body.scrollTop = body.scrollHeight;
}

function cmdLs(path) {
  const terminal = CloudStorage.get('terminal', {});
  const targetPath = resolvePath(path || '.');
  const entry = terminal.vfs[targetPath];

  if (!entry) {
    return 'ls: ' + (path || '.') + ': No such file or directory';
  }

  if (entry.type === 'file') {
    return path || targetPath.split('/').pop();
  }

  if (entry.children.length === 0) {
    return '';
  }

  return entry.children.map(function(name) {
    const childPath = targetPath + (targetPath === '/' ? '' : '/') + name;
    const child = terminal.vfs[childPath];
    return child && child.type === 'dir' ? name + '/' : name;
  }).join('  ');
}

function cmdCd(path) {
  if (!path || path === '~') {
    termState.cwd = '/Users/sanket';
    saveTerminalState();
    return '';
  }

  const terminal = CloudStorage.get('terminal', {});
  const targetPath = resolvePath(path);
  const entry = terminal.vfs[targetPath];

  if (!entry) {
    return 'cd: no such file or directory: ' + path;
  }

  if (entry.type !== 'dir') {
    return 'cd: not a directory: ' + path;
  }

  termState.cwd = targetPath;
  saveTerminalState();
  return '';
}

function cmdMkdir(name) {
  if (!name) return 'mkdir: missing operand';

  const terminal = CloudStorage.get('terminal', {});
  const newPath = resolvePath(name);

  if (terminal.vfs[newPath]) {
    return 'mkdir: ' + name + ': File exists';
  }

  const parent = newPath.substring(0, newPath.lastIndexOf('/')) || '/';
  const parentEntry = terminal.vfs[parent];

  if (!parentEntry || parentEntry.type !== 'dir') {
    return 'mkdir: ' + name + ': No such file or directory';
  }

  terminal.vfs[newPath] = { type: 'dir', children: [] };
  parentEntry.children.push(name);
  CloudStorage.set('terminal', terminal);

  return '';
}

function cmdTouch(name) {
  if (!name) return 'touch: missing file operand';

  const terminal = CloudStorage.get('terminal', {});
  const newPath = resolvePath(name);

  if (terminal.vfs[newPath]) {
    return ''; // File exists, update timestamp (we don't track timestamps in demo)
  }

  const parent = newPath.substring(0, newPath.lastIndexOf('/')) || '/';
  const parentEntry = terminal.vfs[parent];

  if (!parentEntry || parentEntry.type !== 'dir') {
    return 'touch: ' + name + ': No such file or directory';
  }

  terminal.vfs[newPath] = { type: 'file', content: '', size: 0 };
  parentEntry.children.push(name);
  CloudStorage.set('terminal', terminal);

  return '';
}

function cmdCat(name) {
  if (!name) return 'cat: missing file operand';

  const terminal = CloudStorage.get('terminal', {});
  const filePath = resolvePath(name);
  const entry = terminal.vfs[filePath];

  if (!entry) {
    return 'cat: ' + name + ': No such file or directory';
  }

  if (entry.type !== 'file') {
    return 'cat: ' + name + ': Is a directory';
  }

  return entry.content || '';
}

function cmdRm(name) {
  if (!name) return 'rm: missing operand';

  const terminal = CloudStorage.get('terminal', {});
  const targetPath = resolvePath(name);
  const entry = terminal.vfs[targetPath];

  if (!entry) {
    return 'rm: ' + name + ': No such file or directory';
  }

  const parent = targetPath.substring(0, targetPath.lastIndexOf('/')) || '/';
  const parentEntry = terminal.vfs[parent];
  const fileName = name.split('/').pop();

  delete terminal.vfs[targetPath];
  if (parentEntry && parentEntry.children) {
    parentEntry.children = parentEntry.children.filter(function(c) { return c !== fileName; });
  }

  CloudStorage.set('terminal', terminal);
  return '';
}

function openVimEditor(filename, termBody) {
  if (!filename) {
    addTermLine(termBody, 'vim: missing file operand');
    return;
  }

  const terminal = CloudStorage.get('terminal', {});
  const filePath = resolvePath(filename);
  let entry = terminal.vfs[filePath];
  let content = '';

  if (entry) {
    if (entry.type !== 'file') {
      addTermLine(termBody, 'vim: ' + filename + ': Is a directory');
      return;
    }
    content = entry.content || '';
  }

  // Create vim modal
  const modal = document.createElement('div');
  modal.className = 'vim-modal';
  modal.innerHTML =
    '<div class="vim-container">' +
      '<div class="vim-header">' +
        '<span>' + filename + '</span>' +
        '<span class="vim-hint">Ctrl+S to save, Esc to exit</span>' +
      '</div>' +
      '<textarea class="vim-editor" id="vim-editor">' + content + '</textarea>' +
      '<div class="vim-footer">-- INSERT --</div>' +
    '</div>';

  document.body.appendChild(modal);

  const editor = document.getElementById('vim-editor');
  editor.focus();

  let hasChanges = false;
  editor.addEventListener('input', function() {
    hasChanges = true;
  });

  // Handle Ctrl+S to save
  editor.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveVimFile(filePath, filename, editor.value);
      hasChanges = false;
      addTermLine(termBody, '"' + filename + '" written');
      modal.remove();
    } else if (e.key === 'Escape') {
      if (hasChanges && !confirm('File has unsaved changes. Exit anyway?')) {
        return;
      }
      modal.remove();
    }
  });
}

function saveVimFile(filePath, filename, content) {
  const terminal = CloudStorage.get('terminal', {});

  if (!terminal.vfs[filePath]) {
    // Create new file
    const parent = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
    const parentEntry = terminal.vfs[parent];

    if (parentEntry && parentEntry.type === 'dir') {
      parentEntry.children.push(filename);
    }
  }

  terminal.vfs[filePath] = {
    type: 'file',
    content: content,
    size: content.length
  };

  CloudStorage.set('terminal', terminal);
}

function addTermLine(termBody, text) {
  const line = document.createElement('div');
  line.className = 'tline';
  line.textContent = text;
  const inputLine = termBody.querySelector('.tinline');
  termBody.insertBefore(line, inputLine);
  termBody.scrollTop = termBody.scrollHeight;
}

function resolvePath(path) {
  if (!path || path === '.') return termState.cwd;
  if (path === '~') return '/Users/sanket';
  if (path.startsWith('/')) return path;
  if (path === '..') {
    const parts = termState.cwd.split('/').filter(Boolean);
    parts.pop();
    return '/' + parts.join('/') || '/';
  }

  return termState.cwd + (termState.cwd === '/' ? '' : '/') + path;
}

function updatePrompt(inp) {
  const prompt = inp.parentElement.querySelector('.tprompt');
  if (prompt) prompt.textContent = getPrompt();
}

function saveTerminalState() {
  const terminal = CloudStorage.get('terminal', {});
  terminal.currentPath = termState.cwd;
  CloudStorage.autoSave('terminal', terminal);
}
