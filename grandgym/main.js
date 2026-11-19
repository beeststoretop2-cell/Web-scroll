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
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050608);
scene.fog = new THREE.FogExp2(0x050608, 0.03);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 400);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.8, 0.55, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

scene.add(new THREE.HemisphereLight(0x8fb8ff, 0x140804, 0.4));
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(6, 10, 8);
scene.add(key);
const rim = new THREE.DirectionalLight(0x8fd0ff, 1.2);
rim.position.set(-8, 4, -6);
scene.add(rim);

/* ---------------- materials ---------------- */
const FLAME = new THREE.Color(0xff4a12);
const ICE = new THREE.Color(0x8fd0ff);
const glow = (c, k = 3) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
const steel = new THREE.MeshStandardMaterial({ color: 0xd9dde3, metalness: 1, roughness: 0.18 });
const darkSteel = new THREE.MeshStandardMaterial({ color: 0x24272c, metalness: 0.85, roughness: 0.35 });
const rubber = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.55, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.4 });
const glowSprite = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.3, 'rgba(255,255,255,.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const animated = [];
const timeMats = [];

/* ---------------- anchors & camera keyframes ---------------- */
const P = [
  [0, 0, 0],        // 0 inicio
  [-16, 2, -30],    // 1 centro
  [12, 0, -60],     // 2 panatta
  [0, 0, -92],      // 3 galería (túnel)
  [0, 4, -125],     // 4 actividades
  [-14, -4, -160],  // 5 piscina
  [0, 0, -195],     // 6 horario
  [0, -1, -230],    // 7 precios
  [14, 2, -265],    // 8 estética
  [16, 0, -300],    // 9 judo
  [0, 2, -335],     // 10 reseñas
  [0, 0, -370],     // 11 contacto
].map((a) => new THREE.Vector3(...a));
// off = camera offset from anchor; side: -1 subject to the right (text left), 1 subject to the left, 0 centred
const K = [
  { off: [0, 0.8, 9.5], side: -1 },
  { off: [2, 3, 14], side: 1 },
  { off: [-2, 1.5, 10], side: -1 },
  { off: [0, 0, 6], side: 0 },
  { off: [0, 1, 14], side: 0 },
  { off: [0, 9, 9], side: 1 },
  { off: [0, 0, 12], side: 0 },
  { off: [0, 3, 14], side: 0 },
  { off: [0, 0.5, 11], side: 0 },
  { off: [-1, 0.5, 8.5], side: -1 },
  { off: [0, -1, 15], side: 0 },
  { off: [0, 1.2, 12], side: 0 },
];
const camPts = P.map((p, i) => p.clone().add(new THREE.Vector3(...K[i].off)));
const camCurve = new THREE.CatmullRomCurve3(camPts, false, 'centripetal', 0.5);

/* ---------------- barbell ---------------- */
function makeBarbell(scale = 1) {
  const g = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7.6, 24), steel);
  bar.rotation.z = Math.PI / 2;
  g.add(bar);
  const plates = [
    { r: 1.12, w: 0.24, c: 0xc9201c, glow: FLAME },   // 25 kg
    { r: 1.12, w: 0.2, c: 0x1d4fc4, glow: ICE },      // 20 kg
    { r: 0.86, w: 0.16, c: 0xe8b80c, glow: FLAME },   // 15 kg
    { r: 0.66, w: 0.12, c: 0x1e8c3e, glow: ICE },     // 10 kg
  ];
  for (const s of [-1, 1]) {
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.9, 32), steel);
    sleeve.rotation.z = Math.PI / 2; sleeve.position.x = s * 2.85; g.add(sleeve);
    const stop = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 32), steel);
    stop.rotation.z = Math.PI / 2; stop.position.x = s * 1.92; g.add(stop);
    let x = 2.0;
    for (const p of plates) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, p.w, 64), rubber(p.c));
      m.rotation.z = Math.PI / 2; m.position.x = s * (x + p.w / 2); g.add(m);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, p.w + 0.02, 32), steel);
      hub.rotation.z = Math.PI / 2; hub.position.copy(m.position); g.add(hub);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(p.r - 0.06, 0.012, 8, 96), glow(p.glow, 3));
      ring.rotation.y = Math.PI / 2; ring.position.set(s * (x + (s > 0 ? p.w + 0.002 : -0.002)), 0, 0); g.add(ring);
      x += p.w + 0.02;
    }
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 24), darkSteel);
    collar.rotation.z = Math.PI / 2; collar.position.x = s * (x + 0.07); g.add(collar);
  }
  g.scale.setScalar(scale);
  return g;
}

