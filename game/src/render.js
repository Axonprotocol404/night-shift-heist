// Cinematic dark renderer: floor grid, walls, translucent vision cones with line-of-sight
// occlusion (raycast fan), cameras with red blink, glowing loot, thief with shadow trail,
// alarm meter / loot count / timer HUD, and title / win / caught overlays.
import { CAMERA_FOV, CAMERA_RANGE, EXIT, FIELD, HUD_HEIGHT, THIEF, WALLS } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;
export const SCREEN_WIN = 4;

// Logical pixels per field pixel (the canvas is FIELD.width x (FIELD.height + HUD)).
export const VIEW = { width: FIELD.width, height: FIELD.height + HUD_HEIGHT };

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;

  function fit() {
    const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
    canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
    canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
  }
  window.addEventListener('resize', fit);
  fit();

  function drawCone(x, y, angle, half, range, color, alpha, occluders) {
    const rays = 42;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i <= rays; i += 1) {
      const a = angle - half + (i / rays) * half * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      let dist = range;
      for (let d = 14; d < range; d += 8) {
        const px = x + ca * d;
        const py = y + sa * d;
        let hit = false;
        for (const w of occluders) {
          if (px >= w[0] && px <= w[0] + w[2] && py >= w[1] && py <= w[1] + w[3]) { hit = true; break; }
        }
        if (hit) { dist = d - 6; break; }
      }
      ctx.lineTo(x + ca * dist, y + sa * dist);
    }
    ctx.closePath();
    const grad = ctx.createRadialGradient(x, y, 8, x, y, range);
    grad.addColorStop(0, color.replace('ALPHA', String(alpha)));
    grad.addColorStop(1, color.replace('ALPHA', '0'));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = color.replace('ALPHA', String(Math.min(0.8, alpha + 0.15)));
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  function draw(state, screen, best) {
    const t = state.thief;
    // Backdrop
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    // Floor
    const floor = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    floor.addColorStop(0, '#141a26');
    floor.addColorStop(1, '#0b0f18');
    ctx.fillStyle = floor;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.strokeStyle = 'rgba(120,150,200,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 40; x < FIELD.width; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.height); }
    for (let y = 40; y < FIELD.height; y += 40) { ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); }
    ctx.stroke();

    // Exit door
    ctx.fillStyle = 'rgba(60, 220, 130, 0.18)';
    ctx.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
    ctx.strokeStyle = '#3ddc82';
    ctx.lineWidth = 2;
    ctx.strokeRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
    ctx.fillStyle = '#3ddc82';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h / 2 + 5);

    // Vision cones (guards then cameras), under walls.
    for (const g of state.guards) {
      const alerted = state.spottedBy === 'guard' && state.spottedNow;
      drawCone(g.x, g.y, g.angle, g.fov / 2, g.range,
        alerted ? 'rgba(255,70,70,ALPHA)' : 'rgba(255,196,60,ALPHA)',
        alerted ? 0.4 : 0.26, WALLS);
    }
    for (const c of state.cameras) {
      const alerted = state.spottedBy === 'camera' && state.spottedNow;
      drawCone(c.x, c.y, c.angle, CAMERA_FOV / 2, CAMERA_RANGE,
        alerted ? 'rgba(255,70,70,ALPHA)' : 'rgba(80,180,255,ALPHA)',
        alerted ? 0.4 : 0.22, WALLS);
    }

    // Walls (outer frame darker, inner structure lighter)
    for (let i = 0; i < WALLS.length; i += 1) {
      const [x, y, w, h] = WALLS[i];
      ctx.fillStyle = i < 4 ? '#1a2230' : '#26334d';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(110,140,200,0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }

    // Loot (glowing diamonds)
    for (const item of state.loot) {
      if (item.taken) continue;
      const pulse = 0.6 + 0.4 * Math.sin(item.glow * 10 + performance.now() / 300);
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(Math.PI / 4);
      ctx.shadowColor = 'rgba(255,215,80,0.9)';
      ctx.shadowBlur = 16 * pulse;
      ctx.fillStyle = '#ffd750';
      ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = '#fff3c0';
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    }

    // Guards (dark bodies + bright visor, direction indicator)
    for (const g of state.guards) {
      ctx.beginPath();
      ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
      ctx.fillStyle = state.spottedNow && state.spottedBy === 'guard' ? '#b3352f' : '#2c3850';
      ctx.fill();
      ctx.strokeStyle = '#8899bb';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(g.x + Math.cos(g.angle) * 7, g.y + Math.sin(g.angle) * 7, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd452';
      ctx.fill();
    }

    // Cameras (wall-mounted boxes with lens)
    for (const c of state.cameras) {
      const red = state.spottedNow && state.spottedBy === 'camera';
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);
      ctx.fillStyle = '#3a4a6a';
      ctx.fillRect(-10, -7, 22, 14);
      ctx.strokeStyle = '#8899bb';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-10, -7, 22, 14);
      ctx.beginPath();
      ctx.arc(12, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = red ? '#ff5346' : '#54c7ff';
      ctx.shadowColor = red ? 'rgba(255,80,60,0.9)' : 'rgba(80,200,255,0.8)';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    }

    // Thief: shadow trail + body + aim
    const spotted = state.spottedNow;
    ctx.save();
    ctx.beginPath();
    ctx.arc(t.x, t.y, THIEF.radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = spotted ? 'rgba(255,70,70,0.35)' : 'rgba(120,220,255,0.15)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(t.x, t.y, THIEF.radius, 0, Math.PI * 2);
    ctx.fillStyle = spotted ? '#ff6a5c' : '#57e0ff';
    ctx.shadowColor = spotted ? 'rgba(255,90,70,0.9)' : 'rgba(90,220,255,0.8)';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#0a0e16';
    ctx.lineWidth = 2;
    ctx.stroke();
    // hat brim showing facing
    ctx.beginPath();
    ctx.arc(t.x + Math.cos(t.facing) * 8, t.y + Math.sin(t.facing) * 8, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    drawHud(state, screen, best);
    if (screen === SCREEN_TITLE) overlay('MIDNIGHT VAULT', 'Steal all 4 loot bags. Avoid cones. Escape via EXIT.', 'Press SPACE or click to begin', '#57e0ff');
    if (screen === SCREEN_PAUSED) overlay('PAUSED', null, 'Press P to resume', '#cccccc');
    if (screen === SCREEN_OVER) overlay('CAUGHT!', `Loot secured: ${state.carried}/${state.totalLoot}`, 'Press SPACE to try again', '#ff6a5c');
    if (screen === SCREEN_WIN) overlay('CLEAN GETAWAY', `All ${state.totalLoot} loot bags in ${Math.max(0, Math.round(120 - state.time))}s`, 'Press SPACE to play again', '#3ddc82');
  }

  function drawHud(state, screen, best) {
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, FIELD.height, VIEW.width, HUD_HEIGHT);
    ctx.strokeStyle = 'rgba(90,120,180,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, FIELD.height + 0.5);
    ctx.lineTo(VIEW.width, FIELD.height + 0.5);
    ctx.stroke();

    // Alarm meter
    const mx = 24;
    const my = FIELD.height + 30;
    const mw = 300;
    const mh = 18;
    ctx.fillStyle = '#1a2230';
    ctx.fillRect(mx, my, mw, mh);
    const fill = ctx.createLinearGradient(mx, 0, mx + mw, 0);
    const danger = state.alarm > 0.6;
    fill.addColorStop(0, danger ? '#ff4646' : '#e8a13a');
    fill.addColorStop(1, danger ? '#ff8a80' : '#ffd267');
    ctx.fillStyle = fill;
    ctx.fillRect(mx, my, mw * state.alarm, mh);
    ctx.strokeStyle = 'rgba(160,180,220,0.5)';
    ctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);
    ctx.fillStyle = danger && Math.sin(performance.now() / 120) > 0 ? '#ff4646' : '#9fb2d8';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ALARM', mx, my - 7);

    // Loot count
    ctx.fillStyle = '#ffd750';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Loot  ${state.carried}/${state.totalLoot}`, 480, FIELD.height + 40);

    // Timer
    const secs = Math.ceil(state.time);
    ctx.fillStyle = secs <= 15 ? '#ff6a5c' : '#cfe0ff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, VIEW.width - 24, FIELD.height + 40);

    // status pill
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = state.spottedNow ? '#ff6a5c' : '#5a719c';
    ctx.fillText(state.spottedNow ? 'DETECTED' : 'hidden', VIEW.width - 24, FIELD.height + 18);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5a719c';
    ctx.fillText(best > 0 ? `best ${best}` : '', 24, FIELD.height + 18);
  }

  function overlay(title, subtitle, hint, color) {
    ctx.fillStyle = 'rgba(3,5,10,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.fillText(title, VIEW.width / 2, 250);
    if (subtitle) {
      ctx.fillStyle = '#cfe0ff';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(subtitle, VIEW.width / 2, 295);
    }
    ctx.fillStyle = '#8ea6cc';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(hint, VIEW.width / 2, 335);
  }

  return { draw, fit };
}
