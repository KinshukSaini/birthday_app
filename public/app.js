(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const params = new URLSearchParams(location.search);
  const PREVIEW = params.has('preview');

  let config = null;
  let current = null;

  // ---------- Fluent 3D emoji (falls back to the native emoji if the CDN is unreachable) ----------
  const feUrl = (name) => {
    const file = name.toLowerCase().replace(/ /g, '_') + '_3d.png';
    return `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/${encodeURIComponent(name)}/3D/${file}`;
  };
  function fallback(img) {
    const span = document.createElement('span');
    span.className = img.className + ' fe-fallback';
    span.textContent = img.alt;
    img.replaceWith(span);
  }
  function setupEmoji(root = document) {
    $$('img[data-fe]', root).forEach((img) => {
      if (img.src) return;
      img.onerror = () => fallback(img);
      img.src = feUrl(img.dataset.fe);
      img.draggable = false;
    });
  }

  // ---------- text ----------
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const friendName = () => (config.friendName ?? '').trim() || 'Friend';

  // Supports **bold**, {name} and line breaks — everything else is shown as plain text.
  function rich(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\{name\}/gi, `<span class="name">${esc(friendName())}</span>`)
      .replace(/\n/g, '<br>');
  }

  // Fields deleted on the /modify page are listed in config.removed; their text is kept so they can be restored.
  const isRemoved = (key) => (config.removed || []).includes(key);
  // Hide the whole pill, button or heading a piece of text sits in, not just the text itself.
  const box = (el) => el.closest('.pill, button, h1, h2') || el;

  function applyText() {
    $$('[data-t]').forEach((el) => {
      box(el).classList.toggle('removed', isRemoved(el.dataset.t));
      if (el.id === 'noLabel' && el.dataset.taunted) return;
      el.innerHTML = rich(get(config, el.dataset.t));
    });
    $('#paragraphs').classList.toggle('removed', isRemoved('birthday.paragraphs'));
    $('#paragraphs').innerHTML = (config.birthday.paragraphs || [])
      .filter((p) => p.trim())
      .map((p) => `<p>${rich(p)}</p>`).join('');
    $('#target').textContent = gameTarget();
    $('#vipName').textContent = friendName();
  }

  const gameTarget = () => Math.max(1, Math.min(50, parseInt(config.game.target, 10) || 10));

  // ---------- screens ----------
  const screens = ['intro', 'confirm', 'cat', 'game', 'success', 'birthday'];
  const enter = {};
  const leave = {};

  function goTo(name, { instant = false } = {}) {
    const next = $('#s-' + name);
    if (!next || name === current) return;
    const prev = current && $('#s-' + current);
    if (current && leave[current]) leave[current]();
    current = name;
    const show = () => {
      next.classList.add('active');
      window.scrollTo({ top: 0, behavior: instant ? 'auto' : 'smooth' });
      if (enter[name]) enter[name]();
    };
    if (prev && !instant) {
      prev.classList.remove('active');
      prev.classList.add('leaving');
      setTimeout(() => { prev.classList.remove('leaving'); show(); }, 330);
    } else {
      if (prev) prev.classList.remove('active');
      show();
    }
  }

  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (!go) return;
    Sound.pop();
    goTo(go.dataset.go);
  });

  // ---------- confetti ----------
  const confetti = (() => {
    const canvas = $('#confetti');
    const ctx = canvas.getContext('2d');
    const colors = ['#f472b6', '#fb7185', '#c084fc', '#818cf8', '#fbbf24', '#34d399', '#60a5fa', '#fda4af'];
    let parts = [];
    let running = false;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    addEventListener('resize', resize); resize();
    function loop() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts = parts.filter((p) => p.y < innerHeight + 40 && p.life > 0);
      for (const p of parts) {
        p.vy += 0.16; p.vx *= 0.99; p.vy *= 0.99;
        p.x += p.vx + Math.sin(p.y / 30) * 0.4; p.y += p.vy;
        p.rot += p.vr; p.life -= 0.004;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, p.life * 2);
        ctx.fillStyle = p.c;
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2 * Math.abs(Math.cos(p.rot * 2)) + 1);
        ctx.restore();
      }
      if (parts.length) requestAnimationFrame(loop); else running = false;
    }
    function add(p) { parts.push(p); if (!running) { running = true; requestAnimationFrame(loop); } }
    return {
      burst(x = innerWidth / 2, y = innerHeight / 2, n = 120, spread = 1) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = (3 + Math.random() * 9) * spread;
          add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5, s: 6 + Math.random() * 7, c: colors[i % colors.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, life: 1, round: Math.random() < 0.3 });
        }
      },
      rain(n = 160) {
        for (let i = 0; i < n; i++) {
          add({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.6, vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 3, s: 6 + Math.random() * 7, c: colors[i % colors.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.2, life: 1.4, round: Math.random() < 0.3 });
        }
      },
    };
  })();

  // ---------- floating background emoji ----------
  const FLOATIES = [['Sparkles', '✨'], ['Cherry blossom', '🌸'], ['Heart with ribbon', '💝'], ['Star', '⭐'], ['Balloon', '🎈'], ['Two hearts', '💕']];
  function spawnFloatie() {
    if (document.hidden) return;
    const [name, alt] = FLOATIES[Math.floor(Math.random() * FLOATIES.length)];
    const img = document.createElement('img');
    img.className = 'floatie';
    img.dataset.fe = name; img.alt = alt;
    const size = 18 + Math.random() * 22;
    img.style.cssText = `left:${Math.random() * 96}vw;width:${size}px;height:${size}px;animation-duration:${14 + Math.random() * 12}s;--sway:${(Math.random() - 0.5) * 120}px;opacity:${0.5 + Math.random() * 0.4}`;
    img.onerror = () => img.remove();
    img.src = feUrl(name);
    img.addEventListener('animationend', () => img.remove());
    $('#floaties').appendChild(img);
  }
  for (let i = 0; i < 4; i++) setTimeout(spawnFloatie, i * 900);
  setInterval(spawnFloatie, 2600);

  // ---------- mute ----------
  const muteBtn = $('#muteBtn');
  const syncMute = () => { muteBtn.textContent = Sound.isMuted() ? '🔇' : '🔊'; };
  muteBtn.addEventListener('click', () => { Sound.setMuted(!Sound.isMuted()); syncMute(); if (!Sound.isMuted()) Sound.pop(); });
  syncMute();
  document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });
  document.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse' && e.target.matches?.('.btn:not(#noBtn)')) Sound.hover();
  }, true);

  // ---------- 1. intro ----------
  enter.intro = () => {};

  // ---------- 2. confirm (the "No" button is very shy) ----------
  const noBtn = $('#noBtn');
  const yesBtn = $('#yesBtn');
  let dodges = 0;
  let tx = 0, ty = 0;
  let noHome = null;
  addEventListener('resize', () => { tx = 0; ty = 0; noHome = null; noBtn.style.transform = ''; });

  function resetConfirm() {
    dodges = 0; tx = 0; ty = 0; noHome = null;
    noBtn.style.transform = '';
    yesBtn.style.transform = '';
    delete $('#noLabel').dataset.taunted;
    $('#noLabel').innerHTML = rich(config.confirm.no);
  }
  enter.confirm = resetConfirm;

  const taunts = () => (isRemoved('confirm.noTaunts') ? [] : config.confirm.noTaunts || []).filter((t) => t.trim());
  const surrendered = () => taunts().length > 0 && dodges >= taunts().length;

  function dodge() {
    if (surrendered()) return;
    const list = taunts();
    dodges++;
    Sound.whoosh();
    const label = $('#noLabel');
    label.dataset.taunted = '1';
    label.innerHTML = rich(list.length ? list[Math.min(dodges, list.length) - 1] : config.confirm.no);
    yesBtn.style.transform = `scale(${Math.min(1 + dodges * 0.09, 1.6)})`;

    if (surrendered()) {
      // The last taunt gives in: the button comes home and now says yes.
      tx = 0; ty = 0;
      noBtn.style.transform = '';
      Sound.sparkle();
      return;
    }
    // Measure the button's home spot once; mid-transition rects would drift.
    const r = noBtn.getBoundingClientRect();
    if (!noHome) noHome = { x: r.left - tx, y: r.top - ty };
    const baseX = noHome.x, baseY = noHome.y;
    const pad = 14;
    let nx, ny, tries = 0;
    do {
      nx = pad + Math.random() * (innerWidth - r.width - pad * 2);
      ny = pad + 60 + Math.random() * (innerHeight - r.height - pad * 2 - 60);
      tries++;
    } while (tries < 20 && Math.hypot(nx - r.left, ny - r.top) < 160);
    tx = nx - baseX; ty = ny - baseY;
    noBtn.style.transform = `translate(${tx}px, ${ty}px) rotate(${(Math.random() - 0.5) * 16}deg)`;
  }

  noBtn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') dodge(); });
  noBtn.addEventListener('click', () => {
    if (surrendered()) return accept();
    dodge();
  });
  yesBtn.addEventListener('click', accept);

  function accept() {
    Sound.pop();
    Sound.sparkle();
    const r = yesBtn.getBoundingClientRect();
    confetti.burst(r.left + r.width / 2, r.top + r.height / 2, 60, 0.7);
    goTo('cat');
  }

  // ---------- 4. heart-catching game ----------
  const game = (() => {
    const arena = $('#arena');
    const heart = $('#heart');
    const SIZE = 66;
    const SPEEDS = ['Sleepy Kitten', 'Agile Kitty', 'Zoomies Mode', 'Turbo Tiger', 'Cat-astrophic!'];
    let x, y, vx, vy, caught, combo, lastCatch, raf, lastT, turnAt, running = false;

    const speedLevel = () => Math.min(SPEEDS.length - 1, Math.floor((caught / gameTarget()) * SPEEDS.length));
    const pxPerSec = () => 120 + (caught / gameTarget()) * 260;

    function aim() {
      const a = Math.random() * Math.PI * 2;
      vx = Math.cos(a); vy = Math.sin(a);
      turnAt = performance.now() + 900 + Math.random() * 1400;
    }
    function place() {
      const w = arena.clientWidth - SIZE, h = arena.clientHeight - SIZE;
      x = Math.random() * w; y = Math.random() * h;
      aim();
      heart.classList.remove('respawn'); void heart.offsetWidth; heart.classList.add('respawn');
    }
    function updateHud() {
      $('#score').textContent = caught;
      $('#progress').style.width = (caught / gameTarget()) * 100 + '%';
      $('#combo').textContent = combo + 'x' + (combo >= 3 ? ' 🔥' : '');
      $('#speed').textContent = SPEEDS[speedLevel()];
    }
    function tick(t) {
      if (!running) return;
      const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
      if (t > turnAt) aim();
      const w = arena.clientWidth - SIZE, h = arena.clientHeight - SIZE;
      const sp = pxPerSec();
      x += vx * sp * dt; y += vy * sp * dt;
      if (x < 0) { x = 0; vx = Math.abs(vx); }
      if (x > w) { x = w; vx = -Math.abs(vx); }
      if (y < 0) { y = 0; vy = Math.abs(vy); }
      if (y > h) { y = h; vy = -Math.abs(vy); }
      heart.style.transform = `translate(${x}px, ${y}px) rotate(${vx * 10}deg)`;
      raf = requestAnimationFrame(tick);
    }
    function floatText(text, px, py, cls = '') {
      const el = document.createElement('div');
      el.className = 'floating-text ' + cls;
      el.textContent = text;
      el.style.left = px + 'px'; el.style.top = py + 'px';
      el.addEventListener('animationend', () => el.remove());
      arena.appendChild(el);
    }
    function burst(px, py) {
      const names = [['Sparkles', '✨'], ['Sparkling heart', '💖'], ['Two hearts', '💕']];
      for (let i = 0; i < 8; i++) {
        const [n, alt] = names[i % names.length];
        const b = document.createElement('img');
        b.className = 'burst'; b.alt = alt;
        b.onerror = () => b.remove();
        b.src = feUrl(n);
        const a = (i / 8) * Math.PI * 2;
        b.style.left = px + 'px'; b.style.top = py + 'px';
        b.style.setProperty('--dx', Math.cos(a) * 60 + 'px');
        b.style.setProperty('--dy', Math.sin(a) * 60 + 'px');
        b.style.setProperty('--rot', (Math.random() - 0.5) * 90 + 'deg');
        b.addEventListener('animationend', () => b.remove());
        arena.appendChild(b);
      }
    }

    heart.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!running) return;
      const now = performance.now();
      combo = now - lastCatch < 1600 ? combo + 1 : 1;
      lastCatch = now;
      caught++;
      Sound.catch(caught - 1);
      const cx = x + SIZE / 2, cy = y + SIZE / 2;
      burst(cx, cy);
      floatText(combo >= 2 ? `+1  ${combo}x combo!` : '+1', cx, cy - 20);
      $('#arenaHint').style.opacity = 0;
      const s = $('#score'); s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump');
      updateHud();
      if (caught >= gameTarget()) return win();
      place();
    });
    arena.addEventListener('pointerdown', (e) => {
      if (!running || e.target === heart) return;
      const r = arena.getBoundingClientRect();
      combo = 0; updateHud();
      Sound.boop();
      floatText(['so close!', 'missed 🙀', 'whoosh!', 'nope!'][Math.floor(Math.random() * 4)], e.clientX - r.left, e.clientY - r.top, 'miss');
    });

    function win() {
      running = false;
      cancelAnimationFrame(raf);
      heart.style.transition = 'transform 0.4s';
      Sound.fanfare();
      const r = arena.getBoundingClientRect();
      confetti.burst(r.left + r.width / 2, r.top + r.height / 2, 140);
      setTimeout(() => { heart.style.transition = ''; goTo('success'); }, 1300);
    }

    return {
      start() {
        caught = 0; combo = 0; lastCatch = 0;
        $('#arenaHint').style.opacity = 1;
        updateHud();
        // Wait a frame so the arena has its real size before placing the heart.
        requestAnimationFrame(() => {
          place();
          running = true; lastT = performance.now();
          raf = requestAnimationFrame(tick);
        });
      },
      stop() { running = false; cancelAnimationFrame(raf); },
    };
  })();
  enter.game = () => game.start();
  leave.game = () => game.stop();

  // ---------- 5. success ----------
  enter.success = () => {
    Sound.sparkle();
    confetti.rain(90);
  };

  // ---------- 6. birthday ----------
  const cake = $('#cake');
  let songUntil = 0;

  function playSong() {
    if (performance.now() < songUntil) return;
    const d = Sound.happyBirthday(0.15);
    songUntil = performance.now() + d * 1000;
  }

  function resetCake() {
    cake.classList.remove('out');
    $('#wishMade').classList.add('hidden');
    $('#cakeHint').classList.remove('hidden');
  }

  enter.birthday = () => {
    resetCake();
    Sound.partyHorn();
    setTimeout(() => current === 'birthday' && Sound.fanfare(), 250);
    confetti.burst(innerWidth / 2, innerHeight * 0.35, 160);
    setTimeout(() => confetti.rain(120), 400);
  };

  cake.addEventListener('click', () => {
    if (cake.classList.contains('out')) {
      // Relight for another wish.
      resetCake();
      Sound.sparkle();
      return;
    }
    Sound.blow();
    cake.classList.add('out');
    $$('.flame', cake).forEach((f) => {
      for (let i = 0; i < 3; i++) {
        const s = document.createElement('span');
        s.className = 'smoke';
        s.style.left = f.style.left;
        s.style.top = parseFloat(f.style.top) + 8 + 'px';
        s.style.animationDelay = i * 0.18 + 's';
        s.style.setProperty('--dx', (Math.random() - 0.5) * 30 + 'px');
        s.addEventListener('animationend', () => s.remove());
        cake.appendChild(s);
      }
    });
    setTimeout(() => {
      Sound.partyHorn();
      const r = cake.getBoundingClientRect();
      confetti.burst(r.left + r.width / 2, r.top + r.height / 3, 180, 1.1);
      confetti.rain(140);
      const title = $('.rainbow-title');
      title.classList.remove('party'); void title.offsetWidth; title.classList.add('party');
      $('#cakeHint').classList.add('hidden');
      $('#wishMade').classList.remove('hidden');
      playSong();
    }, 700);
  });

  $('#replayBtn').addEventListener('click', () => {
    Sound.pop();
    playSong();
    confetti.rain(100);
  });

  $('#restartBtn').addEventListener('click', () => {
    Sound.pop();
    goTo('intro');
  });


  // ---------- boot ----------
  async function loadConfig() {
    try {
      const res = await fetch('/api/config', { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  }

  // The /modify page shows this app in an iframe and sends unsaved edits here for a live preview.
  if (PREVIEW) {
    addEventListener('message', (e) => {
      if (e.origin !== location.origin || !e.data) return;
      if (e.data.type === 'bday-ping' && config) parent.postMessage({ type: 'bday-ready' }, location.origin);
      if (e.data.type === 'bday-config') {
        config = e.data.config;
        applyText();
        if (current === 'confirm') resetConfirm();
      }
      if (e.data.type === 'bday-screen' && screens.includes(e.data.screen)) goTo(e.data.screen, { instant: true });
    });
  }

  (async () => {
    const loaded = await loadConfig();
    config = config || loaded; // a live-preview edit may have arrived while loading
    if (!config) {
      document.body.insertAdjacentHTML('beforeend', '<p style="position:fixed;bottom:10px;width:100%;text-align:center;color:#a274c8">Couldn\'t load the surprise. Is the server running?</p>');
      return;
    }
    setupEmoji();
    applyText();
    const start = params.get('screen');
    goTo(screens.includes(start) ? start : 'intro', { instant: true });
    if (PREVIEW) parent.postMessage({ type: 'bday-ready' }, location.origin);
  })();
})();