/* 0 INICIO */
const hero = makeBarbell(0.95);
hero.position.copy(P[0]);
scene.add(hero);
{
  const l1 = new THREE.PointLight(0xff4a12, 8, 10, 2); l1.position.set(3, -1, 2); hero.add(l1);
  const l2 = new THREE.PointLight(0x8fd0ff, 8, 10, 2); l2.position.set(-3, 1.5, 2); hero.add(l2);
}
animated.push((t) => {
  hero.rotation.y = -0.5 + Math.sin(t * 0.4) * 0.35 + scrollF * 1.2;
  hero.rotation.x = 0.25 + Math.sin(t * 0.6) * 0.05;
  hero.position.y = Math.sin(t * 0.9) * 0.15;
});

/* 1 CENTRO — edificio de 2800 m² en wireframe */
{
  const g = new THREE.Group(); g.position.copy(P[1]);
  const lineMat = new THREE.LineBasicMaterial({ color: ICE.clone().multiplyScalar(1.6), transparent: true, opacity: 0.7, toneMapped: false });
  const floors = 5;
  for (let i = 0; i < floors; i++) {
    const w = 9 - i * 0.2, d = 6 - i * 0.15;
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 1.1, d)), lineMat);
    box.position.y = i * 1.25 - 2.5; g.add(box);
    const slab = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.04, side: THREE.DoubleSide, depthWrite: false }));
    slab.rotation.x = -Math.PI / 2; slab.position.y = box.position.y - 0.55; g.add(slab);
    // rooms grid
    for (let k = 1; k < 4; k++) {
      const pts = [new THREE.Vector3(-w / 2 + (w / 4) * k, box.position.y - 0.55, -d / 2), new THREE.Vector3(-w / 2 + (w / 4) * k, box.position.y - 0.55, d / 2)];
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.25 })));
    }
  }
  // pool on the ground floor
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2), glow(0x2f7cff, 1.2));
  pool.rotation.x = -Math.PI / 2; pool.position.set(-2, -3.04, 0.6); g.add(pool);
  const scanner = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), new THREE.MeshBasicMaterial({ color: 0xff5a12, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  scanner.rotation.x = -Math.PI / 2; g.add(scanner);
  const scanEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(10, 7)), new THREE.LineBasicMaterial({ color: FLAME.clone().multiplyScalar(3), toneMapped: false }));
  scanEdge.rotation.x = -Math.PI / 2; g.add(scanEdge);
  g.rotation.y = 0.6;
  scene.add(g);
  animated.push((t) => {
    const y = -3 + ((t * 0.5) % 1) * 6.2;
    scanner.position.y = scanEdge.position.y = y;
    g.rotation.y = 0.6 + Math.sin(t * 0.2) * 0.25;
  });
}

