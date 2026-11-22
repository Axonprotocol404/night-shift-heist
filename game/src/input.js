// input.js — keyboard state: WASD / arrows to move, Space to start/pause, R to retry.

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set(); // cleared every frame after being read
    window.addEventListener('keydown', (e) => this.onKey(e, true), { passive: false });
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.down.clear());
  }

  onKey(e, isDown) {
    const k = e.key.toLowerCase();
    const tracked =
      ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'r'].includes(k);
    if (!tracked) return;
    e.preventDefault(); // stop the page scrolling on arrows/space
    if (isDown && !this.down.has(k)) this.pressed.add(k);
    if (isDown) this.down.add(k); else this.down.delete(k);
  }

  axis() {
    let x = 0;
    let y = 0;
    if (this.down.has('a') || this.down.has('arrowleft')) x -= 1;
    if (this.down.has('d') || this.down.has('arrowright')) x += 1;
    if (this.down.has('w') || this.down.has('arrowup')) y -= 1;
    if (this.down.has('s') || this.down.has('arrowdown')) y += 1;
    if (x !== 0 && y !== 0) { x *= 0.7071; y *= 0.7071; } // normalize diagonals
    return { x, y };
  }

  // One-shot reads: 'space', 'r'.
  consume(key) {
    const had = this.pressed.has(key);
    if (had) this.pressed.delete(key);
    return had;
  }

  endFrame() {
    this.pressed.clear();
  }
}
