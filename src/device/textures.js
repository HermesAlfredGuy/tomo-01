// Printed artwork for the device's plastic faces, drawn at print resolution onto
// canvases and used as decal maps. Keeps fine print crisp without extra geometry.
const PX_PER_UNIT = 150;

function makeCanvas(wUnits, hUnits) {
  const c = document.createElement('canvas');
  c.width = Math.round(wUnits * PX_PER_UNIT);
  c.height = Math.round(hUnits * PX_PER_UNIT);
  return c;
}

export function makeBaseDecal(w, d, opt = {}) {
  const c = makeCanvas(w, d);
  const g = c.getContext('2d');
  const k = PX_PER_UNIT;
  const X = (x) => (x + w / 2) * k;
  const Y = (z) => (z + d / 2) * k;
  const ink = opt.ink || 'rgba(24,22,18,0.55)';
  const faint = opt.faint || 'rgba(24,22,18,0.18)';

  g.clearRect(0, 0, c.width, c.height);

  // moulded panel seam
  g.strokeStyle = faint;
  g.lineWidth = 3;
  roundRect(g, X(-w / 2 + 0.28), Y(-d / 2 + 0.28), (w - 0.56) * k, (d - 0.56) * k, 0.28 * k);
  g.stroke();

  // speaker grille (bottom-left of the face)
  g.fillStyle = ink;
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const cx = X(-5.55) + col * 0.34 * k;
      const cy = Y(2.35) + row * 0.34 * k;
      g.beginPath();
      g.arc(cx, cy, 0.075 * k, 0, Math.PI * 2);
      g.fill();
    }
  }

  // brand print, back edge (reads right-way-up when the lid is open)
  g.fillStyle = ink;
  g.font = `${Math.round(0.42 * k)}px "DM Mono", monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.save();
  g.translate(X(0), Y(-2.62));
  g.fillText('T O M O — 0 1', 0, 0);
  g.font = `${Math.round(0.2 * k)}px "DM Mono", monospace`;
  g.fillStyle = faint;
  g.fillText('HANDHELD SYSTEM · KYOTO', 0, 0.45 * k);
  g.restore();

  // start / select labels
  g.fillStyle = ink;
  g.font = `${Math.round(0.17 * k)}px "DM Mono", monospace`;
  g.textAlign = 'center';
  g.fillText('SELECT', X(3.15), Y(2.86));
  g.fillText('START', X(4.35), Y(2.86));

  // corner screws
  [[-5.9, -3.05], [5.9, -3.05], [-5.9, 3.05], [5.9, 3.05]].forEach(([sx, sz]) => {
    g.strokeStyle = faint;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(X(sx), Y(sz), 0.1 * k, 0, Math.PI * 2);
    g.stroke();
  });

  return c;
}

export function makeLidDecal(w, d) {
  const c = makeCanvas(w, d);
  const g = c.getContext('2d');
  const k = PX_PER_UNIT;
  const X = (x) => (x + w / 2) * k;
  const Y = (z) => (z + d / 2) * k;

  // dark bezel plate with a hairline sheen at the top edge
  g.fillStyle = '#121110';
  roundRect(g, 0, 0, c.width, c.height, 0.3 * k);
  g.fill();
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, 'rgba(255,255,255,0.08)');
  grad.addColorStop(0.12, 'rgba(255,255,255,0.015)');
  grad.addColorStop(1, 'rgba(0,0,0,0.25)');
  g.fillStyle = grad;
  roundRect(g, 0, 0, c.width, c.height, 0.3 * k);
  g.fill();

  g.strokeStyle = 'rgba(255,255,255,0.09)';
  g.lineWidth = 2;
  roundRect(g, 3, 3, c.width - 6, c.height - 6, 0.28 * k);
  g.stroke();

  // brand + power indicator under the screen
  g.fillStyle = 'rgba(238,232,220,0.62)';
  g.font = `${Math.round(0.2 * k)}px "DM Mono", monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('T O M O', X(0), Y(2.62));

  g.fillStyle = 'rgba(185,242,74,0.75)';
  g.beginPath();
  g.arc(X(5.05), Y(2.62), 0.055 * k, 0, Math.PI * 2);
  g.fill();

  return c;
}

export function makeScreenGlow() {
  const c = makeCanvas(4, 4, 64);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(c.width / 2, c.height / 2, c.width * 0.24, c.width / 2, c.height / 2, c.width / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.22)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

export function makeContactShadow(alpha = 1) {
  const c = makeCanvas(24, 24, 64);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(c.width / 2, c.height / 2, 0, c.width / 2, c.height / 2, c.width / 2);
  grad.addColorStop(0, `rgba(30,25,16,${0.86 * alpha})`);
  grad.addColorStop(0.46, `rgba(30,25,16,${0.62 * alpha})`);
  grad.addColorStop(0.72, `rgba(30,25,16,${0.24 * alpha})`);
  grad.addColorStop(1, 'rgba(30,25,16,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

// A whisper of mould texture: breaks the perfect CAD plastic into something moulded.
export function makeShellNoise() {
  const c = makeCanvas(6, 6, 32);
  const g = c.getContext('2d');
  const img = g.createImageData(c.width, c.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 118 + Math.round(Math.random() * 26);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function makeLidOuterDecal(w, d) {
  const c = makeCanvas(w, d);
  const g = c.getContext('2d');
  const k = PX_PER_UNIT;
  const X = (x) => (x + w / 2) * k;
  const Y = (z) => (z + d / 2) * k;
  g.clearRect(0, 0, c.width, c.height);

  // moulded wordmark, stamped into the shell
  g.fillStyle = 'rgba(30,26,18,0.30)';
  g.font = `800 ${Math.round(1.15 * k)}px "Big Shoulders Display Variable", "Arial Narrow", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.save();
  g.translate(X(0), Y(-0.55));
  g.scale(1, 0.86);
  g.fillText('tomo', 0, 0);
  g.restore();

  // hairline under the wordmark, like a printed catalogue plate
  g.strokeStyle = 'rgba(30,26,18,0.22)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(X(-1.5), Y(0.45));
  g.lineTo(X(1.5), Y(0.45));
  g.stroke();

  g.fillStyle = 'rgba(30,26,18,0.38)';
  g.font = `${Math.round(0.19 * k)}px "DM Mono", monospace`;
  g.fillText('TOMO-01', X(0), Y(0.85));
  g.fillStyle = 'rgba(30,26,18,0.22)';
  g.font = `${Math.round(0.13 * k)}px "DM Mono", monospace`;
  g.fillText('HANDHELD SYSTEM · FIRST RUN · KYOTO', X(0), Y(1.25));

  // regulatory micro print near the hinge edge
  g.fillStyle = 'rgba(30,26,18,0.20)';
  g.font = `${Math.round(0.11 * k)}px "DM Mono", monospace`;
  g.fillText('T-01 · 5V 3A · MODEL A · 218 G · 133 × 74 × 22 MM', X(0), Y(-2.85));

  // corner screw covers
  [[-5.4, -2.6], [5.4, -2.6], [-5.4, 2.6], [5.4, 2.6]].forEach(([sx, sz]) => {
    g.strokeStyle = 'rgba(30,26,18,0.14)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(X(sx), Y(sz), 0.11 * k, 0, Math.PI * 2);
    g.stroke();
  });

  return c;
}

export function makeLetterDecal(letter, color, size = 0.55) {
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = color;
  g.font = `600 ${Math.round(size * PX_PER_UNIT * 0.62)}px "DM Mono", monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(letter, c.width / 2, c.height / 2 + size * PX_PER_UNIT * 0.02);
  return c;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