/* 2 PANATTA — máquina guiada con pila de pesas */
{
  const g = new THREE.Group(); g.position.copy(P[2]);
  const red = new THREE.MeshPhysicalMaterial({ color: 0xb3121b, metalness: 0.5, roughness: 0.3, clearcoat: 1 });
  const frame = (w, h, d, x, y, z, m = darkSteel) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
  frame(3.4, 0.16, 2.2, 0, -2.6, 0);
  frame(0.16, 5.4, 0.16, -0.9, 0.1, -0.6); frame(0.16, 5.4, 0.16, 0.9, 0.1, -0.6);
  frame(2.2, 0.18, 0.4, 0, 2.8, -0.6, red);
  frame(0.08, 4.4, 0.08, -0.35, 0, -0.6, steel); frame(0.08, 4.4, 0.08, 0.35, 0, -0.6, steel);
  const stack = new THREE.Group(); g.add(stack);
  const plates = [];
  for (let i = 0; i < 14; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.15, 0.45), i % 2 ? darkSteel : new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: 0.7, roughness: 0.4 }));
    p.position.set(0, -2.4 + i * 0.165, -0.6);
    stack.add(p); plates.push(p);
  }
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.97, 0.02, 0.47), glow(0xff4a12, 2.5));
  g.add(stripe);
  const pulley = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 12, 48), steel);
  pulley.position.set(0, 2.55, -0.25); g.add(pulley);
  const cableGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.6), new THREE.Vector3(0, 2.55, -0.6), new THREE.Vector3(0, 2.55, 0.1), new THREE.Vector3(0, 0.6, 1.0)]);
  const cable = new THREE.Line(cableGeo, new THREE.LineBasicMaterial({ color: 0xffffff }));
  g.add(cable);
  const seat = frame(1.1, 0.22, 1.1, 0, -1.2, 1.0, new THREE.MeshPhysicalMaterial({ color: 0x111214, roughness: 0.6, sheen: 1, sheenColor: new THREE.Color(0x553333) }));
  frame(0.16, 1.3, 0.16, 0, -1.9, 1.0);
  const back = frame(1.1, 1.6, 0.2, 0, -0.3, 0.45, seat.material);
  back.rotation.x = -0.15;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 16), steel);
  handle.rotation.z = Math.PI / 2; g.add(handle);
  const l = new THREE.PointLight(0xff4a12, 10, 12, 2); l.position.set(2, 1, 3); g.add(l);
  const l2 = new THREE.PointLight(0x8fd0ff, 6, 12, 2); l2.position.set(-3, 2, 1); g.add(l2);
  g.rotation.y = -0.7;
  scene.add(g);
  animated.push((t) => {
    const lift = (Math.sin(t * 1.4) * 0.5 + 0.5) * 1.6;
    plates.forEach((p, i) => { p.position.y = -2.4 + i * 0.165 + (i >= 6 ? lift : 0); });
    stripe.position.set(0, -2.4 + 6 * 0.165 - 0.09 + lift, -0.6);
    const pos = cableGeo.attributes.position;
    pos.setY(0, -2.4 + 13 * 0.165 + lift);
    pos.setXYZ(3, 0, 0.6 - lift * 0.5, 1.0 + lift * 0.3); pos.needsUpdate = true;
    handle.position.set(0, 0.6 - lift * 0.5, 1.0 + lift * 0.3);
    g.rotation.y = -0.7 + Math.sin(t * 0.25) * 0.3;
  });
}

