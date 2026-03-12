/* ===== CALCULATOR ===== */

function openCalc() {
  mkWin('calc', 'Calculator', 255, 365,
    '<div class="calc-d" id="cd">0</div>' +
    '<div class="calc-g">' +
      '<button class="cb fn" onclick="cFn(\'C\')">C</button>' +
      '<button class="cb fn" onclick="cFn(\'±\')">±</button>' +
      '<button class="cb fn" onclick="cFn(\'%\')">%</button>' +
      '<button class="cb op" onclick="cOp(\'÷\')">÷</button>' +
      '<button class="cb" onclick="cN(\'7\')">7</button>' +
      '<button class="cb" onclick="cN(\'8\')">8</button>' +
      '<button class="cb" onclick="cN(\'9\')">9</button>' +
      '<button class="cb op" onclick="cOp(\'×\')">×</button>' +
      '<button class="cb" onclick="cN(\'4\')">4</button>' +
      '<button class="cb" onclick="cN(\'5\')">5</button>' +
      '<button class="cb" onclick="cN(\'6\')">6</button>' +
      '<button class="cb op" onclick="cOp(\'−\')">−</button>' +
      '<button class="cb" onclick="cN(\'1\')">1</button>' +
      '<button class="cb" onclick="cN(\'2\')">2</button>' +
      '<button class="cb" onclick="cN(\'3\')">3</button>' +
      '<button class="cb op" onclick="cOp(\'+\')">+</button>' +
      '<button class="cb zero" onclick="cN(\'0\')">0</button>' +
      '<button class="cb" onclick="cN(\'.\')">.</button>' +
      '<button class="cb op" onclick="cEq()">=</button>' +
    '</div>',
    { bs: 'overflow:hidden' }
  );
}

function cN(n) {
  if (calcRst) { calcVal = ''; calcRst = false; }
  if (n === '.' && calcVal.includes('.')) return;
  calcVal = calcVal === '0' && n !== '.' ? n : calcVal + n;
  uCD();
}

function cOp(o) {
  calcPrev = parseFloat(calcVal);
  calcOp = o;
  calcRst = true;
}

function cEq() {
  if (!calcOp || calcPrev === null) return;
  const c = parseFloat(calcVal);
  let r;
  switch (calcOp) {
    case '+': r = calcPrev + c; break;
    case '−': r = calcPrev - c; break;
    case '×': r = calcPrev * c; break;
    case '÷': r = c === 0 ? 'Error' : calcPrev / c; break;
  }
  calcVal = typeof r === 'number' ? String(Math.round(r * 1e10) / 1e10) : r;
  calcOp = null;
  calcPrev = null;
  calcRst = true;
  uCD();
}

function cFn(f) {
  if (f === 'C') { calcVal = '0'; calcOp = null; calcPrev = null; }
  else if (f === '±') calcVal = String(-parseFloat(calcVal));
  else if (f === '%') calcVal = String(parseFloat(calcVal) / 100);
  uCD();
}

function uCD() {
  document.querySelectorAll('.calc-d').forEach(d => {
    d.textContent = calcVal.length > 12 ? parseFloat(calcVal).toExponential(6) : calcVal;
  });
}
