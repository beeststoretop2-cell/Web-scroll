import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const isMobile = matchMedia('(max-width: 720px)').matches || /Mobi|Android/i.test(navigator.userAgent);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- renderer ---------------- */
const canvas = document.getElementById('webgl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07070b);
scene.fog = new THREE.FogExp2(0x07070b, 0.034);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 400);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.75, 0.5, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ---------------- lights ---------------- */
scene.add(new THREE.HemisphereLight(0x6677aa, 0x1a0a05, 0.35));
const key = new THREE.DirectionalLight(0xffe2c4, 1.4);
key.position.set(5, 8, 6);
scene.add(key);
const rim = new THREE.DirectionalLight(0x6fa8ff, 0.9);
rim.position.set(-6, 3, -8);
scene.add(rim);

/* ---------------- shared materials ---------------- */
const HOT = new THREE.Color(0xff5a1f);
const hotGlow = (mult = 4, c = HOT) => new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(mult), toneMapped: false });

function noiseTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.random() * 120;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 3);
  return t;
}
const neoTex = noiseTexture();
const neoprene = new THREE.MeshPhysicalMaterial({
  color: 0x17171c, roughness: 0.78, metalness: 0.05, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x7a4a3a),
  bumpMap: neoTex, bumpScale: 0.6, side: THREE.DoubleSide, envMapIntensity: 0.6,
});
const trim = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.5, metalness: 0.3 });
const velcro = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 1, bumpMap: neoTex, bumpScale: 2 });
const plastic = new THREE.MeshPhysicalMaterial({ color: 0x0d0d10, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 });
const metal = new THREE.MeshStandardMaterial({ color: 0xd8d8de, metalness: 1, roughness: 0.22 });

const cyl = (a, y, r) => new THREE.Vector3(r * Math.sin(a), y, r * Math.cos(a));
const glowSprite = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,200,140,.8)');
  grd.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

/* ---------------- the belt ---------------- */
function makeBelt() {
  const group = new THREE.Group();
  const R = 1.6, H = 1.15, span = Math.PI * 1.32;

  const band = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 96, 1, true, -span / 2, span), neoprene);
  group.add(band);

  // Edge binding
  for (const y of [H / 2, -H / 2]) {
    const pts = [];
    for (let i = 0; i <= 60; i++) pts.push(cyl(-span / 2 + (span * i) / 60, y, R));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.04, 8), trim));
  }
  // Velcro ends
  for (const s of [-1, 1]) {
    const a0 = s > 0 ? span / 2 - 0.55 : -span / 2;
    const v = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.012, R + 0.012, H * 0.86, 24, 1, true, a0, 0.55), velcro);
    group.add(v);
  }
  // Pocket
  const pocket = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.035, R + 0.035, H * 0.7, 24, 1, true, 0.95, 0.55), neoprene);
  group.add(pocket);

  // Heating coil (meander)
  const cSpan = 1.55, N = 10, h = 0.3, Rc = R + 0.025;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = -cSpan / 2 + (cSpan * i) / (N - 1);
    const up = i % 2 === 0;
    pts.push(cyl(a, up ? h : -h, Rc), cyl(a, up ? -h : h, Rc));
    if (i < N - 1) {
      const am = a + cSpan / (N - 1) / 2;
      pts.push(cyl(am, up ? -h - 0.08 : h + 0.08, Rc));
    }
  }
  const coilCurve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const coilMat = hotGlow(2.2);
  const coil = new THREE.Mesh(new THREE.TubeGeometry(coilCurve, 500, 0.028, 8), coilMat);
  group.add(coil);
  const halo = new THREE.Mesh(new THREE.TubeGeometry(coilCurve, 300, 0.09, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3a10, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  group.add(halo);
  // Warm glow on the fabric behind the coil
  const glowPlane = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.015, R + 0.015, H * 0.85, 48, 1, true, -cSpan / 2 - 0.15, cSpan + 0.3),
    new THREE.MeshBasicMaterial({ color: 0xff3a10, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false }));
  group.add(glowPlane);

  // Controller
  const ca = -1.2;
  const ctrl = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.12), plastic);
  ctrl.add(body);
  for (const x of [-0.12, 0.12]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 24), plastic);
    b.rotation.x = Math.PI / 2; b.position.set(x, 0, 0.07);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 8, 32), hotGlow(3, new THREE.Color(0xffffff)));
    ring.position.set(x, 0, 0.095);
    ctrl.add(b, ring);
  }
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), hotGlow(6));
  led.position.set(0.24, 0.1, 0.065);
  ctrl.add(led);
  ctrl.position.copy(cyl(ca, 0, R + 0.07));
  ctrl.rotation.y = ca;
  group.add(ctrl);

  // Cable
  const cable = new THREE.CatmullRomCurve3([
    cyl(ca - 0.25, -0.1, R + 0.06), cyl(ca - 0.45, -0.5, R + 0.12), cyl(ca - 0.5, -1.2, R + 0.4), cyl(ca - 0.7, -2.2, R + 0.9),
  ]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 60, 0.025, 8), plastic));

  // Heat particles
  const count = 140;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = (Math.random() - 0.5) * cSpan * 1.1, r = Rc + 0.05 + Math.random() * 0.25;
    pos.set([r * Math.sin(a), (Math.random() - 0.5) * 0.6, r * Math.cos(a)], i * 3);
    seed[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const heat = new THREE.Points(geo, heatMaterial(0.09));
  group.add(heat);

  group.userData = { coilMat, halo, heat, led };
  return group;
}

