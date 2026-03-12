/* ===== APP LAUNCHER ===== */

function openApp(id) {
  // Restore minimized window if one exists
  for (let [k, w] of Object.entries(wins)) {
    if (w.app === id && w.min) {
      w.el.style.display = '';
      w.min = false;
      focusWin(k);
      return;
    }
  }

  const apps = {
    finder: openFinder,
    calc: openCalc,
    terminal: openTerm,
    notes: openNotes,
    settings: openSettings,
    weather: openWeather,
    music: openMusic,
    calendar: openCal,
    clock: openClk,
    stocks: openStocks,
    safari: openSafari,
    textedit: openTE,
    camera: openCam,
    photos: openPhotos,
    todo: openTodo,
    about: openAbout
  };

  if (apps[id]) apps[id]();
}

/* ===== URL & FOLDER SHORTCUTS ===== */

function openURL(url) {
  // Open Safari with URL
  openApp('safari');
  setTimeout(function() {
    const urlBar = document.querySelector('.surl');
    if (urlBar) {
      urlBar.value = url;
      // Trigger navigation in Safari app
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      urlBar.dispatchEvent(event);
    }
  }, 250);
  showNotificationBanner('Safari', 'Opening ' + url, '🧭', 2000);
}

function openProjectsFolder() {
  openApp('finder');
  setTimeout(function() {
    const sidebar = document.querySelectorAll('.fsbi');
    sidebar.forEach(function(item) {
      item.classList.remove('active');
    });
  }, 100);
  showNotificationBanner('Finder', 'Opening Projects folder', '📂', 2000);
}
