/* ===== TEXT EDIT ===== */

function openTE() {
  mkWin('textedit', 'TextEdit — Untitled', 580, 420,
    '<div style="display:flex;flex-direction:column;height:100%">' +
      '<div class="tetb">' +
        '<button class="teb" onclick="document.execCommand(\'bold\')"><b>B</b></button>' +
        '<button class="teb" onclick="document.execCommand(\'italic\')"><i>I</i></button>' +
        '<button class="teb" onclick="document.execCommand(\'underline\')"><u>U</u></button>' +
        '<div class="tesep"></div>' +
        '<button class="teb" onclick="document.execCommand(\'justifyLeft\')">⫷</button>' +
        '<button class="teb" onclick="document.execCommand(\'justifyCenter\')">☰</button>' +
        '<button class="teb" onclick="document.execCommand(\'justifyRight\')">⫸</button>' +
        '<div class="tesep"></div>' +
        '<button class="teb" onclick="document.execCommand(\'insertUnorderedList\')">• List</button>' +
        '<button class="teb" onclick="document.execCommand(\'insertOrderedList\')">1. List</button>' +
      '</div>' +
      '<div class="tearea" contenteditable="true">Start typing here...</div>' +
    '</div>',
    { bs: 'padding:0;overflow:hidden' }
  );
}
