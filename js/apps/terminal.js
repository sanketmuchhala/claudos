/* ===== TERMINAL ===== */

function openTerm() {
  mkWin('terminal', 'Terminal — zsh', 600, 380,
    '<div class="term" id="tb' + (wid + 1) + '">' +
      '<div class="tline" style="color:#FFCC00">Welcome to CloudOS Terminal v2.0</div>' +
      '<div class="tline" style="color:#666">Type \'help\' for available commands</div>' +
      '<div class="tline">&nbsp;</div>' +
      '<div class="tinline"><span class="tprompt">sanket@cloudos ~ %</span><input class="tinp" autofocus></div>' +
    '</div>',
    {
      bs: 'padding:0;overflow:hidden',
      init: function(el) {
        var inp = el.querySelector('.tinp');
        var body = el.querySelector('.term');
        inp.focus();
        el.querySelector('.wbody').addEventListener('click', function() { inp.focus(); });
        inp.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            var cmd = inp.value.trim();
            inp.value = '';
            runCmd(cmd, body, inp);
          }
        });
      }
    }
  );
}

function runCmd(cmd, body, inp) {
  var il = inp.parentElement;
  var out = document.createElement('div');
  out.className = 'tline';
  out.style.color = '#999';
  out.textContent = 'sanket@cloudos ~ % ' + cmd;
  body.insertBefore(out, il);

  var r = '';
  var lc = cmd.toLowerCase();

  if (!cmd) {}
  else if (lc === 'help') r = 'Commands: help, date, whoami, ls, pwd, echo, clear, uname, neofetch, cal, uptime, fortune, cowsay, history, matrix';
  else if (lc === 'date') r = new Date().toString();
  else if (lc === 'whoami') r = 'sanket';
  else if (lc === 'pwd') r = '/Users/sanket';
  else if (lc === 'ls') r = 'Desktop/    Documents/  Downloads/  Music/\nPictures/   Movies/     Projects/   merchant.live/';
  else if (lc.startsWith('echo ')) r = cmd.slice(5);
  else if (lc === 'clear') { body.querySelectorAll('.tline').forEach(function(l) { l.remove(); }); return; }
  else if (lc.startsWith('uname')) r = 'CloudOS 14.2.1 Darwin Kernel Version 23.2.0 x86_64';
  else if (lc === 'uptime') r = 'up ' + (Math.floor(Math.random() * 30) + 1) + ' days, ' + Math.floor(Math.random() * 24) + ':' + String(Math.floor(Math.random() * 60)).padStart(2, '0');
  else if (lc === 'neofetch') {
    var root = document.getElementById('os-root');
    r = '        ████████        sanket@cloudos\n      ██        ██      ──────────────\n    ██            ██    OS: CloudOS 14.2.1\n   ██   ████████  ██   Host: Browser VM\n   ██   ██    ██  ██   Kernel: CloudKernel 23.2.0\n    ██            ██    Shell: zsh 5.9\n      ██        ██      Resolution: ' + root.offsetWidth + 'x' + root.offsetHeight + '\n        ████████        Memory: 16384MB';
  }
  else if (lc === 'cal') {
    var d = new Date();
    r = '     ' + d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + '\nSu Mo Tu We Th Fr Sa\n';
    var f = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
    var la = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    var line = '   '.repeat(f);
    for (var i = 1; i <= la; i++) {
      line += String(i).padStart(2) + ' ';
      if ((i + f) % 7 === 0) line += '\n';
    }
    r += line;
  }
  else if (lc === 'history') r = termHist.map(function(h, i) { return '  ' + (i + 1) + '  ' + h; }).join('\n') || '(empty)';
  else if (lc === 'fortune') {
    var fortunes = [
      'The best way to predict the future is to create it.',
      'Code is like humor. When you have to explain it, it\'s bad.',
      'First, solve the problem. Then, write the code.',
      'Talk is cheap. Show me the code. — Linus Torvalds',
      'Simplicity is the soul of efficiency.'
    ];
    r = fortunes[Math.floor(Math.random() * fortunes.length)];
  }
  else if (lc.startsWith('cowsay')) {
    var m = cmd.slice(7) || 'Moo!';
    var b = '-'.repeat(m.length + 2);
    r = ' ' + b + '\n< ' + m + ' >\n ' + b + '\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||';
  }
  else if (lc === 'matrix') {
    r = Array(6).fill(0).map(function() {
      return Array(45).fill(0).map(function() {
        return Math.random() > .5 ? String.fromCharCode(0x30A0 + Math.random() * 96) : ' ';
      }).join('');
    }).join('\n');
  }
  else r = 'zsh: command not found: ' + cmd.split(' ')[0];

  if (cmd) termHist.push(cmd);
  if (r) {
    var res = document.createElement('div');
    res.className = 'tline';
    res.textContent = r;
    res.style.whiteSpace = 'pre-wrap';
    body.insertBefore(res, il);
  }
  body.scrollTop = body.scrollHeight;
}
