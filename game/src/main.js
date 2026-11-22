// main.js — wires everything together: the game loop, HUD, overlay and
// start/pause/win/lose flow.

import { CANVAS_W, CANVAS_H, STATE, GAME_TIME, LOOT_COUNT, ALARM_MAX } from './config.js';
import { Input } from './input.js';
import { createWorld, updateWorld } from './world.js';
import { makeRenderer } from './render.js';
import { Sound } from './sound.js';

const canvas = document.getElementById('game');
const overlay = document.getElementById('overlay');
const overlayTitle = overlay.querySelector('h1');
const overlaySub = document.getElementById('overlay-sub');
const overlayAction = document.getElementById('overlay-action');
const alarmFill = document.getElementById('alarm-fill');
const alarmWrap = document.getElementById('alarm-wrap');
const lootCount = document.getElementById('loot-count');
const timerEl = document.getElementById('timer');
const hintEl = document.getElementById('hint');

const input = new Input();
const sound = new Sound();
const renderer = makeRenderer(canvas);
let world = createWorld();

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function updateHud() {
  const pct = Math.round((world.alarm / ALARM_MAX) * 100);
  alarmFill.style.width = `${pct}%`;
  alarmWrap.classList.toggle('hot', pct >= 60);
  lootCount.textContent = `${world.lootTotal - world.lootLeft}/${world.lootTotal}`;
  timerEl.textContent = fmtTime(world.time);
  timerEl.classList.toggle('low', world.time <= 20);
  hintEl.textContent = world.exit.open
    ? 'EXIT UNLOCKED — run for the green door!'
    : 'WASD/arrows move · SPACE pause · stay out of the light';
}

function showOverlay(title, sub, action, cls) {
  overlayTitle.textContent = title;
  overlaySub.innerHTML = sub;
  overlayAction.textContent = action;
  overlay.classList.remove('hidden', 'win', 'lose');
  if (cls) overlay.classList.add(cls);
}

function hideOverlay() {
  overlay.classList.add('hidden');
}

function startGame() {
  world = createWorld();
  world.state = STATE.PLAYING;
  hideOverlay();
  sound.start();
}

function onWin() {
  world.state = STATE.WIN;
  sound.win();
  const used = Math.ceil(GAME_TIME - world.time);
  showOverlay(
    'CLEAN GETAWAY',
    `All ${LOOT_COUNT} bags stolen in ${fmtTime(used)}. The vault never knew what hit it.`,
    'Press SPACE to run it again',
    'win',
  );
}

function onLose() {
  world.state = STATE.LOSE;
  sound.lose();
  const got = LOOT_COUNT - world.lootLeft;
  showOverlay(
    'BUSTED',
    `${world.loseReason}<br>Loot recovered: ${got}/${LOOT_COUNT}`,
    'Press SPACE to try again',
    'lose',
  );
}

function togglePause() {
  if (world.state === STATE.PLAYING) {
    world.state = STATE.PAUSED;
    showOverlay('PAUSED', 'The guards keep patrolling in your dreams only.', 'Press SPACE to resume', '');
    sound.pause();
  } else if (world.state === STATE.PAUSED) {
    world.state = STATE.PLAYING;
    hideOverlay();
    sound.start();
  }
}

// Rebuild the events object every frame so closures always see fresh world state.
const events = {
  onWin: () => onWin(),
  onLose: () => onLose(),
  onLoot: () => sound.loot(),
  onSpot: () => sound.spotted(),
};

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;

  if (input.consume(' ')) {
    if (world.state === STATE.TITLE) startGame();
    else if (world.state === STATE.PLAYING || world.state === STATE.PAUSED) togglePause();
    else startGame();
  }
  if (input.consume('r') && world.state !== STATE.TITLE) startGame();

  updateWorld(world, dt, input, events);
  renderer.drawFrame(world, t);
  updateHud();
  input.endFrame();
  requestAnimationFrame(frame);
}

showOverlay(
  'VANILLA HEIST',
  'Steal the 4 glowing bags of gold. Guards patrol with vision cones,<br>' +
  'cameras sweep the halls. Fill the alarm meter and it\u2019s over.<br>' +
  'Grab everything, then escape through the green EXIT door.',
  'Press SPACE to start',
  '',
);
updateHud();
requestAnimationFrame(frame);
