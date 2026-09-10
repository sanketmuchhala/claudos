/* ===== LOCK SCREEN AND POWER =====
   Any password unlocks (Enter or the arrow). The Apple menu can lock the
   screen, sleep, restart, shut down, log out, and force quit apps. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  let screen;
  let locked = false;
  let clockTimer;
  let onUnlock = null;

  function tick() {
    const now = new Date();
    screen.querySelector('.lock-date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    screen.querySelector('.lock-time').textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?[AP]M$/, '');
    clearTimeout(clockTimer);
    if (locked) clockTimer = setTimeout(tick, 1000 - now.getMilliseconds() + 20);
  }

  function lock(options = {}) {
    OS.menu.closeAll();
    OS.spotlight?.close(false);
    OS.launchpad?.close();
    OS.controlCenter?.close();
    OS.notificationCenter?.close();
    onUnlock = options.onUnlock || null;
    locked = true;
    screen.hidden = false;
    screen.classList.remove('is-leaving');
    screen.classList.toggle('is-boot', !!options.boot);
    document.getElementById('os').classList.add('is-locked');
    document.getElementById('desktop').inert = true;
    document.getElementById('menubar').inert = true;
    tick();
    const field = screen.querySelector('input');
    field.value = '';
    requestAnimationFrame(() => field.focus({ preventScroll: true }));
  }

  function unlock() {
    if (!locked) return;
    locked = false;
    clearTimeout(clockTimer);
    document.getElementById('desktop').inert = false;
    document.getElementById('menubar').inert = false;
    document.getElementById('os').classList.remove('is-locked');
    screen.classList.add('is-leaving');
    setTimeout(() => { if (!locked) screen.hidden = true; }, OS.util.motionOn() ? 480 : 0);
    const callback = onUnlock;
    onUnlock = null;
    callback?.();
    const top = OS.wm.visible()[0];
    if (top) { OS.wm.focus(top.id); top.focusContent(); }
  }

  function blackout(className, html, onWake) {
    const layer = OS.util.el(`<div class="blackout ${className}" tabindex="-1">${html}</div>`);
    document.body.appendChild(layer);
    requestAnimationFrame(() => layer.classList.add('is-on'));
    layer.focus();
    if (onWake) {
      const wake = () => { layer.remove(); document.removeEventListener('keydown', wake, true); onWake(); };
      setTimeout(() => { layer.addEventListener('pointerdown', wake); document.addEventListener('keydown', wake, true); }, 600);
    }
    return layer;
  }

  async function quitAll() {
    for (const id of OS.apps.running()) {
      if (id === 'finder') { for (const win of OS.wm.list('finder')) await OS.wm.close(win.id); continue; }
      if (!(await OS.apps.quit(id))) return false;
    }
    return true;
  }

  function forceQuit() {
    const existing = OS.wm.all().find(w => w.data.forceQuit);
    if (existing) { existing.focus(); return; }
    let selected = OS.apps.running()[0];
    const win = OS.wm.create({
      app: 'finder', title: 'Force Quit Applications', width: 330, height: 360, minWidth: 300, minHeight: 300, className: 'force-quit',
      content: '<div class="fq"><p class="fq-tip">If an app doesn’t respond for a while, select its name and click Force Quit.</p><div class="fq-list" role="listbox" aria-label="Running applications" tabindex="0"></div><p class="fq-tip">You can open this window by choosing Force Quit… from the Apple menu.</p><div class="fq-actions"><button type="button" class="push-button is-default" data-fq>Force Quit</button></div></div>',
    });
    win.data.forceQuit = true;
    const render = () => {
      const running = OS.apps.running();
      if (!running.includes(selected)) selected = running[0];
      win.body.querySelector('.fq-list').innerHTML = running.map(id => `<div class="fq-row${id === selected ? ' is-selected' : ''}" role="option" aria-selected="${id === selected}" data-id="${esc(id)}"><img src="${esc(OS.apps.get(id).icon)}" alt="" />${esc(OS.apps.get(id).name)}</div>`).join('');
      win.body.querySelector('[data-fq]').textContent = selected === 'finder' ? 'Relaunch' : 'Force Quit';
    };
    render();
    win.body.addEventListener('click', async event => {
      const row = event.target.closest('[data-id]');
      if (row) { selected = row.dataset.id; render(); return; }
      if (event.target.closest('[data-fq]') && selected) {
        const name = OS.apps.get(selected).name;
        const ok = await OS.dialog.confirm({ title: `Do you want to force “${name}” to quit?`, message: 'You will lose any unsaved changes.', confirm: selected === 'finder' ? 'Relaunch' : 'Force Quit', win });
        if (!ok) return;
        if (selected === 'finder') { OS.wm.list('finder').filter(w => w !== win).forEach(w => OS.wm.close(w.id, { force: true })); }
        else { for (const w of OS.wm.list(selected)) await OS.wm.close(w.id, { force: true }); OS.apps.get(selected).onQuit?.(); }
        render();
      }
    });
    const refresh = () => { if (win.el.isConnected) render(); };
    const unsubscribe = [OS.on('app:launch', refresh), OS.on('app:quit', refresh)];
    win.on('close', () => unsubscribe.forEach(off => off()));
  }

  OS.power = {
    forceQuit,
    sleep() {
      OS.menu.closeAll();
      blackout('is-sleep', '', () => { if (OS.settings.get('requirePassword')) lock(); });
    },
    async restart() {
      const ok = await OS.dialog.confirm({ title: 'Are you sure you want to restart your computer now?', message: 'CloudOS will reload. Your files, notes, and settings are kept.', confirm: 'Restart', icon: 'images/icons/files/macbook.png' });
      if (!ok) return;
      CloudStorage.flush();
      blackout('is-restart', '');
      setTimeout(() => window.location.reload(), OS.util.motionOn() ? 900 : 50);
    },
    async shutDown() {
      const ok = await OS.dialog.confirm({ title: 'Are you sure you want to shut down your computer now?', message: 'Everything you created is saved in this browser.', confirm: 'Shut Down', icon: 'images/icons/files/macbook.png' });
      if (!ok || !(await quitAll())) return;
      CloudStorage.flush();
      const layer = blackout('is-off', '<button type="button" class="power-button" aria-label="Start up CloudOS"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v8m5.5-5.2a8 8 0 1 1-11 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button><p>CloudOS is shut down. Click to start up.</p>');
      layer.addEventListener('click', () => window.location.reload());
    },
    async logOut() {
      const ok = await OS.dialog.confirm({ title: 'Are you sure you want to quit all applications and log out now?', message: 'Your files, notes, and settings are kept.', confirm: 'Log Out', icon: 'images/avatar.jpg' });
      if (!ok || !(await quitAll())) return;
      lock({ onUnlock: () => OS.startSession?.() });
    },
  };

  OS.lock = lock;
  OS.unlock = unlock;
  OS.isLocked = () => locked;
  OS.lockscreen = {
    init() {
      screen = document.getElementById('lockscreen');
      const person = Portfolio.data.person;
      screen.innerHTML = `<div class="lock-top" aria-hidden="true"><p class="lock-date"></p><p class="lock-time"></p></div>
        <form class="lock-login" autocomplete="off">
          <img class="lock-avatar" src="images/avatar.jpg" alt="${esc(person.name)}" width="88" height="88" />
          <p class="lock-name">${esc(person.name)}</p>
          <div class="lock-field"><input type="password" placeholder="Enter Password" aria-label="Password. Any password unlocks CloudOS." /><button type="submit" class="lock-go" aria-label="Unlock"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="currentColor" opacity=".25"/><path d="M8.2 6.2 12 10l-3.8 3.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
          <p class="lock-hint">Press Enter to unlock · any password works</p>
        </form>`;
      screen.querySelector('form').addEventListener('submit', event => { event.preventDefault(); unlock(); });
      screen.addEventListener('pointerdown', event => { if (!event.target.closest('form')) screen.querySelector('input').focus(); });
    },
  };
})();
