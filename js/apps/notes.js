/* ===== NOTES ===== */

function openNotes() {
  mkWin('notes', 'Notes', 620, 400,
    '<div style="display:flex;height:100%">' +
      '<div class="nsb">' +
        notes.map(function(n, i) {
          return '<div class="nli ' + (i === 0 ? 'active' : '') + '" onclick="selNote(' + i + ',this)"><h4>' + n.title + '</h4><p>' + n.body.slice(0, 35) + '...</p></div>';
        }).join('') +
      '</div>' +
      '<div style="flex:1;overflow:hidden"><textarea class="nta" id="nta">' + notes[0].body + '</textarea></div>' +
    '</div>',
    { bs: 'overflow:hidden' }
  );
}

function selNote(i, el) {
  noteIdx = i;
  document.querySelectorAll('.nli').forEach(function(x) { x.classList.remove('active'); });
  el.classList.add('active');
  var ta = document.getElementById('nta');
  if (ta) ta.value = notes[i].body;
}
