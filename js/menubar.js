/* ===== MENUBAR CLOCK ===== */

function updMClock() {
  const n = new Date();
  document.getElementById('mclock').textContent =
    n.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' +
    n.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const nct = document.getElementById('nct');
  const ncd = document.getElementById('ncd');
  if (nct) nct.textContent = n.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (ncd) ncd.textContent = n.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

setInterval(updMClock, 1000);
updMClock();

/* ===== MENU BAR DROPDOWNS ===== */

let currentDropdown = null;

const menuData = {
  file: [
    { label: 'New Window', action: 'newWindow', shortcut: '⌘N' },
    { label: 'Close Window', action: 'closeWindow', shortcut: '⌘W' },
    { type: 'separator' },
    { label: 'Save', action: 'save', shortcut: '⌘S' },
    { label: 'Save As...', action: 'saveAs', shortcut: '⇧⌘S' }
  ],
  edit: [
    { label: 'Undo', action: 'undo', shortcut: '⌘Z' },
    { label: 'Redo', action: 'redo', shortcut: '⇧⌘Z' },
    { type: 'separator' },
    { label: 'Cut', action: 'cut', shortcut: '⌘X' },
    { label: 'Copy', action: 'copy', shortcut: '⌘C' },
    { label: 'Paste', action: 'paste', shortcut: '⌘V' }
  ],
  view: [
    { label: 'Toggle Fullscreen', action: 'fullscreen', shortcut: '⌃⌘F' },
    { type: 'separator' },
    { label: 'Zoom In', action: 'zoomIn', shortcut: '⌘+' },
    { label: 'Zoom Out', action: 'zoomOut', shortcut: '⌘-' },
    { label: 'Reset Zoom', action: 'zoomReset', shortcut: '⌘0' }
  ],
  window: [
    { label: 'Minimize', action: 'minimize', shortcut: '⌘M' },
    { label: 'Zoom', action: 'zoom' },
    { type: 'separator' },
    { label: 'Bring All to Front', action: 'bringToFront' }
  ],
  help: [
    { label: 'CloudOS Help', action: 'help' },
    { type: 'separator' },
    { label: 'About CloudOS', action: 'about' }
  ]
};

function showMenuDropdown(menuName, menuElement) {
  // Close existing dropdown
  if (currentDropdown) {
    currentDropdown.remove();
    if (currentDropdown.dataset.menu === menuName) {
      currentDropdown = null;
      return;
    }
  }

  const items = menuData[menuName];
  if (!items) return;

  const rect = menuElement.getBoundingClientRect();
  const scale = getOSScale();
  const dropdown = document.createElement('div');
  dropdown.className = 'menu-dropdown';
  dropdown.dataset.menu = menuName;
  dropdown.style.left = (rect.left / scale) + 'px';
  dropdown.style.top = ((rect.bottom / scale) + 2) + 'px';

  dropdown.innerHTML = items.map(function(item) {
    if (item.type === 'separator') {
      return '<div class="menu-separator"></div>';
    }
    return '<div class="menu-item" onclick="executeMenuAction(\'' + item.action + '\')">' +
      '<span>' + item.label + '</span>' +
      (item.shortcut ? '<span class="menu-shortcut">' + item.shortcut + '</span>' : '') +
    '</div>';
  }).join('');

  document.body.appendChild(dropdown);
  currentDropdown = dropdown;

  // Close on click outside
  setTimeout(function() {
    document.addEventListener('click', closeDropdown, { once: true });
  }, 100);
}

function closeDropdown() {
  if (currentDropdown) {
    currentDropdown.remove();
    currentDropdown = null;
  }
}

function executeMenuAction(action) {
  closeDropdown();

  const actions = {
    newWindow: function() { showNotificationBanner('Menu', 'New window feature coming soon', '📄', 2000); },
    closeWindow: function() {
      const focused = Object.values(wins).find(function(w) { return w.el.style.zIndex == zTop; });
      if (focused) closeWin(focused.id);
    },
    save: function() { showNotificationBanner('Menu', 'Save feature coming soon', '💾', 2000); },
    saveAs: function() { showNotificationBanner('Menu', 'Save As feature coming soon', '💾', 2000); },
    undo: function() { showNotificationBanner('Menu', 'Undo feature coming soon', '↩️', 2000); },
    redo: function() { showNotificationBanner('Menu', 'Redo feature coming soon', '↪️', 2000); },
    cut: function() { showNotificationBanner('Menu', 'Cut feature coming soon', '✂️', 2000); },
    copy: function() { showNotificationBanner('Menu', 'Copy feature coming soon', '📋', 2000); },
    paste: function() { showNotificationBanner('Menu', 'Paste feature coming soon', '📋', 2000); },
    fullscreen: function() {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    },
    zoomIn: function() { showNotificationBanner('Menu', 'Zoom In feature coming soon', '🔍', 2000); },
    zoomOut: function() { showNotificationBanner('Menu', 'Zoom Out feature coming soon', '🔍', 2000); },
    zoomReset: function() { showNotificationBanner('Menu', 'Reset Zoom feature coming soon', '🔍', 2000); },
    minimize: function() {
      const focused = Object.values(wins).find(function(w) { return w.el.style.zIndex == zTop; });
      if (focused) minWin(focused.id);
    },
    zoom: function() {
      const focused = Object.values(wins).find(function(w) { return w.el.style.zIndex == zTop; });
      if (focused) maxWin(focused.id);
    },
    bringToFront: function() { showNotificationBanner('Menu', 'Bring All to Front feature coming soon', '🪟', 2000); },
    help: function() { showNotificationBanner('Help', 'CloudOS Help Center', '❓', 3000); },
    about: function() { openApp('about'); }
  };

  if (actions[action]) actions[action]();
}
