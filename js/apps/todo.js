/* ===== REMINDERS / TODO ===== */

function openTodo() {
  mkWin('todo', 'Reminders', 360, 420, getTodoHtml(), {
    init: function(el) {
      var inp = el.querySelector('.tdinp');
      if (inp) {
        inp.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' && inp.value.trim()) {
            addTD();
          }
        });
      }
    }
  });
  updateTodoBadge(); // Update dock badge when window opens
}

function getTodoHtml() {
  const todos = CloudStorage.get('todos', []);
  const incomplete = todos.filter(function(t) { return !t.d; });

  return '<div class="tdinr">' +
      '<input class="tdinp" placeholder="Add a reminder...">' +
      '<button class="tdadd" onclick="addTD()">Add</button>' +
    '</div>' +
    '<div class="td-stats">' +
      '<span style="font-weight:600;color:var(--text)">' + incomplete.length + '</span> remaining' +
    '</div>' +
    '<div id="tdlist" style="padding:6px 10px">' +
      (todos.length > 0 ?
        todos.map(function(t, i) {
          return '<div class="tdi">' +
            '<div class="tdcb ' + (t.d ? 'done' : '') + '" onclick="togTD(' + i + ')"></div>' +
            '<span class="tdtxt ' + (t.d ? 'done' : '') + '">' + t.t + '</span>' +
            '<span class="tddel" onclick="delTD(' + i + ')">✕</span>' +
          '</div>';
        }).join('')
        : '<div class="td-empty">No reminders yet</div>'
      ) +
    '</div>';
}

function addTD() {
  var inp = document.querySelector('.tdinp');
  if (!inp || !inp.value.trim()) return;

  const todos = CloudStorage.get('todos', []);

  todos.push({
    id: Date.now(),
    t: inp.value.trim(),
    d: false
  });

  CloudStorage.set('todos', todos);
  inp.value = '';
  refreshTD();
  updateTodoBadge();
}

function togTD(i) {
  const todos = CloudStorage.get('todos', []);
  if (!todos[i]) return;

  todos[i].d = !todos[i].d;
  CloudStorage.set('todos', todos);
  refreshTD();
  updateTodoBadge();

  // Show notification
  const status = todos[i].d ? 'completed' : 'marked incomplete';
  showNotificationBanner('Reminders', 'Task ' + status, '✅', 2000);
}

function delTD(i) {
  const todos = CloudStorage.get('todos', []);
  if (!todos[i]) return;

  todos.splice(i, 1);
  CloudStorage.set('todos', todos);
  refreshTD();
  updateTodoBadge();
  showNotificationBanner('Reminders', 'Task deleted', '✅', 2000);
}

function refreshTD() {
  const todos = CloudStorage.get('todos', []);
  const l = document.getElementById('tdlist');

  if (l) {
    l.innerHTML = todos.length > 0 ?
      todos.map(function(t, i) {
        return '<div class="tdi">' +
          '<div class="tdcb ' + (t.d ? 'done' : '') + '" onclick="togTD(' + i + ')"></div>' +
          '<span class="tdtxt ' + (t.d ? 'done' : '') + '">' + t.t + '</span>' +
          '<span class="tddel" onclick="delTD(' + i + ')">✕</span>' +
        '</div>';
      }).join('')
      : '<div class="td-empty">No reminders yet</div>';
  }

  // Update stats
  const stats = document.querySelector('.td-stats');
  if (stats) {
    const incomplete = todos.filter(function(t) { return !t.d; }).length;
    stats.innerHTML = '<span style="font-weight:600;color:var(--text)">' + incomplete + '</span> remaining';
  }
}

function updateTodoBadge() {
  const todos = CloudStorage.get('todos', []);
  const incomplete = todos.filter(function(t) { return !t.d; }).length;

  // Update dock badge (uses animations.js function)
  if (typeof updateDockBadge === 'function') {
    updateDockBadge('todo', incomplete > 0 ? incomplete : null);
  }
}