/* 4 ACTIVIDADES — volante de ciclo + órbitas */
{
  const g = new THREE.Group(); g.position.copy(P[4]);
  const wheel = new THREE.Group();
  wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.3, 96), steel));
  const rimG = new THREE.Mesh(new THREE.TorusGeometry(2.02, 0.05, 12, 128), glow(FLAME, 3)); rimG.rotation.x = Math.PI / 2; wheel.add(rimG);
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 3.6), darkSteel); s.rotation.y = (i / 6) * Math.PI; wheel.add(s);
  }
  wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.5, 32), glow(ICE, 1.5)));
  wheel.rotation.x = Math.PI / 2;
  g.add(wheel);
  const orbits = [];
  const names = 14;
  for (let r = 0; r < 3; r++) {
    const o = new THREE.Group();
    o.add(new THREE.Mesh(new THREE.TorusGeometry(3.2 + r * 0.9, 0.008, 6, 160), new THREE.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.35 })));
    const n = r === 0 ? 4 : 5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.06, 16, 16), glow(i % 2 ? ICE : FLAME, 4));
      s.position.set(Math.cos(a) * (3.2 + r * 0.9), Math.sin(a) * (3.2 + r * 0.9), 0); o.add(s);
    }
    o.rotation.set(0.4 + r * 0.5, r * 0.6, 0);
    g.add(o); orbits.push(o);
  }
  const l = new THREE.PointLight(0xff4a12, 10, 14, 2); l.position.set(0, 0, 4); g.add(l);
  scene.add(g);
  animated.push((t) => {
    wheel.rotation.y = t * 3;
    orbits.forEach((o, i) => { o.rotation.z = t * (0.2 + i * 0.1) * (i % 2 ? -1 : 1); });
    g.rotation.y = Math.sin(t * 0.3) * 0.4;
  });
}

/* 5 PISCINA — agua con cáusticas + corcheras */
{
  const g = new THREE.Group(); g.position.copy(P[5]);
  const water = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `uniform float uTime; varying vec2 vUv; varying float vH;
      void main(){ vUv = uv; vec3 p = position;
        float h = sin(p.x*0.8+uTime*1.2)*0.12 + sin(p.y*1.1-uTime*0.9)*0.1 + sin((p.x+p.y)*2.0+uTime*2.0)*0.04;
        p.z += h; vH = h; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }`,
    fragmentShader: `uniform float uTime; varying vec2 vUv; varying float vH;
      float c(vec2 p){ p*=8.0; float v=0.0; for(int i=0;i<3;i++){ p+=vec2(sin(p.y+uTime*0.7),cos(p.x-uTime*0.6)); v+=abs(sin(p.x)*sin(p.y)); } return v/3.0; }
      void main(){ float k = pow(1.0-c(vUv), 6.0);
        vec3 deep = vec3(0.01,0.06,0.16), shallow = vec3(0.08,0.45,0.9);
        vec3 col = mix(deep, shallow, 0.4 + vH*2.0) + vec3(0.6,0.85,1.2)*k*1.6;
        float edge = smoothstep(0.0,0.08,vUv.x)*smoothstep(1.0,0.92,vUv.x)*smoothstep(0.0,0.08,vUv.y)*smoothstep(1.0,0.92,vUv.y);
        gl_FragColor = vec4(col*edge, 1.0); }`,
  });
  timeMats.push(water);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(16, 10, 120, 80), water);
  pool.rotation.x = -Math.PI / 2; g.add(pool);
  const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(16.4, 10.4)), new THREE.LineBasicMaterial({ color: ICE.clone().multiplyScalar(2), toneMapped: false }));
  border.rotation.x = -Math.PI / 2; border.position.y = 0.05; g.add(border);
  const buoyGeo = new THREE.SphereGeometry(0.09, 10, 10);
  const lanes = [];
  for (let l = 1; l < 5; l++) {
    const z = -5 + l * 2;
    const inst = new THREE.InstancedMesh(buoyGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), 60);
    const d = new THREE.Object3D();
    for (let i = 0; i < 60; i++) {
      d.position.set(-7.8 + i * 0.264, 0.08, z); d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
      inst.setColorAt(i, (i % 10 < 5) ? new THREE.Color(2.2, 0.5, 0.15) : new THREE.Color(1.6, 1.6, 1.8));
    }
    g.add(inst); lanes.push(inst);
  }
  const l = new THREE.PointLight(0x5ab0ff, 14, 16, 2); l.position.set(0, 3, 0); g.add(l);
  g.rotation.y = 0.25;
  scene.add(g);
  animated.push((t) => { lanes.forEach((ln, i) => { ln.position.y = Math.sin(t * 1.4 + i) * 0.05; }); });
}

