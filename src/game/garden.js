// Pebble Garden — the tape that ships in the box, playable on the page.
// 10 × 7 tiles, one button, twelve seeds. Deliberately small: a handheld game you
// can finish in a minute and still want to look at.

const COLS = 10;
const ROWS = 7;
const TILE = 24;
const OX = 40;
const OY = 48;

const C = {
  hud: '#1b2418',
  hudInk: '#d8e8a8',
  sky: '#dfe8bd',
  grass: '#9dbb7a',
  grass2: '#8fb06e',
  soil: '#a8835a',
  soilDark: '#8a6b4a',
  ink: '#1e2a1d',
  white: '#f6f1dd',
  accent: '#e5432b',
  petal: '#f2b26b',
  rock: '#7d8570',
};

const ROCKS = [[2, 1], [7, 2], [4, 6], [8, 5]];

export function createGarden(canvas, { onCount } = {}) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let player = { c: 4, r: 3 };
  let visual = { x: OX + 4 * TILE + TILE / 2, y: OY + 3 * TILE + TILE / 2 };
  let facing = 1;
  let seeds = [];
  let time = 0;
  let hints = 1;
  let complete = false;
  let moving = null;
  let rain = Array.from({ length: 26 }, () => ({
    x: Math.random() * 320, y: Math.random() * 240, s: 90 + Math.random() * 120,
  }));

  const isRock = (c, r) => ROCKS.some(([rc, rr]) => rc === c && rr === r);
  const seedAt = (c, r) => seeds.find((s) => s.c === c && s.r === r);

  function count() {
    return seeds.length;
  }
  function report() {
    onCount?.(count(), complete);
  }

  function move(dc, dr) {
    if (moving) return;
    const c = Math.max(0, Math.min(COLS - 1, player.c + dc));
    const r = Math.max(0, Math.min(ROWS - 1, player.r + dr));
    if (c === player.c && r === player.r) return;
    if (isRock(c, r)) return;
    if (dc) facing = dc > 0 ? 1 : -1;
    moving = { from: { c: player.c, r: player.r }, to: { c, r }, t: 0 };
    player = { c, r };
    hints = Math.max(0, hints - 0.34);
  }

  function plant() {
    if (complete) return;
    if (seedAt(player.c, player.r) || isRock(player.c, player.r)) return;
    seeds.push({ c: player.c, r: player.r, at: time, watered: true });
    hints = 0;
    if (seeds.length >= 12) complete = true;
    report();
  }

  function reset() {
    player = { c: 4, r: 3 };
    seeds = [];
    time = 0;
    complete = false;
    hints = 1;
    moving = null;
    report();
  }

  function px(c) { return OX + c * TILE; }
  function py(r) { return OY + r * TILE; }

  function drawPlayer(x, y, walking) {
    const bob = walking ? (Math.round(Math.sin(time * 18)) > 0 ? 1 : 0) : 0;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y) + bob);
    // hat
    ctx.fillStyle = C.accent;
    ctx.fillRect(-8, -18, 16, 4);
    ctx.fillRect(-5, -24, 10, 6);
    // head
    ctx.fillStyle = '#f6d8a8';
    ctx.fillRect(-5, -18, 10, 8);
    ctx.fillStyle = C.ink;
    ctx.fillRect(-3 + (facing > 0 ? 2 : -2), -15, 2, 2);
    ctx.fillRect(1 + (facing > 0 ? 2 : -2), -15, 2, 2);
    // body
    ctx.fillStyle = C.white;
    ctx.fillRect(-6, -10, 12, 11);
    ctx.fillStyle = C.ink;
    ctx.fillRect(-6, -10, 12, 2);
    // arms
    ctx.fillStyle = C.white;
    ctx.fillRect(-8, -8, 2, 6);
    ctx.fillRect(6, -8, 2, 6);
    // legs
    ctx.fillStyle = C.ink;
    const s = walking ? (Math.round(Math.sin(time * 18)) > 0 ? 2 : 0) : 0;
    ctx.fillRect(-5, 1, 4, 5 + s);
    ctx.fillRect(1, 1, 4, 5 + (2 - s));
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = C.sky;
    ctx.fillRect(0, 0, 320, 240);

    // hud
    ctx.fillStyle = C.hud;
    ctx.fillRect(0, 0, 320, 34);
    ctx.fillStyle = C.hudInk;
    ctx.font = '10px "DM Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText('PEBBLE GARDEN', 12, 12);
    ctx.fillStyle = '#8fae63';
    ctx.fillText('TAPE 01 · IN THE BOX', 12, 25);
    ctx.fillStyle = C.hudInk;
    ctx.textAlign = 'right';
    ctx.fillText(`${String(count()).padStart(2, '0')} / 12`, 308, 12);
    ctx.fillStyle = '#8fae63';
    ctx.fillText(complete ? 'GARDEN COMPLETE' : 'PLANTED', 308, 25);
    ctx.textAlign = 'left';

    // garden plot
    ctx.fillStyle = C.grass;
    ctx.fillRect(OX - 8, OY - 8, COLS * TILE + 16, ROWS * TILE + 16);
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        ctx.fillStyle = (r + c) % 2 ? C.grass : C.grass2;
        ctx.fillRect(px(c), py(r), TILE, TILE);
        if ((c * 7 + r * 3) % 5 === 0) {
          ctx.fillStyle = 'rgba(30,42,29,0.12)';
          ctx.fillRect(px(c) + 6, py(r) + 14, 3, 1);
          ctx.fillRect(px(c) + 14, py(r) + 8, 1, 3);
        }
      }
    }

    // rocks
    ROCKS.forEach(([c, r]) => {
      const x = px(c) + TILE / 2;
      const y = py(r) + TILE / 2 + 3;
      ctx.fillStyle = 'rgba(30,42,29,0.18)';
      ctx.fillRect(x - 9, y + 5, 18, 3);
      ctx.fillStyle = C.rock;
      ctx.fillRect(x - 8, y - 5, 16, 10);
      ctx.fillRect(x - 5, y - 8, 10, 3);
      ctx.fillStyle = '#96a08a';
      ctx.fillRect(x - 5, y - 4, 5, 2);
    });

    // seeds → flowers
    seeds.forEach((s) => {
      const age = time - s.at;
      const x = px(s.c) + TILE / 2;
      const y = py(s.r) + TILE / 2 + 7;
      const sway = Math.round(Math.sin(time * 2 + s.c) * 1.5);
      if (age < 1.2) {
        ctx.fillStyle = C.soilDark;
        ctx.fillRect(x - 2, y - 2, 4, 3);
        return;
      }
      ctx.fillStyle = C.soilDark;
      ctx.fillRect(x - 3, y - 1, 6, 2);
      ctx.fillStyle = '#4f6b3c';
      ctx.fillRect(x - 1, y - 9, 2, 9);
      if (age < 2.4) {
        ctx.fillRect(x - 4, y - 12, 4, 2);
        return;
      }
      // leaves
      ctx.fillStyle = '#6d8f52';
      ctx.fillRect(x - 5, y - 8, 4, 2);
      ctx.fillRect(x + 1, y - 11, 4, 2);
      // bloom
      const petal = age > 3.6 ? C.petal : '#c7a86b';
      ctx.fillStyle = petal;
      ctx.fillRect(x - 4 + sway, y - 18, 8, 5);
      ctx.fillRect(x - 2 + sway, y - 21, 4, 3);
      ctx.fillStyle = C.accent;
      ctx.fillRect(x - 1 + sway, y - 16, 2, 2);
    });

    // rain
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    rain.forEach((d) => {
      ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 4);
    });

    // player (smooth between tiles)
    let vx = visual.x;
    let vy = visual.y;
    if (moving) {
      const t = Math.min(1, moving.t / 0.14);
      const e = t * t * (3 - 2 * t);
      const fx = px(moving.from.c) + TILE / 2;
      const fy = py(moving.from.r) + TILE / 2;
      const tx = px(moving.to.c) + TILE / 2;
      const ty = py(moving.to.r) + TILE / 2;
      vx = fx + (tx - fx) * e;
      vy = fy + (ty - fy) * e;
    }
    visual = { x: vx, y: vy };
    drawPlayer(vx, vy - 2, !!moving);

    // hints
    if (hints > 0.05 && !complete) {
      ctx.globalAlpha = Math.min(1, hints);
      ctx.fillStyle = 'rgba(27,36,24,0.82)';
      ctx.fillRect(70, 208, 180, 24);
      ctx.fillStyle = C.hudInk;
      ctx.font = '10px "DM Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ARROWS — WALK   ·   A — PLANT', 160, 220);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    if (complete) {
      ctx.fillStyle = 'rgba(27,36,24,0.88)';
      ctx.fillRect(56, 196, 208, 34);
      ctx.fillStyle = C.hudInk;
      ctx.font = '12px "DM Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GARDEN COMPLETE', 160, 208);
      ctx.fillStyle = '#8fae63';
      ctx.font = '10px "DM Mono", monospace';
      ctx.fillText('PRESS R TO START OVER', 160, 221);
      ctx.textAlign = 'left';
    }
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    if (moving) {
      moving.t += dt;
      if (moving.t >= 0.14) moving = null;
    }
    rain.forEach((d) => {
      d.y += d.s * dt;
      if (d.y > 240) { d.y = -6; d.x = Math.random() * 320; }
    });
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  report();

  return {
    move, plant, reset,
    get player() { return { ...player }; },
    get count() { return count(); },
  };
}