function heatMaterial(size = 0.1, rise = 1.4) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSize: { value: size * innerHeight * 0.5 }, uRise: { value: rise }, uMap: { value: glowSprite } },
    vertexShader: `
      attribute float seed; uniform float uTime, uSize, uRise; varying float vA;
      void main(){
        float t = fract(seed + uTime * 0.25);
        vec3 p = position;
        p.y += t * uRise;
        p.x += sin(t * 6.2831 + seed * 20.0) * 0.06;
        vA = sin(t * 3.1416);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (0.6 + seed) / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uMap; varying float vA;
      void main(){ vec4 c = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vec3(1.0,0.45,0.15) * 1.3, c.a * vA * 0.6); }`,
  });
  m.userData.size = size;
  return m;
}
const animated = []; // {update(t)}
const heatMats = [];

/* ---------------- scene anchors ---------------- */
const P = [
  new THREE.Vector3(0, 0, 0),        // 0 hero
  new THREE.Vector3(-14, 2, -22),    // 1 problema (lo que ya sabes)
  new THREE.Vector3(0, 0, -45),      // 2 mecanismo
  new THREE.Vector3(28, 4, -78),     // 3 niveles
  new THREE.Vector3(-6, -6, -112),   // 4 masaje
  new THREE.Vector3(22, 8, -150),    // 5 usb-c
  new THREE.Vector3(-18, 0, -190),   // 6 seguridad
  new THREE.Vector3(0, 0, -230),     // 7 real
  new THREE.Vector3(0, 0, -270),     // 8 packs
  new THREE.Vector3(16, 0, -305),    // 9 regalo
  new THREE.Vector3(0, 0, -345),     // 10 faq / final
];
// camera offset from anchor, and horizontal composition side (-1 = object on right, 1 = object on left, 0 center)
const K = [
  { off: [0, 0.35, 6.4], side: -1 },
  { off: [0, 0.8, 9], side: 1 },
  { off: [0, 0.4, 11], side: -1 },
  { off: [-2, 2, 13], side: 1 },
  { off: [0, 6.5, 11], side: -1 },
  { off: [4, 1.2, 8], side: 1 },
  { off: [-2, 1, 9.5], side: -1 },
  { off: [0, 1.5, 13], side: 0 },
  { off: [0, 2.5, 13], side: 0 },
  { off: [-1, 2, 9], side: -1 },
  { off: [0, 0.6, 9], side: 0 },
];
const camPts = P.map((p, i) => p.clone().add(new THREE.Vector3(...K[i].off)));
const camCurve = new THREE.CatmullRomCurve3(camPts, false, 'centripetal', 0.5);

