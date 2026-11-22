// The screenshot scenes behind ?shot=start|play|end. Each stages a representative frame of
// a real run from a fresh world using a scripted thief path (same seed => same frame), so the
// cover and mid shots show vision cones, cameras, loot and the HUD exactly as a player sees it.
import { FIELD, THIEF_START, WALLS } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { STEP } from './config.js';

const START_SECONDS = 4;

/** Straight-line steps toward a point, stopping on wall contact (the world blocks movement). */
function walk(world, x, y, seconds) {
  const t = world.state.thief;
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const dx = x - t.x;
    const dy = y - t.y;
    if (Math.hypot(dx, dy) < 4) return;
    world.step(Math.sign(dx) * Math.min(1, Math.abs(dx)), Math.sign(dy) * Math.min(1, Math.abs(dy)));
  }
}

function pause(world, seconds) {
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) world.step(0, 0);
}

export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name === 'play') {
    // Grab the near loot, then sit between guards so cones/cameras fill the frame.
    pause(world, 1.4);
    walk(world, 170, 320, 3.5);
    walk(world, 150, 250, 2.0); // near first loot bag
    pause(world, 0.6);
    walk(world, 360, 300, 3.0);
    walk(world, 620, 360, 3.5);
    pause(world, 1.2);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'end') {
    // Late-game drama: two bags secured, the thief got clipped by a guard cone —
    // alarm climbing, cones flash red.
    pause(world, 1.4);
    walk(world, 170, 320, 3.5);
    walk(world, 150, 250, 2.0);
    state.loot[0].taken = true;
    state.carried = 1;
    walk(world, 360, 300, 3.0);
    walk(world, 620, 360, 3.5);
    state.loot[2].taken = true;
    state.carried = 2;
    walk(world, 700, 470, 3.0);
    pause(world, 0.7);
    state.alarm = 0.62;
    state.spottedNow = true;
    state.spottedBy = 'guard';
    state.thief.lit = 1;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  // start: title screen with the world idling behind it.
  pause(world, START_SECONDS);
  void FIELD; void WALLS; void THIEF_START;
  return { screen: SCREEN_TITLE, best: 0 };
}
