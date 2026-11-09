(() => {
  const $ = (s) => document.querySelector(s);
  const fe = (name) => `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/${encodeURIComponent(name)}/3D/${name.toLowerCase().replace(/ /g, '_')}_3d.png`;

  // Every editable piece of text. type: text | textarea | number | lines (one per line) | paragraphs (blank line between)
  // keep: true marks fields that can't be deleted, because the surprise needs them to work.
  const SECTIONS = [
    { screen: 'intro', emoji: 'Sparkling heart', step: 'The basics', title: 'Who is this for?', fields: [
      { key: 'friendName', label: "Friend's name", keep: true, hint: 'Used wherever you write {name}, and shown next to "Birthday VIP" on the last page.' },
    ] },
    { screen: 'intro', emoji: 'Wrapped gift', step: 'Screen 1', title: 'The welcome gift', fields: [
      { key: 'intro.title', label: 'Heading' },
      { key: 'intro.subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'intro.badge', label: 'Little warning badge' },
      { key: 'intro.button', label: 'Button', keep: true },
    ] },
    { screen: 'confirm', emoji: 'Face with monocle', step: 'Screen 2', title: 'Are you sure?', fields: [
      { key: 'confirm.title', label: 'Heading' },
      { key: 'confirm.question', label: 'Question', type: 'textarea' },
      { key: 'confirm.yes', label: '"Yes" button', keep: true },
      { key: 'confirm.no', label: '"No" button' },
      { key: 'confirm.noTaunts', label: 'What the runaway "No" button says', type: 'lines',
        hint: 'One per line. Each time they try to press No, it runs away and shows the next line. The last line makes No give up and act as a yes. If you delete these, No just keeps running away.' },
      { key: 'confirm.hint', label: 'Small hint at the bottom' },
    ] },
    { screen: 'cat', emoji: 'Grinning cat', step: 'Screen 3', title: 'The cat guardian', fields: [
      { key: 'cat.badge', label: 'Badge' },
      { key: 'cat.title', label: 'Heading' },
      { key: 'cat.text', label: 'First line', type: 'textarea' },
      { key: 'cat.text2', label: 'Second line', type: 'textarea' },
      { key: 'cat.button', label: 'Button', keep: true },
    ] },
    { screen: 'game', emoji: 'Heart with ribbon', step: 'Screen 4', title: 'Catch the hearts game', fields: [
      { key: 'game.label', label: 'Small label' },
      { key: 'game.title', label: 'Heading' },
      { key: 'game.instructions', label: 'Instructions' },
      { key: 'game.target', label: 'Hearts to catch', type: 'number', keep: true, hint: 'Between 1 and 50. The heart gets faster as they go.' },
    ] },
    { screen: 'success', emoji: 'Smiling cat with heart-eyes', step: 'Screen 5', title: 'Quest complete', fields: [
      { key: 'success.badge', label: 'Badge' },
      { key: 'success.title', label: 'Heading' },
      { key: 'success.text', label: 'Message', type: 'textarea' },
      { key: 'success.text2', label: 'Second line' },
      { key: 'success.button', label: 'Button', keep: true },
    ] },
    { screen: 'birthday', emoji: 'Birthday cake', step: 'Screen 6', title: 'The birthday letter', fields: [
      { key: 'birthday.title', label: 'Big heading' },
      { key: 'birthday.cakeHint', label: 'Cake hint' },
      { key: 'birthday.wishMade', label: 'After the candles are blown out' },
      { key: 'birthday.vipLabel', label: 'Label next to the name' },
      { key: 'birthday.greeting', label: 'Greeting' },
      { key: 'birthday.paragraphs', label: 'Your message', type: 'paragraphs', hint: 'Leave an empty line between paragraphs.' },
      { key: 'birthday.highlight', label: 'Highlighted line' },
      { key: 'birthday.signoff', label: 'Sign-off' },
      { key: 'birthday.signature', label: 'Signature' },
      { key: 'birthday.replayButton', label: 'Replay-song button' },
    ] },
  ];
  const SCREEN_NAMES = { intro: '🎁 Welcome', confirm: '🧐 Sure?', cat: '😺 Cat', game: '💝 Game', success: '😻 Win', birthday: '🎂 Letter' };

  let config = null;
  let dirty = false;
  let passwordRequired = false;
  let frameReady = false;
  let activeScreen = 'intro';

  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  function set(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
    target[last] = value;
  }

  const toForm = (f, v) => {
    if (f.type === 'lines') return (v || []).join('\n');
    if (f.type === 'paragraphs') return (v || []).join('\n\n');
    return v ?? '';
  };
  const fromForm = (f, v) => {
    if (f.type === 'lines') return v.split('\n').map((s) => s.trim()).filter(Boolean);
    if (f.type === 'paragraphs') return v.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    if (f.type === 'number') return Math.max(1, Math.min(50, parseInt(v, 10) || 1));
    return v;
  };

  // ---------- status + toast ----------
  function status(text, cls = '') { const s = $('#status'); s.textContent = text; s.className = 'status ' + cls; }
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }
  function markDirty() {
    dirty = true;
    $('#saveBtn').disabled = false;
    status('Unsaved changes', 'dirty');
  }

  // ---------- preview ----------
  const frame = $('#frame');
  let pushTimer;
  function pushPreview() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      if (frameReady && config) frame.contentWindow.postMessage({ type: 'bday-config', config }, location.origin);
    }, 120);
  }
  function showScreen(screen) {
    activeScreen = screen;
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.screen === screen));
    if (frameReady) frame.contentWindow.postMessage({ type: 'bday-screen', screen }, location.origin);
  }
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.data?.type !== 'bday-ready') return;
    frameReady = true;
    pushPreview();
    showScreen(activeScreen);
  });

  // The preview may finish loading before this script runs, so also ask it directly.
  const ping = () => { if (!frameReady) frame.contentWindow?.postMessage({ type: 'bday-ping' }, location.origin); };
  frame.addEventListener('load', () => setTimeout(ping, 300));
  ping();

  const tabs = $('#tabs');
  Object.entries(SCREEN_NAMES).forEach(([screen, label]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.dataset.screen = screen;
    b.onclick = () => showScreen(screen);
    tabs.appendChild(b);
  });

  // ---------- form ----------
  // Deleting a field only lists its key in config.removed; the text stays put, so Restore brings it back as it was.
  const removedList = () => (Array.isArray(config.removed) ? config.removed : (config.removed = []));
  function setRemoved(f, wrap, removed) {
    const list = removedList().filter((k) => k !== f.key);
    if (removed) list.push(f.key);
    config.removed = list;
    wrap.classList.toggle('is-removed', removed);
    markDirty();
    pushPreview();
    toast(removed ? `🗑 "${f.label}" deleted. Hit Restore to bring it back.` : `🌸 "${f.label}" is back`);
    if (!removed) wrap.querySelector('input, textarea')?.focus();
  }

  function buildForm() {
    const form = $('#form');
    form.innerHTML = '';
    SECTIONS.forEach((sec, i) => {
      const card = document.createElement('section');
      card.className = 'card' + (i > 2 ? ' collapsed' : '');
      card.innerHTML = `
        <button class="card-head" type="button">
          <img alt="" src="${fe(sec.emoji)}" onerror="this.style.visibility='hidden'" />
          <span class="t"><div class="eyebrow">${sec.step}</div><h2>${sec.title}</h2></span>
          <span class="chev">▾</span>
        </button>
        <div class="fields"></div>`;
      card.querySelector('.card-head').onclick = () => {
        card.classList.toggle('collapsed');
        if (!card.classList.contains('collapsed')) showScreen(sec.screen);
      };
      card.addEventListener('focusin', () => {
        document.querySelectorAll('section.card.focused').forEach((c) => c !== card && c.classList.remove('focused'));
        card.classList.add('focused');
        if (activeScreen !== sec.screen) showScreen(sec.screen);
      });

      const fields = card.querySelector('.fields');
      sec.fields.forEach((f) => {
        const id = 'f-' + f.key.replace(/\./g, '-');
        const wrap = document.createElement('div');
        wrap.className = 'field';
        const multi = ['textarea', 'lines', 'paragraphs'].includes(f.type);
        const el = document.createElement(multi ? 'textarea' : 'input');
        el.id = id;
        if (!multi) el.type = f.type === 'number' ? 'number' : 'text';
        if (f.type === 'number') { el.min = 1; el.max = 50; }
        if (f.type === 'paragraphs' || f.type === 'lines') el.classList.add('tall');
        el.value = toForm(f, get(config, f.key));
        el.addEventListener('input', () => {
          set(config, f.key, fromForm(f, el.value));
          markDirty();
          pushPreview();
        });
        const head = document.createElement('div');
        head.className = 'field-head';
        const label = document.createElement('label');
        label.htmlFor = id; label.textContent = f.label;
        head.appendChild(label);
        const body = document.createElement('div');
        body.className = 'field-body';
        body.appendChild(el);
        if (f.hint) {
          const h = document.createElement('div');
          h.className = 'hint'; h.textContent = f.hint;
          body.appendChild(h);
        }
        wrap.append(head, body);

        if (!f.keep) {
          const del = document.createElement('button');
          del.type = 'button'; del.className = 'field-del';
          del.textContent = '🗑 Delete';
          del.title = 'Hide this from the surprise. You can restore it any time.';
          del.onclick = () => setRemoved(f, wrap, true);

          const gone = document.createElement('div');
          gone.className = 'field-gone';
          gone.innerHTML = '<span>Deleted · your friend won\'t see this</span>';
          const restore = document.createElement('button');
          restore.type = 'button'; restore.className = 'field-restore';
          restore.textContent = '↺ Restore';
          restore.onclick = () => setRemoved(f, wrap, false);
          gone.appendChild(restore);

          head.appendChild(del);
          wrap.appendChild(gone);
          wrap.classList.toggle('is-removed', removedList().includes(f.key));
        }
        fields.appendChild(wrap);
      });
      form.appendChild(card);
    });
  }

  // ---------- save / reset ----------
  function headers() {
    const h = { 'Content-Type': 'application/json' };
    if (passwordRequired) h['x-modify-password'] = $('#pw').value;
    return h;
  }
  async function handle(res, okMsg) {
    if (res.status === 401) {
      status('Wrong password', 'err');
      toast('🔒 That password didn\'t work');
      $('#pw').focus();
      return false;
    }
    if (res.status === 503) { status('No database', 'err'); toast('🗄️ Connect a database in Vercel (Storage tab) to save'); return false; }
    if (!res.ok) { status('Save failed', 'err'); toast('😿 Something went wrong'); return false; }
    try { sessionStorage.setItem('bday-pw', $('#pw').value); } catch {}
    config = await res.json();
    dirty = false;
    $('#saveBtn').disabled = true;
    status('All saved ✓', 'ok');
    toast(okMsg);
    return true;
  }

  async function save() {
    if (passwordRequired && !$('#pw').value) { toast('🔒 Enter the password first'); $('#pw').focus(); return; }
    $('#saveBtn').disabled = true;
    status('Saving…');
    try {
      const res = await fetch('/api/config', { method: 'POST', headers: headers(), body: JSON.stringify(config) });
      if (!(await handle(res, '💖 Saved! Your friend will see the new text.'))) $('#saveBtn').disabled = false;
    } catch {
      status('Save failed', 'err'); $('#saveBtn').disabled = false; toast('😿 Could not reach the server');
    }
  }

  async function reset() {
    if (!confirm('Reset every piece of text back to the original defaults?')) return;
    if (passwordRequired && !$('#pw').value) { toast('🔒 Enter the password first'); $('#pw').focus(); return; }
    try {
      const res = await fetch('/api/config', { method: 'DELETE', headers: headers() });
      if (await handle(res, '🌸 Back to the defaults')) { buildForm(); pushPreview(); }
    } catch {
      toast('😿 Could not reach the server');
    }
  }

  $('#saveBtn').onclick = save;
  $('#resetBtn').onclick = reset;
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (dirty) save(); }
  });
  addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  // ---------- boot ----------
  (async () => {
    try {
      const [cfg, meta] = await Promise.all([
        fetch('/api/config', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/meta', { cache: 'no-store' }).then((r) => r.json()),
      ]);
      config = cfg;
      passwordRequired = meta.passwordRequired;
      if (passwordRequired) {
        $('#pwWrap').classList.add('show');
        try { $('#pw').value = sessionStorage.getItem('bday-pw') || ''; } catch {}
      }
      buildForm();
      showScreen('intro');
      pushPreview();
      ping();
      status('All saved ✓', 'ok');
    } catch {
      status('Server unreachable', 'err');
    }
  })();
})();