/* 0 HERO belt */
const heroBelt = makeBelt();
heroBelt.position.copy(P[0]);
scene.add(heroBelt);
const heroLight = new THREE.PointLight(0xff5a1f, 1.5, 5, 2);
heroLight.position.set(0, 0, 2.2);
heroBelt.add(heroLight);
animated.push((t) => {
  heroBelt.rotation.y = Math.sin(t * 0.35) * 0.5 + scrollF * 1.6;
  heroBelt.rotation.x = Math.sin(t * 0.5) * 0.06 + 0.08;
  heroBelt.position.y = P[0].y + Math.sin(t * 0.8) * 0.08;
});


/* 1 PROBLEMA — the old way: a hot-water bottle that goes cold */
{
  const g = new THREE.Group();
  g.position.copy(P[1]);
  const rubber = new THREE.MeshPhysicalMaterial({ color: 0x8a2a14, roughness: 0.45, clearcoat: 0.6, emissive: 0xff4a12, emissiveIntensity: 0.6 });
  const bottle = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), rubber);
  body.scale.set(1.5, 2.0, 0.45);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.7, 32), rubber);
  neck.position.y = 2.15;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.35, 32), plastic);
  cap.position.y = 2.6;
  bottle.add(body, neck, cap);
  // ribbed texture lines
  for (let i = -5; i <= 5; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 64), rubber);
    const y = i * 0.3, k = Math.sqrt(Math.max(0, 1 - (y / 2) ** 2));
    rib.scale.set(1.5 * k, 0.45 * k, 1);
    rib.rotation.x = Math.PI / 2;
    rib.position.y = y;
    bottle.add(rib);
  }
  bottle.rotation.z = -0.25;
  g.add(bottle);
  // frost particles
  const count = isMobile ? 160 : 320;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos.set([(Math.random() - 0.5) * 7, 2.5 - Math.random() * 1.5, (Math.random() - 0.5) * 3], i * 3);
    seed[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const frost = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uCold: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uMap: { value: glowSprite } },
    vertexShader: `
      attribute float seed; uniform float uTime, uPx; varying float vA;
      void main(){
        float t = fract(seed + uTime * 0.08);
        vec3 p = position; p.y -= t * 5.0; p.x += sin(t * 6.28 + seed * 30.0) * 0.3;
        vA = sin(t * 3.14);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.5 + seed * 2.0) * uPx * (16.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform float uCold; varying float vA;
      void main(){ vec4 c = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vec3(0.6,0.85,1.3), c.a * vA * uCold); }`,
  });
  g.add(new THREE.Points(geo, frost));
  const light = new THREE.PointLight(0xff5a1f, 4, 9, 2);
  light.position.set(0, 0, 3);
  g.add(light);
  scene.add(g);
  const warm = new THREE.Color(0x8a2a14), coldC = new THREE.Color(0x2a3a4a);
  const warmL = new THREE.Color(0xff5a1f), coldL = new THREE.Color(0x5aa0ff);
  animated.push((t) => {
    // 8s cycle: hot → slowly cooling → cold
    const c = Math.min(1, ((t % 8) / 8) * 1.4);
    rubber.color.lerpColors(warm, coldC, c);
    rubber.emissiveIntensity = 0.6 * (1 - c);
    light.color.lerpColors(warmL, coldL, c);
    frost.uniforms.uTime.value = t;
    frost.uniforms.uCold.value = c;
    bottle.position.y = Math.sin(t * 0.7) * 0.12;
    bottle.rotation.y = Math.sin(t * 0.4) * 0.4;
  });
}

