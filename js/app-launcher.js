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
