/* ===== APP SWITCHER (Cmd+Tab) ===== */

let appSwitcher = {
  open: false,
  selectedIndex: 0,
  windows: []
};

function openAppSwitcher() {
  // Get all open windows
  const openWindows = Array.from(document.querySelectorAll('.win')).map(function(win) {
    return {
      id: win.dataset.id,
      app: win.dataset.app,
      title: win.querySelector('.wtitle')?.textContent || 'Untitled',
      icon: getAppIcon(win.dataset.app),
      minimized: win.style.display === 'none',
      element: win
    };
  });

  if (openWindows.length === 0) return;

  appSwitcher.windows = openWindows;
  appSwitcher.selectedIndex = 0;
  appSwitcher.open = true;

  renderAppSwitcher();
}

function renderAppSwitcher() {
  // Remove existing switcher if any
  const existing = document.getElementById('app-switcher');
  if (existing) existing.remove();

  const switcher = document.createElement('div');
  switcher.id = 'app-switcher';
  switcher.innerHTML =
    '<div class="switcher-backdrop"></div>' +
    '<div class="switcher-container">' +
      appSwitcher.windows.map(function(win, i) {
        return '<div class="switcher-item ' + (i === appSwitcher.selectedIndex ? 'selected' : '') + '">' +
          '<div class="switcher-icon">' + win.icon + '</div>' +
          '<div class="switcher-title">' + win.title + '</div>' +
          (win.minimized ? '<div class="switcher-minimized">Minimized</div>' : '') +
        '</div>';
      }).join('') +
    '</div>';

  document.body.appendChild(switcher);

  // Animate in
  requestAnimationFrame(function() {
    switcher.classList.add('visible');
  });
}

function cycleSwitcher(direction) {
  if (!appSwitcher.open || appSwitcher.windows.length === 0) return;

  appSwitcher.selectedIndex += direction;

  if (appSwitcher.selectedIndex < 0) {
    appSwitcher.selectedIndex = appSwitcher.windows.length - 1;
  } else if (appSwitcher.selectedIndex >= appSwitcher.windows.length) {
    appSwitcher.selectedIndex = 0;
  }

  // Update UI
  const items = document.querySelectorAll('.switcher-item');
  items.forEach(function(item, i) {
    item.classList.toggle('selected', i === appSwitcher.selectedIndex);
  });
}

function closeAppSwitcher() {
  if (!appSwitcher.open) return;

  const selectedWindow = appSwitcher.windows[appSwitcher.selectedIndex];
  if (selectedWindow) {
    focusAppWindow(selectedWindow.id);
  }

  const switcher = document.getElementById('app-switcher');
  if (switcher) {
    switcher.classList.remove('visible');
    setTimeout(function() {
      switcher.remove();
    }, 200);
  }

  appSwitcher.open = false;
  appSwitcher.windows = [];
  appSwitcher.selectedIndex = 0;
}

function focusAppWindow(winId) {
  const win = document.querySelector('.win[data-id="' + winId + '"]');
  if (!win) return;

  // If minimized, restore it
  if (win.style.display === 'none') {
    const appName = win.dataset.app;
    windows.forEach(function(w) {
      if (w.id === winId) {
        w.min = false;
      }
    });

    // Use smooth restore animation if available
    const savedStyles = win.dataset.savedStyles;
    if (savedStyles && typeof smoothRestore === 'function') {
      win.style.display = 'block';
      smoothRestore(win, savedStyles, function() {
        focWin(winId);
      });
    } else {
      win.style.display = 'block';
      focWin(winId);
    }
  } else {
    focWin(winId);
  }
}

function getAppIcon(appName) {
  const icons = {
    'finder': '📁',
    'safari': '🧭',
    'terminal': '⬛',
    'calculator': '🧮',
    'notes': '📝',
    'music': '🎵',
    'calendar': '📅',
    'weather': '🌤️',
    'clock': '🕐',
    'photos': '🖼️',
    'stocks': '📈',
    'todo': '✅',
    'textedit': '📄',
    'camera': '📸',
    'settings': '⚙️',
    'about': '💻'
  };

  return icons[appName] || '📦';
}