/* 2 MECANISMO — giant heating element */
{
  const g = new THREE.Group();
  g.position.copy(P[2]);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 4.6, 1, 1), neoprene);
  panel.position.z = -0.25;
  g.add(panel);
  const pts = [], N = 10, w = 6.2, h = 1.35;
  for (let i = 0; i < N; i++) {
    const x = -w / 2 + (w * i) / (N - 1), up = i % 2 === 0;
    pts.push(new THREE.Vector3(x, up ? h : -h, 0), new THREE.Vector3(x, up ? -h : h, 0));
    if (i < N - 1) pts.push(new THREE.Vector3(x + w / (N - 1) / 2, up ? -h - 0.35 : h + 0.35, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const mat = hotGlow(2);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 900, 0.07, 10), mat));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 400, 0.28, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3a10, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
  // travelling energy pulse
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), hotGlow(10, new THREE.Color(0xffd0a0)));
  g.add(pulse);
  // heat haze
  const count = isMobile ? 260 : 520;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos.set([(Math.random() - 0.5) * 7, -2.2 + Math.random() * 2, Math.random() * 1.2], i * 3);
    seed[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const hm = heatMaterial(0.16, 4.5);
  heatMats.push(hm);
  g.add(new THREE.Points(geo, hm));
  const l = new THREE.PointLight(0xff5a1f, 6, 10, 2);
  l.position.set(0, 0, 2.5);
  g.add(l);
  scene.add(g);
  animated.push((t) => {
    mat.color.copy(HOT).multiplyScalar(2 + Math.sin(t * 2) * 0.5);
    pulse.position.copy(curve.getPointAt((t * 0.12) % 1));
    g.rotation.y = Math.sin(t * 0.3) * 0.12;
  });
}

/* 2 NIVELES — three heat rings */
{
  const g = new THREE.Group();
  g.position.copy(P[3]);
  const colors = [0xffb347, 0xff6a2b, 0xff2d2d];
  const rings = colors.map((c, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1.5 + i * 0.75, 0.05 + i * 0.02, 16, 160), hotGlow(2 + i * 1.5, new THREE.Color(c)));
    g.add(m);
    return m;
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 4),
    new THREE.MeshPhysicalMaterial({ color: 0x1a0d08, emissive: 0xff4a12, emissiveIntensity: 1.5, roughness: 0.2, clearcoat: 1 }));
  g.add(core);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite, color: 0xff6a2b, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 }));
  sprite.scale.setScalar(6);
  g.add(sprite);
  const l = new THREE.PointLight(0xff6a2b, 6, 10, 2);
  g.add(l);
  scene.add(g);
  animated.push((t) => {
    rings.forEach((r, i) => {
      r.rotation.x = t * (0.3 + i * 0.17) + i;
      r.rotation.y = t * (0.22 - i * 0.09) + i * 2;
    });
    core.rotation.y = t * 0.4;
    const lvl = Math.floor(t / 1.6) % 3;
    core.material.emissiveIntensity += ((1 + lvl * 1.4) - core.material.emissiveIntensity) * 0.06;
    sprite.material.opacity = 0.4 + lvl * 0.25;
  });
}

