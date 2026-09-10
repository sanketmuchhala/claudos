/* A small argument tokenizer, ported from terminal.sanketmuchhala.com
   (src/terminal/parser.ts). It never evaluates or expands visitor input. */
(function () {
  function parseCommand(input) {
    if (input.length > 2048) {
      return { ok: false, error: 'That command is too long. Please keep it under 2,048 characters.' };
    }
    const tokens = [];
    let token = '';
    let active = false;
    let quote = null;
    let escaped = false;

    for (const character of input) {
      if (escaped) { token += character; active = true; escaped = false; continue; }
      if (character === '\\' && quote !== "'") { escaped = true; active = true; continue; }
      if (quote) {
        if (character === quote) quote = null;
        else token += character;
        continue;
      }
      if (character === "'" || character === '"') { quote = character; active = true; continue; }
      if (/\s/.test(character)) {
        if (active) tokens.push(token);
        token = '';
        active = false;
        continue;
      }
      token += character;
      active = true;
    }

    if (escaped) return { ok: false, error: 'A trailing backslash needs a character after it.' };
    if (quote) return { ok: false, error: `Unclosed ${quote === '"' ? 'double' : 'single'} quote. Add a matching ${quote} and try again.` };
    if (active) tokens.push(token);
    return { ok: true, tokens };
  }

  window.Portfolio.parseCommand = parseCommand;
})();