/* 6 HORARIO — reloj con la hora real de Burgos */
{
  const g = new THREE.Group(); g.position.copy(P[6]);
  const N = 60;
  const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), new THREE.MeshBasicMaterial({ toneMapped: false }), N);
  const d = new THREE.Object3D();
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, big = i % 5 === 0;
    d.position.set(Math.sin(a) * 3.4, Math.cos(a) * 3.4, 0); d.rotation.z = -a; d.scale.set(big ? 1.6 : 1, big ? 1.4 : 0.8, 1);
    d.updateMatrix(); ticks.setMatrixAt(i, d.matrix); ticks.setColorAt(i, new THREE.Color(0x30343a));
  }
  g.add(ticks);
  g.add(new THREE.Mesh(new THREE.TorusGeometry(3.85, 0.02, 8, 160), glow(ICE, 2)));
  const face = new THREE.Mesh(new THREE.CircleGeometry(3.7, 96), new THREE.MeshPhysicalMaterial({ color: 0x07080a, roughness: 0.1, metalness: 0.4, clearcoat: 1, transparent: true, opacity: 0.85 }));
  face.position.z = -0.1; g.add(face);
  const hand = (len, w, mat, z) => { const h = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.06), mat); m.position.y = len / 2 - 0.3; h.add(m); h.position.z = z; g.add(h); return h; };
  const hH = hand(2.0, 0.16, steel, 0.05), hM = hand(2.9, 0.1, steel, 0.1), hS = hand(3.2, 0.03, glow(FLAME, 4), 0.15);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 24).rotateX(Math.PI / 2), glow(FLAME, 3)));
  const l = new THREE.PointLight(0xff4a12, 6, 10, 2); l.position.set(0, 0, 3); g.add(l);
  scene.add(g);
  const on = new THREE.Color(), off = new THREE.Color(0x30343a);
  const fmt = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' });
  animated.push((t) => {
    const [h, m, s] = fmt.format(new Date()).split(':').map(Number);
    const ms = (Date.now() % 1000) / 1000;
    hS.rotation.z = -((s + ms) / 60) * Math.PI * 2;
    hM.rotation.z = -((m + s / 60) / 60) * Math.PI * 2;
    hH.rotation.z = -(((h % 12) + m / 60) / 12) * Math.PI * 2;
    for (let i = 0; i < N; i++) ticks.setColorAt(i, i <= s ? on.setRGB(2.4, 0.4 + i / 120, 0.1) : off);
    ticks.instanceColor.needsUpdate = true;
    g.rotation.y = Math.sin(t * 0.3) * 0.25;
  });
}