/* 3 MASAJE — vibration wave field */
{
  const g = new THREE.Group();
  g.position.copy(P[4]);
  const n = isMobile ? 90 : 140, size = 18;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * n * 3);
  let k = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    pos[k++] = (i / (n - 1) - 0.5) * size; pos[k++] = 0; pos[k++] = (j / (n - 1) - 0.5) * size;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `
      uniform float uTime, uPx; varying float vH; varying float vD;
      void main(){
        vec3 p = position; float d = length(p.xz);
        float w = sin(d * 2.4 - uTime * 5.0) * exp(-d * 0.18);
        p.y += w * 0.55; vH = w; vD = d;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (2.0 + max(w, 0.0) * 4.0) * uPx * (12.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vH; varying float vD;
      void main(){
        float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
        vec3 c = mix(vec3(0.35,0.12,0.06), vec3(1.6,0.6,0.18), clamp(vH*0.8+0.4,0.0,1.0));
        gl_FragColor = vec4(c, a * smoothstep(9.0, 3.0, vD));
      }`,
  });
  g.add(new THREE.Points(geo, mat));
  // Vibration motor puck
  const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.3, 48), plastic);
  puck.position.y = 0.6;
  const puckRing = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.03, 8, 64), hotGlow(5));
  puckRing.rotation.x = Math.PI / 2;
  puck.add(puckRing);
  g.add(puck);
  const shock = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.015, 8, 96),
      new THREE.MeshBasicMaterial({ color: 0xff7a3a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.rotation.x = Math.PI / 2; m.position.y = 0.6; g.add(m); return m;
  });
  scene.add(g);
  animated.push((t) => {
    mat.uniforms.uTime.value = t;
    puck.position.x = Math.sin(t * 90) * 0.015;
    puck.position.y = 0.6 + Math.cos(t * 77) * 0.015 + Math.sin(t * 2) * 0.1;
    puck.rotation.y = t * 0.6;
    shock.forEach((s, i) => {
      const f = (t * 0.6 + i / 3) % 1;
      s.scale.setScalar(0.8 + f * 6);
      s.material.opacity = (1 - f) * 0.9;
    });
  });
}

/* 4 USB-C */
{
  const g = new THREE.Group();
  g.position.copy(P[5]);
  const rr = (w, h, r) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
    s.lineTo(-w / 2 + r, h / 2); s.absarc(-w / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5);
    return s;
  };
  const shell = rr(1.7, 0.62, 0.31);
  shell.holes.push(rr(1.45, 0.4, 0.2));
  const plug = new THREE.Mesh(new THREE.ExtrudeGeometry(shell, { depth: 1.3, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3, curveSegments: 24 }), metal);
  plug.position.z = -1.3;
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 1.2), hotGlow(3));
  tongue.position.z = -0.65;
  const housing = new THREE.Mesh(new THREE.ExtrudeGeometry(rr(2.2, 1.0, 0.5), { depth: 2.2, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 4, curveSegments: 24 }), plastic);
  housing.position.z = -3.55;
  const logo = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.04), hotGlow(4));
  logo.position.set(0, 0.55, -2.4);
  const head = new THREE.Group();
  head.add(plug, tongue, housing, logo);
  head.rotation.set(0.15, -0.6, 0.1);
  g.add(head);
  // Cable with energy flow
  const cable = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, -3.5), new THREE.Vector3(0, -0.5, -6), new THREE.Vector3(-2, -2.5, -8), new THREE.Vector3(-5, -3, -7), new THREE.Vector3(-9, -2, -9),
  ].map((v) => v.applyEuler(head.rotation)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 120, 0.22, 16), plastic));
  const flowN = 40;
  const flow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 8), hotGlow(8, new THREE.Color(0xffc080)), flowN);
  g.add(flow);
  const dummy = new THREE.Object3D();
  const l = new THREE.PointLight(0xff8040, 5, 8, 2);
  l.position.set(0, 0.5, 1.2);
  g.add(l);
  scene.add(g);
  animated.push((t) => {
    head.position.y = Math.sin(t * 0.9) * 0.12;
    for (let i = 0; i < flowN; i++) {
      const u = 1 - ((t * 0.18 + i / flowN) % 1);
      dummy.position.copy(cable.getPointAt(u));
      dummy.position.y += head.position.y;
      dummy.scale.setScalar(0.6 + Math.sin(i * 1.7 + t * 4) * 0.4);
      dummy.updateMatrix();
      flow.setMatrixAt(i, dummy.matrix);
    }
    flow.instanceMatrix.needsUpdate = true;
  });
}

