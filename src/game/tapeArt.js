// Cover art for the six launch tapes — hand-placed pixels, one palette each.
const P = {
  garden: { sky: '#cfe0a8', far: '#a9c184', mid: '#8bae71', ground: '#7a9c60', ink: '#243a28', white: '#f8f9ea', accent: '#ec9a5a' },
  bus: { sky: '#0c1526', far: '#16243d', mid: '#223454', ground: '#0a101c', ink: '#050810', white: '#e8eefc', accent: '#ffc861' },
  kettle: { sky: '#f3dcc0', far: '#e2c39c', mid: '#c9a173', ground: '#8a6240', ink: '#2c1d12', white: '#fff6e6', accent: '#c8503c' },
  rally: { sky: '#cfe8d6', far: '#a3cbb2', mid: '#7bb08d', ground: '#4d6b57', ink: '#122a1e', white: '#f4f8f2', accent: '#e5432b' },
  sea: { sky: '#8fd3cf', far: '#4ea6a8', mid: '#2b7d86', ground: '#123c47', ink: '#07202a', white: '#eaf7f4', accent: '#ffd166' },
  cat: { sky: '#2b1a3f', far: '#3d2757', mid: '#513570', ground: '#241432', ink: '#120a1c', white: '#efe2ff', accent: '#f2b26b' },
};

const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const disc = (g, cx, cy, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); };

function starfield(g, pal, n = 20, seed = 3) {
  for (let i = 0; i < n; i += 1) {
    const x = (i * 53 + seed * 17) % 126 + 1;
    const y = (i * 29 + seed * 7) % 52 + 4;
    rect(g, x, y, 1, 1, i % 4 ? pal.white : pal.accent);
  }
}

