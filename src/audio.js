// Opt-in sound: everything is synthesised in WebAudio, nothing is downloaded.
// Off by default; the nav toggle is the only way in (and it persists).
let ctx = null;
let on = false;
let master = null;

const STORE = 'tomo-sound';

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noise(dur, gain, freq, type = 'bandpass') {
  const c = ensure();
  if (!c) return;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  src.connect(f).connect(g).connect(master);
  src.start();
}

function tone(freq, dur, gain = 0.12, type = 'sine', slide = 0) {
  const c = ensure();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g).connect(master);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
}

export const sfx = {
  get on() { return on; },
  toggle(next) {
    on = next ?? !on;
    try { localStorage.setItem(STORE, on ? 'on' : 'off'); } catch { /* private mode */ }
    if (on) {
      ensure();
      tone(660, 0.12, 0.09, 'triangle');
    }
    return on;
  },
  boot() { if (!on) return; tone(523.25, 0.16, 0.1, 'triangle'); setTimeout(() => tone(659.25, 0.16, 0.1, 'triangle'), 110); setTimeout(() => tone(783.99, 0.3, 0.09, 'triangle'), 220); },
  thunk() {
    if (!on) return;
    tone(120, 0.16, 0.16, 'sine', -60);
    noise(0.09, 0.12, 900, 'lowpass');
  },
  tick() { if (!on) return; noise(0.02, 0.05, 2400, 'bandpass'); },
  plant() {
    if (!on) return;
    tone(880, 0.07, 0.08, 'square');
    setTimeout(() => tone(1174.66, 0.12, 0.07, 'triangle'), 60);
  },
  done() {
    if (!on) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => tone(f, 0.22, 0.08, 'triangle'), i * 90));
  },
  reset() { if (!on) return; noise(0.12, 0.1, 500, 'lowpass'); },
};

export function initSound() {
  try { on = localStorage.getItem(STORE) === 'on'; } catch { on = false; }
  const btn = document.querySelector('[data-sound-toggle]');
  const label = document.querySelector('[data-sound-label]');
  const paint = () => {
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(on));
    if (label) label.textContent = on ? 'Sound: on' : 'Sound: off';
  };
  paint();
  btn?.addEventListener('click', () => {
    sfx.toggle();
    paint();
  });
  // A gesture anywhere unlocks audio once it has been switched on before.
  if (on) window.addEventListener('pointerdown', () => ensure(), { once: true });
  return paint;
}
