'use strict';
// Tiny chiptune sound effects made with Web Audio, no files needed.
const Sound = (() => {
  let ac = null, enabled = true, noiseBuf = null;

  function audio() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ac = new AC(); } catch (e) { return null; }
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function tone(freq, dur, o = {}) {
    const a = audio();
    if (!a) return;
    const t0 = a.currentTime + (o.delay || 0);
    const osc = a.createOscillator(), g = a.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + o.slide), t0 + dur);
    const v = o.vol ?? 0.06;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, o = {}) {
    const a = audio();
    if (!a) return;
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = a.currentTime + (o.delay || 0);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = noiseBuf;
    f.type = o.filter || 'highpass';
    f.frequency.value = o.freq || 1000;
    g.gain.setValueAtTime(o.vol ?? 0.12, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(a.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  const seq = (notes, step, o = {}) => notes.forEach((n, i) => n && tone(n, step * 1.1, { ...o, delay: (o.delay || 0) + i * step }));

  const FX = {
    select: () => tone(660, 0.05, { vol: 0.04 }),
    step: () => tone(170, 0.03, { type: 'triangle', vol: 0.05 }),
    heavy: () => { tone(80, 0.12, { type: 'triangle', vol: 0.12 }); noise(0.08, { freq: 200, vol: 0.06 }); },
    place: () => tone(220, 0.06, { vol: 0.05 }),
    hit: () => { noise(0.08, { freq: 400, vol: 0.18 }); tone(140, 0.1, { slide: -60, vol: 0.08 }); },
    slash: () => { noise(0.14, { freq: 2500, vol: 0.14 }); tone(1100, 0.12, { slide: -800, vol: 0.03, type: 'sawtooth' }); },
    zap: () => tone(1300, 0.35, { type: 'sawtooth', slide: -1100, vol: 0.05 }),
    thunder: () => { noise(0.7, { filter: 'lowpass', freq: 600, vol: 0.3 }); tone(60, 0.5, { type: 'triangle', vol: 0.12 }); },
    stomp: () => { tone(90, 0.3, { type: 'triangle', slide: -50, vol: 0.2 }); noise(0.25, { filter: 'lowpass', freq: 300, vol: 0.25 }); },
    croak: () => { tone(150, 0.12, { type: 'sawtooth', vol: 0.06 }); tone(110, 0.16, { type: 'sawtooth', vol: 0.06, delay: 0.15 }); },
    kiss: () => { tone(1500, 0.06, { type: 'sine', slide: 500, vol: 0.08 }); tone(1900, 0.08, { type: 'sine', vol: 0.06, delay: 0.08 }); },
    love: () => seq([523, 659, 784, 1047], 0.1, { type: 'sine', vol: 0.06 }),
    bonk: () => { tone(320, 0.1, { slide: -220, vol: 0.12 }); tone(1000, 0.06, { type: 'sine', vol: 0.05, delay: 0.05 }); },
    fall: () => tone(420, 0.5, { slide: -360, type: 'triangle', vol: 0.08 }),
    poof: () => noise(0.35, { freq: 1500, vol: 0.12 }),
    magic: () => seq([784, 988, 1175, 1568], 0.06, { type: 'triangle', vol: 0.05 }),
    check: () => { tone(880, 0.1, { vol: 0.06 }); tone(660, 0.16, { vol: 0.06, delay: 0.12 }); },
    fanfare: () => seq([523, 523, 523, 659, 0, 523, 659, 784], 0.12, { vol: 0.06 }),
    sad: () => seq([392, 370, 349, 330], 0.25, { type: 'triangle', vol: 0.07 }),
  };

  // Phone vibration on big hits: native haptics inside the app, the Vibration API on the web.
  const RUMBLE = { hit: 'LIGHT', slash: 'LIGHT', bonk: 'MEDIUM', stomp: 'HEAVY', thunder: 'HEAVY' };
  function buzz(style) {
    try {
      const haptics = window.Capacitor?.Plugins?.Haptics;
      if (haptics) haptics.impact({ style });
      else if (navigator.vibrate) navigator.vibrate(style === 'HEAVY' ? 40 : 15);
    } catch (e) { /* no vibration available */ }
  }

  return {
    play(name) {
      if (!enabled || !FX[name]) return;
      try { FX[name](); } catch (e) { /* audio unavailable */ }
      if (RUMBLE[name]) buzz(RUMBLE[name]);
    },
    unlock() { if (enabled) audio(); },
    get enabled() { return enabled; },
    set enabled(v) { enabled = v; },
  };
})();