const ART = {
  garden(g, p) {
    rect(g, 0, 0, 128, 96, p.sky);
    disc(g, 100, 16, 7, p.white);
    for (let x = 0; x < 128; x += 1) {
      const h = 54 + Math.round(Math.sin(x * 0.06) * 6);
      rect(g, x, h, 1, 96 - h, p.far);
    }
    for (let x = 0; x < 128; x += 1) {
      const h = 66 + Math.round(Math.sin((x - 20) * 0.05) * 4);
      rect(g, x, h, 1, 96 - h, p.mid);
    }
    rect(g, 0, 76, 128, 20, p.ground);
    // house
    rect(g, 16, 46, 20, 14, p.white); rect(g, 13, 43, 26, 4, p.ink);
    rect(g, 19, 50, 5, 6, p.ink); rect(g, 28, 50, 4, 4, p.accent);
    // fence + flowers
    for (let x = 46; x < 84; x += 5) rect(g, x, 68, 1, 9, p.ink);
    rect(g, 46, 71, 38, 1, p.ink);
    [[40, 82], [52, 88], [66, 80], [88, 86], [98, 78]].forEach(([x, y], i) => {
      rect(g, x, y, 1, 4, p.ink);
      rect(g, x - 1, y - 2, 3, 2, i % 2 ? p.accent : p.white);
    });
    // figure
    rect(g, 62, 66, 4, 3, p.ink); rect(g, 61, 64, 6, 2, p.accent);
    rect(g, 62, 69, 4, 5, p.white); rect(g, 62, 74, 4, 2, p.ink);
    // path
    for (let y = 76; y < 96; y += 1) rect(g, 100 - Math.round(Math.sin((y - 76) * 0.2) * 6), y, 7, 1, p.far);
  },
  bus(g, p) {
    rect(g, 0, 0, 128, 96, p.sky);
    starfield(g, p, 26, 5);
    disc(g, 100, 20, 8, p.white);
    rect(g, 0, 62, 128, 34, p.ground);
    for (let x = 0; x < 128; x += 1) {
      const h = 56 + Math.round(Math.sin(x * 0.05 + 1) * 5);
      rect(g, x, h, 1, 70 - h, p.far);
    }
    // bus body
    rect(g, 18, 44, 76, 26, p.mid);
    rect(g, 18, 44, 76, 3, p.ink);
    rect(g, 22, 48, 12, 10, p.accent);
    rect(g, 38, 48, 12, 10, p.accent);
    rect(g, 54, 48, 12, 10, p.accent);
    rect(g, 70, 48, 10, 10, p.far);
    rect(g, 84, 48, 6, 10, p.accent);
    rect(g, 18, 62, 76, 3, p.ink);
    disc(g, 32, 72, 5, p.ink); disc(g, 32, 72, 2, p.mid);
    disc(g, 80, 72, 5, p.ink); disc(g, 80, 72, 2, p.mid);
    // stop sign + rain
    rect(g, 104, 56, 2, 22, p.ink); rect(g, 100, 52, 10, 8, p.white);
    for (let i = 0; i < 20; i += 1) rect(g, (i * 37) % 128, (i * 19) % 80 + 6, 1, 3, p.far);
  },
  kettle(g, p) {
    rect(g, 0, 0, 128, 96, p.sky);
    rect(g, 0, 20, 128, 2, p.far);
    rect(g, 0, 62, 128, 34, p.mid);
    rect(g, 0, 60, 128, 4, p.ground);
    // window
    rect(g, 8, 26, 30, 26, p.white); rect(g, 22, 26, 2, 26, p.ground); rect(g, 8, 38, 30, 2, p.ground);
    // kettle
    rect(g, 52, 44, 30, 18, p.ink);
    rect(g, 58, 36, 18, 8, p.ink);
    rect(g, 46, 50, 6, 4, p.ink); rect(g, 82, 48, 8, 3, p.ink);
    rect(g, 60, 32, 14, 4, p.ink);
    rect(g, 74, 30, 6, 3, p.ink);
    // steam
    rect(g, 68, 22, 2, 6, p.white); rect(g, 71, 16, 2, 5, p.white); rect(g, 66, 12, 2, 4, p.white);
    // cup + crow
    rect(g, 26, 52, 9, 7, p.white); rect(g, 35, 54, 3, 3, p.white);
    rect(g, 100, 40, 12, 9, p.ink); rect(g, 112, 41, 4, 4, p.ink);
    rect(g, 103, 43, 2, 2, p.accent); rect(g, 108, 43, 2, 2, p.accent);
    rect(g, 104, 49, 1, 4, p.ink); rect(g, 108, 49, 1, 4, p.ink);
    // counter edge
    rect(g, 0, 76, 128, 3, p.ground);
  },
  rally(g, p) {
    rect(g, 0, 0, 128, 96, p.sky);
    disc(g, 24, 20, 8, p.white);
    for (let x = 0; x < 128; x += 1) {
      const h = 58 + Math.round(Math.sin(x * 0.045 + 2) * 7);
      rect(g, x, h, 1, 96 - h, p.far);
    }
    for (let x = 0; x < 128; x += 1) {
      const h = 72 + Math.round(Math.sin(x * 0.03) * 3);
      rect(g, x, h, 1, 96 - h, p.mid);
    }
    // road
    rect(g, 0, 82, 128, 14, p.ground);
    for (let x = 6; x < 128; x += 18) rect(g, x, 88, 9, 2, p.white);
    // car
    rect(g, 34, 64, 52, 14, p.accent);
    rect(g, 44, 56, 28, 9, p.white);
    rect(g, 46, 58, 10, 6, p.ink); rect(g, 58, 58, 12, 6, p.ink);
    rect(g, 34, 74, 52, 3, p.ink);
    rect(g, 84, 66, 4, 4, p.white);
    disc(g, 46, 79, 6, p.ink); disc(g, 46, 79, 2, p.white);
    disc(g, 74, 79, 6, p.ink); disc(g, 74, 79, 2, p.white);
    // dust
    rect(g, 24, 76, 8, 3, p.white); rect(g, 18, 72, 5, 3, p.white);
    rect(g, 30, 70, 3, 2, p.white);
  },
  sea(g, p) {
    rect(g, 0, 0, 128, 96, p.sky);
    for (let y = 0; y < 96; y += 1) {
      if (y % 4 < 2) rect(g, 0, y, 128, 1, y < 30 ? p.far : p.mid);
    }
    rect(g, 0, 34, 128, 62, p.far + '');
    for (let y = 34; y < 96; y += 1) {
      const k = (y - 34) / 62;
      rect(g, 0, y, 128, 1, k > 0.55 ? p.ground : p.mid);
    }
    // whale
    rect(g, 30, 50, 54, 18, p.sky);
    rect(g, 84, 52, 10, 6, p.sky); rect(g, 94, 48, 6, 6, p.sky); rect(g, 94, 60, 6, 6, p.sky);
    rect(g, 40, 54, 6, 4, p.ink);
    rect(g, 30, 68, 54, 2, p.white);
    // envelope + bubbles + fish
    rect(g, 96, 70, 16, 11, p.white); rect(g, 96, 70, 16, 2, p.far);
    for (let i = 0; i < 12; i += 1) disc(g, 18 + (i * 13) % 100, 40 + (i * 21) % 50, 1 + (i % 2), p.white);
    rect(g, 58, 80, 8, 4, p.accent); rect(g, 66, 81, 3, 2, p.accent);
    for (let y = 0; y < 30; y += 1) rect(g, 0, y, 128, 1, y < 12 ? p.sky : p.far);
  },
  cat(g, p) {
    rect(g, 0, 0, 128, 96, p.sky);
    starfield(g, p, 18, 2);
    disc(g, 102, 18, 9, p.white); disc(g, 97, 15, 7, p.sky);
    // window
    rect(g, 10, 18, 46, 40, p.far);
    rect(g, 32, 18, 2, 40, p.mid); rect(g, 10, 36, 46, 2, p.mid);
    rect(g, 14, 22, 16, 12, p.white); rect(g, 36, 40, 16, 14, p.white);
    // floor
    rect(g, 0, 78, 128, 18, p.ground);
    // plant
    rect(g, 96, 60, 4, 18, p.ink);
    rect(g, 88, 52, 8, 4, p.mid); rect(g, 100, 50, 8, 4, p.mid);
    rect(g, 92, 74, 12, 5, p.accent);
    // cat
    rect(g, 50, 62, 30, 14, p.ink);
    rect(g, 72, 58, 10, 8, p.ink);
    rect(g, 72, 52, 4, 7, p.ink); rect(g, 80, 53, 3, 6, p.ink);
    rect(g, 74, 60, 2, 2, p.accent); rect(g, 78, 60, 2, 2, p.accent);
    rect(g, 46, 64, 6, 4, p.ink); rect(g, 44, 58, 3, 8, p.ink);
    rect(g, 52, 76, 3, 6, p.ink); rect(g, 76, 76, 3, 6, p.ink);
  },
};

export function drawTapeArt(canvas, key) {
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  const pal = P[key] || P.garden;
  g.clearRect(0, 0, canvas.width, canvas.height);
  ART[key]?.(g, pal);
}
