// Keyboard (WASD/arrows, space, P) and mouse. pointer direction is used for the thief's aim-light.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const KEY_LEFT = ['ArrowLeft', 'KeyA'];
const KEY_RIGHT = ['ArrowRight', 'KeyD'];
const KEY_UP = ['ArrowUp', 'KeyW'];
const KEY_DOWN = ['ArrowDown', 'KeyS'];

export function createInput(canvas) {
  const down = new Set();
  let actions = 0;
  const pointer = { x: 480, y: 300, active: false };

  function update(codes, pressed) {
    for (const code of codes) {
      if (pressed) down.add(code); else down.delete(code);
    }
  }
  function any(codes) {
    for (const code of codes) if (down.has(code)) return true;
    return false;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    update(KEY_LEFT.concat(KEY_RIGHT, KEY_UP, KEY_DOWN), true);
    if (KEY_LEFT.includes(event.code) || KEY_RIGHT.includes(event.code)
      || KEY_UP.includes(event.code) || KEY_DOWN.includes(event.code)
      || event.code === 'Space') event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    update(KEY_LEFT.concat(KEY_RIGHT, KEY_UP, KEY_DOWN), false);
  });
  canvas.addEventListener('mousedown', (event) => {
    actions |= ACTION_CONFIRM;
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
  });

  return {
    takeActions() {
      const out = actions;
      actions = 0;
      return out;
    },
    direction() {
      return {
        x: (any(KEY_RIGHT) ? 1 : 0) - (any(KEY_LEFT) ? 1 : 0),
        y: (any(KEY_DOWN) ? 1 : 0) - (any(KEY_UP) ? 1 : 0),
      };
    },
    pointer,
  };
}
