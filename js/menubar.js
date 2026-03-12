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
