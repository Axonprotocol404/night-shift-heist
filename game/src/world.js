// world.js — the bank's floor plan, the people in it, and the rules of the heist.
// Grid coordinates are tiles; everything the renderer touches is in pixels.

import {
  TILE, COLS, ROWS, GAME_TIME, ALARM_RATE_SEEN, ALARM_DECAY, ALARM_MAX,
  PLAYER_SPEED, PLAYER_R, GUARD_SPEED, GUARD_FOV, GUARD_RANGE, GUARD_R,
  GUARD_ALERT_MS, CAMERA_RANGE, CAMERA_SWEEP, CAMERA_ALERT_MS,
  LOOT_R, EXIT_R, STATE, LOSE_REASON,
} from './config.js';

// '#' wall, '.' floor. Outer wall, a two-tile corridor across the middle and
// six rooms around it, each opening onto the corridor through a two-tile door.
export const MAP = [
  '########################',
  '#......#.......#.......#',
  '#......#.......#.......#',
  '#......#...##..#.......#',
  '#......#...##..#.......#',
  '#......#.......#.......#',
  '###..#####..#######..###',
  '#......................#',
  '#......................#',
  '###..#####..#######..###',
  '#......#.......#.......#',
  '#......#...##..#.......#',
  '#......#...##..#.......#',
  '#......#.......#.......#',
  '#......#.......#.......#',
  '########################',
];

const LOOT_TILES = [
  [3, 2], [19, 2], [3, 12], [19, 12],
];

const GUARD_ROUTES = [
  [[2.0, 7.5], [21.2, 7.5]],
  [[8.7, 2.0], [14.2, 2.0], [14.2, 5.4], [8.7, 5.4]],
  [[2.0, 10.6], [6.0, 10.6], [6.0, 13.6], [2.0, 13.6]],
  [[17.0, 10.6], [21.4, 10.6], [21.4, 13.6], [17.0, 13.6]],
];

const CAMERA_DEFS = [
  { x: 6.55, y: 1.55, base: 2.52, amp: 0.62, speed: 0.55, phase: 0.0 },
  { x: 21.9, y: 8.2, base: Math.PI, amp: 0.55, speed: 0.42, phase: 1.7 },
  { x: 8.75, y: 13.7, base: 0.06, amp: 0.72, speed: 0.66, phase: 3.1 },
];

const EXIT_POS = { x: 12.5 * TILE, y: 14.55 * TILE };

const px = (t) => t * TILE;

export function isSolidTile(wx, wy) {
  if (wx < 0 || wy < 0 || wx >= COLS || wy >= ROWS) return true;
  return MAP[wy][wx] === '#';
}

export function isSolidAt(x, y) {
  return isSolidTile(Math.floor(x / TILE), Math.floor(y / TILE));
}

// Line of sight: march the segment and stop at the first wall.
export function hasLineOfSight(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const steps = Math.ceil(dist / 4);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isSolidAt(ax + dx * t, ay + dy * t)) return false;
  }
  return true;
}

// How far a ray travels before it hits a wall (used to clip vision cones).
export function rayDistance(x, y, angle, max) {
  const step = 4;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let d = step; d < max; d += step) {
    if (isSolidAt(x + cos * d, y + sin * d)) return d;
  }
  return max;
}

