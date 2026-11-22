// Fixed-size playfield and tunables. The canvas letterboxes the FIELD into the window.
export const FIELD = { width: 960, height: 600 };

export const STEP = 1 / 60;
export const HUD_HEIGHT = 56;

// Thief
export const THIEF = { radius: 11, speed: 168 };

// Guards patrol waypoints; speed in px/s; cone half-angle in radians; sight range in px.
export const GUARDS = [
  {
    path: [[200, 120], [760, 120], [760, 300], [200, 300]],
    speed: 95, fov: Math.PI / 5, range: 240,
  },
  {
    path: [[780, 470], [300, 470], [300, 400], [700, 400], [700, 520], [200, 520]],
    speed: 80, fov: Math.PI / 5.2, range: 215,
  },
  {
    path: [[520, 200], [520, 430], [640, 430], [640, 200]],
    speed: 70, fov: Math.PI / 6, range: 200,
  },
];

export const CAMERA_FOV = Math.PI / 6.5;
export const CAMERA_RANGE = 205;
export const CAMERA_SWEEP = Math.PI / 3.2;

// Alarm: per-second fill while spotted; decays when hidden. Full alarm = caught.
export const ALARM_RATE = 0.30;
export const ALARM_DECAY = 0.10;

export const LOOT_VALUE = 1;

export const TIME_LIMIT = 120;

// Rectangular walls: [x, y, w, h] in field pixels (outer walls plus inner structure).
export const WALLS = [
  [0, 0, FIELD.width, 14],
  [0, FIELD.height - 14, FIELD.width, 14],
  [0, 0, 14, FIELD.height],
  [FIELD.width - 14, 0, 14, FIELD.height],
  [90, 90, 220, 16],
  [90, 90, 16, 130],
  [90, 300, 16, 210],
  [200, 350, 16, 160],
  [310, 220, 16, 130],
  [310, 220, 180, 16],
  [430, 300, 16, 120],
  [560, 90, 16, 150],
  [560, 226, 190, 16],
  [736, 90, 16, 150],
  [680, 300, 200, 16],
  [680, 300, 16, 120],
  [430, 440, 190, 16],
  [810, 226, 60, 16],
];

// Loot spawn points (picked up in any order); exit door rectangle.
export const LOOT_POINTS = [[150, 250], [870, 160], [470, 200], [870, 500]];
export const LOOT_RADIUS = 10;
export const EXIT = { x: 30, y: 470, w: 60, h: 130 };
export const THIEF_START = { x: 66, y: 535 };
