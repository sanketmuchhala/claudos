/* ===== CALENDAR ===== */

let selectedCalDate = null;

function openCal() {
  mkWin('calendar', 'Calendar', 680, 480, getCalHtml());
}

function getCalHtml() {
  const d = calDate;
  const mo = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const fd = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const dm = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const td = new Date();

  const events = CloudStorage.get('calendar_events', []);

  // Build calendar grid
  let g = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(function(n) {
    return '<div class="cdn">' + n + '</div>';
  }).join('');

  // Previous month days
  const pm = new Date(d.getFullYear(), d.getMonth(), 0).getDate();
  for (let i = fd - 1; i >= 0; i--) {
    g += '<div class="cd om">' + (pm - i) + '</div>';
  }

  // Current month days
  for (let i = 1; i <= dm; i++) {
    const isToday = i === td.getDate() && d.getMonth() === td.getMonth() && d.getFullYear() === td.getFullYear();
    const dateStr = formatCalDate(d.getFullYear(), d.getMonth(), i);
    const hasEvent = events.some(function(e) { return e.date === dateStr; });

    g += '<div class="cd ' + (isToday ? 'today' : '') + '" onclick="selectCalDate(\'' + dateStr + '\')">' +
      i +
      (hasEvent ? '<div class="event-dot"></div>' : '') +
    '</div>';
  }

  // Next month days
  const rem = 42 - (fd + dm);
  for (let i = 1; i <= rem; i++) {
    g += '<div class="cd om">' + i + '</div>';
  }

  return '<div style="display:flex;height:100%">' +
    '<div style="flex:1">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border)">' +
        '<button class="cal-nav-btn" onclick="chMo(-1)">◀</button>' +
        '<h3 style="font-size:16px;font-weight:700;color:var(--text)">' + mo + '</h3>' +
        '<button class="cal-nav-btn" onclick="chMo(1)">▶</button>' +
      '</div>' +
      '<div class="calgrid">' + g + '</div>' +
    '</div>' +
    '<div class="cal-sidebar">' +
      '<div class="cal-sidebar-header">' +
        '<h4>Events</h4>' +
        '<button class="btn-add-event" onclick="showEventModal()">+ Add</button>' +
      '</div>' +
      '<div id="cal-events-list">' +
        (selectedCalDate ? getEventsListHtml(selectedCalDate) : '<div class="cal-empty">Select a date to view events</div>') +
      '</div>' +
    '</div>' +
  '</div>';
}

function selectCalDate(dateStr) {
  selectedCalDate = dateStr;

  // Update events list
  const eventsList = document.getElementById('cal-events-list');
  if (eventsList) {
    eventsList.innerHTML = getEventsListHtml(dateStr);
  }
}

function getEventsListHtml(dateStr) {
  const events = CloudStorage.get('calendar_events', []);
  const dateEvents = events.filter(function(e) { return e.date === dateStr; });

  if (dateEvents.length === 0) {
    return '<div class="cal-empty">No events on ' + formatDateDisplay(dateStr) + '</div>' +
      '<button class="btn-add-event-main" onclick="showEventModal(\'' + dateStr + '\')">+ Add Event</button>';
  }

  return '<div class="cal-date-label">' + formatDateDisplay(dateStr) + '</div>' +
    dateEvents.map(function(e) {
      return '<div class="cal-event-item">' +
        '<div class="cal-event-title">' + e.title + '</div>' +
        (e.description ? '<div class="cal-event-desc">' + e.description + '</div>' : '') +
        '<button class="cal-event-delete" onclick="deleteEvent(' + e.id + ')">Delete</button>' +
      '</div>';
    }).join('') +
    '<button class="btn-add-event-main" onclick="showEventModal(\'' + dateStr + '\')">+ Add Event</button>';
}

function showEventModal(dateStr) {
  const targetDate = dateStr || selectedCalDate || formatCalDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const modal = document.createElement('div');
  modal.className = 'event-modal';
  modal.innerHTML =
    '<div class="modal-content">' +
      '<div class="modal-header">' +
        '<h3>New Event</h3>' +
        '<button class="modal-close" onclick="this.closest(\'.event-modal\').remove()">✕</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<label>Date</label>' +
        '<input type="text" id="event-date" value="' + formatDateDisplay(targetDate) + '" readonly>' +
        '<label>Title</label>' +
        '<input type="text" id="event-title" placeholder="Event title" autofocus>' +
        '<label>Description (optional)</label>' +
        '<textarea id="event-desc" placeholder="Event description" rows="3"></textarea>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn-cancel" onclick="this.closest(\'.event-modal\').remove()">Cancel</button>' +
        '<button class="btn-save" onclick="saveEvent(\'' + targetDate + '\')">Save</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);

  // Focus title input
  setTimeout(function() {
    const titleInput = document.getElementById('event-title');
    if (titleInput) titleInput.focus();
  }, 100);
}

function saveEvent(dateStr) {
  const title = document.getElementById('event-title').value.trim();
  const desc = document.getElementById('event-desc').value.trim();

  if (!title) {
    alert('Please enter an event title');
    return;
  }

  const events = CloudStorage.get('calendar_events', []);
  events.push({
    id: Date.now(),
    date: dateStr,
    title: title,
    description: desc
  });

  CloudStorage.set('calendar_events', events);

  // Close modal
  document.querySelector('.event-modal').remove();

  // Refresh calendar
  refreshCalendar();

  showNotificationBanner('Calendar', 'Event created', '📅', 2000);
}

function deleteEvent(eventId) {
  if (!confirm('Delete this event?')) return;

  const events = CloudStorage.get('calendar_events', []);
  const index = events.findIndex(function(e) { return e.id === eventId; });

  if (index !== -1) {
    events.splice(index, 1);
    CloudStorage.set('calendar_events', events);
    refreshCalendar();
    showNotificationBanner('Calendar', 'Event deleted', '📅', 2000);
  }
}

function chMo(dir) {
  calDate.setMonth(calDate.getMonth() + dir);
  refreshCalendar();
}

function refreshCalendar() {
  document.querySelectorAll('.win').forEach(function(w) {
    if (w.dataset.app === 'calendar') {
      w.querySelector('.wbody').innerHTML = getCalHtml();
    }
  });
}

function formatCalDate(year, month, day) {
  return year + '-' + pad(month + 1) + '-' + pad(day);
}

function formatDateDisplay(dateStr) {
  const parts = dateStr.split('-');
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function pad(n) {
  return n < 10 ? '0' + n : n;
}
