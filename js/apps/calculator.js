/* ===== CALCULATOR =====
   Basic calculator with chained operations, percent, sign, backspace, and
   keyboard input (digits, + - * / % . Enter = Esc Backspace). */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  let win = null;
  const state = { display: '0', stored: null, op: null, fresh: false, expression: '', lastOp: null, lastOperand: null };
  const SYMBOL = { '+': '+', '-': '−', '*': '×', '/': '÷' };

  function compute(a, b, op) {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '*') return a * b;
    if (op === '/') return b === 0 ? NaN : a / b;
    return b;
  }
  function format(value) {
    if (!Number.isFinite(value)) return 'Error';
    const rounded = Math.round(value * 1e10) / 1e10;
    const text = String(rounded);
    if (text.replace(/[-.]/g, '').length > 11) return rounded.toExponential(5).replace('e+', 'e');
    return text;
  }
  const pretty = text => {
    if (text === 'Error' || text.includes('e')) return text;
    const [int, dec] = text.split('.');
    return `${Number(int).toLocaleString('en-US')}${text.includes('.') ? `.${dec}` : ''}`.replace(/^-0$/, '-0');
  };

  function input(digit) {
    if (state.fresh || state.display === 'Error') { state.display = '0'; state.fresh = false; }
    if (digit === '.' && state.display.includes('.')) return;
    if (state.display.replace(/[-.]/g, '').length >= 9 && digit !== '.') return;
    state.display = state.display === '0' && digit !== '.' ? digit : state.display === '-0' && digit !== '.' ? `-${digit}` : state.display + digit;
    render();
  }
  function operator(op) {
    const current = parseFloat(state.display);
    if (state.op && !state.fresh) {
      const result = compute(state.stored, current, state.op);
      state.display = format(result);
      state.stored = result;
    } else state.stored = current;
    state.op = op;
    state.fresh = true;
    state.expression = `${pretty(format(state.stored))} ${SYMBOL[op]}`;
    render();
  }
  function equals() {
    if (!state.op && state.lastOp) {
      state.display = format(compute(parseFloat(state.display), state.lastOperand, state.lastOp));
      state.fresh = true;
      render();
      return;
    }
    if (!state.op) return;
    const operand = parseFloat(state.display);
    const result = compute(state.stored, operand, state.op);
    state.expression = `${pretty(format(state.stored))} ${SYMBOL[state.op]} ${pretty(format(operand))} =`;
    state.lastOp = state.op;
    state.lastOperand = operand;
    state.display = format(result);
    state.op = null;
    state.stored = null;
    state.fresh = true;
    render();
  }
  function clear() {
    if (state.display !== '0' && !state.fresh) { state.display = '0'; }
    else Object.assign(state, { display: '0', stored: null, op: null, fresh: false, expression: '', lastOp: null, lastOperand: null });
    render();
  }
  function backspace() {
    if (state.fresh || state.display === 'Error') return;
    state.display = state.display.length > 1 && !(state.display.length === 2 && state.display.startsWith('-')) ? state.display.slice(0, -1) : '0';
    render();
  }
  function sign() {
    if (state.display === 'Error') return;
    state.display = state.display.startsWith('-') ? state.display.slice(1) : `-${state.display}`;
    if (state.fresh) state.fresh = false;
    render();
  }
  function percent() {
    const value = parseFloat(state.display);
    state.display = format(state.op && state.stored !== null && ['+', '-'].includes(state.op) ? state.stored * value / 100 : value / 100);
    render();
  }

  function render() {
    if (!win) return;
    const display = win.body.querySelector('[data-display]');
    const text = pretty(state.display);
    display.textContent = text;
    display.style.fontSize = text.length > 9 ? `${Math.max(22, 46 - (text.length - 9) * 3.2)}px` : '';
    win.body.querySelector('[data-expression]').textContent = state.expression;
    win.body.querySelector('[data-clear]').textContent = state.display !== '0' && !state.fresh ? '⌫' : 'AC';
    win.body.querySelector('[data-clear]').setAttribute('aria-label', state.display !== '0' && !state.fresh ? 'Delete' : 'All clear');
    win.body.querySelectorAll('[data-op]').forEach(b => b.classList.toggle('is-active', state.fresh && state.op === b.dataset.op));
  }

  const BUTTONS = [
    ['clear', 'AC', 'fn'], ['sign', '±', 'fn'], ['percent', '%', 'fn'], ['op:/', '÷', 'op'],
    ['7'], ['8'], ['9'], ['op:*', '×', 'op'],
    ['4'], ['5'], ['6'], ['op:-', '−', 'op'],
    ['1'], ['2'], ['3'], ['op:+', '+', 'op'],
    ['calc', '', 'fn is-calc'], ['0'], ['.'], ['equals', '=', 'op'],
  ];

  function press(key) {
    if (/^[0-9.]$/.test(key)) input(key);
    else if (key.startsWith('op:')) operator(key.slice(3));
    else if (key === 'equals') equals();
    else if (key === 'clear') { if (state.display !== '0' && !state.fresh) backspace(); else clear(); }
    else if (key === 'sign') sign();
    else if (key === 'percent') percent();
    else if (key === 'calc') navigator.clipboard?.writeText(state.display).then(() => OS.notify({ app: 'calculator', title: 'Copied', message: `${pretty(state.display)} is on the clipboard.`, timeout: 2500 })).catch(() => {});
  }

  function open() {
    win = OS.wm.create({
      app: 'calculator', title: 'Calculator', chrome: 'none', width: 240, height: 404, resizable: false, className: 'calculator-win', lightsTop: 12, lightsLeft: 12,
      content: `<div class="calc" tabindex="0" aria-label="Calculator. Type numbers and operators.">
        <div class="calc-screen" data-drag><div class="calc-expression" data-expression aria-hidden="true"></div><div class="calc-display" data-display role="status" aria-live="polite">0</div></div>
        <div class="calc-keys">${BUTTONS.map(([key, label = key, kind = 'num']) => `<button type="button" class="calc-key ${kind}${key === '0' ? ' is-zero' : ''}" data-key="${key}"${key === 'clear' ? ' data-clear' : ''}${key.startsWith('op:') ? ` data-op="${key.slice(3)}"` : ''}${key === 'calc' ? ' aria-label="Copy result" title="Copy result"' : ''}>${key === 'calc' ? '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="10" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 5h5M5.5 8h1m2 0h1m2 0h0M5.5 11h1m2 0h1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>' : esc(label)}</button>`).join('')}</div>
      </div>`,
      onFocusRequest: () => win.body.querySelector('.calc').focus({ preventScroll: true }),
      onClose: () => { win = null; return true; },
    });
    win.body.addEventListener('click', event => {
      const button = event.target.closest('[data-key]');
      if (button) press(button.dataset.key);
    });
    win.body.querySelector('.calc').addEventListener('keydown', event => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key.toLowerCase() === 'c') { navigator.clipboard?.writeText(state.display).catch(() => {}); event.preventDefault(); }
        return;
      }
      const map = { '+': 'op:+', '-': 'op:-', '*': 'op:*', x: 'op:*', '/': 'op:/', '=': 'equals', Enter: 'equals', '%': 'percent', Escape: 'clear' };
      let key = map[event.key] || (/^[0-9.]$/.test(event.key) ? event.key : null);
      if (event.key === 'Backspace') { event.preventDefault(); backspace(); return; }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); clear(); return; }
      if (!key) return;
      event.preventDefault();
      press(key);
      const button = win.body.querySelector(`[data-key="${CSS.escape(key)}"]`);
      button?.classList.add('is-pressed');
      setTimeout(() => button?.classList.remove('is-pressed'), 110);
    });
    render();
    return win;
  }

  OS.apps.register({
    id: 'calculator',
    name: 'Calculator',
    icon: 'images/icons/apps/calculator.png',
    keywords: ['math', 'calc', 'numbers', 'arithmetic'],
    single: true,
    version: '11.0',
    about: 'Add, subtract, multiply, and divide, with chained operations and percentages. Type on your keyboard too.',
    help: 'Type digits and + − × ÷ on your keyboard; Enter or = calculates, Backspace deletes a digit, Esc clears. The calculator button copies the result. Spotlight can also do quick arithmetic.',
    open,
    menus: () => [
      { title: 'Edit', items: [
        { label: 'Copy', shortcut: `${OS.util.mod}C`, action: () => navigator.clipboard?.writeText(state.display).catch(() => {}) },
        { label: 'Paste', shortcut: `${OS.util.mod}V`, action: async () => { try { const text = (await navigator.clipboard.readText()).trim(); if (/^-?\d*\.?\d+$/.test(text)) { state.display = text; state.fresh = false; render(); } } catch { /* Clipboard unavailable. */ } } },
        '-',
        { label: 'Clear All', action: () => { Object.assign(state, { display: '0', stored: null, op: null, fresh: false, expression: '' }); render(); } },
      ] },
    ],
  });
})();
