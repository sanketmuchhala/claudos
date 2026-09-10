/* ===== MENUS =====
   One engine for menu bar menus, context menus, and Dock menus.
   Items: { label, action, shortcut, disabled, checked, danger, icon,
   submenu: items | () => items, separator, header }. Pointer use keeps DOM
   focus where it was (so Edit ▸ Copy acts on the focused field); keyboard
   use moves focus into the menu. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  const stack = [];
  let submenuTimer;

  const normalize = items => (typeof items === 'function' ? items() : items || [])
    .filter(Boolean)
    .map(item => (item === '-' ? { separator: true } : item));
  const interactive = item => item && !item.separator && !item.header && !item.disabled;

  function render(items, uid) {
    return items.map((item, index) => {
      if (item.separator) return '<div class="menu-sep" role="separator"></div>';
      if (item.header) return `<div class="menu-header" role="presentation">${esc(item.label)}</div>`;
      const role = item.checked !== undefined ? 'menuitemcheckbox' : 'menuitem';
      const icon = item.icon ? `<span class="menu-icon">${item.icon.startsWith('<') ? item.icon : `<img src="${esc(item.icon)}" alt="" />`}</span>` : '';
      return `<div class="menu-item${item.danger ? ' is-danger' : ''}" id="${uid}-${index}" role="${role}" data-index="${index}" tabindex="-1"${item.disabled ? ' aria-disabled="true"' : ''}${item.checked !== undefined ? ` aria-checked="${!!item.checked}"` : ''}${item.submenu ? ' aria-haspopup="menu" aria-expanded="false"' : ''}>
        <span class="menu-check" aria-hidden="true">${item.checked ? '✓' : ''}</span>${icon}<span class="menu-label">${esc(item.label)}</span>${item.submenu ? '<span class="menu-arrow" aria-hidden="true">›</span>' : item.shortcut ? `<span class="menu-shortcut">${esc(item.shortcut)}</span>` : ''}
      </div>`;
    }).join('');
  }

  function place(el, opts) {
    const pad = 6;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    let left, top;
    if (opts.parentRect) {
      left = opts.parentRect.right - 3;
      top = opts.parentRect.top - 5;
      if (left + rect.width > vw - pad) left = opts.parentRect.left - rect.width + 3;
    } else if (opts.anchorRect) {
      left = opts.align === 'right' ? opts.anchorRect.right - rect.width : opts.anchorRect.left;
      top = (opts.top ?? opts.anchorRect.bottom) + (opts.gap ?? 1);
      if (opts.above) top = opts.anchorRect.top - rect.height - (opts.gap ?? 8);
      if (left + rect.width > vw - pad) left = vw - rect.width - pad;
    } else {
      left = opts.x;
      top = opts.y;
      if (left + rect.width > vw - pad) left = Math.max(pad, opts.x - rect.width);
      if (top + rect.height > vh - pad) top = Math.max(pad, opts.y - rect.height);
    }
    left = Math.max(pad, left);
    if (top + rect.height > vh - pad) {
      if (opts.parentRect) top = Math.max(pad, vh - rect.height - pad);
      else el.style.maxHeight = `${Math.max(120, vh - top - pad)}px`;
    }
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(Math.max(pad, top))}px`;
  }

  function setActive(entry, index, focus = false) {
    entry.active = index;
    entry.el.querySelectorAll('.menu-item').forEach(node => node.classList.toggle('is-active', Number(node.dataset.index) === index));
    const node = entry.el.querySelector(`[data-index="${index}"]`);
    if (node) {
      entry.el.setAttribute('aria-activedescendant', node.id);
      if (focus) node.focus({ preventScroll: true });
      node.scrollIntoView({ block: 'nearest' });
    }
  }

  function step(entry, delta) {
    const count = entry.items.length;
    let index = entry.active === -1 ? (delta > 0 ? -1 : count) : entry.active;
    for (let i = 0; i < count; i++) {
      index = (index + delta + count) % count;
      if (interactive(entry.items[index])) { setActive(entry, index, entry.keyboard); return; }
    }
  }

  function closeFrom(entry) {
    const index = stack.indexOf(entry);
    if (index === -1) return;
    const removed = stack.splice(index);
    removed.reverse().forEach(item => {
      item.el.remove();
      item.opts.onClose?.();
      if (item.parentEntry) {
        item.parentEntry.child = null;
        item.parentEntry.el.querySelector('[aria-expanded="true"]')?.setAttribute('aria-expanded', 'false');
      }
    });
    if (!stack.length) {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onOutside, true);
      window.removeEventListener('blur', closeAll);
      window.removeEventListener('resize', closeAll);
    }
  }

  function closeAll() {
    clearTimeout(submenuTimer);
    if (stack.length) closeFrom(stack[0]);
  }

  function openSubmenu(entry, index, keyboard) {
    const item = entry.items[index];
    if (!item?.submenu || item.disabled) return;
    if (entry.child?.index === index) return;
    if (entry.child) closeFrom(entry.child.menu);
    const node = entry.el.querySelector(`[data-index="${index}"]`);
    node.setAttribute('aria-expanded', 'true');
    const child = open(item.submenu, { parentRect: node.getBoundingClientRect(), parentEntry: entry, keyboard, className: entry.opts.className });
    entry.child = { index, menu: stack[stack.length - 1] };
    return child;
  }

  function activate(entry, index, keyboard = false) {
    const item = entry.items[index];
    if (!interactive(item)) return;
    if (item.submenu) { openSubmenu(entry, index, keyboard); return; }
    const node = entry.el.querySelector(`[data-index="${index}"]`);
    node?.classList.add('is-flash');
    const root = stack[0];
    const restore = root?.opts.returnFocus;
    const run = () => {
      try { item.action?.(); } catch (error) { console.error('Menu action failed', error); }
    };
    if (OS.util.motionOn()) {
      run();
      setTimeout(() => { if (root) closeFrom(root); }, 90);
    } else {
      closeAll();
      run();
    }
    if (keyboard && restore?.isConnected && !item.keepFocus) setTimeout(() => { if (document.activeElement === document.body) restore.focus({ preventScroll: true }); }, 100);
  }

  function onKey(event) {
    if (!stack.length || event.isComposing) return;
    const entry = stack[stack.length - 1];
    const handled = () => { event.preventDefault(); event.stopPropagation(); };
    switch (event.key) {
      case 'ArrowDown': handled(); entry.keyboard = true; step(entry, 1); break;
      case 'ArrowUp': handled(); entry.keyboard = true; step(entry, -1); break;
      case 'ArrowRight':
        handled();
        if (entry.items[entry.active]?.submenu) openSubmenu(entry, entry.active, true);
        else stack[0].opts.onNavigate?.(1);
        break;
      case 'ArrowLeft':
        handled();
        if (entry.parentEntry) { closeFrom(entry); entry.parentEntry.el.querySelector('.is-active')?.focus({ preventScroll: true }); }
        else stack[0].opts.onNavigate?.(-1);
        break;
      case 'Enter': case ' ':
        handled();
        if (entry.active >= 0) activate(entry, entry.active, true);
        break;
      case 'Escape': {
        handled();
        const root = stack[0];
        if (entry.parentEntry) { closeFrom(entry); return; }
        closeAll();
        root.opts.onEscape?.();
        break;
      }
      case 'Tab': closeAll(); break;
      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
          const letter = event.key.toLowerCase();
          const start = entry.active;
          for (let i = 1; i <= entry.items.length; i++) {
            const index = (start + i + entry.items.length) % entry.items.length;
            if (interactive(entry.items[index]) && entry.items[index].label.toLowerCase().startsWith(letter)) { handled(); setActive(entry, index, true); break; }
          }
        }
    }
  }

  function onOutside(event) {
    if (stack.some(entry => entry.el.contains(event.target))) return;
    const ignore = stack[0]?.opts.ignore;
    if (ignore && ignore.some?.(el => el?.contains(event.target))) return;
    closeAll();
  }

  /** Opens a menu. Returns the menu element. */
  function open(items, opts = {}) {
    if (!opts.parentEntry) closeAll();
    const list = normalize(items);
    const uid = OS.util.uid('menu');
    const el = document.createElement('div');
    el.className = `menu${opts.className ? ` ${opts.className}` : ''}`;
    el.setAttribute('role', 'menu');
    if (opts.label) el.setAttribute('aria-label', opts.label);
    el.tabIndex = -1;
    el.innerHTML = render(list, uid);
    document.getElementById('overlays').appendChild(el);
    place(el, opts);
    const entry = { el, items: list, active: -1, opts, keyboard: !!opts.keyboard, parentEntry: opts.parentEntry || null, child: null };
    stack.push(entry);

    el.addEventListener('pointerdown', event => event.preventDefault());
    el.addEventListener('pointermove', event => {
      const node = event.target.closest('.menu-item');
      if (!node) return;
      const index = Number(node.dataset.index);
      if (entry.active !== index) {
        setActive(entry, interactive(list[index]) ? index : -1);
        clearTimeout(submenuTimer);
        if (list[index]?.submenu) submenuTimer = setTimeout(() => openSubmenu(entry, index, false), 120);
        else if (entry.child) submenuTimer = setTimeout(() => entry.child && closeFrom(entry.child.menu), 200);
      }
    });
    el.addEventListener('pointerleave', () => { if (!entry.child) setActive(entry, -1); });
    el.addEventListener('click', event => {
      const node = event.target.closest('.menu-item');
      if (node) activate(entry, Number(node.dataset.index), false);
    });

    if (stack.length === 1) {
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('pointerdown', onOutside, true);
      window.addEventListener('blur', closeAll);
      window.addEventListener('resize', closeAll);
    }
    if (opts.keyboard) {
      const first = list.findIndex(interactive);
      if (first >= 0) setActive(entry, first, true); else el.focus();
    }
    return el;
  }

  OS.menu = {
    open,
    closeAll,
    isOpen: () => stack.length > 0,
    /** Runs an editing command on the focused field (Edit menu). */
    async edit(command) {
      const target = document.activeElement;
      const editable = target && (target.isContentEditable || /^(INPUT|TEXTAREA)$/.test(target.tagName));
      if (command === 'paste') {
        if (!editable || target.readOnly) return;
        try {
          const text = await navigator.clipboard.readText();
          target.focus();
          document.execCommand('insertText', false, text);
        } catch {
          OS.notify?.({ app: 'finder', title: 'Paste', message: `Use ${OS.util.mod}V to paste; this browser blocks menu access to the clipboard.` });
        }
        return;
      }
      if (command === 'selectAll' && !editable) {
        const scope = OS.wm?.focused()?.body;
        if (scope) { const range = document.createRange(); range.selectNodeContents(scope); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); }
        return;
      }
      document.execCommand(command);
    },
  };
})();
