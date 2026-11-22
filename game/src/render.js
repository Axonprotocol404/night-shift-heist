// render.js — draws every frame: dark rooms, vision cones, sweeping beams,
// glowing loot, the exit, the thief, and a cinematic vignette.

import { TILE, CANVAS_W, CANVAS_H, STATE, GUARD_FOV, GUARD_RANGE, CAMERA_RANGE } from './config.js';
import { MAP, conePolygon, isSolidTile } from './world.js';

const FLOOR = '#0b0f1a';
const FLOOR_ALT = '#0d1220';
const WALL_TOP = '#1d2740';
const WALL_FACE = '#101828';
const WALL_EDGE = '#2c3c60';
const GOLD = '#ffd166';
const GREEN = '#4ee38a';

export function makeRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;

  function drawFrame(w, t) {
    ctx.save();
    if (w.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * w.shake, (Math.random() - 0.5) * w.shake);
    }
    drawFloor();
    drawRooms(w, t);
    for (const l of w.loots) if (!l.taken) drawLoot(l, t);
    drawExit(w.exit, t);
    drawPlayerTrail(w);
    for (const c of w.cameras) drawCamera(c, w, t);
    for (const g of w.guards) drawGuardCone(g, w);
    drawDust(w);
    for (const g of w.guards) drawGuard(g, w, t);
    drawPlayer(w, t);
    drawWallShadows();
    drawVignette();
    if (w.state === STATE.PLAYING && w.spottedTimer > 0) drawSpottedFlash(w);
    ctx.restore();
  }

  // ---- floor -------------------------------------------------------------

  function drawFloor() {
    ctx.fillStyle = FLOOR;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = FLOOR_ALT;
    for (let y = 0; y < MAP.length; y++) {
      for (let x = 0; x < MAP[y].length; x++) {
        if (MAP[y][x] === '#' || (x + y) % 2) continue;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
    // faint grid seams so the rooms read as tiled bank flooring
    ctx.strokeStyle = 'rgba(60,80,120,0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_W; x += TILE) {
      ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, CANVAS_H);
    }
    for (let y = 0; y <= CANVAS_H; y += TILE) {
      ctx.moveTo(0, y + 0.5); ctx.lineTo(CANVAS_W, y + 0.5);
    }
    ctx.stroke();
  }

  // walls: a face and a brighter cap, painted as thick strokes
  function drawRooms(w, t) {
    ctx.lineCap = 'square';
    for (let y = 0; y < MAP.length; y++) {
      for (let x = 0; x < MAP[y].length; x++) {
        if (MAP[y][x] !== '#') continue;
        const px = x * TILE;
        const py = y * TILE;
        ctx.fillStyle = WALL_FACE;
        ctx.fillRect(px, py + TILE * 0.28, TILE, TILE * 0.72);
        ctx.fillStyle = WALL_TOP;
        ctx.fillRect(px, py, TILE, TILE * 0.3);
        ctx.strokeStyle = WALL_EDGE;
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      }
    }
  }

  function drawWallShadows() {
    // soft drop from wall caps onto the floor below
    const grad = ctx.createLinearGradient(0, 0, 0, 26);
    grad.addColorStop(0, 'rgba(0,0,0,0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    for (let y = 0; y < MAP.length; y++) {
      for (let x = 0; x < MAP[y].length; x++) {
        if (MAP[y][x] !== '#') continue;
        if (y + 1 < MAP.length && MAP[y + 1][x] !== '#') {
          ctx.fillRect(x * TILE, (y + 1) * TILE, TILE, 14);
        }
      }
    }
  }

  // ---- actors ------------------------------------------------------------

  function drawGuardCone(g, w) {
    const hot = g.alert > 60;
    const pts = conePolygon(g.x, g.y, g.angle, GUARD_FOV, GUARD_RANGE, 26);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    const grad = ctx.createRadialGradient(g.x, g.y, 6, g.x, g.y, GUARD_RANGE);
    if (hot) {
      grad.addColorStop(0, 'rgba(255,90,70,0.42)');
      grad.addColorStop(0.55, 'rgba(255,70,80,0.20)');
      grad.addColorStop(1, 'rgba(255,60,90,0)');
    } else {
      grad.addColorStop(0, 'rgba(150,190,255,0.30)');
      grad.addColorStop(0.6, 'rgba(120,160,230,0.13)');
      grad.addColorStop(1, 'rgba(100,140,220,0)');
    }
    ctx.fillStyle = grad;
    ctx.fill();
    // edges of the cone for a crisp silhouette
    ctx.strokeStyle = hot ? 'rgba(255,110,100,0.55)' : 'rgba(150,190,255,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawGuard(g, w, t) {
    const bob = Math.sin(t * 6 + g.bob) * 1.6;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(g.x, g.y + 9, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // body
    ctx.fillStyle = g.alert > 60 ? '#e64c5a' : '#3f5f96';
    ctx.beginPath();
    ctx.roundRect(g.x - 9, g.y - 9 + bob, 18, 18, 5);
    ctx.fill();
    ctx.strokeStyle = g.alert > 60 ? '#ffb0b6' : '#7fa3d8';
    ctx.lineWidth = 2;
    ctx.stroke();
    // head + facing nose
    ctx.fillStyle = '#c9d6ea';
    ctx.beginPath();
    ctx.arc(g.x, g.y - 2 + bob, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e9f0fb';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(g.x + Math.cos(g.angle) * 6, g.y - 2 + bob + Math.sin(g.angle) * 6);
    ctx.lineTo(g.x + Math.cos(g.angle) * 14, g.y - 2 + bob + Math.sin(g.angle) * 14);
    ctx.stroke();
    // chest light when suspicious
    if (g.alert > 60) {
      ctx.fillStyle = 'rgba(255,90,80,0.9)';
      ctx.beginPath();
      ctx.arc(g.x, g.y + 4 + bob, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCamera(c, w, t) {
    // beam, clipped to walls
    const pts = conePolygon(c.x, c.y, c.angle, 0.17, CAMERA_RANGE, 12);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    const grad = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, CAMERA_RANGE);
    if (c.alert > 40) {
      grad.addColorStop(0, 'rgba(255,80,70,0.5)');
      grad.addColorStop(1, 'rgba(255,60,80,0)');
    } else {
      grad.addColorStop(0, 'rgba(255,220,140,0.42)');
      grad.addColorStop(0.7, 'rgba(255,200,110,0.10)');
      grad.addColorStop(1, 'rgba(255,190,90,0)');
    }
    ctx.fillStyle = grad;
    ctx.fill();

    // housing on the wall
    ctx.fillStyle = '#0e1420';
    ctx.beginPath();
    ctx.roundRect(c.x - 8, c.y - 8, 16, 16, 3);
    ctx.fill();
    ctx.strokeStyle = c.alert > 40 ? '#ff6a5e' : '#e8c86a';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // lens
    ctx.fillStyle = c.alert > 40 ? '#ff4b3e' : '#ffe9a8';
    ctx.beginPath();
    ctx.arc(c.x + Math.cos(c.angle) * 4, c.y + Math.sin(c.angle) * 4, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlayerTrail(w) {
    if (!w.player.moving || w.state !== STATE.PLAYING) return;
    ctx.fillStyle = 'rgba(140,190,255,0.10)';
    for (let i = 1; i <= 3; i++) {
      const a = w.player.angle + Math.PI;
      const d = 14 + i * 9;
      ctx.beginPath();
      ctx.arc(w.player.x + Math.cos(a) * d, w.player.y + Math.sin(a) * d, 4 - i, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlayer(w, t) {
    const p = w.player;
    const bob = p.moving ? Math.sin(t * 11) * 1.5 : Math.sin(t * 2) * 0.6;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 9, 10, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // thief in dark clothes, faint rim light so they pop against the floor
    ctx.fillStyle = '#1c2438';
    ctx.beginPath();
    ctx.roundRect(p.x - 8, p.y - 8 + bob, 16, 16, 5);
    ctx.fill();
    ctx.strokeStyle = w.seen ? '#ff7a6e' : '#8fb6ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    // beanie + eyes
    ctx.fillStyle = '#0c1018';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 2 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cfe2ff';
    const ex = Math.cos(p.angle);
    const ey = Math.sin(p.angle);
    ctx.fillRect(p.x + ex * 3 - 1, p.y - 3 + bob + ey * 3 - 1, 2, 2);
    ctx.fillRect(p.x + ex * 5 - 1, p.y - 2 + bob + ey * 5 - 1, 2, 2);
    // little satchel
    ctx.fillStyle = '#39294f';
    ctx.beginPath();
    ctx.roundRect(p.x - ex * 9 - 3, p.y - ey * 9 - 3 + bob, 6, 6, 2);
    ctx.fill();
  }

  // ---- objectives ----------------------------------------------------------

  function drawLoot(l, t) {
    const float = Math.sin(t * 2.4 + l.bob) * 3;
    const y = l.y + float;
    const glow = 0.5 + Math.sin(t * 3 + l.bob) * 0.18;
    // golden halo
    const grad = ctx.createRadialGradient(l.x, y, 2, l.x, y, 26);
    grad.addColorStop(0, `rgba(255,209,102,${0.5 * glow + 0.25})`);
    grad.addColorStop(0.6, `rgba(255,190,70,${0.16 * glow})`);
    grad.addColorStop(1, 'rgba(255,180,60,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    // money bag
    ctx.fillStyle = '#f5b942';
    ctx.beginPath();
    ctx.moveTo(l.x - 8, y + 8);
    ctx.quadraticCurveTo(l.x - 11, y - 4, l.x - 3, y - 6);
    ctx.quadraticCurveTo(l.x, y - 9, l.x + 3, y - 6);
    ctx.quadraticCurveTo(l.x + 11, y - 4, l.x + 8, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8a6a1c';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // tied neck + dollar mark
    ctx.fillStyle = '#6b5217';
    ctx.fillRect(l.x - 3.4, y - 8, 6.8, 3);
    ctx.fillStyle = '#5c4310';
    ctx.font = 'bold 9px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', l.x, y + 3);
  }

  function drawExit(exit, t) {
    const pulse = exit.open ? 0.6 + Math.sin(t * 5) * 0.4 : 0.18;
    const col = exit.open ? GREEN : '#3f5f96';
    // doorway glow spilling onto the floor
    const grad = ctx.createRadialGradient(exit.x, exit.y, 4, exit.x, exit.y, 44);
    grad.addColorStop(0, exit.open ? 'rgba(78,227,138,0.55)' : 'rgba(70,110,180,0.25)');
    grad.addColorStop(1, 'rgba(78,227,138,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(exit.x, exit.y, 44, 0, Math.PI * 2);
    ctx.fill();
    // the door
    ctx.fillStyle = '#0d1a14';
    ctx.beginPath();
    ctx.roundRect(exit.x - 18, exit.y - 24, 36, 48, 4);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.stroke();
    // EXIT sign
    ctx.fillStyle = exit.open ? GREEN : '#5a7ab0';
    ctx.fillRect(exit.x - 16, exit.y - 34, 32, 9);
    ctx.fillStyle = '#04140b';
    ctx.font = 'bold 8px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', exit.x, exit.y - 26.5);
    // arrow when unlocked
    if (exit.open) {
      const ay = exit.y + Math.sin(t * 4) * 3;
      ctx.fillStyle = `rgba(78,227,138,${0.4 + pulse * 0.5})`;
      ctx.beginPath();
      ctx.moveTo(exit.x - 7, ay - 6);
      ctx.lineTo(exit.x + 7, ay - 6);
      ctx.lineTo(exit.x, ay + 5);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(150,180,230,0.75)';
      ctx.font = '7px "Trebuchet MS", sans-serif';
      ctx.fillText('LOCKED', exit.x, exit.y + 36);
    }
  }

  // ---- atmosphere ------------------------------------------------------------

  function drawDust(w) {
    ctx.fillStyle = 'rgba(180,200,240,1)';
    for (const d of w.particles) {
      ctx.globalAlpha = d.a;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawVignette() {
    const grad = ctx.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.34,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.82,
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  function drawSpottedFlash(w) {
    const a = Math.min(0.14, w.spottedTimer * 0.4);
    ctx.fillStyle = `rgba(255,60,60,${a})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = 'rgba(255,90,80,0.95)';
    ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPOTTED', CANVAS_W / 2, 86);
  }

  return { drawFrame };
}