function tileCenter(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

export function createWorld() {
  const loots = LOOT_TILES.map(([tx, ty], i) => {
    const c = tileCenter(tx, ty);
    return { id: i, x: c.x, y: c.y, taken: false, bob: i * 0.9 };
  });

  const guards = GUARD_ROUTES.map((route, i) => {
    const start = route[0];
    return {
      id: i,
      x: px(start[0]),
      y: px(start[1]),
      route: route.map(([x, y]) => ({ x: px(x), y: px(y) })),
      leg: i % route.length,      // index of the waypoint being walked to
      dir: 1,
      angle: 0,
      speed: GUARD_SPEED * (0.9 + (i % 2) * 0.12),
      seen: false,
      alert: 0,                    // ms of continuous sight
      stareAt: 0,                  // radians the cone leans toward the player
      pause: 0,
      bob: i * 1.3,
    };
  });

  const cameras = CAMERA_DEFS.map((c, i) => ({
    id: i,
    x: px(c.x),
    y: px(c.y),
    base: c.base,
    amp: c.amp,
    speed: c.speed,
    phase: c.phase,
    angle: c.base,
    seen: false,
    alert: 0,
  }));

  return {
    state: STATE.TITLE,
    time: GAME_TIME,
    alarm: 0,
    seen: false,
    spottedTimer: 0,
    lootLeft: LOOT_TILES.length,
    lootTotal: LOOT_TILES.length,
    player: {
      x: px(2.6), y: px(3.2),
      angle: 0,
      r: PLAYER_R,
      speed: PLAYER_SPEED,
      step: 0,
      moving: false,
      hidden: false,
    },
    guards,
    cameras,
    loots,
    exit: { x: EXIT_POS.x, y: EXIT_POS.y, r: EXIT_R, open: false, pulse: 0 },
    particles: makeDust(),
    shake: 0,
    time0: 0,
    loseReason: '',
  };
}

function makeDust() {
  const list = [];
  for (let i = 0; i < 70; i++) {
    list.push({
      x: Math.random() * COLS * TILE,
      y: Math.random() * ROWS * TILE,
      vx: (Math.random() - 0.5) * 7,
      vy: -4 - Math.random() * 8,
      r: 0.6 + Math.random() * 1.4,
      a: 0.12 + Math.random() * 0.3,
    });
  }
  return list;
}

// Push a circle out of every wall tile it overlaps.
function resolveWalls(ent, r) {
  const minX = Math.floor((ent.x - r) / TILE);
  const maxX = Math.floor((ent.x + r) / TILE);
  const minY = Math.floor((ent.y - r) / TILE);
  const maxY = Math.floor((ent.y + r) / TILE);
  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      if (!isSolidTile(tx, ty)) continue;
      const left = tx * TILE;
      const top = ty * TILE;
      const cx = Math.max(left, Math.min(ent.x, left + TILE));
      const cy = Math.max(top, Math.min(ent.y, top + TILE));
      let dx = ent.x - cx;
      let dy = ent.y - cy;
      let d = Math.hypot(dx, dy);
      if (d === 0) {
        // dead centre: shove out along the shortest axis
        dx = ent.x - (left + TILE / 2);
        dy = ent.y - (top + TILE / 2);
        d = Math.hypot(dx, dy) || 1;
      }
      if (d < r) {
        const push = (r - d) / d;
        ent.x += dx * push;
        ent.y += dy * push;
      }
    }
  }
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function seesPoint(pxx, pxy, ox, oy, angle, halfFov, range) {
  const dx = pxx - ox;
  const dy = pxy - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), angle)) > halfFov) return false;
  return hasLineOfSight(ox, oy, pxx, pxy);
}

