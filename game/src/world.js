// Game state and rules: thief movement with wall collision, guard patrol + vision cones,
// camera sweeps, loot pickup, alarm meter, timer, win (all loot + reach exit) and lose
// (alarm full or time out). step() advances one fixed tick and returns event flags.
import {
  ALARM_DECAY, ALARM_RATE, CAMERA_FOV, CAMERA_RANGE, CAMERA_SWEEP, EXIT,
  FIELD, GUARDS, LOOT_POINTS, LOOT_RADIUS, LOOT_VALUE, STEP, THIEF, THIEF_START,
  TIME_LIMIT, WALLS,
} from './config.js';

export const EVENT_NONE = 0;
export const EVENT_SPOTTED = 1;
export const EVENT_LOOT = 2;
export const EVENT_OVER = 4;
export const EVENT_WIN = 8;
export const KIND_LOST = 0;
export const KIND_PLAYING = 1;
export const KIND_WON = 2;

function rectCircleOverlap(rect, cx, cy, r) {
  const nx = Math.max(rect[0], Math.min(cx, rect[0] + rect[2]));
  const ny = Math.max(rect[1], Math.min(cy, rect[1] + rect[3]));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

/** Segment vs axis-aligned rect hit (slab method). */
function segmentHitsRect(x1, y1, x2, y2, rect) {
  const [rx, ry, rw, rh] = rect;
  let t0 = 0;
  let t1 = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  function slab(p, d, min, max) {
    if (Math.abs(d) < 1e-9) return p >= min && p <= max;
    let ta = (min - p) / d;
    let tb = (max - p) / d;
    if (ta > tb) { const tmp = ta; ta = tb; tb = tmp; }
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    return t0 <= t1;
  }
  return slab(x1, dx, rx, rx + rw) && slab(y1, dy, ry, ry + rh) && t1 >= 0 && t0 <= 1;
}

export function hasLineOfSight(x1, y1, x2, y2) {
  for (let i = 0; i < WALLS.length; i += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, WALLS[i])) return false;
  }
  return true;
}

function moveWithWalls(entity, dx, dy, radius) {
  const x = entity.x + dx;
  const y = entity.y + dy;
  const probe = [{ x, y: entity.y }, { x: entity.x, y }];
  const widths = [radius, radius];
  for (let i = 0; i < 2; i += 1) {
    const p = probe[i];
    let blocked = false;
    for (const wall of WALLS) {
      if (rectCircleOverlap(wall, p.x, p.y, radius)) { blocked = true; break; }
    }
    if (!blocked) {
      entity.x = p.x;
      entity.y = p.y;
    }
  }
  entity.x = Math.max(radius + 2, Math.min(FIELD.width - radius - 2, entity.x));
  entity.y = Math.max(radius + 2, Math.min(FIELD.height - radius - 2, entity.y));
}

function patrol(waypoints, index, x, y) {
  const target = waypoints[index];
  const dx = target[0] - x;
  const dy = target[1] - y;
  const dist = Math.hypot(dx, dy);
  return { dx, dy, dist, target };
}

