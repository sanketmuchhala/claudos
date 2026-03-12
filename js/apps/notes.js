/* ===== NOTES ===== */

let currentNoteId = null;

function openNotes() {
  const notes = CloudStorage.get('notes', [
    { id: Date.now(), title: 'Welcome', body: 'Welcome to Notes!', timestamp: Date.now() }
  ]);

  // Select first note or create empty state
  currentNoteId = notes.length > 0 ? notes[0].id : null;

  const html =
    '<div style="display:flex;height:100%">' +
      '<div class="nsb">' +
        '<div class="nsb-header">' +
          '<button class="nnew" onclick="createNewNote()">+ New Note</button>' +
        '</div>' +
        '<div id="notes-list">' + renderNotesList(notes) + '</div>' +
      '</div>' +
      '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden">' +
        (notes.length > 0 ?
          '<textarea class="nta" id="nta" oninput="saveNoteContent()" placeholder="Start typing...">' + notes[0].body + '</textarea>' +
          '<div class="note-footer">' +
            '<button class="btn-delete" onclick="deleteCurrentNote()">🗑️ Delete</button>' +
            '<span class="note-info">' + formatNoteTimestamp(notes[0].timestamp) + '</span>' +
          '</div>'
          : '<div class="note-empty">No notes. Create one to get started.</div>'
        ) +
      '</div>' +
    '</div>';

  mkWin('notes', 'Notes', 680, 460, html, { bs: 'overflow:hidden' });
}

function renderNotesList(notes) {
  if (notes.length === 0) return '<div class="note-empty-sidebar">No notes yet</div>';

  return notes.map(function(n) {
    const isActive = n.id === currentNoteId;
    const preview = n.body.slice(0, 50) || 'Empty note';
    const timeStr = formatTimestamp(n.timestamp);

    return '<div class="nli ' + (isActive ? 'active' : '') + '" onclick="selectNote(' + n.id + ', this)">' +
      '<h4>' + (n.title || 'Untitled') + '</h4>' +
      '<p>' + preview + (n.body.length > 50 ? '...' : '') + '</p>' +
      '<span class="note-time">' + timeStr + '</span>' +
    '</div>';
  }).join('');
}

function selectNote(noteId, el) {
  const notes = CloudStorage.get('notes', []);
  const note = notes.find(function(n) { return n.id === noteId; });
  if (!note) return;

  currentNoteId = noteId;

  // Update sidebar active state
  document.querySelectorAll('.nli').forEach(function(x) { x.classList.remove('active'); });
  el.classList.add('active');

  // Update textarea
  const ta = document.getElementById('nta');
  if (ta) ta.value = note.body;

  // Update footer
  const footer = document.querySelector('.note-footer');
  if (footer) {
    const infoSpan = footer.querySelector('.note-info');
    if (infoSpan) infoSpan.textContent = formatNoteTimestamp(note.timestamp);
  }
}

function saveNoteContent() {
  if (!currentNoteId) return;

  const ta = document.getElementById('nta');
  if (!ta) return;

  const notes = CloudStorage.get('notes', []);
  const note = notes.find(function(n) { return n.id === currentNoteId; });
  if (!note) return;

  note.body = ta.value;
  note.timestamp = Date.now();

  // Extract title from first line (up to 50 chars)
  const firstLine = note.body.split('\n')[0].trim();
  note.title = firstLine.slice(0, 50) || 'Untitled';

  // Auto-save with debounce
  CloudStorage.autoSave('notes', notes);

  // Update sidebar preview
  const notesList = document.getElementById('notes-list');
  if (notesList) {
    notesList.innerHTML = renderNotesList(notes);
  }
}

function createNewNote() {
  const notes = CloudStorage.get('notes', []);

  const newNote = {
    id: Date.now(),
    title: 'New Note',
    body: '',
    timestamp: Date.now()
  };

  notes.unshift(newNote); // Add to beginning
  CloudStorage.set('notes', notes);

  currentNoteId = newNote.id;

  // Update UI
  const notesList = document.getElementById('notes-list');
  if (notesList) {
    notesList.innerHTML = renderNotesList(notes);
  }

  const ta = document.getElementById('nta');
  if (ta) {
    ta.value = '';
    ta.focus();
  }

  showNotificationBanner('Notes', 'New note created', '📝', 2000);
}

function deleteCurrentNote() {
  if (!currentNoteId) return;

  if (!confirm('Delete this note? This cannot be undone.')) return;

  const notes = CloudStorage.get('notes', []);
  const index = notes.findIndex(function(n) { return n.id === currentNoteId; });
  if (index === -1) return;

  notes.splice(index, 1);
  CloudStorage.set('notes', notes);

  // Select next note or clear
  if (notes.length > 0) {
    const nextNote = notes[index] || notes[index - 1];
    currentNoteId = nextNote.id;

    // Update UI
    const notesList = document.getElementById('notes-list');
    if (notesList) {
      notesList.innerHTML = renderNotesList(notes);
    }

    const ta = document.getElementById('nta');
    if (ta) ta.value = nextNote.body;

    const footer = document.querySelector('.note-footer');
    if (footer) {
      const infoSpan = footer.querySelector('.note-info');
      if (infoSpan) infoSpan.textContent = formatNoteTimestamp(nextNote.timestamp);
    }
  } else {
    // No notes left
    currentNoteId = null;
    const container = document.querySelector('#wins .win[data-app="notes"] .wc');
    if (container) {
      container.innerHTML = '<div style="display:flex;height:100%"><div class="nsb"><div class="nsb-header"><button class="nnew" onclick="createNewNote()">+ New Note</button></div><div id="notes-list" class="note-empty-sidebar">No notes yet</div></div><div style="flex:1;display:flex;align-items:center;justify-content:center"><div class="note-empty">No notes. Create one to get started.</div></div></div>';
    }
  }

  showNotificationBanner('Notes', 'Note deleted', '📝', 2000);
}

function formatTimestamp(ts) {
  const date = new Date(ts);
  const now = new Date();
  const diff = now - date;

  // Less than 1 minute
  if (diff < 60000) return 'Just now';

  // Less than 1 hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return mins + ' min' + (mins > 1 ? 's' : '') + ' ago';
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
  }

  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return days + ' day' + (days > 1 ? 's' : '') + ' ago';
  }

  // Format as date
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  return month + '/' + day + '/' + year;
}

function formatNoteTimestamp(ts) {
  const date = new Date(ts);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  let hours = date.getHours();
  const mins = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minsStr = mins < 10 ? '0' + mins : mins;

  return 'Modified ' + month + '/' + day + '/' + year + ' at ' + hours + ':' + minsStr + ' ' + ampm;
}