export function updateWorld(w, dt, input, events) {
  if (w.state !== STATE.PLAYING) {
    w.particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y < -4) { p.y = ROWS * TILE + 4; p.x = Math.random() * COLS * TILE; }
    });
    return;
  }

  const p = w.player;
  const ax = input.axis();
  p.moving = ax.x !== 0 || ax.y !== 0;
  const stepLen = p.speed * dt;
  p.x += ax.x * stepLen;
  p.y += ax.y * stepLen;
  resolveWalls(p, p.r);
  if (p.moving) {
    p.step += dt * 9;
    p.angle = Math.atan2(ax.y, ax.x);
  }

  // Pedestrians in the beams: dust drifts up through the light.
  for (const d of w.particles) {
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    if (d.y < -6) { d.y = ROWS * TILE + 6; d.x = Math.random() * COLS * TILE; }
    if (d.x < -6) d.x = COLS * TILE + 6;
    if (d.x > COLS * TILE + 6) d.x = -6;
  }

  // ---- guards: patrol, then stare when they catch you -------------------
  let seenByAny = false;
  for (const g of w.guards) {
    const target = g.route[g.leg];
    const tx = target.x;
    const ty = target.y;
    let dx = tx - g.x;
    let dy = ty - g.y;
    let dist = Math.hypot(dx, dy);

    g.seen = seesPoint(p.x, p.y, g.x, g.y, g.angle, GUARD_FOV, GUARD_RANGE) ||
      seesPoint(p.x, p.y, g.x, g.y, g.angle, GUARD_FOV * 1.05, GUARD_RANGE * 0.5);

    if (g.seen) {
      seenByAny = true;
      g.alert += dt * 1000;
      const want = Math.atan2(p.y - g.y, p.x - g.x);
      g.angle += angleDiff(want, g.angle) * Math.min(1, dt * 5.5);
      g.pause = 0.9;
    } else {
      g.alert = Math.max(0, g.alert - dt * 500);
    }

    if (g.pause > 0 && !g.seen) {
      g.pause -= dt; // still scanning where the noise came from
    } else if (!g.seen) {
      const walk = g.speed * dt;
      if (dist < 4) {
        g.leg += g.dir;
        if (g.leg >= g.route.length) { g.leg = g.route.length - 2; g.dir = -1; }
        if (g.leg < 0) { g.leg = 1; g.dir = 1; }
      } else {
        g.x += (dx / dist) * walk;
        g.y += (dy / dist) * walk;
        g.angle += angleDiff(Math.atan2(dy, dx), g.angle) * Math.min(1, dt * 4);
      }
    }

    // Idle scanning: a slow head sweep while walking keeps the cones alive.
    g.angle += Math.sin((w.time + g.bob) * 1.6) * dt * 0.35;
  }

  // ---- cameras: sweeping beams ------------------------------------------
  for (const c of w.cameras) {
    c.angle = c.base + Math.sin(w.time * c.speed + c.phase) * c.amp;
    c.seen = seesPoint(p.x, p.y, c.x, c.y, c.angle, 0.16, CAMERA_RANGE);
    if (c.seen) {
      seenByAny = true;
      c.alert += dt * 1000;
    } else {
      c.alert = Math.max(0, c.alert - dt * 700);
    }
  }

  // ---- alarm ------------------------------------------------------------
  w.seen = seenByAny;
  if (seenByAny) {
    w.alarm = Math.min(ALARM_MAX, w.alarm + dt * ALARM_RATE_SEEN);
    w.spottedTimer = 0.35;
    w.shake = Math.min(6, w.shake + dt * 14);
    if (events.onSpot) events.onSpot();
  } else {
    w.alarm = Math.max(0, w.alarm - dt * ALARM_DECAY);
    w.spottedTimer = Math.max(0, w.spottedTimer - dt);
    w.shake = Math.max(0, w.shake - dt * 10);
  }
  if (w.alarm >= ALARM_MAX) {
    w.loseReason = LOSE_REASON.ALARM;
    events.onLose();
  }

  // ---- loot -------------------------------------------------------------
  for (const l of w.loots) {
    if (l.taken) continue;
    l.bob += dt;
    if (Math.hypot(p.x - l.x, p.y - l.y) < l.r + p.r + 4) {
      l.taken = true;
      w.lootLeft -= 1;
      if (w.lootLeft === 0) w.exit.open = true;
      if (events.onLoot) events.onLoot(w.lootLeft);
    }
  }

  // ---- exit -------------------------------------------------------------
  w.exit.pulse += dt;
  if (w.exit.open && Math.hypot(p.x - w.exit.x, p.y - w.exit.y) < w.exit.r + p.r) {
    events.onWin();
    return;
  }

  // ---- clock ------------------------------------------------------------
  w.time = Math.max(0, w.time - dt);
  if (w.time <= 0) {
    w.loseReason = LOSE_REASON.TIME;
    events.onLose();
  }
}

// Exposed so the renderer can draw cones without re-implementing clipping.
export function conePolygon(x, y, angle, halfFov, range, rays = 30) {
  const pts = [{ x, y }];
  for (let i = 0; i <= rays; i++) {
    const a = angle - halfFov + (halfFov * 2 * i) / rays;
    const d = rayDistance(x, y, a, range);
    pts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
  }
  return pts;
}

export const LEVEL_INFO = { LOOT_TILES, EXIT_POS };
