// All sounds are synthesized with the Web Audio API, so there are no audio files to load.
const Sound = (() => {
  let ctx = null;
  let master = null;
  let muted = false;
  try { muted = localStorage.getItem('bday-muted') === '1'; } catch {}

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.6;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ freq = 440, type = 'sine', start = 0, dur = 0.2, vol = 0.3, attack = 0.005, slideTo = null, slideTime = null }) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + start;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + (slideTime || dur));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noise({ start = 0, dur = 0.4, vol = 0.3, type = 'bandpass', freq = 1000, freqTo = null, q = 1 }) {
    const c = ac(); if (!c) return null;
    const t = c.currentTime + start;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t);
    return { src, gain: g, t };
  }

  // A soft music-box note: sine with a quiet octave on top, quick attack, long decay.
  function bell(freq, start = 0, dur = 0.8, vol = 0.22) {
    tone({ freq, type: 'sine', start, dur, vol, attack: 0.004 });
    tone({ freq: freq * 2, type: 'sine', start, dur: dur * 0.6, vol: vol * 0.25, attack: 0.004 });
    tone({ freq: freq * 3, type: 'triangle', start, dur: dur * 0.25, vol: vol * 0.08, attack: 0.002 });
  }

  const N = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note -> Hz
  const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96];

  return {
    unlock() { ac(); },
    isMuted() { return muted; },
    setMuted(m) {
      muted = m;
      try { localStorage.setItem('bday-muted', m ? '1' : '0'); } catch {}
      if (master) master.gain.setTargetAtTime(m ? 0 : 0.6, ctx.currentTime, 0.05);
    },

    pop() {
      tone({ freq: 380, slideTo: 900, type: 'sine', dur: 0.12, vol: 0.35 });
      tone({ freq: 1200, type: 'triangle', start: 0.05, dur: 0.08, vol: 0.08 });
    },
    hover() { tone({ freq: 1300, type: 'sine', dur: 0.06, vol: 0.05 }); },
    sparkle() {
      [88, 91, 95, 100].forEach((n, i) => bell(N(n), i * 0.06, 0.5, 0.1));
    },
    whoosh() {
      noise({ dur: 0.35, vol: 0.25, freq: 600, freqTo: 3500, q: 2 });
      tone({ freq: 700, slideTo: 1400, type: 'sine', dur: 0.15, vol: 0.06 });
    },
    boing() {
      tone({ freq: 160, slideTo: 420, type: 'triangle', dur: 0.25, vol: 0.25, slideTime: 0.12 });
    },
    boop() { tone({ freq: 300, slideTo: 180, type: 'sine', dur: 0.15, vol: 0.18 }); },

    catch(combo = 0) {
      const n = PENTA[Math.min(combo, PENTA.length - 1)];
      bell(N(n), 0, 0.35, 0.25);
      bell(N(n + 12), 0.05, 0.25, 0.08);
      tone({ freq: 500, slideTo: 1500, type: 'sine', dur: 0.08, vol: 0.12 });
    },

    fanfare() {
      const seq = [[72, 0], [76, 0.12], [79, 0.24], [84, 0.36], [79, 0.52], [84, 0.64]];
      seq.forEach(([n, s]) => {
        tone({ freq: N(n), type: 'square', start: s, dur: 0.2, vol: 0.06 });
        bell(N(n), s, 0.6, 0.18);
      });
      [72, 76, 79, 84].forEach((n) => bell(N(n), 0.82, 1.4, 0.12));
    },

    partyHorn() {
      tone({ freq: 330, slideTo: 520, type: 'sawtooth', dur: 0.45, vol: 0.08, slideTime: 0.3 });
      noise({ dur: 0.18, vol: 0.4, type: 'highpass', freq: 2000 });
      [96, 100, 103, 108].forEach((n, i) => bell(N(n), 0.1 + i * 0.05, 0.4, 0.06));
    },

    blow() {
      noise({ dur: 0.9, vol: 0.55, type: 'lowpass', freq: 1600, freqTo: 300, q: 0.5 });
      noise({ start: 0.1, dur: 0.6, vol: 0.15, type: 'bandpass', freq: 3000, freqTo: 900, q: 1 });
    },

    // Happy Birthday on the music box. Returns the duration in seconds.
    happyBirthday(start = 0) {
      const b = 0.42;
      const song = [
        [67, 0.75], [67, 0.25], [69, 1], [67, 1], [72, 1], [71, 2],
        [67, 0.75], [67, 0.25], [69, 1], [67, 1], [74, 1], [72, 2],
        [67, 0.75], [67, 0.25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2],
        [77, 0.75], [77, 0.25], [76, 1], [72, 1], [74, 1], [72, 3],
      ];
      const bass = { 0: 48, 6: 55, 12: 48, 19: 53, 24: 48 };
      let t = start;
      song.forEach(([n, d], i) => {
        bell(N(n + 12), t, Math.max(0.6, d * b * 1.6), 0.2);
        if (bass[i] !== undefined) bell(N(bass[i] + 12), t, 1.6, 0.1);
        t += d * b;
      });
      return t - start;
    },
  };
})();
