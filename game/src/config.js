// config.js — every tunable of the heist in one place.

export const CANVAS_W = 960;
export const CANVAS_H = 640;
export const TILE = 40;               // grid cell size in pixels
export const COLS = CANVAS_W / TILE;  // 24
export const ROWS = CANVAS_H / TILE;  // 16

export const GAME_TIME = 120;         // seconds, the 2:00 clock
export const ALARM_RATE_SEEN = 0.34;  // alarm gain per second while spotted
export const ALARM_RATE_FOOTSTEP = 0.06; // small alarm tick near a guard
export const ALARM_DECAY = 0.05;      // alarm cools when hidden
export const ALARM_MAX = 1.0;

export const PLAYER_SPEED = 172;      // px/s
export const PLAYER_R = 11;
export const GUARD_SPEED = 78;
export const GUARD_ALERT_SPEED = 148; // chasing pace once they see you
export const GUARD_FOV = Math.PI / 3.4;  // vision cone half-angle
export const GUARD_RANGE = 205;
export const GUARD_R = 12;
export const GUARD_ALERT_MS = 420;    // time in cone before full alarm burst
export const CAMERA_RANGE = 190;
export const CAMERA_SWEEP = Math.PI / 2.6;
export const CAMERA_ALERT_MS = 380;

export const LOOT_COUNT = 4;
export const LOOT_R = 12;
export const EXIT_R = 20;

export const STATE = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  WIN: 'win',
  LOSE: 'lose',
};

export const LOSE_REASON = {
  ALARM: 'THE ALARM WENT OFF — BUSTED',
  TIME: 'TIME RAN OUT — CLEAN GETAWAY FAILED',
};
