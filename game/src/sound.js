// sound.js — tiny WebAudio blips, all generated, no files and no network.
// Every sound is created on demand after the first user gesture.

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  blip(freq, dur, type = 'square', gain = 0.06, slideTo = 0) {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(30, slideTo), ctx.currentTime + dur,
      );
    }
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  start()   { this.blip(440, 0.12, 'triangle', 0.07, 660); }
  pause()   { this.blip(330, 0.14, 'triangle', 0.06, 220); }
  loot()    { this.blip(720, 0.10, 'square', 0.06, 980); setTimeout(() => this.blip(1040, 0.12, 'square', 0.05), 90); }
  spotted() { this.blip(220, 0.16, 'sawtooth', 0.05, 160); }
  win() {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => this.blip(f, 0.16, 'triangle', 0.07), i * 120));
  }
  lose() {
    [330, 262, 208, 156].forEach((f, i) =>
      setTimeout(() => this.blip(f, 0.22, 'sawtooth', 0.06), i * 150));
  }
}
