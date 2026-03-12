/* ===== REMINDERS / TODO ===== */

function openTodo() {
  mkWin('todo', 'Reminders', 360, 420, getTodoHtml(), {
    init: function(el) {
      var inp = el.querySelector('.tdinp');
      if (inp) {
        inp.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' && inp.value.trim()) {
            todos.push({ t: inp.value.trim(), d: false });
            inp.value = '';
            refreshTD();
          }
        });
      }
    }
  });
}

function getTodoHtml() {
  return '<div class="tdinr"><input class="tdinp" placeholder="Add a reminder..."><button class="tdadd" onclick="addTD()">Add</button></div>' +
    '<div id="tdlist" style="padding:6px 10px">' +
      todos.map(function(t, i) {
        return '<div class="tdi">' +
          '<div class="tdcb ' + (t.d ? 'done' : '') + '" onclick="togTD(' + i + ')"></div>' +
          '<span class="tdtxt ' + (t.d ? 'done' : '') + '">' + t.t + '</span>' +
          '<span class="tddel" onclick="delTD(' + i + ')">✕</span>' +
        '</div>';
      }).join('') +
    '</div>';
}

function addTD() {
  var inp = document.querySelector('.tdinp');
  if (inp && inp.value.trim()) {
    todos.push({ t: inp.value.trim(), d: false });
    inp.value = '';
    refreshTD();
  }
}

function togTD(i) { todos[i].d = !todos[i].d; refreshTD(); }

function delTD(i) { todos.splice(i, 1); refreshTD(); }

function refreshTD() {
  var l = document.getElementById('tdlist');
  if (l) {
    l.innerHTML = todos.map(function(t, i) {
      return '<div class="tdi">' +
        '<div class="tdcb ' + (t.d ? 'done' : '') + '" onclick="togTD(' + i + ')"></div>' +
        '<span class="tdtxt ' + (t.d ? 'done' : '') + '">' + t.t + '</span>' +
        '<span class="tddel" onclick="delTD(' + i + ')">✕</span>' +
      '</div>';
    }).join('');
  }
}
