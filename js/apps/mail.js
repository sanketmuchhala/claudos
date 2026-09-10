/* ===== MAIL =====
   An inbox with messages from Sanket and a compose window. Send hands the
   message to your own email app (mailto:), and a copy is kept in Sent. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  const person = Portfolio.data.person;
  const email = (Portfolio.link('email')?.url || 'mailto:muchhalasanket@gmail.com').replace(/^mailto:/, '');
  const link = id => Portfolio.link(id)?.url;
  const featured = ['LexOrchestrator', 'LanguageLineage', 'matter-graph-legal-ai'].map(id => Portfolio.adapter.matchProject(id)).filter(Boolean);
  const INBOX = [
    { id: 'welcome', from: person.name, address: email, subject: 'Welcome to CloudOS 👋', date: Date.parse('2026-09-10T09:00:00'),
      body: `Hi there,\n\nThanks for stopping by! CloudOS is my portfolio dressed up as a Mac. A few things to try:\n\n• Terminal — it’s the portfolio. Type whoami, projects, or graph python.\n• Finder — browse every project as a folder. Your own files go in Documents.\n• Spotlight (⌘ Space or Ctrl Space) — search apps, projects, skills, and files.\n\nMore about me:\nPortfolio: ${link('portfolio')}\nRésumé: ${link('resume')}\nGitHub: ${link('github')}\nLinkedIn: ${link('linkedin')}\n\nIf you want to talk about a role or a project, just reply to this message.\n\n— ${person.name}\n${person.role}` },
    { id: 'projects', from: person.name, address: email, subject: 'Three projects worth a look', date: Date.parse('2026-09-09T16:30:00'),
      body: `Hi again,\n\nIf you only have a few minutes, start with these:\n\n${featured.map(p => `${p.name}\n${p.description}\n${p.demo || p.repository || p.url || ''}`).join('\n\n')}\n\nYou can inspect any of them in Terminal (inspect ${featured[0]?.id || 'LexOrchestrator'}) or open them from Finder ▸ Projects.\n\n— Sanket` },
  ];
  let win = null;
  let box = 'inbox';
  let selected = 'welcome';

  const mail = () => CloudStorage.get('mail', { sent: [], read: [] });
  const sent = () => (mail().sent || []).map(m => ({ ...m, from: 'You', address: m.to }));
  const isRead = id => (mail().read || []).includes(id);
  function markRead(id) {
    const data = mail();
    if (!data.read.includes(id)) { data.read = [...data.read, id]; CloudStorage.set('mail', data); }
    badge();
  }
  function badge() { OS.dock.setBadge('mail', INBOX.filter(m => !isRead(m.id)).length || null); }
  const messages = () => (box === 'inbox' ? INBOX : sent().sort((a, b) => b.date - a.date));
  const linkify = text => esc(text).replace(/https?:\/\/[^\s<]+/g, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);

  function render() {
    if (!win) return;
    const list = messages();
    if (!list.some(m => m.id === selected)) selected = list[0]?.id || null;
    win.body.querySelectorAll('[data-box]').forEach(b => b.classList.toggle('is-active', b.dataset.box === box));
    win.body.querySelector('[data-unread]').textContent = INBOX.filter(m => !isRead(m.id)).length || '';
    win.body.querySelector('[data-box-title]').textContent = box === 'inbox' ? 'Inbox' : 'Sent';
    win.body.querySelector('[data-box-count]').textContent = `${list.length} message${list.length === 1 ? '' : 's'}`;
    win.body.querySelector('[data-messages]').innerHTML = list.length ? list.map(m => `<button type="button" class="mail-row${m.id === selected ? ' is-selected' : ''}${box === 'inbox' && !isRead(m.id) ? ' is-unread' : ''}" data-message="${esc(m.id)}"><span class="mail-row-head"><strong>${esc(box === 'inbox' ? m.from : `To: ${m.address}`)}</strong><time>${esc(OS.util.relativeTime(m.date))}</time></span><span class="mail-subject">${esc(m.subject || '(No Subject)')}</span><span class="mail-preview">${esc(m.body.replace(/\s+/g, ' ').slice(0, 110))}</span></button>`).join('') : `<p class="mail-empty">${box === 'sent' ? 'Messages you send appear here.' : 'No messages'}</p>`;
    const message = list.find(m => m.id === selected);
    win.body.querySelector('[data-reader]').innerHTML = message ? `<header class="mail-reader-head"><span class="mail-avatar">${box === 'inbox' ? `<img src="images/avatar.jpg" alt="" />` : 'Y'}</span><div><strong>${esc(box === 'inbox' ? message.from : 'You')}</strong><p>${esc(message.subject || '(No Subject)')}</p><small>To: ${esc(box === 'inbox' ? 'You' : message.address)}</small></div><time>${esc(new Date(message.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }))}</time></header><div class="mail-reader-body">${linkify(message.body)}</div>${box === 'sent' ? '<p class="mail-note">Handed to your email app with mailto:. CloudOS doesn’t send email itself.</p>' : ''}` : '<p class="mail-empty">No message selected</p>';
    if (message && box === 'inbox') markRead(message.id);
  }

  function compose(prefill = {}) {
    const draft = OS.wm.create({
      app: 'mail', title: 'New Message', width: 560, height: 460, minWidth: 360, minHeight: 300, className: 'mail-compose-win',
      content: `<form class="mail-compose" data-compose>
        <div class="mail-compose-bar"><button type="submit" class="push-button is-accent" data-send><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 7.6 14.5 2l-4.3 12-2.4-4.9Z" fill="currentColor"/></svg> Send</button><span>Send opens your email app with this message.</span></div>
        <label class="mail-field"><span>To:</span><input name="to" type="email" value="${esc(prefill.to || email)}" required /></label>
        <label class="mail-field"><span>Subject:</span><input name="subject" value="${esc(prefill.subject || '')}" placeholder="Hello from CloudOS" /></label>
        <textarea name="body" aria-label="Message" placeholder="Write your message…">${esc(prefill.body || '')}</textarea>
      </form>`,
      onFocusRequest: w => { const f = w.body.querySelector(prefill.subject ? 'textarea' : '[name="subject"]'); f?.focus(); },
      onClose: async w => {
        const form = w.body.querySelector('form');
        if (!form.dataset.sent && form.elements.body.value.trim()) {
          const ok = await OS.dialog.confirm({ title: 'Discard this message?', message: 'Your draft will be lost.', confirm: 'Discard', destructive: true, win: w });
          if (!ok) return false;
        }
        return true;
      },
    });
    const form = draft.body.querySelector('form');
    form.addEventListener('submit', event => {
      event.preventDefault();
      const to = form.elements.to.value.trim();
      if (!to) return;
      const subject = form.elements.subject.value.trim();
      const body = form.elements.body.value;
      const anchor = document.createElement('a');
      anchor.href = `mailto:${encodeURIComponent(to).replace(/%40/g, '@')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      const data = mail();
      data.sent = [{ id: `s${Date.now()}`, to, subject, body, date: Date.now() }, ...(data.sent || [])].slice(0, 30);
      CloudStorage.set('mail', data);
      form.dataset.sent = '1';
      draft.close();
      OS.notify({ app: 'mail', title: 'Message ready to send', message: `Opened in your email app: ${subject || '(No Subject)'}` });
      if (win) { box = 'sent'; selected = data.sent[0].id; render(); }
    });
    return draft;
  }

  function open(args = {}) {
    if (args.compose) {
      if (!win && !OS.wm.list('mail').length) openMailbox();
      return compose(args.compose);
    }
    if (win) { OS.wm.focus(win.id); return win; }
    return openMailbox();
  }

  function openMailbox() {
    win = OS.wm.create({
      app: 'mail', title: 'Inbox', chrome: 'toolbar', width: 940, height: 560, minWidth: 460, minHeight: 320, className: 'mail-win', lightsTop: 19, lightsLeft: 18,
      content: `<div class="mail">
        <aside class="sidebar mail-sidebar" data-drag aria-label="Mailboxes"><div class="sidebar-scroll"><div class="sb-section"><h3>Favorites</h3>
          <button type="button" class="sb-item" data-box="inbox"><i class="sb-glyph" style="--glyph:url('images/icons/sidebar/mail-inbox.png')" aria-hidden="true"></i>Inbox<span class="sb-count" data-unread></span></button>
          <button type="button" class="sb-item" data-box="sent"><i class="sb-glyph" style="--glyph:url('images/icons/sidebar/mail-sent.png')" aria-hidden="true"></i>Sent</button>
        </div></div></aside>
        <section class="mail-list"><header class="toolbar" data-drag><div><h1 class="toolbar-title" data-box-title>Inbox</h1><small class="mail-count" data-box-count></small></div><div class="toolbar-flex" data-drag></div><button type="button" class="tb-btn" data-compose-new aria-label="New Message" title="New Message"><svg viewBox="0 0 18 18" aria-hidden="true"><path d="M13.5 2.5 15.5 4.5 8 12l-3 1 1-3Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 3H3.5A1.5 1.5 0 0 0 2 4.5v10A1.5 1.5 0 0 0 3.5 16h10a1.5 1.5 0 0 0 1.5-1.5V10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button></header><div class="mail-messages" data-messages role="listbox" aria-label="Messages"></div></section>
        <section class="mail-reader"><header class="toolbar mail-reader-bar" data-drag><div class="toolbar-flex" data-drag></div><button type="button" class="tb-btn" data-reply aria-label="Reply" title="Reply"><svg viewBox="0 0 18 16" aria-hidden="true"><path d="M7 3 2 8l5 5M2.5 8H11a5 5 0 0 1 5 5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></header><article class="mail-reader-scroll" data-reader></article></section>
      </div>`,
      onClose: () => { win = null; return true; },
    });
    win.body.addEventListener('click', event => {
      const t = event.target;
      const b = t.closest('[data-box]');
      if (b) { box = b.dataset.box; selected = null; render(); return; }
      const m = t.closest('[data-message]');
      if (m) { selected = m.dataset.message; render(); return; }
      if (t.closest('[data-compose-new]')) { compose(); return; }
      if (t.closest('[data-reply]')) {
        const message = messages().find(x => x.id === selected);
        if (message) compose({ to: message.address, subject: /^re:/i.test(message.subject) ? message.subject : `Re: ${message.subject}`, body: `\n\n—\nOn ${new Date(message.date).toLocaleDateString('en-US', { dateStyle: 'medium' })}, ${message.from} wrote:\n${message.body.split('\n').map(line => `> ${line}`).join('\n')}` });
        return;
      }
      const a = t.closest('.mail-reader-body a[href]');
      if (a && !event.metaKey && !event.ctrlKey) { event.preventDefault(); OS.openURL(a.href); }
    });
    render();
    return win;
  }

  badge();

  OS.apps.register({
    id: 'mail',
    name: 'Mail',
    icon: 'images/icons/apps/mail.png',
    keywords: ['email', 'contact', 'message', 'inbox', 'hire'],
    version: '16.0',
    about: `Messages from ${person.name}, and a way to reach him. Sending opens your own email app with the message filled in.`,
    help: 'Read the welcome message for tips. Use the compose button (or Reply) to write to Sanket; Send opens your email app with the message ready.',
    open,
    dockMenu: () => [{ label: 'New Message', action: () => compose() }],
    menus: () => [
      { title: 'File', items: [
        { label: 'New Message', shortcut: `${OS.util.mod}N`, action: () => compose() },
        { label: 'Close Window', shortcut: `${OS.util.mod}W`, disabled: !OS.wm.focused() || OS.wm.focused().app !== 'mail', action: () => OS.wm.focused()?.close() },
      ] },
      { title: 'Mailbox', items: [
        { label: 'Inbox', checked: box === 'inbox', action: () => { box = 'inbox'; if (win) render(); else openMailbox(); } },
        { label: 'Sent', checked: box === 'sent', action: () => { box = 'sent'; if (win) render(); else openMailbox(); } },
      ] },
    ],
  });
})();