/* 7 PRECIOS — podios de discos */
{
  const g = new THREE.Group(); g.position.copy(P[7]);
  const cols = [0xc9201c, 0x1d4fc4, 0xe8b80c, 0x1e8c3e];
  const heights = [6, 4, 5, 3];
  const stacks = [];
  [-4.2, -1.4, 1.4, 4.2].forEach((x, i) => {
    const s = new THREE.Group(); s.position.x = x;
    for (let k = 0; k < heights[i]; k++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.26, 64), rubber(cols[(i + k) % 4]));
      p.position.y = -2.4 + k * 0.29; s.add(p);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.012, 6, 96), glow(k % 2 ? ICE : FLAME, 2.5));
      ring.rotation.x = Math.PI / 2; ring.position.y = p.position.y + 0.135; s.add(ring);
    }
    g.add(s); stacks.push(s);
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.MeshBasicMaterial({ color: 0xff4a12, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.6; g.add(floor);
  const l = new THREE.PointLight(0xff6a2b, 10, 16, 2); l.position.set(0, 3, 5); g.add(l);
  scene.add(g);
  animated.push((t) => stacks.forEach((s, i) => { s.rotation.y = t * 0.5 * (i % 2 ? 1 : -1); s.position.y = Math.sin(t * 1.2 + i) * 0.12; }));
}

/* 8 ESTÉTICA — orbe iridiscente */
{
  const g = new THREE.Group(); g.position.copy(P[8]);
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 12),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transmission: 1, thickness: 1.5, ior: 1.4, iridescence: 1, iridescenceIOR: 1.6, envMapIntensity: 1.5 }));
  g.add(orb);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 32), glow(0xffb38a, 2.2)); g.add(core);
  const bubbles = [];
  for (let i = 0; i < 24; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.14, 16, 16), glow(i % 3 ? 0xffc6a8 : 0x8fd0ff, 2));
    b.userData = { a: Math.random() * 6.28, r: 2.6 + Math.random() * 1.8, y: (Math.random() - 0.5) * 4, s: 0.2 + Math.random() * 0.4 };
    g.add(b); bubbles.push(b);
  }
  const l = new THREE.PointLight(0xffa080, 10, 12, 2); l.position.set(0, 0, 0); g.add(l);
  scene.add(g);
  animated.push((t) => {
    orb.rotation.y = t * 0.2; orb.position.y = Math.sin(t * 0.8) * 0.15;
    core.scale.setScalar(1 + Math.sin(t * 2) * 0.1);
    bubbles.forEach((b) => { const u = b.userData; b.position.set(Math.cos(u.a + t * u.s) * u.r, u.y + Math.sin(t * u.s * 2 + u.a) * 0.4, Math.sin(u.a + t * u.s) * u.r); });
  });
}

/* 9 JUDO — medalla de oro */
{
  const g = new THREE.Group(); g.position.copy(P[9]);
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc95a, metalness: 1, roughness: 0.18 });
  const medal = new THREE.Group();
  medal.add(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.2, 96).rotateX(Math.PI / 2), gold));
  const rimM = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.08, 16, 96), gold); medal.add(rimM);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.03, 12, 96), glow(0xffb340, 2.5)); inner.position.z = 0.12; medal.add(inner);
  const inner2 = inner.clone(); inner2.position.z = -0.12; medal.add(inner2);
  // star relief
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.32 : 0.8, a = (i / 10) * Math.PI * 2 + Math.PI / 2; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }), gold);
  star.position.z = 0.1; medal.add(star);
  const star2 = star.clone(); star2.rotation.y = Math.PI; star2.position.z = -0.1; medal.add(star2);
  medal.position.y = -0.6;
  g.add(medal);
  const ribbon = (c, x, rz) => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.4, 0.04), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.5, sheen: 1, sheenColor: new THREE.Color(c) })); r.position.set(x, 2.4, -0.05); r.rotation.z = rz; g.add(r); };
  ribbon(0xc9201c, -0.45, 0.22); ribbon(0x1d4fc4, 0.45, -0.22);
  const l = new THREE.PointLight(0xffc060, 12, 10, 2); l.position.set(2, 1, 3); g.add(l);
  scene.add(g);
  animated.push((t) => { medal.rotation.y = t * 0.9; g.rotation.z = Math.sin(t * 0.7) * 0.05; g.position.y = P[9].y + Math.sin(t) * 0.12; });
}

/* 10 RESEÑAS — 4,3 estrellas */
{
  const g = new THREE.Group(); g.position.copy(P[10]);
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.42 : 1, a = (i / 10) * Math.PI * 2 + Math.PI / 2; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3 });
  geo.center();
  const stars = [];
  for (let i = 0; i < 5; i++) {
    const full = i < 4;
    const m = new THREE.Mesh(geo, full ? new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff4a12, emissiveIntensity: 1.2, metalness: 0.4, roughness: 0.3 })
      : new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.6, roughness: 0.3, emissive: 0xff4a12, emissiveIntensity: 0.25 }));
    const a = (i - 2) * 0.32;
    m.position.set(Math.sin(a) * 6, Math.cos(a) * 1.2 - 1.2, Math.cos(a) * 1.5 - 1.5);
    g.add(m); stars.push(m);
  }
  const l = new THREE.PointLight(0xff6a2b, 8, 14, 2); l.position.set(0, 1, 4); g.add(l);
  g.position.y += 5.4;
  g.scale.setScalar(0.8);
  scene.add(g);
  animated.push((t) => stars.forEach((s, i) => { s.rotation.y = Math.sin(t * 1.2 + i * 0.6) * 0.6; s.position.y = Math.cos((i - 2) * 0.32) * 1.2 - 1.2 + Math.sin(t * 1.5 + i) * 0.12; }));
}

