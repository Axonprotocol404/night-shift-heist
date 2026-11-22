// Optional WebAudio bleeps (no external files): detection rising tone, loot pickup chime,
// alarm and win/lose stingers. Created lazily after the first user gesture.
export function createSound() {
  let ctx = null;
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    return ctx;
  }
  function tone(freq, duration, type = 'sine', gain = 0.08, when = 0) {
    const ac = ensure();
    if (!ac) return;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ac.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + when + duration);
    osc.connect(g).connect(ac.destination);
    osc.start(ac.currentTime + when);
    osc.stop(ac.currentTime + when + duration);
  }
  return {
    unlock() { const ac = ensure(); if (ac && ac.state === 'suspended') ac.resume(); },
    loot() { tone(880, 0.12, 'triangle', 0.1); tone(1320, 0.15, 'triangle', 0.08, 0.09); },
    spotted() { tone(220, 0.18, 'sawtooth', 0.06); },
    caught() { tone(160, 0.5, 'sawtooth', 0.12); tone(110, 0.7, 'sawtooth', 0.12, 0.25); },
    win() { tone(523, 0.15, 'triangle', 0.1); tone(659, 0.15, 'triangle', 0.1, 0.14); tone(784, 0.3, 'triangle', 0.1, 0.28); },
  };
}
