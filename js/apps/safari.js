/* ===== SAFARI ===== */

function openSafari() {
  mkWin('safari', 'Safari', 780, 520,
    '<div style="display:flex;flex-direction:column;height:100%">' +
      '<div style="display:flex;align-items:center;gap:6px;padding:7px 10px;background:rgba(255,255,255,0.35);border-bottom:1px solid var(--border)">' +
        '<button style="border:none;background:none;font-size:15px;cursor:pointer;padding:3px 7px;border-radius:4px;color:var(--text)">◀</button>' +
        '<button style="border:none;background:none;font-size:15px;cursor:pointer;padding:3px 7px;border-radius:4px;color:var(--text)">▶</button>' +
        '<button style="border:none;background:none;font-size:15px;cursor:pointer;padding:3px 7px;border-radius:4px;color:var(--text)">⟳</button>' +
        '<input id="surl" style="flex:1;padding:5px 12px;border-radius:8px;border:1px solid var(--border);font-family:var(--font);font-size:13px;background:rgba(255,255,255,0.6);outline:none" value="https://en.wikipedia.org" onkeydown="if(event.key===\'Enter\'){var u=this.value;if(!u.startsWith(\'http\'))u=\'https://\'+u;document.getElementById(\'sfr\').src=u}">' +
      '</div>' +
      '<iframe id="sfr" src="https://en.wikipedia.org" style="flex:1;border:none;background:#fff"></iframe>' +
    '</div>',
    { bs: 'padding:0;overflow:hidden' }
  );
}