/* 5 SEGURIDAD — shield + timer */
{
  const g = new THREE.Group();
  g.position.copy(P[6]);
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.1, 1)),
    new THREE.LineBasicMaterial({ color: new THREE.Color(0xff7a3a).multiplyScalar(2), transparent: true, opacity: 0.8, toneMapped: false }));
  g.add(wire);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(1.3, 64, 64),
    new THREE.MeshPhysicalMaterial({ color: 0x0b0b0e, roughness: 0.05, metalness: 0.2, clearcoat: 1, iridescence: 0.6, envMapIntensity: 1.6 }));
  g.add(orb);
  const ticksN = 60;
  const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.28, 0.05), new THREE.MeshBasicMaterial({ toneMapped: false }), ticksN);
  const d = new THREE.Object3D();
  for (let i = 0; i < ticksN; i++) {
    const a = (i / ticksN) * Math.PI * 2;
    d.position.set(Math.sin(a) * 3.1, Math.cos(a) * 3.1, 0);
    d.rotation.z = -a;
    d.updateMatrix();
    ticks.setMatrixAt(i, d.matrix);
    ticks.setColorAt(i, new THREE.Color(0x333333));
  }
  g.add(ticks);
  const power = new THREE.Group();
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 12, 64, Math.PI * 1.6), hotGlow(5));
  arc.rotation.z = Math.PI / 2 + Math.PI * 0.2;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), hotGlow(5));
  bar.position.y = 0.3;
  power.add(arc, bar);
  power.position.z = 1.45;
  g.add(power);
  const l = new THREE.PointLight(0xff6a2b, 5, 10, 2);
  l.position.set(0, 0, 3);
  g.add(l);
  scene.add(g);
  const on = new THREE.Color(), off = new THREE.Color(0x2a2a2e);
  animated.push((t) => {
    wire.rotation.y = t * 0.15; wire.rotation.x = t * 0.08;
    const prog = (t * 0.12) % 1;
    for (let i = 0; i < ticksN; i++) {
      const f = i / ticksN;
      if (f < prog) ticks.setColorAt(i, on.setRGB(2.4, 0.5 + f, 0.15));
      else ticks.setColorAt(i, off);
    }
    ticks.instanceColor.needsUpdate = true;
    g.rotation.y = Math.sin(t * 0.4) * 0.25;
  });
}

/* 6 REAL — belt big, slow rotation */
const showBelt = makeBelt();
showBelt.position.copy(P[7]);
showBelt.scale.setScalar(1.6);
scene.add(showBelt);
animated.push((t) => { showBelt.rotation.y = t * 0.25; });

/* 7 PACKS — three belts on pedestals */
const packBelts = [];
{
  const g = new THREE.Group();
  g.position.copy(P[8]);
  [-4.6, 0, 4.6].forEach((x, i) => {
    const b = makeBelt();
    b.position.set(x, 0.3, i === 1 ? 0.8 : 0);
    b.scale.setScalar(i === 1 ? 1.05 : 0.9);
    const ped = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.03, 8, 96), hotGlow(i === 1 ? 5 : 2.5));
    ped.rotation.x = Math.PI / 2;
    ped.position.set(x, -1.2, b.position.z);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.9, 64),
      new THREE.MeshBasicMaterial({ color: 0xff4a12, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; disc.position.copy(ped.position);
    g.add(b, ped, disc);
    packBelts.push(b);
  });
  const l = new THREE.PointLight(0xff6a2b, 6, 14, 2);
  l.position.set(0, 3, 4);
  g.add(l);
  scene.add(g);
  animated.push((t) => packBelts.forEach((b, i) => {
    b.rotation.y = t * 0.4 + i * 2.1;
    b.position.y = 0.3 + Math.sin(t * 1.2 + i) * 0.12;
  }));
}