/* 11 CONTACTO — barra final */
const finalBar = makeBarbell(1.15);
finalBar.position.copy(P[11]);
scene.add(finalBar);
{
  const l = new THREE.PointLight(0xff4a12, 8, 12, 2); l.position.set(0, 2, 3); finalBar.add(l);
}
animated.push((t) => { finalBar.rotation.y = t * 0.35; finalBar.position.y = P[11].y + Math.sin(t * 0.9) * 0.15; });

/* ---------------- túnel de pórticos LED (techos de Grandgym) ---------------- */
{
  const gateGeo = new THREE.BoxGeometry(1, 1, 1);
  const count = isMobile ? 70 : 120;
  const bars = new THREE.InstancedMesh(gateGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), count * 4);
  const d = new THREE.Object3D(), tan = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let n = 0;
  const near = (u) => { const f = u * (P.length - 1); return Math.abs(f - Math.round(f)) < 0.42; };
  for (let i = 0; i < count; i++) {
    const u = i / count;
    if (near(u) && !(Math.round(u * (P.length - 1)) === 3)) continue; // keep gates through the gallery tunnel
    const p = camCurve.getPointAt(u); camCurve.getTangentAt(u, tan);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(), tan, up));
    const W = 11, Hh = 7;
    const col = i % 6 === 0 ? new THREE.Color(1.8, 0.45, 0.12) : i % 2 ? new THREE.Color(0.7, 1.0, 1.4) : new THREE.Color(1.15, 1.15, 1.25);
    const parts = [[0, Hh / 2, W, 0.05], [0, -Hh / 2, W, 0.05], [-W / 2, 0, 0.05, Hh], [W / 2, 0, 0.05, Hh]];
    for (const [x, y, sx, sy] of parts) {
      d.position.set(x, y, 0).applyQuaternion(q).add(p);
      d.quaternion.copy(q); d.scale.set(sx, sy, 0.05); d.updateMatrix();
      bars.setMatrixAt(n, d.matrix); bars.setColorAt(n, col); n++;
    }
  }
  bars.count = n;
  scene.add(bars);

  // dust
  const dc = isMobile ? 1600 : 4000;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(dc * 3), seed = new Float32Array(dc);
  for (let i = 0; i < dc; i++) {
    const p = camCurve.getPoint(Math.random());
    pos.set([p.x + (Math.random() - 0.5) * 50, p.y + (Math.random() - 0.5) * 30, p.z + (Math.random() - 0.5) * 30], i * 3);
    seed[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uMap: { value: glowSprite } },
    vertexShader: `attribute float seed; uniform float uTime, uPx; varying float vS;
      void main(){ vec3 p = position; p.y += sin(uTime*0.3 + seed*30.0)*0.5; vS = seed;
        vec4 mv = modelViewMatrix * vec4(p,1.0); gl_PointSize = (1.0 + seed*2.2) * uPx * (20.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D uMap; uniform float uTime; varying float vS;
      void main(){ vec4 c = texture2D(uMap, gl_PointCoord); vec3 col = mix(vec3(1.0,0.45,0.15), vec3(0.55,0.8,1.0), step(0.55, vS));
        gl_FragColor = vec4(col, c.a * (0.3 + 0.3*sin(uTime + vS*40.0))); }`,
  });
  timeMats.push(mat);
  scene.add(new THREE.Points(geo, mat));
}

