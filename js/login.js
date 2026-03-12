/* ===== LOGIN SYSTEM ===== */

function updLoginClock() {
  const n = new Date();
  const lt = document.getElementById('ltime');
  const ld = document.getElementById('ldate');
  if (lt) lt.textContent = n.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/^0/, '');
  if (ld) ld.textContent = n.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function unlock() {
  const l = document.getElementById('login');
  l.style.transition = 'opacity .5s, transform .5s';
  l.style.opacity = '0';
  l.style.transform = 'scale(1.08)';
  setTimeout(() => l.style.display = 'none', 500);
}

updLoginClock();
setInterval(updLoginClock, 1000);

document.getElementById('lpw').addEventListener('keydown', e => {
  if (e.key === 'Enter') unlock();
});

document.getElementById('login').addEventListener('click', e => {
  if (e.target.id === 'login') document.getElementById('lpw').focus();
});