/* 8 REGALO — gift box with emerging belt */
{
  const g = new THREE.Group();
  g.position.copy(P[9]);
  const boxMat = new THREE.MeshPhysicalMaterial({ color: 0x141016, roughness: 0.35, clearcoat: 1, sheen: 0.5, sheenColor: new THREE.Color(0xff6a2b) });
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.0, 2.6), boxMat);
  box.position.y = -1.2;
  const rib = hotGlow(3.2, new THREE.Color(0xff6a2b));
  const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.04, 2.64), rib); r1.position.y = -1.2;
  const r2 = new THREE.Mesh(new THREE.BoxGeometry(2.64, 2.04, 0.28), rib); r2.position.y = -1.2;
  const lid = new THREE.Group();
  const lidM = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.45, 2.85), boxMat);
  const lr1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.48, 2.9), rib);
  const lr2 = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.48, 0.3), rib);
  const bow1 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.1, 12, 48), rib);
  bow1.position.set(-0.38, 0.5, 0); bow1.rotation.set(0, 0, 0.6);
  const bow2 = bow1.clone(); bow2.position.x = 0.38; bow2.rotation.z = -0.6;
  lid.add(lidM, lr1, lr2, bow1, bow2);
  lid.rotation.set(0.35, 0.2, -0.25);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 0.9, 5, 48, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff7a3a, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 1.3;
  const belt = makeBelt();
  belt.scale.setScalar(0.62);
  g.add(box, r1, r2, lid, beam, belt);
  const l = new THREE.PointLight(0xff6a2b, 5, 10, 2);
  l.position.set(0, 1.5, 2);
  g.add(l);
  g.rotation.y = -0.4;
  scene.add(g);
  animated.push((t) => {
    lid.position.set(-0.6, 2.6 + Math.sin(t * 1.1) * 0.15, -0.3);
    belt.position.y = 0.6 + Math.sin(t * 1.3) * 0.15;
    belt.rotation.y = t * 0.6;
    beam.material.opacity = 0.09 + Math.sin(t * 2) * 0.03;
  });
}

/* 9 FINAL belt */
const finalBelt = makeBelt();
finalBelt.position.copy(P[10]);
finalBelt.scale.setScalar(1.3);
scene.add(finalBelt);
const finalLight = new THREE.PointLight(0xff5a1f, 2, 6, 2);
finalLight.position.set(0, 0, 3);
finalBelt.add(finalLight);
animated.push((t) => { finalBelt.rotation.y = Math.sin(t * 0.3) * 0.6; finalBelt.position.y = Math.sin(t * 0.8) * 0.1; });

