/* ===== STOCKS =====
   A watchlist and charts built from deterministic sample series. The prices
   are illustrative, not live market data, and the app labels them that way. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  const STOCKS = [
    { s: 'AAPL', n: 'Apple Inc.', p: 227.63, c: 1.23 },
    { s: 'GOOGL', n: 'Alphabet Inc.', p: 175.89, c: -0.82 },
    { s: 'MSFT', n: 'Microsoft Corporation', p: 415.4, c: 3.15 },
    { s: 'AMZN', n: 'Amazon.com, Inc.', p: 197.12, c: 1.87 },
    { s: 'TSLA', n: 'Tesla, Inc.', p: 248.91, c: -4.23 },
    { s: 'NVDA', n: 'NVIDIA Corporation', p: 881.86, c: 12.34 },
    { s: 'META', n: 'Meta Platforms, Inc.', p: 512.33, c: 5.67 },
  ];
  const RANGES = { '1D': 78, '1W': 35, '1M': 22, '3M': 64, '6M': 126, '1Y': 252 };
  let win = null;
  let current = 'AAPL';
  let range = '1D';

  function rng(seed) {
    let t = [...seed].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
    return () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  }
  /** A reproducible walk that ends at today's price. */
  function series(stock, key) {
    const count = RANGES[key];
    const random = rng(`${stock.s}:${key}`);
    const volatility = key === '1D' ? 0.0022 : key === '1W' ? 0.006 : 0.012;
    const values = [stock.p];
    for (let i = 1; i < count; i++) values.unshift(values[0] * (1 - (random() - 0.49) * volatility * 2));
    if (key === '1D') { const open = stock.p - stock.c; const scale = (stock.p - open) / (values[values.length - 1] - values[0] || 1); return values.map(v => open + (v - values[0]) * scale); }
    return values;
  }
  const pct = stock => (stock.c / (stock.p - stock.c)) * 100;
  const money = v => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function path(values, width, height, pad = 4) {
    const min = Math.min(...values), max = Math.max(...values);
    const span = max - min || 1;
    return values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * width).toFixed(1)},${(pad + (1 - (v - min) / span) * (height - pad * 2)).toFixed(1)}`).join(' ');
  }

  function renderList() {
    win.body.querySelector('[data-list]').innerHTML = STOCKS.map(stock => {
      const up = stock.c >= 0;
      return `<button type="button" class="stk-row${stock.s === current ? ' is-selected' : ''}" data-symbol="${stock.s}"><span class="stk-id"><strong>${stock.s}</strong><small>${esc(stock.n)}</small></span><svg class="stk-spark" viewBox="0 0 60 26" aria-hidden="true"><path d="${path(series(stock, '1D'), 60, 26)}" fill="none" stroke="${up ? '#30d158' : '#ff453a'}" stroke-width="1.4"/></svg><span class="stk-price"><strong>${stock.p.toFixed(2)}</strong><em class="${up ? 'up' : 'down'}">${up ? '+' : ''}${stock.c.toFixed(2)}</em></span></button>`;
    }).join('');
  }

  function renderDetail() {
    const stock = STOCKS.find(s => s.s === current);
    const values = series(stock, range);
    const up = values[values.length - 1] >= values[0];
    const change = values[values.length - 1] - values[0];
    const color = up ? '#30d158' : '#ff453a';
    const high = Math.max(...values), low = Math.min(...values);
    const random = rng(`${stock.s}:stats`);
    const stats = [
      ['Open', (stock.p - stock.c).toFixed(2)], ['High', high.toFixed(2)], ['Low', low.toFixed(2)], ['Vol', `${(20 + random() * 60).toFixed(1)}M`],
      ['P/E', (18 + random() * 50).toFixed(2)], ['Mkt Cap', `${(0.4 + random() * 3).toFixed(2)}T`], ['52W H', (stock.p * (1.08 + random() * 0.2)).toFixed(2)], ['52W L', (stock.p * (0.62 + random() * 0.2)).toFixed(2)],
    ];
    win.body.querySelector('[data-detail]').innerHTML = `<header class="stk-head"><div><h2>${stock.s}</h2><p>${esc(stock.n)}</p></div><div class="stk-quote"><strong>${money(stock.p)}</strong><em class="${stock.c >= 0 ? 'up' : 'down'}">${stock.c >= 0 ? '+' : ''}${stock.c.toFixed(2)} (${pct(stock).toFixed(2)}%)</em></div></header>
      <div class="segmented stk-ranges" role="group" aria-label="Chart range">${Object.keys(RANGES).map(r => `<button type="button" data-range="${r}" aria-pressed="${r === range}">${r}</button>`).join('')}</div>
      <div class="stk-chart"><svg viewBox="0 0 600 240" preserveAspectRatio="none" role="img" aria-label="${stock.s} ${range} chart, ${up ? 'up' : 'down'} ${Math.abs(change).toFixed(2)}"><defs><linearGradient id="stk-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${path(values, 600, 240)} L600,240 L0,240 Z" fill="url(#stk-fill)"/><path d="${path(values, 600, 240)}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><div class="stk-axis"><span>${high.toFixed(2)}</span><span>${low.toFixed(2)}</span></div></div>
      <dl class="stk-stats">${stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      <p class="stk-note">Sample data for illustration — not live market prices.</p>`;
    win.setTitle(`Stocks — ${stock.s}`);
  }

  function open() {
    win = OS.wm.create({
      app: 'stocks', title: 'Stocks', chrome: 'toolbar', width: 860, height: 560, minWidth: 420, minHeight: 380, className: 'stocks-win', lightsTop: 19, lightsLeft: 18,
      content: `<div class="stocks"><aside class="stk-sidebar"><header class="stk-sidebar-head" data-drag><div class="toolbar-flex" data-drag></div></header><h3 class="stk-title">My Symbols</h3><div class="stk-list" data-list role="listbox" aria-label="Watchlist"></div></aside><main class="stk-detail" data-detail></main></div>`,
      onClose: () => { win = null; return true; },
    });
    win.body.addEventListener('click', event => {
      const row = event.target.closest('[data-symbol]');
      if (row) { current = row.dataset.symbol; renderList(); renderDetail(); return; }
      const r = event.target.closest('[data-range]');
      if (r) { range = r.dataset.range; renderDetail(); }
    });
    win.body.querySelector('[data-list]').addEventListener('keydown', event => {
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      event.preventDefault();
      const i = STOCKS.findIndex(s => s.s === current);
      current = STOCKS[OS.util.clamp(i + (event.key === 'ArrowDown' ? 1 : -1), 0, STOCKS.length - 1)].s;
      renderList(); renderDetail();
      win.body.querySelector(`[data-symbol="${current}"]`)?.focus();
    });
    renderList();
    renderDetail();
    return win;
  }

  OS.stocks = {
    summary: () => STOCKS.slice(0, 3).map(s => ({ symbol: s.s, price: s.p.toFixed(2), change: `${s.c >= 0 ? '+' : ''}${pct(s).toFixed(2)}%`, up: s.c >= 0 })),
  };

  OS.apps.register({
    id: 'stocks',
    name: 'Stocks',
    icon: 'images/icons/apps/stocks.png',
    keywords: ['market', 'finance', 'shares', 'prices', 'ticker'],
    single: true,
    version: '7.0',
    about: 'A watchlist with charts. Prices are sample data for illustration, not live market quotes.',
    help: 'Pick a symbol to see its chart; switch ranges from 1D to 1Y. Use ↑/↓ in the list. Prices are illustrative sample data.',
    open,
  });
})();
