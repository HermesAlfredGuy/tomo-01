// Tiny bitmap type + drawing helpers for the in-device LCDs.
// 5×7 glyphs on a 1-pixel grid, drawn with nearest-neighbour scaling so the
// screens look like real pixel panels rather than blurry canvas text.

const G = {
  A: '01110/10001/10001/11111/10001/10001/10001',
  B: '11110/10001/10001/11110/10001/10001/11110',
  C: '01111/10000/10000/10000/10000/10000/01111',
  D: '11110/10001/10001/10001/10001/10001/11110',
  E: '11111/10000/10000/11110/10000/10000/11111',
  F: '11111/10000/10000/11110/10000/10000/10000',
  G: '01111/10000/10000/10111/10001/10001/01110',
  H: '10001/10001/10001/11111/10001/10001/10001',
  I: '11111/00100/00100/00100/00100/00100/11111',
  J: '00111/00010/00010/00010/10010/10010/01100',
  K: '10001/10010/10100/11000/10100/10010/10001',
  L: '10000/10000/10000/10000/10000/10000/11111',
  M: '10001/11011/10101/10101/10001/10001/10001',
  N: '10001/11001/10101/10011/10001/10001/10001',
  O: '01110/10001/10001/10001/10001/10001/01110',
  P: '11110/10001/10001/11110/10000/10000/10000',
  Q: '01110/10001/10001/10001/10101/10010/01101',
  R: '11110/10001/10001/11110/10100/10010/10001',
  S: '01111/10000/10000/01110/00001/00001/11110',
  T: '11111/00100/00100/00100/00100/00100/00100',
  U: '10001/10001/10001/10001/10001/10001/01110',
  V: '10001/10001/10001/10001/10001/01010/00100',
  W: '10001/10001/10001/10101/10101/11011/10001',
  X: '10001/10001/01010/00100/01010/10001/10001',
  Y: '10001/10001/01010/00100/00100/00100/00100',
  Z: '11111/00001/00010/00100/01000/10000/11111',
  0: '01110/10001/10011/10101/11001/10001/01110',
  1: '00100/01100/00100/00100/00100/00100/01110',
  2: '01110/10001/00001/00010/00100/01000/11111',
  3: '11111/00010/00100/00010/00001/10001/01110',
  4: '00010/00110/01010/10010/11111/00010/00010',
  5: '11111/10000/11110/00001/00001/10001/01110',
  6: '00110/01000/10000/11110/10001/10001/01110',
  7: '11111/00001/00010/00100/01000/01000/01000',
  8: '01110/10001/10001/01110/10001/10001/01110',
  9: '01110/10001/10001/01111/00001/00010/01100',
  ':': '00000/00100/00100/00000/00100/00100/00000',
  '-': '00000/00000/00000/11111/00000/00000/00000',
  '.': '00000/00000/00000/00000/00000/00100/00100',
  '/': '00000/00001/00010/00100/01000/10000/00000',
  ' ': '00000/00000/00000/00000/00000/00000/00000',
};

const GLYPHS = Object.fromEntries(Object.entries(G).map(([k, v]) => [k, v.split('/')]));

export function textWidth(str, scale = 1, tracking = 1) {
  return (str.length * (5 + tracking) - tracking) * scale;
}

export function drawText(ctx, str, x, y, color, scale = 1, tracking = 1) {
  ctx.fillStyle = color;
  const step = (5 + tracking) * scale;
  let cx = Math.round(x);
  for (const raw of String(str).toUpperCase()) {
    const glyph = GLYPHS[raw] || GLYPHS[' '];
    for (let r = 0; r < 7; r += 1) {
      const row = glyph[r];
      for (let c = 0; c < 5; c += 1) {
        if (row[c] === '1') ctx.fillRect(cx + c * scale, Math.round(y) + r * scale, scale, scale);
      }
    }
    cx += step;
  }
}

// A pixel grid wrapper: the world is W×H logical pixels, the canvas is W*S×H*S.
export function createPixelCanvas(w, h, scale = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return {
    canvas,
    ctx,
    scale,
    w,
    h,
    clear(color) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },
    rect(x, y, rw, rh, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x * scale), Math.round(y * scale), Math.round(rw * scale), Math.round(rh * scale));
    },
    disc(cx, cy, r, color) {
      ctx.fillStyle = color;
      const rr = r * r;
      for (let yy = -r; yy <= r; yy += 1) {
        const span = Math.floor(Math.sqrt(rr - yy * yy));
        ctx.fillRect(Math.round((cx - span) * scale), Math.round((cy + yy) * scale), Math.round((span * 2 + 1) * scale), scale);
      }
    },
    line(x0, y0, x1, y1, color) {
      ctx.fillStyle = color;
      let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
      let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx - dy, x = x0, y = y0;
      for (let i = 0; i < 400; i += 1) {
        ctx.fillRect(Math.round(x * scale), Math.round(y * scale), scale, scale);
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
      }
    },
    text(str, x, y, color, s = 1, tracking = 1) { drawText(ctx, str, x * scale, y * scale, color, scale * s, tracking); },
  };
}