/* ---------------- ambient: dust + light trail ---------------- */
{
  const count = isMobile ? 1800 : 4500;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const p = camCurve.getPoint(Math.random());
    pos.set([p.x + (Math.random() - 0.5) * 60, p.y + (Math.random() - 0.5) * 34, p.z + (Math.random() - 0.5) * 40], i * 3);
    seed[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uMap: { value: glowSprite } },
    vertexShader: `
      attribute float seed; uniform float uTime, uPx; varying float vS;
      void main(){
        vec3 p = position; p.y += sin(uTime * 0.3 + seed * 30.0) * 0.4; vS = seed;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.0 + seed * 2.5) * uPx * (22.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform float uTime; varying float vS;
      void main(){
        vec4 c = texture2D(uMap, gl_PointCoord);
        vec3 col = mix(vec3(1.0,0.55,0.25), vec3(0.6,0.75,1.0), step(0.75, vS));
        gl_FragColor = vec4(col, c.a * (0.35 + 0.35 * sin(uTime + vS * 40.0)));
      }`,
  });
  scene.add(new THREE.Points(geo, mat));
  heatMats.push(mat);

  // Light trail that the camera follows
  const trailPts = camCurve.getPoints(400).map((p) => p.clone().add(new THREE.Vector3(0, -2.6, -3)));
  const trailCurve = new THREE.CatmullRomCurve3(trailPts);
  const trailMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime; varying vec2 vUv;
      void main(){ float d = fract(vUv.x * 40.0 - uTime * 0.6); float a = smoothstep(0.0,0.1,d) * smoothstep(0.6,0.1,d);
        gl_FragColor = vec4(vec3(1.4,0.5,0.15), 0.12 + a * 0.55); }`,
  });
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(trailCurve, 1200, 0.025, 6), trailMat));
  heatMats.push(trailMat);
}

/* ---------------- scroll → camera ---------------- */
const sections = [...document.querySelectorAll('[data-scene]')];
let holds = [];
function measure() {
  holds = sections.map((s) => {
    const top = s.offsetTop;
    return { start: top, end: top + Math.max(0, s.offsetHeight - innerHeight) };
  });
}
function targetF() {
  const y = scrollY;
  if (y <= holds[0].start) return 0;
  for (let i = 0; i < holds.length; i++) {
    const h = holds[i];
    if (y <= h.end) return i;
    const next = holds[i + 1];
    if (!next) return i;
    if (y < next.start) return i + (y - h.end) / (next.start - h.end);
  }
  return holds.length - 1;
}
const ease = (x) => x * x * (3 - 2 * x);
let scrollF = 0;
let shift = { x: 0, y: 0 };
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; }, { passive: true });

const tmpTarget = new THREE.Vector3();
const tmpPos = new THREE.Vector3();
const n = P.length - 1;
function updateCamera(dt) {
  const tf = targetF();
  scrollF += (tf - scrollF) * Math.min(1, dt * (reduceMotion ? 20 : 3.2));
  const i = Math.min(Math.floor(scrollF), n - 1);
  const fr = Math.min(1, Math.max(0, scrollF - i));
  const e = ease(fr);

  camCurve.getPoint((i + e) / n, tmpPos);
  // lift the camera mid-flight for a swooping feel
  tmpPos.y += Math.sin(e * Math.PI) * 2.2;
  tmpTarget.lerpVectors(P[i], P[Math.min(i + 1, n)], e);

  mouse.sx += (mouse.x - mouse.sx) * 0.05;
  mouse.sy += (mouse.y - mouse.sy) * 0.05;
  camera.position.set(tmpPos.x + mouse.sx * 0.8, tmpPos.y - mouse.sy * 0.5, tmpPos.z);
  camera.lookAt(tmpTarget);
  camera.rotation.z += Math.sin(e * Math.PI) * 0.08 * (i % 2 ? 1 : -1); // banking roll during flight

  // framing: push subject to the side opposite the text panel
  const portrait = innerWidth < 720 || innerWidth / innerHeight < 0.9;
  const sA = K[i].side, sB = K[Math.min(i + 1, n)].side;
  const side = sA + (sB - sA) * e;
  const tx = portrait ? 0 : side * 0.24;
  const ty = portrait ? 0.27 : 0;
  shift.x += (tx - shift.x) * 0.08;
  shift.y += (ty - shift.y) * 0.08;
  const w = innerWidth, h = innerHeight;
  camera.setViewOffset(w, h, shift.x * w, shift.y * h, w, h);

  camera.fov = (portrait ? 58 : 42) + Math.sin(e * Math.PI) * 8; // speed warp
  camera.updateProjectionMatrix();
}

/* ---------------- loop ---------------- */
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  scene.traverse((o) => { if (o.material?.uniforms?.uSize) o.material.uniforms.uSize.value = (o.material.userData.size || 0.1) * innerHeight * 0.5; });
  measure();
}
addEventListener('resize', resize);
addEventListener('load', measure);
new ResizeObserver(measure).observe(document.getElementById('content'));
measure();

const allBelts = [];
scene.traverse((o) => { if (o.userData?.coilMat) allBelts.push(o); });
allBelts.forEach((b) => heatMats.push(b.userData.heat.material));

const clock = new THREE.Clock();
let visible = true;
document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  animated.forEach((fn) => fn(t));
  heatMats.forEach((m) => { if (m.uniforms.uTime) m.uniforms.uTime.value = t; });
  allBelts.forEach((b, i) => {
    const pulse = 2.2 + Math.sin(t * 2.2 + i) * 0.6;
    b.userData.coilMat.color.copy(HOT).multiplyScalar(pulse);
    b.userData.halo.material.opacity = 0.08 + Math.sin(t * 2.2 + i) * 0.03;
  });
  updateCamera(dt);
  composer.render();
}
updateCamera(1);
composer.render();
window.__sceneReady = true;
frame();
