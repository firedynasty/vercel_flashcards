/**
 * head.js — a procedural 3D head with a real jaw hinge.
 *
 * No UI, no audio, no network. You give it an element to live in and a
 * driver function; it renders and animates. That is the whole contract,
 * which is what makes it liftable into another project.
 *
 *   import { createHead, MOODS } from './head.js';
 *
 *   const head = createHead({ mount: document.getElementById('stage') });
 *   head.setDriver(() => ({ open: 0.6, wide: 0.2 }));   // per frame
 *   head.setSpeaking(true);
 *   head.setMood('bright');
 *
 * The driver is the extension point. It is called once per frame and
 * returns the mouth's RAW target; the head owns the smoothing (fast to
 * open, slow to close, which is what reads as speech). Swap the driver
 * and you swap the entire lip-sync strategy without touching geometry:
 *
 *   - amplitude driver  -> open from RMS, wide from spectral centroid
 *   - viseme driver     -> open/wide from a timed list of mouth shapes
 *   - manual driver     -> whatever you like
 *
 *   open: 0 = shut, 1 = wide open
 *   wide: 0 = rounded "oo", 1 = spread "ee"
 */

import * as THREE from 'three';

export const MOODS = {
  neutral:   { brow:  0.0,  browTilt:  0.0,  lid:  0.0,  smile:  0.0, tilt:  0.0,  cheek: 0.0 },
  bright:    { brow:  0.05, browTilt:  0.1,  lid:  0.1,  smile:  1.0, tilt:  0.05, cheek: 1.0 },
  surprised: { brow:  0.12, browTilt:  0.0,  lid: -0.3,  smile:  0.2, tilt:  0.0,  cheek: 0.0 },
  serious:   { brow: -0.05, browTilt: -0.22, lid:  0.16, smile: -0.4, tilt: -0.04, cheek: 0.0 }
};

/** Default palette. Each entry is read from a CSS custom property on
 *  :root if present, else the literal fallback — so the head themes
 *  itself with the host page but still works on a bare document. */
const DEFAULT_PALETTE = {
  skin:   ['--skin', '#f0c9a4'],
  shade:  ['--skin-shade', '#dfae86'],
  ink:    ['--ink', '#2a1d17'],
  mouth:  ['--mouth', '#3f1413'],
  tongue: ['--tongue', '#d9776f'],
  teeth:  ['--teeth', '#fbf7f0'],
  iris:   ['--iris', '#4a6b8a'],
  shirt:  ['--accent', '#c4452d']
};

