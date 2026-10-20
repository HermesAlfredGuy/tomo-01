// The two LCDs of Tomo-01: a boot sequence, then a living pixel garden.
import { createPixelCanvas, textWidth } from './pixel.js';

const C = {
  sky: '#cfe0a8',
  sky2: '#c2d69b',
  sun: '#f7efc4',
  cloud: '#e2eabf',
  hillFar: '#a9c184',
  hillMid: '#8bae71',
  ground: '#7a9c60',
  groundDark: '#5c7c4d',
  ink: '#243a28',
  dark: '#3f5d3c',
  white: '#f8f9ea',
  accent: '#ec9a5a',
  glass: '#b9f24a',
};

const PW = 128;
const PH = 96;
const BW = 96;
const BH = 72;

export function createScreens() {
  const top = createPixelCanvas(PW, PH, 2);
  const bottom = createPixelCanvas(BW, BH, 2);

  let mode = 'off';
  let bootT = 0;
  let bootStart = 0;
  let t = 0;
  let planted = 6;
  let blink = 0;

  function drawTop() {
    if (mode === 'off') {
      top.clear('#0b0f0a');
      return;
    }
    if (mode === 'boot') {
      drawBoot();
      return;
    }
    drawGarden();
  }

  function drawBoot() {
    const p = bootT;
    top.clear(C.glass);
    if (p < 0.06) {
      top.rect(0, 0, PW, PH, '#7ba832');
      top.rect(0, Math.floor(p / 0.06 * PH), PW, 1, C.white);
      return;
    }
    if (p < 0.14) {
      top.clear(C.white);
      return;
    }
    top.clear(C.glass);
    if (p < 0.24) {
      // horizontal scanline roll
      const y = Math.floor((p - 0.14) / 0.1 * PH);
      top.rect(0, y, PW, 2, C.ink);
      return;
    }
    if (p < 0.74) {
      const k = Math.min(1, (p - 0.24) / 0.16);
      // dot-matrix wordmark, letters dropped in one by one
      const word = 'TOMO';
      const s = 3;
      const w = textWidth(word, s);
      const x = Math.round((PW - w) / 2);
      const y = 34;
      for (let i = 0; i < word.length; i += 1) {
        if (k > i / word.length) {
          const gx = x + i * (5 + 1) * s;
          // draw each letter by masking the full string render: cheap and exact
          top.text(word[i], gx / 1, y, C.ink, s, 1);
        }
      }
      top.rect(x - 4, y - 6, w + 8, 1, C.ink);
      top.rect(x - 4, y + 7 * s + 5, w + 8, 1, C.ink);
      if (p > 0.46) {
        const label = 'HANDHELD 01';
        top.text(label, (PW - textWidth(label, 1)) / 2, y + 7 * s + 12, C.ink, 1, 1);
      }
      // loading bar
      if (p > 0.5) {
        const bw = 56;
        const bx = (PW - bw) / 2;
        const by = 78;
        top.rect(bx, by, bw, 4, C.ink);
        const fill = Math.round(((p - 0.5) / 0.24) * (bw - 2));
        top.rect(bx + 1, by + 1, Math.max(0, fill), 2, C.glass);
      }
      return;
    }
    // wipe into the garden
    const reveal = Math.min(1, (p - 0.74) / 0.2);
    drawGarden(reveal);
  }

  function drawGarden(reveal = 1) {
    const rows = Math.max(1, Math.round(PH * reveal));
    // sky
    top.rect(0, 0, PW, rows, C.sky);
    top.rect(0, 40, PW, Math.max(0, rows - 40), C.sky2);

    // sun with a dithered halo
    top.disc(103, 15, 6, C.sun);
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;
      top.rect(103 + Math.round(Math.cos(a) * 9), 15 + Math.round(Math.sin(a) * 9), 1, 1, C.sun);
    }

    // clouds drift at two speeds
    const cloud = (x, y, w) => {
      top.rect(x, y, w, 3, C.cloud);
      top.rect(x + 3, y - 2, w - 8, 2, C.cloud);
      top.rect(x + 1, y + 3, w - 2, 1, C.cloud);
    };
    cloud(((8 + t * 2.1) % (PW + 40)) - 40, 12, 18);
    cloud(((56 + t * 1.3) % (PW + 50)) - 50, 22, 24);
    cloud(((96 + t * 3.0) % (PW + 44)) - 44, 8, 14);

    // far hills (dithered edge)
    for (let x = 0; x < PW; x += 1) {
      const h = 52 + Math.round(Math.sin((x + 8) * 0.07) * 5 + Math.sin(x * 0.031) * 4);
      top.rect(x, h, 1, 96 - h, C.hillFar);
      if (x % 2 === 0) top.rect(x, h - 1, 1, 1, C.hillFar);
    }
    // mid hills
    for (let x = 0; x < PW; x += 1) {
      const h = 64 + Math.round(Math.sin((x - 14) * 0.055) * 4);
      top.rect(x, h, 1, 96 - h, C.hillMid);
    }

    // house on the left hill
    top.rect(10, 58, 22, 14, C.hillMid);
    top.rect(12, 46, 18, 12, C.white);
    top.rect(9, 44, 24, 3, C.dark);
    top.rect(11, 47, 20, 2, C.dark);
    top.rect(14, 50, 6, 5, C.ink);
    top.rect(24, 50, 4, 4, C.accent);
    top.rect(25, 51, 2, 2, C.sun);
    top.rect(29, 40, 2, 4, C.cloud);
    top.rect(30, 36, 2, 3, C.cloud);

    // fence
    for (let x = 40; x <= 62; x += 4) {
      top.rect(x, 64, 1, 8, C.dark);
    }
    top.rect(40, 67, 23, 1, C.dark);

    // ground
    top.rect(0, 72, PW, 96 - 72, C.ground);
    for (let x = 0; x < PW; x += 1) {
      if ((x + Math.floor(t * 0.5)) % 7 === 0) top.rect(x, 72 + ((x * 3) % 5), 1, 1, C.groundDark);
      if (x % 3 === 0) top.rect(x, 92 + (x % 3), 1, 1, C.groundDark);
    }
    // winding path
    for (let y = 76; y < 96; y += 1) {
      const x = 60 - Math.round(Math.sin((y - 76) * 0.14) * 9);
      top.rect(x, y, 7, 1, C.hillFar);
    }

    // planted flowers
    const spots = [
      [34, 82], [44, 88], [52, 79], [72, 84], [82, 90], [90, 80],
    ];
    spots.forEach(([x, y], i) => {
      const grown = mode === 'play' ? i < planted : i < 4;
      const sway = Math.round(Math.sin(t * 1.6 + i) * 0.6);
      if (!grown) {
        top.rect(x, y, 1, 2, C.groundDark);
        return;
      }
      top.rect(x, y - 2, 1, 4, C.dark);
      top.rect(x + sway, y - 4, 2, 2, C.accent);
      top.rect(x + sway, y - 5, 1, 1, C.sun);
    });

    // rain
    for (let i = 0; i < 7; i += 1) {
      const rx = (i * 19 + Math.floor(t * 26)) % (PW + 10) - 5;
      const ry = (i * 13 + Math.floor(t * 44)) % 70;
      top.rect(rx, ry, 1, 2, C.sky2);
      top.rect(rx, ry + 2, 1, 1, C.white);
    }

    // player: idle bob + facing
    const px = 58;
    const py = 80 + (Math.round(Math.sin(t * 2.2)) > 0 ? 0 : 1);
    // hat
    top.rect(px, py - 1, 6, 1, C.accent);
    top.rect(px + 1, py - 3, 4, 2, C.accent);
    // head
    top.rect(px + 1, py, 4, 3, C.sun);
    top.rect(px + 2, py + 1, 1, 1, C.ink);
    top.rect(px + 4, py + 1, 1, 1, C.ink);
    // body
    top.rect(px + 1, py + 3, 4, 4, C.white);
    top.rect(px, py + 4, 1, 2, C.white);
    top.rect(px + 5, py + 4, 1, 2, C.white);
    // legs
    const step = Math.round(Math.sin(t * 6)) > 0 ? 1 : 0;
    top.rect(px + 1, py + 7, 1, 2 + step, C.ink);
    top.rect(px + 4, py + 7, 1, 2 + (1 - step), C.ink);

    // crops to the wipe line
    if (reveal < 1) {
      top.rect(0, rows, PW, PH - rows, '#0b0f0a');
    }
  }

  function drawBottom() {
    bottom.clear('#0b0f0a');
    if (mode === 'off') return;
    if (mode === 'boot') {
      bottom.clear('#0b0f0a');
      if (bootT > 0.6) {
        const label = 'TOMO OS 1.0';
        bottom.text(label, (BW - textWidth(label)) / 2, 30, C.glass, 1, 1);
        if (bootT > 0.9) bottom.text('READY', (BW - textWidth('READY')) / 2, 40, C.glass, 1, 1);
      }
      return;
    }
    // play HUD: dark panel, lime type, twelve seed slots
    bottom.clear('#10160d');
    bottom.rect(0, 0, BW, 11, C.glass);
    bottom.text('GARDEN', 3, 3, '#10160d', 1, 1);
    const count = String(Math.min(planted, 12)).padStart(2, '0') + '/12';
    bottom.text(count, BW - textWidth(count, 1, 1) - 3, 3, '#10160d', 1, 1);
    for (let i = 0; i < 12; i += 1) {
      const gx = 5 + (i % 4) * 22;
      const gy = 17 + Math.floor(i / 4) * 17;
      bottom.rect(gx, gy, 18, 13, i < planted ? C.glass : '#2b3a24');
      if (i < planted) {
        bottom.rect(gx + 7, gy + 3, 4, 7, C.dark);
        bottom.rect(gx + 4, gy + 5, 10, 3, C.accent);
      }
    }
    if (blink > 0.55) bottom.text('A PLANT', 5, 63, C.glass, 1, 1);
    bottom.text('B RESET', BW - textWidth('B RESET', 1, 1) - 4, 63, '#4d6b45', 1, 1);
  }


  function nowSeconds() { return performance.now() / 1000; }

  function update() {
    t = nowSeconds();
    blink = (t * 1.35) % 1;
    if (mode === 'boot') {
      bootT = Math.min(1.15, (t - bootStart) / 2.6);
      if (t - bootStart >= 2.6) mode = 'play';
    }
    drawTop();
    drawBottom();
    return mode === 'play' ? 1 : bootT;
  }

  return {
    topCanvas: top.canvas,
    bottomCanvas: bottom.canvas,
    update,
    draw() { drawTop(); drawBottom(); return mode === 'play' ? 1 : bootT; },
    preview() { mode = 'play'; drawTop(); drawBottom(); },
    startBoot() {
      if (mode === 'boot') return;
      mode = 'boot';
      bootStart = nowSeconds();
      bootT = 0;
      drawTop();
      drawBottom();
    },
    reset() {
      mode = 'off'; bootT = 0; bootStart = 0; t = 0; planted = 6;
      drawTop(); drawBottom();
    },
    setPlanted(n) { planted = n; },
    get mode() { return mode; },
    get progress() { return bootT; },
  };
}