/* ---------------- scroll → camera ---------------- */
const sections = [...document.querySelectorAll('[data-scene]')];
let holds = [];
function measure() {
  holds = sections.map((s) => {
    const top = s.getBoundingClientRect().top + scrollY;
    return { start: top, end: top + Math.max(0, s.offsetHeight - innerHeight) };
  });
}
function targetF() {
  const y = scrollY;
  if (y <= holds[0].start) return 0;
  for (let i = 0; i < holds.length; i++) {
    const h = holds[i], next = holds[i + 1];
    if (y <= h.end) return i + (sections[i].id === 'galeria' ? 0 : 0);
    if (!next) return i;
    if (y < next.start) return i + (y - h.end) / (next.start - h.end);
  }
  return holds.length - 1;
}
const ease = (x) => x * x * (3 - 2 * x);
let scrollF = 0;
const shift = { x: 0, y: 0 };
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; }, { passive: true });
const tmpPos = new THREE.Vector3(), tmpTarget = new THREE.Vector3();
const n = P.length - 1;
let galleryDrift = 0;
function updateCamera(dt, t) {
  const tf = targetF();
  scrollF += (tf - scrollF) * Math.min(1, dt * (reduceMotion ? 20 : 3));
  const i = Math.min(Math.floor(scrollF), n - 1);
  const e = ease(Math.min(1, Math.max(0, scrollF - i)));
  camCurve.getPoint((i + e) / n, tmpPos);
  tmpPos.y += Math.sin(e * Math.PI) * 2;
  tmpTarget.lerpVectors(P[i], P[i + 1], e);

  // inside the gallery tunnel: drift forward with the horizontal scroll
  const g = holds[3];
  if (g && scrollY > g.start && scrollY < g.end) {
    galleryDrift = (scrollY - g.start) / (g.end - g.start);
  } else galleryDrift += ((scrollY >= (g?.end ?? 0) ? 1 : 0) - galleryDrift) * 0.1;
  const gw = Math.max(0, 1 - Math.abs(scrollF - 3));
  tmpPos.z -= galleryDrift * 10 * gw;
  tmpTarget.z -= galleryDrift * 10 * gw;

  mouse.sx += (mouse.x - mouse.sx) * 0.05; mouse.sy += (mouse.y - mouse.sy) * 0.05;
  camera.position.set(tmpPos.x + mouse.sx * 1.0, tmpPos.y - mouse.sy * 0.6, tmpPos.z);
  camera.lookAt(tmpTarget);
  camera.rotation.z += Math.sin(e * Math.PI) * 0.1 * (i % 2 ? 1 : -1);

  const portrait = innerWidth < 720 || innerWidth / innerHeight < 0.9;
  const side = K[i].side + (K[i + 1].side - K[i].side) * e;
  shift.x += ((portrait ? 0 : side * 0.22) - shift.x) * 0.08;
  shift.y += ((portrait ? 0.24 : 0) - shift.y) * 0.08;
  camera.setViewOffset(innerWidth, innerHeight, shift.x * innerWidth, shift.y * innerHeight, innerWidth, innerHeight);
  camera.fov = (portrait ? 60 : 42) + Math.sin(e * Math.PI) * 10;
  camera.updateProjectionMatrix();
}

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  measure();
}
addEventListener('resize', resize);
addEventListener('load', measure);
new ResizeObserver(measure).observe(document.getElementById('content'));
measure();

const clock = new THREE.Clock();
let visible = true;
document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  animated.forEach((fn) => fn(t));
  timeMats.forEach((m) => { m.uniforms.uTime.value = t; });
  updateCamera(dt, t);
  composer.render();
}
updateCamera(1, 0);
composer.render();
window.__sceneReady = true;
frame();