export function createHead({ mount, palette = DEFAULT_PALETTE, pixelRatio = 2 } = {}) {
  if (!mount) throw new Error('createHead: a mount element is required');

  /* ---------------------------------------------------------------- *
   *  1. Scene, camera, lights
   * ---------------------------------------------------------------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(pixelRatio, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x4a3b30, 0.75));
  const keyLight = new THREE.DirectionalLight(0xfff1e0, 1.45);
  keyLight.position.set(2.6, 3.4, 4.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  const sc = keyLight.shadow.camera;
  sc.left = -3; sc.right = 3; sc.top = 3; sc.bottom = -3; sc.near = 0.5; sc.far = 14;
  scene.add(keyLight);
  const rim = new THREE.DirectionalLight(0x9fc4ff, 0.6);
  rim.position.set(-3.4, 1.4, -2.6);
  scene.add(rim);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.25);
  fillLight.position.set(-1.5, -1.2, 3);
  scene.add(fillLight);

  /* ---------------------------------------------------------------- *
   *  2. Materials, themed from CSS custom properties
   * ---------------------------------------------------------------- */
  function cssVar(spec) {
    const [name, fallback] = spec;
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  const mat = {
    skin:   new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.0 }),
    shade:  new THREE.MeshStandardMaterial({ roughness: 0.7,  metalness: 0.0 }),
    ink:    new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 }),
    mouth:  new THREE.MeshStandardMaterial({ roughness: 0.95, side: THREE.BackSide }),
    tongue: new THREE.MeshStandardMaterial({ roughness: 0.45 }),
    teeth:  new THREE.MeshStandardMaterial({ roughness: 0.25 }),
    white:  new THREE.MeshStandardMaterial({ roughness: 0.2 }),
    iris:   new THREE.MeshStandardMaterial({ roughness: 0.3 }),
    pupil:  new THREE.MeshStandardMaterial({ roughness: 0.15, color: 0x120c0a }),
    shirt:  new THREE.MeshStandardMaterial({ roughness: 0.8 }),
    lip:    new THREE.MeshStandardMaterial({ roughness: 0.4 })
  };
  function applyTheme() {
    mat.skin.color.set(cssVar(palette.skin));
    mat.shade.color.set(cssVar(palette.shade));
    mat.ink.color.set(cssVar(palette.ink));
    mat.mouth.color.set(cssVar(palette.mouth));
    // emissive keeps an open mouth from reading as a hole punched in the head
    mat.mouth.emissive.set(cssVar(palette.mouth));
    mat.mouth.emissiveIntensity = 0.3;
    mat.tongue.color.set(cssVar(palette.tongue));
    mat.teeth.color.set(cssVar(palette.teeth));
    mat.white.color.set(cssVar(palette.teeth));
    mat.iris.color.set(cssVar(palette.iris));
    mat.shirt.color.set(cssVar(palette.shirt));
    mat.lip.color.set(cssVar(palette.tongue)).offsetHSL(0, 0, -0.08);
    scene.background = null;
  }
  applyTheme();
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  darkQuery.addEventListener('change', applyTheme);

  /* ---------------------------------------------------------------- *
   *  3. Head geometry
   *
   *  The skull is an ellipsoid cut in two at the mouth line. The front
   *  lower piece lives in a hinge group, so it swings like a real jaw
   *  and uncovers the dark mouth cavity sitting just inside the skin.
   * ---------------------------------------------------------------- */
  const A = 0.95, B = 1.18, C = 1.0;    // ellipsoid radii (x, y, z)
  const MT = 1.97;                      // polar angle of the mouth line
  const TAU = Math.PI * 2;

  // Point on the head surface. a = azimuth (0 = front, + = right), t = polar.
  function surf(t, a, radial = 1) {
    return new THREE.Vector3(
      Math.sin(a) * Math.sin(t) * A * radial,
      Math.cos(t) * B * radial,
      Math.cos(a) * Math.sin(t) * C * radial
    );
  }

  const root = new THREE.Group();       // user drag rotation
  scene.add(root);
  const body = new THREE.Group();       // neck + shoulders, do not bob
  root.add(body);
  const head = new THREE.Group();       // bob / tilt / nod
  root.add(head);
  const skull = new THREE.Group();      // everything fixed to the upper head
  head.add(skull);

  // The hinge axis runs through the two points where the cut meets the
  // sides of the head, exactly like a jaw joint: those points stay put
  // while the front of the cut swings open.
  const Y_CUT = Math.cos(MT) * B;
  const jawHinge = new THREE.Group();
  jawHinge.position.set(0, Y_CUT, 0);
  head.add(jawHinge);
  const jaw = new THREE.Group();        // contents offset back to head space
  jaw.position.set(0, -Y_CUT, 0);
  jawHinge.add(jaw);

  function shaped(geo, mtl, radial = 1) {
    const m = new THREE.Mesh(geo, mtl);
    m.scale.set(A * radial, B * radial, C * radial);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  // Back half of the head (one piece), front skull above the mouth line,
  // front jaw below it. The two vertical seams land at the ears.
  const SEG = 64, RING = 44;
  skull.add(shaped(new THREE.SphereGeometry(1, SEG, RING, Math.PI, Math.PI), mat.skin));
  skull.add(shaped(new THREE.SphereGeometry(1, SEG, RING, 0, Math.PI, 0, MT), mat.skin));
  const jawMesh = shaped(new THREE.SphereGeometry(1, SEG, RING, 0, Math.PI, MT, Math.PI - MT), mat.skin);
  jaw.add(jawMesh);

  // Dark cavity just inside the skin: what you see through an open mouth.
  const cavity = shaped(new THREE.SphereGeometry(1, 40, 28), mat.mouth, 0.972);
  cavity.castShadow = false; cavity.receiveShadow = false;
  head.add(cavity);

  // A warm light living inside the head: it only escapes through an open
  // mouth, so teeth and tongue are lit without any spill on the face.
  const mouthLight = new THREE.PointLight(0xffd3bf, 2.2, 2.2, 2);
  mouthLight.position.set(0, Math.cos(MT) * B + 0.12, 0.3);
  head.add(mouthLight);

  /* --- lips, teeth: tubes swept along the mouth line --------------- */
  const SWEEP = 0.9;                    // total mouth width, in radians of azimuth
  function arcTube(radius, radial, thetaAt, mtl, sweep = SWEEP) {
    const pts = [];
    const n = 26;
    for (let i = 0; i <= n; i++) {
      const u = -0.5 + i / n;           // -0.5 .. 0.5
      pts.push(surf(thetaAt(u), u * sweep, radial));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 72, radius, 10, false), mtl);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  const bow = (u) => Math.pow(Math.abs(u) * 2, 2);   // 0 at centre, 1 at corners

  const lipUpper = arcTube(0.050, 1.015, (u) => MT - 0.062 + 0.05 * bow(u), mat.lip);
  skull.add(lipUpper);
  const lipLower = arcTube(0.044, 1.015, (u) => MT + 0.030 - 0.042 * bow(u), mat.lip);
  jaw.add(lipLower);

  const teethUpper = arcTube(0.045, 0.965, (u) => MT + 0.07 + 0.015 * bow(u), mat.teeth);
  skull.add(teethUpper);
  const teethLower = arcTube(0.036, 0.955, (u) => MT + 0.16 - 0.015 * bow(u), mat.teeth, SWEEP * 0.92);
  jaw.add(teethLower);

  // Tongue, carried by the jaw.
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), mat.tongue);
  tongue.position.copy(surf(MT + 0.3, 0, 0.78));
  tongue.scale.set(0.19, 0.05, 0.17);
  jaw.add(tongue);

  // Cheek walls: skin-coloured bands riding on the jaw, just under the
  // skin. Invisible with the mouth shut, they fill the gap either side
  // of the lips as it swings, so an open mouth reads as a mouth and not
  // as a slot cut across the whole face.
  const BAND = 0.36;
  for (const sgn of [-1, 1]) {
    const a0 = SWEEP * 0.5 + 0.015;     // just outside the lip corner
    const phi = sgn > 0 ? (Math.PI / 2 + a0) : 0;
    const band = shaped(
      new THREE.SphereGeometry(1, 40, 18, phi, Math.PI / 2 - a0, MT - BAND, BAND + 0.03),
      mat.skin, 0.992
    );
    band.castShadow = false;
    jaw.add(band);
  }

  /* --- nose -------------------------------------------------------- */
  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 28, 20), mat.skin);
  noseTip.position.set(0, -0.235, 0.935);
  noseTip.scale.set(1.15, 0.92, 1.2);
  noseTip.castShadow = true;
  skull.add(noseTip);
  const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.2, 8, 18), mat.skin);
  bridge.position.set(0, -0.15, 0.925);
  bridge.rotation.x = 0.26;
  bridge.castShadow = true;
  skull.add(bridge);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), mat.skin);
    wing.position.set(s * 0.08, -0.262, 0.905);
    wing.scale.set(0.9, 0.85, 0.9);
    skull.add(wing);
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.028, 14, 10), mat.mouth);
    nostril.position.set(s * 0.058, -0.29, 0.978);
    nostril.scale.set(1, 0.7, 1);
    skull.add(nostril);
  }

  /* --- eyes -------------------------------------------------------- */
  const EYE = { x: 0.3, y: 0.09, z: 0.822, r: 0.145 };
  const eyes = [];
  for (const s of [-1, 1]) {
    const socket = new THREE.Group();
    socket.position.set(s * EYE.x, EYE.y, EYE.z);
    skull.add(socket);

    const ball = new THREE.Group();     // rotates when glancing
    socket.add(ball);
    const white = new THREE.Mesh(new THREE.SphereGeometry(EYE.r, 32, 24), mat.white);
    white.castShadow = true; white.receiveShadow = true;
    ball.add(white);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.065, 24, 18), mat.iris);
    iris.position.z = EYE.r - 0.028;
    iris.scale.z = 0.5;
    ball.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.032, 20, 14), mat.pupil);
    pupil.position.z = EYE.r + 0.004;
    pupil.scale.z = 0.4;
    ball.add(pupil);
    const glint = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    glint.position.set(-0.03 * s + 0.012, 0.045, EYE.r + 0.006);
    ball.add(glint);

    const lidUpper = new THREE.Mesh(
      new THREE.SphereGeometry(EYE.r + 0.016, 30, 20, 0, TAU, 0, 1.3), mat.skin
    );
    lidUpper.castShadow = true;
    socket.add(lidUpper);
    const lidLower = new THREE.Mesh(
      new THREE.SphereGeometry(EYE.r + 0.014, 30, 20, 0, TAU, Math.PI - 1.05, 1.05), mat.skin
    );
    socket.add(lidLower);

    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.26, 8, 16), mat.ink);
    brow.rotation.z = Math.PI / 2 + s * 0.12;
    brow.rotation.y = -s * 0.5;
    brow.position.set(s * 0.3, 0.325, 0.885);
    brow.castShadow = true;
    skull.add(brow);

    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.23, 24, 18), mat.skin);
    cheek.position.set(s * 0.4, -0.29, 0.6);
    cheek.scale.set(1, 0.72, 0.42);
    skull.add(cheek);

    eyes.push({ side: s, ball, lidUpper, lidLower, brow, cheek });
  }

  /* --- ears, hair, neck, shoulders ---------------------------------- */
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.2, 26, 20), mat.shade);
    ear.position.set(s * 0.93, -0.06, -0.02);
    ear.scale.set(0.58, 1.05, 0.72);
    ear.castShadow = true;
    skull.add(ear);
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 14), mat.skin);
    lobe.position.set(s * 0.95, -0.23, 0.0);
    lobe.scale.set(0.4, 1, 0.8);
    skull.add(lobe);
  }
  const hair = shaped(new THREE.SphereGeometry(1, 56, 36, 0, TAU, 0, 1.0), mat.ink, 1.04);
  hair.position.y = 0.01;
  hair.rotation.x = -0.09;
  skull.add(hair);
  const hairBack = shaped(new THREE.SphereGeometry(1, 48, 32, Math.PI, Math.PI, 0, 1.72), mat.ink, 1.035);
  hairBack.rotation.x = -0.05;
  skull.add(hairBack);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.28, 28, 20), mat.ink);
  bun.position.set(0, 0.42, -0.95);
  bun.scale.set(1, 0.92, 0.82);
  bun.castShadow = true;
  skull.add(bun);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.78, 32), mat.shade);
  neck.position.set(0, -1.42, -0.04);
  neck.castShadow = true; neck.receiveShadow = true;
  body.add(neck);
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), mat.shirt);
  shoulders.position.set(0, -2.08, -0.05);
  shoulders.scale.set(1.5, 0.62, 0.72);
  shoulders.castShadow = true; shoulders.receiveShadow = true;
  body.add(shoulders);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.07, 12, 40), mat.shirt);
  collar.position.set(0, -1.76, -0.04);
  collar.rotation.x = Math.PI / 2;
  collar.scale.set(1, 0.85, 1);
  body.add(collar);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(5, 48), new THREE.ShadowMaterial({ opacity: 0.11 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.62;
  floor.receiveShadow = true;
  scene.add(floor);

  /* ---------------------------------------------------------------- *
   *  4. Resize / framing
   * ---------------------------------------------------------------- */
  function resize() {
    const w = mount.clientWidth || 400;
    const h = mount.clientHeight || 400;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const fovY = 2 * Math.tan((camera.fov * Math.PI / 180) / 2);
    const dist = Math.max(2.95 / fovY, 2.7 / (fovY * camera.aspect));
    camera.position.set(0, 0.05, dist);
    camera.lookAt(0, -0.06, 0);
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(mount);
  resize();

  /* ---------------------------------------------------------------- *
   *  5. Pointer: drag to turn, hover to be looked at
   * ---------------------------------------------------------------- */
  const turn = { x: 0, y: 0, tx: 0, ty: 0 };
  const gaze = { x: 0, y: 0 };
  let dragging = false, lastX = 0, lastY = 0;

  const onDown = (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    mount.classList.add('dragging');
    mount.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const r = mount.getBoundingClientRect();
    gaze.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    gaze.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (!dragging) return;
    turn.ty = THREE.MathUtils.clamp(turn.ty + (e.clientX - lastX) * 0.008, -1.15, 1.15);
    turn.tx = THREE.MathUtils.clamp(turn.tx - (e.clientY - lastY) * 0.006, -0.4, 0.45);
    lastX = e.clientX; lastY = e.clientY;
  };
  const endDrag = () => { dragging = false; mount.classList.remove('dragging'); };
  const onLeave = () => { gaze.x = 0; gaze.y = 0; };

  mount.addEventListener('pointerdown', onDown);
  mount.addEventListener('pointermove', onMove);
  mount.addEventListener('pointerup', endDrag);
  mount.addEventListener('pointercancel', endDrag);
  mount.addEventListener('pointerleave', onLeave);

  /* ---------------------------------------------------------------- *
   *  6. State
   * ---------------------------------------------------------------- */
  let driver = null;                    // () => { open, wide } | null
  let speaking = false;
  let gain = 1;
  let open = 0, wide = 0.5, level = 0;
  let mood = MOODS.neutral;
  const moodNow = { brow: 0, browTilt: 0, lid: 0, smile: 0, tilt: 0, cheek: 0 };

  let blink = 0, blinkPhase = 0, nextBlink = performance.now() + 1800;
  const glanceTarget = new THREE.Vector2(0, 0);
  let nextGlance = performance.now() + 1500;

  const rest = {
    lipU: lipUpper.position.clone(), lipL: lipLower.position.clone(),
    teethU: teethUpper.position.clone(), teethL: teethLower.position.clone(),
    tongue: tongue.position.clone(),
    browY: eyes.map((e) => e.brow.position.y),
    cheekZ: eyes.map((e) => e.cheek.position.z)
  };

  /* ---------------------------------------------------------------- *
   *  7. Main loop
   * ---------------------------------------------------------------- */
  let tPrev = performance.now();
  const t0 = tPrev;
  let raf = 0, disposed = false;

  function frame(now) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - tPrev) / 1000); tPrev = now;
    const t = (now - t0) / 1000;

    /* --- ask the driver where the mouth should be --- */
    let target = 0, targetWide = 0.5;
    const d = driver ? driver(dt, now) : null;
    if (d) {
      target = THREE.MathUtils.clamp((d.open ?? 0) * gain, 0, 1);
      targetWide = THREE.MathUtils.clamp(d.wide ?? 0.5, 0, 1);
      level = d.level ?? target * 0.25;
    } else {
      level = 0;
    }

    // Fast to open, slower to close: that is what reads as speech.
    const k = target > open ? 1 - Math.pow(0.0004, dt) : 1 - Math.pow(0.02, dt);
    open += (target - open) * k;
    wide += (targetWide - wide) * (1 - Math.pow(0.01, dt));

    /* --- expression easing --- */
    for (const m in moodNow) {
      moodNow[m] += (mood[m] - moodNow[m]) * (1 - Math.pow(0.004, dt));
    }

    /* --- jaw + lips --- */
    const o = open;
    jawHinge.rotation.x = Math.pow(o, 1.1) * 0.2;
    const round = 1 - wide;                            // 1 = "oo", 0 = "ee"
    const narrow = 1 - 0.26 * round * (0.4 + 0.6 * o);
    const pucker = 0.055 * round * (0.3 + 0.7 * o);
    const spread = 1 + 0.07 * wide * o + 0.05 * Math.max(0, moodNow.smile);

    lipUpper.scale.x = narrow * spread;
    lipLower.scale.x = narrow * spread;
    teethUpper.scale.x = narrow * spread;
    teethLower.scale.x = narrow * spread;
    lipUpper.position.z = rest.lipU.z + pucker;
    lipLower.position.z = rest.lipL.z + pucker * 1.2;
    lipUpper.position.y = rest.lipU.y - 0.012 * o + 0.012 * Math.max(0, moodNow.smile);
    lipLower.position.y = rest.lipL.y - 0.02 * round * o;
    lipUpper.scale.y = 1 + 0.25 * round;
    lipLower.scale.y = 1 + 0.3 * round;

    tongue.position.y = rest.tongue.y + 0.02 - 0.05 * o;
    tongue.position.z = rest.tongue.z + 0.03 * o;
    tongue.scale.y = 0.055 + 0.03 * o;

    /* --- head motion: a nod on every stressed syllable --- */
    head.position.y = speaking ? -o * 0.035 + Math.sin(t * 1.9) * 0.008 : Math.sin(t * 0.95) * 0.009;
    head.rotation.x = (speaking ? o * 0.05 : 0) + Math.sin(t * 0.8) * 0.012 + moodNow.tilt * 0.4;
    head.rotation.z = Math.sin(t * 1.15) * 0.014 + (speaking ? Math.sin(t * 2.3) * 0.012 : 0);
    jawMesh.position.y = 0;
    body.position.y = Math.sin(t * 1.1) * 0.012;       // breathing
    shoulders.scale.set(1.5 + Math.sin(t * 1.1) * 0.01, 0.62, 0.72 + Math.sin(t * 1.1) * 0.006);

    /* --- user drag, plus a little lean toward the pointer --- */
    turn.x += (turn.tx - turn.x) * (1 - Math.pow(0.002, dt));
    turn.y += (turn.ty - turn.y) * (1 - Math.pow(0.002, dt));
    root.rotation.x = turn.x + (dragging ? 0 : gaze.y * 0.05);
    root.rotation.y = turn.y + (dragging ? 0 : gaze.x * 0.09);

    /* --- blinking --- */
    if (blinkPhase === 0 && now > nextBlink) blinkPhase = 1;
    if (blinkPhase === 1) {
      blink += dt * 14;
      if (blink >= 1) { blink = 1; blinkPhase = 2; }
    } else if (blinkPhase === 2) {
      blink -= dt * 9;
      if (blink <= 0) { blink = 0; blinkPhase = 0; nextBlink = now + 1900 + Math.random() * 3400; }
    }

    /* --- glancing --- */
    if (now > nextGlance) {
      glanceTarget.set((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.16);
      nextGlance = now + 1400 + Math.random() * 2600;
    }
    const lookX = THREE.MathUtils.clamp(glanceTarget.x - gaze.x * 0.2 - turn.y * 0.5, -0.45, 0.45);
    const lookY = THREE.MathUtils.clamp(glanceTarget.y + gaze.y * 0.12, -0.25, 0.25);

    /* --- per-eye rig --- */
    eyes.forEach((e, i) => {
      e.ball.rotation.y = -lookX;
      e.ball.rotation.x = lookY;
      const lidClose = Math.max(blink, 0.0) + moodNow.lid * 0.35;
      e.lidUpper.rotation.x = -0.46 + lidClose * 1.62 - o * 0.06;
      e.lidLower.rotation.x = 0.34 - lidClose * 0.5;
      e.brow.position.y = rest.browY[i] + moodNow.brow + (speaking ? o * 0.045 : 0) + blink * -0.01;
      e.brow.rotation.y = -e.side * 0.42 + moodNow.browTilt * e.side * 0.9;
      e.cheek.position.z = rest.cheekZ[i] + moodNow.cheek * 0.03 + o * 0.012;
      e.cheek.scale.y = 0.72 + moodNow.cheek * 0.08 + o * 0.03;
    });

    api.onFrame?.(dt, now);
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  /* ---------------------------------------------------------------- *
   *  8. Public API
   * ---------------------------------------------------------------- */
  const api = {
    /** Supply the per-frame mouth target. fn() -> { open, wide, level? } or null. */
    setDriver(fn) { driver = fn || null; },
    /** Whether the head should carry itself like it is talking (nods, brows). */
    setSpeaking(b) { speaking = !!b; },
    /** Multiplies the driver's `open`. 0.75 subtle, 1 normal, 1.4 lively. */
    setGain(g) { gain = Number(g) || 1; },
    setMood(name) { if (MOODS[name]) mood = MOODS[name]; },
    recenter() { turn.tx = 0; turn.ty = 0; },
    /** Smoothed mouth opening, 0..1 — handy for a level meter. */
    get level() { return level; },
    get open() { return open; },
    /** Optional per-frame hook. */
    onFrame: null,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      darkQuery.removeEventListener('change', applyTheme);
      mount.removeEventListener('pointerdown', onDown);
      mount.removeEventListener('pointermove', onMove);
      mount.removeEventListener('pointerup', endDrag);
      mount.removeEventListener('pointercancel', endDrag);
      mount.removeEventListener('pointerleave', onLeave);
      renderer.dispose();
      renderer.domElement.remove();
    },
    three: { THREE, scene, camera, renderer, root, head, skull, jaw, jawHinge, eyes }
  };
  return api;
}
