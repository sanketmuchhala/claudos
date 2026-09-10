/* ===== ALERTS AND SHEETS =====
   Promise-based replacements for alert/confirm/prompt. With a window they
   appear as a sheet over that window; otherwise centered over the desktop. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;

  function show({ title, message = '', buttons = ['OK'], defaultButton, cancelButton, destructive, icon, win, input }) {
    return new Promise(resolve => {
      const previousFocus = document.activeElement;
      const host = win?.el || document.getElementById('overlays');
      const iconSrc = icon || (win ? OS.apps.get(win.app)?.icon : null) || 'images/icons/apps/finder.png';
      const primary = defaultButton || buttons[0];
      const cancel = cancelButton || buttons.find(b => /^cancel$/i.test(b)) || (buttons.length > 1 ? buttons[buttons.length - 1] : null);
      const id = OS.util.uid('alert');
      const layer = OS.util.el(`<div class="alert-layer${win ? ' is-sheet' : ''}" role="presentation">
        <div class="alert" role="alertdialog" aria-modal="true" aria-labelledby="${id}-title"${message ? ` aria-describedby="${id}-message"` : ''}>
          <img class="alert-icon" src="${esc(iconSrc)}" alt="" />
          <h2 id="${id}-title" class="alert-title">${esc(title)}</h2>
          ${message ? `<p id="${id}-message" class="alert-message">${esc(message)}</p>` : ''}
          ${input ? `<input class="alert-input" type="text" value="${esc(input.value || '')}" placeholder="${esc(input.placeholder || '')}" aria-label="${esc(input.label || title)}" spellcheck="false" />` : ''}
          <div class="alert-buttons${buttons.length > 2 ? ' is-stacked' : ''}">
            ${buttons.map(label => `<button type="button" class="alert-button${label === primary ? ' is-default' : ''}${destructive && label === destructive ? ' is-destructive' : ''}" data-choice="${esc(label)}">${esc(label)}</button>`).join('')}
          </div>
        </div>
      </div>`);
      host.appendChild(layer);
      const field = layer.querySelector('.alert-input');
      const finish = choice => {
        layer.classList.add('is-closing');
        setTimeout(() => layer.remove(), OS.util.motionOn() ? 140 : 0);
        document.removeEventListener('keydown', onKey, true);
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
        resolve(input ? (choice === primary ? field.value : null) : choice);
      };
      const onKey = event => {
        if (!layer.isConnected) return;
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finish(cancel); }
        else if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement && event.target !== layer.querySelector('.is-default'))) { event.preventDefault(); event.stopPropagation(); finish(primary); }
        else if (event.key === 'Tab') {
          const focusables = [...layer.querySelectorAll('button, input')];
          const index = focusables.indexOf(document.activeElement);
          event.preventDefault();
          focusables[(index + (event.shiftKey ? -1 : 1) + focusables.length) % focusables.length].focus();
        }
      };
      layer.addEventListener('click', event => {
        const button = event.target.closest('[data-choice]');
        if (button) finish(button.dataset.choice);
      });
      document.addEventListener('keydown', onKey, true);
      requestAnimationFrame(() => {
        if (field) { field.focus(); field.select(); } else layer.querySelector('.is-default')?.focus();
      });
    });
  }

  OS.dialog = {
    ask: show,
    async confirm({ title, message, confirm = 'OK', cancel = 'Cancel', destructive = false, icon, win }) {
      const choice = await show({ title, message, buttons: [confirm, cancel], defaultButton: confirm, cancelButton: cancel, destructive: destructive ? confirm : null, icon, win });
      return choice === confirm;
    },
    async alert({ title, message, icon, win, button = 'OK' }) {
      await show({ title, message, buttons: [button], icon, win });
    },
    prompt({ title, message, value = '', placeholder = '', confirm = 'OK', cancel = 'Cancel', icon, win }) {
      return show({ title, message, buttons: [confirm, cancel], defaultButton: confirm, cancelButton: cancel, icon, win, input: { value, placeholder } });
    },
  };
})();
