// Tomo-01, built from primitives but lit and finished like a product shot:
// rounded mouldings, matte ABS with clearcoat, printed decals, a real hinge,
// two live LCDs drawn on canvases and a soft studio shadow.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createScreens } from './screen.js';
import { makeBaseDecal, makeLidDecal, makeLidOuterDecal, makeLetterDecal, makeContactShadow, makeShellNoise } from './textures.js';

const W = 13.3;   // width
const D = 7.4;    // depth (closed height of the face)
const TB = 1.1;   // base thickness
const TL = 1.1;   // lid thickness
const R = 0.45;   // moulding radius
const OPEN_ANGLE = 1.98;

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearAlpha(0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 1, 120);
  camera.position.set(0, 6.2, 35);
  camera.lookAt(0, 1.1, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.55;

  const key = new THREE.DirectionalLight(0xfff1dd, 3.1);
  key.position.set(7, 13, 11);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -18;
  key.shadow.camera.right = 18;
  key.shadow.camera.top = 18;
  key.shadow.camera.bottom = -18;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 60;
  key.shadow.radius = 5;
  key.shadow.bias = -0.0009;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  scene.add(key.target);

  const fill = new THREE.DirectionalLight(0xd9e4ff, 1.0);
  fill.position.set(-12, 4, 9);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xfff6e8, 1.5);
  rim.position.set(-5, 7, -12);
  scene.add(rim);

  // ---- materials -----------------------------------------------------------
  const noiseTex = new THREE.CanvasTexture(makeShellNoise());
  noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
  noiseTex.repeat.set(6, 4);
  const shellMat = new THREE.MeshPhysicalMaterial({
    roughnessMap: noiseTex,
    color: new THREE.Color('#ffce3a'),
    roughness: 0.82,
    metalness: 0,
    clearcoat: 0.45,
    clearcoatRoughness: 0.35,
    sheen: 0.25,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color('#ffffff'),
  });
  const shellDarkMat = new THREE.MeshPhysicalMaterial({ color: '#e8c14a', roughness: 0.55, clearcoat: 0.2, metalness: 0 });
  const darkMat = new THREE.MeshPhysicalMaterial({ color: '#201d18', roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#05060a', roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04,
    transparent: true, opacity: 0.22, envMapIntensity: 1.4,
  });

  const screens = createScreens();
  screens.preview();
  const topTex = new THREE.CanvasTexture(screens.topCanvas);
  topTex.magFilter = THREE.NearestFilter;
  topTex.minFilter = THREE.NearestFilter;
  topTex.colorSpace = THREE.SRGBColorSpace;
  topTex.generateMipmaps = false;
  const bottomTex = new THREE.CanvasTexture(screens.bottomCanvas);
  bottomTex.magFilter = THREE.NearestFilter;
  bottomTex.minFilter = THREE.NearestFilter;
  bottomTex.colorSpace = THREE.SRGBColorSpace;
  bottomTex.generateMipmaps = false;

  const screenMatTop = new THREE.MeshBasicMaterial({ map: topTex, toneMapped: false });
  const screenMatBottom = new THREE.MeshBasicMaterial({ map: bottomTex, toneMapped: false });

  // ---- geometry ------------------------------------------------------------
  const rig = new THREE.Group();
  scene.add(rig);
  const spin = new THREE.Group();
  rig.add(spin);
  const model = new THREE.Group();
  spin.add(model);

  const base = new THREE.Mesh(new RoundedBoxGeometry(W, TB, D, 5, R), shellMat);
  base.position.y = TB / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  model.add(base);

  const baseLip = new THREE.Mesh(new RoundedBoxGeometry(W - 0.16, 0.1, D - 0.16, 3, 0.2), shellDarkMat);
  baseLip.position.y = TB - 0.075;   // sits UNDER the printed face, not over it
  baseLip.receiveShadow = true;
  model.add(baseLip);

  // mould parting line: a hairline the light catches along the base
  const parting = new THREE.Mesh(new RoundedBoxGeometry(W + 0.006, 0.024, D + 0.006, 3, 0.2), darkMat);
  parting.position.y = TB - 0.026;
  model.add(parting);

  const baseDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 1.1, D - 1.1),
    new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(makeBaseDecal(W - 1.1, D - 1.1)), transparent: true, roughness: 0.7, metalness: 0 })
  );
  baseDecal.rotation.x = -Math.PI / 2;
  baseDecal.position.set(0, TB + 0.012, 0);
  model.add(baseDecal);

  // bottom LCD
  const bottomScreen = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 4.2), screenMatBottom);
  bottomScreen.rotation.x = -Math.PI / 2;
  bottomScreen.position.set(0, TB + 0.02, 0.1);
  model.add(bottomScreen);
  // bezel as four rails, not a slab: the LCD must stay visible
  const railH = 0.1, railD = 0.34;
  const rails = [
    [0, 2.1 + railD / 2, 5.6 + railD * 2, railD],
    [0, -(2.1 + railD / 2), 5.6 + railD * 2, railD],
    [-2.8 - railD / 2, 0, railD, 4.2],
    [2.8 + railD / 2, 0, railD, 4.2],
  ];
  rails.forEach(([x, z, sx, sz]) => {
    const rail = new THREE.Mesh(new RoundedBoxGeometry(sx, railH, sz, 3, 0.04), darkMat);
    rail.position.set(x, TB + 0.03, 0.1 + z);
    rail.receiveShadow = true;
    model.add(rail);
  });
  const bottomGlass = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 4.2), glassMat);
  bottomGlass.rotation.x = -Math.PI / 2;
  bottomGlass.position.set(0, TB + 0.045, 0.1);
  model.add(bottomGlass);

  // d-pad
  const dpad = new THREE.Group();
  const armA = new THREE.Mesh(new RoundedBoxGeometry(2.15, 0.32, 0.8, 3, 0.16), darkMat);
  const armB = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.32, 2.15, 3, 0.16), darkMat);
  [armA, armB].forEach((m) => { m.castShadow = true; dpad.add(m); });
  const dpadHub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.36, 24), darkMat);
  dpad.add(dpadHub);
  dpad.position.set(-4.35, TB + 0.16, 0.35);
  model.add(dpad);

  // A / B
  const buttonGeo = new THREE.CylinderGeometry(0.62, 0.66, 0.34, 40);
  const ringGeo = new THREE.CylinderGeometry(0.79, 0.8, 0.07, 40);
  const makeButton = (x, z, letter) => {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(ringGeo, darkMat);
    ring.position.y = TB + 0.02;
    const b = new THREE.Mesh(buttonGeo, darkMat);
    b.position.y = TB + 0.2;
    b.castShadow = true;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.52, 0.52),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(makeLetterDecal(letter, '#f4eddc')), transparent: true, roughness: 0.6 })
    );
    face.rotation.x = -Math.PI / 2;
    face.position.y = TB + 0.375;
    g.add(ring, b, face);
    g.position.set(x, 0, z);
    return g;
  };
  model.add(makeButton(4.55, 0.15, 'A'));
  model.add(makeButton(3.5, 1.15, 'B'));

  // start / select
  [[3.1, 2.78], [4.3, 2.78]].forEach(([x, z]) => {
    const p = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.18, 0.36, 3, 0.14), darkMat);
    p.position.set(x, TB + 0.06, z);
    p.castShadow = true;
    model.add(p);
  });

  // volume wheel on the left edge
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.0, 28), darkMat);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(-W / 2 - 0.02, 0.62, 2.1);
  wheel.castShadow = true;
  model.add(wheel);

  // hinge barrel
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, W - 3.2, 28), darkMat);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, TB + 0.02, -D / 2 + R);
  hinge.castShadow = true;
  model.add(hinge);
  [-1, 1].forEach((side) => {
    const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.5, 28), darkMat);
    knuckle.rotation.z = Math.PI / 2;
    knuckle.position.set(side * (W / 2 - 1.5), TB + 0.02, -D / 2 + R);
    knuckle.castShadow = true;
    model.add(knuckle);
  });

  // shoulder buttons
  [[-4.3, 'L'], [4.3, 'R']].forEach(([x]) => {
    const s = new THREE.Mesh(new RoundedBoxGeometry(2.9, 0.62, 1.5, 3, 0.26), shellDarkMat);
    s.position.set(x, TB + 0.02, -D / 2 + 0.05);
    s.castShadow = true;
    model.add(s);
  });

  // ---- lid ---------------------------------------------------------------
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, TB, -D / 2 + R);
  model.add(lidPivot);

  const seam = new THREE.Mesh(new RoundedBoxGeometry(W - 0.55, 0.1, D - 0.55, 3, 0.12), darkMat);
  seam.position.set(0, 0.045, 0);
  model.add(seam);

  const lid = new THREE.Mesh(new RoundedBoxGeometry(W, TL, D, 5, R), shellMat);
  lid.position.set(0, TL / 2 + 0.09, D / 2 - R);
  lid.castShadow = true;
  lid.receiveShadow = true;
  lidPivot.add(lid);

  const lidDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.9, D - 0.9),
    new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(makeLidDecal(W - 0.9, D - 0.9)), transparent: true, roughness: 0.35, metalness: 0 })
  );
  lidDecal.rotation.x = Math.PI / 2;
  lidDecal.position.set(0, 0.082, D / 2 - R);
  lidPivot.add(lidDecal);

  const topScreen = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 5.2), screenMatTop);
  topScreen.rotation.x = Math.PI / 2;
  topScreen.position.set(0, 0.074, D / 2 - R);
  lidPivot.add(topScreen);

  const topGlass = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 5.2), glassMat);
  topGlass.rotation.x = Math.PI / 2;
  topGlass.position.set(0, 0.068, D / 2 - R);
  lidPivot.add(topGlass);

  const outerDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.7, D - 0.7),
    new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(makeLidOuterDecal(W - 0.7, D - 0.7)), transparent: true, roughness: 0.62, metalness: 0 })
  );
  outerDecal.rotation.x = -Math.PI / 2;
  outerDecal.position.set(0, TL + 0.095, D / 2 - R);
  lidPivot.add(outerDecal);

  // cartridge slot on the back edge
  const slot = new THREE.Mesh(new RoundedBoxGeometry(4.6, 0.5, 0.3, 3, 0.1), darkMat);
  slot.position.set(0, TB * 0.52, -D / 2 - 0.02);
  model.add(slot);

  // bottom edge: USB-C, headphone, and a power slider
  const usbc = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.26, 0.3, 4, 0.13), darkMat);
  usbc.position.set(0, TB * 0.45, D / 2 + 0.02);
  model.add(usbc);
  const jack = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 20), darkMat);
  jack.rotation.x = Math.PI / 2;
  jack.position.set(-3.6, TB * 0.5, D / 2 + 0.02);
  model.add(jack);
  const power = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.22, 0.3, 3, 0.09), shellDarkMat);
  power.position.set(3.4, TB * 0.48, D / 2 + 0.02);
  model.add(power);

  // ---- ground shadow ------------------------------------------------------
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 10),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(makeContactShadow(1)), transparent: true, depthWrite: false, toneMapped: false })
  );
  contact.rotation.x = -Math.PI / 2;
  scene.add(contact);

  // the lid throws its own, softer shadow a little to the left
  const cast = new THREE.Mesh(
    new THREE.PlaneGeometry(23, 14),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(makeContactShadow(0.5)), transparent: true, depthWrite: false, toneMapped: false })
  );
  cast.rotation.x = -Math.PI / 2;
  scene.add(cast);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ opacity: 0.32, color: '#2a2418' }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---- pose --------------------------------------------------------------
  const state = { fx: 0.45, fy: 0, w: 0.55, rotX: 0.24, rotY: -0.55, rotZ: 0, open: 0, opacity: 1 };
  let px = 0, py = 0, tx = 0, ty = 0;
  let wobble = 0;
  let last = performance.now();
  let acc = 0;
  let running = true;
  let bootArmed = true;

  function viewport() {
    const vh = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    return { vh, vw: vh * camera.aspect };
  }

  function apply() {
    const { vw } = viewport();
    const s = (state.w * vw) / W;
    rig.position.set(state.fx * vw / 2, state.fy * (viewport().vh / 2), 0);
    rig.scale.setScalar(s);
    spin.rotation.set(state.rotX + tx, state.rotY + ty, state.rotZ + wobble);
    const open = state.open;
    lidPivot.rotation.x = -open * OPEN_ANGLE;
    const centre = TB + open * 6.2;
    model.position.y = -centre * 0.55;
    const gy = rig.position.y - (centre * 0.55) * s + 0.02;
    ground.position.y = gy;
    contact.position.set(rig.position.x - 0.4 * s, gy + 0.006, -0.3 * s);
    contact.scale.setScalar(s);
    cast.position.set(rig.position.x - 2.4 * s, gy + 0.004, -2.4 * s);
    cast.scale.setScalar(s);
    canvas.style.opacity = String(state.opacity);
    canvas.classList.toggle('is-on', state.opacity > 0.02);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    apply();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (running) {
      acc += dt;
      if (acc > 1 / 15) {
        screens.update(acc);
        topTex.needsUpdate = true;
        bottomTex.needsUpdate = true;
        acc = 0;
      }
      // pointer parallax
      tx += (py - tx) * 0.06;
      ty += (px - ty) * 0.06;
      const t = now / 1000;
      wobble = Math.sin(t * 0.6) * 0.004;
      apply();
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    px = (e.clientX / window.innerWidth - 0.5) * 0.12;
    py = (e.clientY / window.innerHeight - 0.5) * 0.09;
  });
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  resize();
  requestAnimationFrame(frame);

  return {
    state,
    screens,
    setOpen(v) {
      state.open = Math.max(0, Math.min(1, v));
      if (state.open > 0.42 && bootArmed) { screens.startBoot(); bootArmed = false; }
      if (state.open < 0.18 && !bootArmed) { screens.reset(); bootArmed = true; }
    },
    scene,
    setDim(v) {
      screenMatTop.color.setScalar(v);
      screenMatBottom.color.setScalar(v);
    },
    setShell(hex) {
      shellMat.color.set(hex);
      const c = new THREE.Color(hex);
      const dark = c.clone().multiplyScalar(0.92).lerp(new THREE.Color('#ffd98a'), 0.02);
      shellDarkMat.color.copy(dark);
    },
    apply,
    dispose() { running = false; renderer.dispose(); },
  };
}