export function createWorld(random) {
  const state = {
    kind: KIND_PLAYING,
    thief: { x: THIEF_START.x, y: THIEF_START.y, facing: 0, lit: 0 },
    guards: GUARDS.map((g, i) => ({
      id: i,
      x: g.path[0][0], y: g.path[0][1],
      angle: 0,
      waypoint: 1 % g.path.length,
      path: g.path,
      speed: g.speed,
      fov: g.fov,
      range: g.range,
      sweepPhase: i * 1.7,
    })),
    cameras: [
      { x: 120, y: 60, base: Math.PI / 2, phase: 0 },
      { x: 900, y: 320, base: Math.PI, phase: 2.1 },
      { x: 500, y: 60, base: Math.PI / 2, phase: 4.4 },
    ],
    loot: [],
    carried: 0,
    totalLoot: LOOT_POINTS.length,
    alarm: 0,
    time: TIME_LIMIT,
    spottedNow: false,
    spottedBy: null,
  };
  let rng = random;

  function reset() {
    rng = random;
    state.kind = KIND_PLAYING;
    state.thief.x = THIEF_START.x;
    state.thief.y = THIEF_START.y;
    state.thief.facing = 0;
    state.thief.lit = 0;
    state.carried = 0;
    state.alarm = 0;
    state.time = TIME_LIMIT;
    state.spottedNow = false;
    state.spottedBy = null;
    for (const g of state.guards) {
      g.x = g.path[0][0];
      g.y = g.path[0][1];
      g.waypoint = 1 % g.path.length;
    }
    // Shuffle loot placement order deterministically; all points active (pick any order).
    state.loot = LOOT_POINTS.map((p) => ({ x: p[0], y: p[1], taken: false, glow: rng() }));
  }

  reset();

  /** Returns event flags for this tick. */
  function step(dirX, dirY) {
    if (state.kind !== KIND_PLAYING) return EVENT_NONE;
    let events = EVENT_NONE;
    const len = Math.hypot(dirX, dirY);
    if (len > 0) {
      const dx = (dirX / len) * THIEF.speed * STEP;
      const dy = (dirY / len) * THIEF.speed * STEP;
      moveWithWalls(state.thief, dx, dy, THIEF.radius);
      state.thief.facing = Math.atan2(dy, dx);
    }

    // Guards patrol and rotate their cones toward motion; sweep slightly for flavour.
    for (const g of state.guards) {
      const { dx, dy, dist, target } = patrol(g.path, g.waypoint, g.x, g.y);
      if (dist < 6) {
        g.waypoint = (g.waypoint + 1) % g.path.length;
      } else {
        const stepLen = g.speed * STEP;
        const nx = g.x + (dx / dist) * stepLen;
        const ny = g.y + (dy / dist) * stepLen;
        let blocked = false;
        for (const wall of WALLS) {
          if (rectCircleOverlap(wall, nx, ny, 13)) { blocked = true; break; }
        }
        if (blocked) g.waypoint = (g.waypoint + 1) % g.path.length;
        else { g.x = nx; g.y = ny; }
        const wanted = Math.atan2(dy, dx);
        let diff = wanted - g.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        g.angle += diff * Math.min(1, 6 * STEP);
      }
      void target;
    }

    // Cameras sweep back and forth.
    for (const c of state.cameras) {
      c.phase += STEP * 0.9;
      c.angle = c.base + Math.sin(c.phase) * CAMERA_SWEEP;
    }

    // Detection: thief inside a cone with line of sight.
    const t = state.thief;
    let spotted = false;
    let by = null;
    for (const g of state.guards) {
      const dist = Math.hypot(t.x - g.x, t.y - g.y);
      if (dist > g.range) continue;
      let ang = Math.atan2(t.y - g.y, t.x - g.x) - g.angle;
      while (ang > Math.PI) ang -= Math.PI * 2;
      while (ang < -Math.PI) ang += Math.PI * 2;
      if (Math.abs(ang) < g.fov / 2 && hasLineOfSight(g.x, g.y, t.x, t.y)) { spotted = true; by = 'guard'; }
    }
    for (const c of state.cameras) {
      const dist = Math.hypot(t.x - c.x, t.y - c.y);
      if (dist > CAMERA_RANGE) continue;
      let ang = Math.atan2(t.y - c.y, t.x - c.x) - c.angle;
      while (ang > Math.PI) ang -= Math.PI * 2;
      while (ang < -Math.PI) ang += Math.PI * 2;
      if (Math.abs(ang) < CAMERA_FOV / 2 && hasLineOfSight(c.x, c.y, t.x, t.y)) { spotted = true; by = by ?? 'camera'; }
    }
    state.spottedNow = spotted;
    state.spottedBy = by;
    if (spotted) {
      state.alarm = Math.min(1, state.alarm + ALARM_RATE * STEP);
      events |= EVENT_SPOTTED;
      t.lit = Math.min(1, t.lit + STEP * 4);
    } else {
      state.alarm = Math.max(0, state.alarm - ALARM_DECAY * STEP);
      t.lit = Math.max(0, t.lit - STEP * 2);
    }

    // Loot pickup.
    for (const item of state.loot) {
      if (item.taken) continue;
      if (Math.hypot(t.x - item.x, t.y - item.y) < THIEF.radius + LOOT_RADIUS) {
        item.taken = true;
        state.carried += LOOT_VALUE;
        events |= EVENT_LOOT;
      }
    }

    // Timer and end conditions.
    state.time = Math.max(0, state.time - STEP);
    if (state.alarm >= 1) {
      state.kind = KIND_LOST;
      events |= EVENT_OVER;
    } else if (state.time <= 0) {
      state.kind = KIND_LOST;
      events |= EVENT_OVER;
    } else if (state.carried >= state.totalLoot) {
      const e = EXIT;
      if (t.x > e.x && t.x < e.x + e.w && t.y > e.y && t.y < e.y + e.h) {
        state.kind = KIND_WON;
        events |= EVENT_OVER | EVENT_WIN;
      }
    }
    return events;
  }

  return { state, step, reset };
}
