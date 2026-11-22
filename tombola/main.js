// Pizzería Tómbola · escena 3D: la cámara vuela entre 7 escenas mientras haces scroll.
// 0 horno · 1 masa 48 h · 2 ingredientes · 3 carta (tómbola) · 4 túnel del equipo · 5 vino y cerveza · 6 neón y caja para llevar
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const isMobile = matchMedia('(max-width: 720px)').matches || /Mobi|Android/i.test(navigator.userAgent);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2;

/* ---------------- renderer ---------------- */
const canvas = document.getElementById('webgl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
} catch (err) {
  document.documentElement.classList.add('no-webgl');
  window.__sceneReady = true;
  throw err;
}
const DPR = Math.min(devicePixelRatio, isMobile ? 1.5 : 2);
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0604);
scene.fog = new THREE.FogExp2(0x160905, 0.017);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 400);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.55, 0.88);
composer.addPass(bloom);
composer.addPass(new OutputPass());

scene.add(new THREE.HemisphereLight(0xffdcb8, 0x1a0805, 0.6));
const key = new THREE.DirectionalLight(0xfff1e0, 1.7);
key.position.set(6, 12, 9);
scene.add(key);
const rim = new THREE.DirectionalLight(0xff6a3a, 1.3);
rim.position.set(-9, 3, -6);
scene.add(rim);

/* ---------------- helpers ---------------- */
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const rr = (a, b) => a + (b - a) * rnd();
let travelK = 0;
const animated = [];
const layoutFns = [];   // ajustes que cambian entre horizontal (texto a un lado) y vertical (3D centrado arriba)
const isPortrait = () => innerWidth < 760 || innerWidth / innerHeight < 0.9;
const timeMats = [];
const billboards = [];
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const glowSprite = canvasTex(128, 128, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, w);
}, false);
const glow = (c, k = 3) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
function blob(g, x, y, r, wob = 0.18, pts = 14) {
  g.beginPath();
  const o = rnd() * TAU;
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * TAU, k = r * (1 + Math.sin(a * 3 + o) * wob * 0.5 + (rnd() - 0.5) * wob);
    const px = x + Math.cos(a) * k, py = y + Math.sin(a) * k;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.closePath(); g.fill();
}
const inDisc = (c, rad) => { const a = rnd() * TAU, d = Math.sqrt(rnd()) * rad; return [c + Math.cos(a) * d, c + Math.sin(a) * d]; };

/* ---------------- colours & materials ---------------- */
const EMBER = 0xff6a2b, NEON = 0xff2d48, BASIL = 0x4fd16a, CREAM = 0xffe6c4;
const steel = new THREE.MeshStandardMaterial({ color: 0xcfd2d6, metalness: 1, roughness: 0.2 });
const ovenRedTex = canvasTex(1024, 64, (g, w, h) => {
  g.fillStyle = '#c62a3f'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 18; i++) { const x = (i / 18) * w; g.fillStyle = 'rgba(70,0,12,.55)'; g.fillRect(x, 0, 3, h); g.fillStyle = 'rgba(255,150,160,.12)'; g.fillRect(x + 3, 0, 10, h); }
});
const granite = new THREE.MeshStandardMaterial({
  roughness: 0.45, metalness: 0.05,
  map: canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#35302d'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = rnd(); g.fillStyle = v > 0.7 ? `rgba(230,225,220,${rr(0.3, 0.8)})` : v > 0.35 ? 'rgba(10,8,8,.7)' : `rgba(150,140,135,${rr(0.2, 0.6)})`;
      g.fillRect(rnd() * w, rnd() * h, rr(1, 3.5), rr(1, 3.5));
    }
  }),
});
const woodTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#7b4a26'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(${rnd() > 0.5 ? '40,20,8' : '170,110,60'},${rr(0.12, 0.35)})`; g.lineWidth = rr(1, 4);
    g.beginPath(); const y = rnd() * h; g.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 6);
    g.stroke();
  }
});
const wood = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 });
const crustTex = canvasTex(256, 64, (g, w, h) => {
  g.fillStyle = '#d9a05a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) { g.fillStyle = rnd() > 0.55 ? `rgba(45,22,8,${rr(0.4, 0.85)})` : `rgba(240,200,140,${rr(0.2, 0.5)})`; blob(g, rnd() * w, rnd() * h, rr(1.5, 6)); }
});
crustTex.wrapS = crustTex.wrapT = THREE.RepeatWrapping; crustTex.repeat.set(6, 1);
const crustMat = new THREE.MeshStandardMaterial({ map: crustTex, roughness: 0.8 });

/* ---------------- pizzas ---------------- */
const pizzaCache = {};
function pizzaTex(kind) {
  if (pizzaCache[kind]) return pizzaCache[kind];
  const t = canvasTex(512, 512, (g, w) => {
    const c = w / 2;
    let gr = g.createRadialGradient(c, c, c * 0.55, c, c, c);
    gr.addColorStop(0, '#e6c086'); gr.addColorStop(0.86, '#d79c55'); gr.addColorStop(1, '#7a421c');
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, c, 0, TAU); g.fill();
    if (kind !== 'nutella') {
      g.fillStyle = '#b02e1a'; blob(g, c, c, c * 0.84, 0.05, 40);
      for (let i = 0; i < 260; i++) { const [x, y] = inDisc(c, c * 0.8); g.fillStyle = `rgba(${rr(110, 200)},${rr(15, 45)},12,.3)`; blob(g, x, y, rr(3, 14)); }
      for (let i = 0; i < 24; i++) { const [x, y] = inDisc(c, c * 0.68); g.fillStyle = 'rgba(248,232,192,.94)'; blob(g, x, y, rr(20, 44), 0.35); }
      for (let i = 0; i < 70; i++) { const [x, y] = inDisc(c, c * 0.7); g.fillStyle = `rgba(205,140,60,${rr(0.2, 0.5)})`; blob(g, x, y, rr(2, 7)); }
    } else {
      g.fillStyle = '#4a2412'; blob(g, c, c, c * 0.82, 0.06, 40);
      for (let i = 0; i < 18; i++) { const [x, y] = inDisc(c, c * 0.7); g.fillStyle = 'rgba(250,240,220,.9)'; blob(g, x, y, rr(10, 24), 0.4); }
    }
    const leaf = (x, y, s, col = '#2f7d2e') => {
      g.save(); g.translate(x, y); g.rotate(rnd() * TAU); g.fillStyle = col;
      g.beginPath(); g.ellipse(0, 0, s, s * 0.48, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(160,220,120,.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.stroke(); g.restore();
    };
    const disc = (x, y, r, col, rimCol) => { g.fillStyle = rimCol; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(x, y, r * 0.86, 0, TAU); g.fill(); };
    const shroom = (x, y, s) => {
      g.save(); g.translate(x, y); g.rotate(rnd() * TAU); g.fillStyle = '#c4a786';
      g.beginPath(); g.arc(0, 0, s, Math.PI, 0); g.lineTo(s * 0.3, s * 0.5); g.lineTo(-s * 0.3, s * 0.5); g.closePath(); g.fill();
      g.strokeStyle = '#6e5038'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, s, Math.PI, 0); g.stroke(); g.restore();
    };
    const ring = (x, y, s, col) => { g.strokeStyle = col; g.lineWidth = 6; g.beginPath(); g.ellipse(x, y, s, s * 0.7, rnd() * TAU, 0, TAU * rr(0.6, 1)); g.stroke(); };
    if (kind === 'margarita') for (let i = 0; i < 7; i++) { const [x, y] = inDisc(c, c * 0.6); leaf(x, y, rr(18, 26)); }
    if (kind === 'pepperoni') for (let i = 0; i < 15; i++) { const [x, y] = inDisc(c, c * 0.7); disc(x, y, rr(20, 27), '#a62a1b', '#6a1810'); }
    if (kind === 'prosciutto') {
      for (let i = 0; i < 8; i++) { const [x, y] = inDisc(c, c * 0.62); g.fillStyle = '#e8a59d'; blob(g, x, y, rr(26, 40), 0.5); g.fillStyle = 'rgba(255,240,235,.5)'; blob(g, x + 6, y - 4, rr(5, 9)); }
      for (let i = 0; i < 10; i++) { const [x, y] = inDisc(c, c * 0.68); shroom(x, y, rr(12, 17)); }
    }
    if (kind === 'vegetal') {
      for (let i = 0; i < 20; i++) { const [x, y] = inDisc(c, c * 0.7); ring(x, y, rr(14, 26), ['#d4281c', '#f0c419', '#3f9a2e'][i % 3]); }
      for (let i = 0; i < 8; i++) { const [x, y] = inDisc(c, c * 0.66); shroom(x, y, rr(12, 16)); }
    }
    if (kind === 'tombola') {
      for (let i = 0; i < 8; i++) { const [x, y] = inDisc(c, c * 0.66); disc(x, y, rr(16, 21), '#c2401f', '#7a2411'); }
      for (let i = 0; i < 6; i++) { const [x, y] = inDisc(c, c * 0.6); g.fillStyle = '#fbf6ea'; blob(g, x, y, 22, 0.2); g.fillStyle = '#f5a516'; g.beginPath(); g.arc(x + 2, y, 9, 0, TAU); g.fill(); }
      for (let i = 0; i < 40; i++) { const [x, y] = inDisc(c, c * 0.7); g.strokeStyle = '#4c8a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rr(-14, 14), y + rr(-14, 14)); g.lineTo(x + rr(-14, 14), y + rr(-14, 14)); g.stroke(); }
    }
    if (kind === 'burratina') {
      for (let i = 0; i < 7; i++) { const [x, y] = inDisc(c, c * 0.62); g.fillStyle = '#7e1d1d'; blob(g, x, y, rr(22, 30), 0.5); }
      const bg = g.createRadialGradient(c, c, 0, c, c, 80); bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, 'rgba(250,246,236,0)');
      g.fillStyle = bg; g.beginPath(); g.arc(c, c, 80, 0, TAU); g.fill();
      for (let i = 0; i < 8; i++) { const [x, y] = inDisc(c, c * 0.66); disc(x, y, 14, '#e0402a', '#a01c12'); }
      for (let i = 0; i < 50; i++) { const [x, y] = inDisc(c, c * 0.72); g.strokeStyle = '#4c8a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rr(-16, 16), y + rr(-16, 16)); g.lineTo(x + rr(-16, 16), y + rr(-16, 16)); g.stroke(); }
    }
    for (let i = 0; i < 90; i++) { const a = rnd() * TAU, d = c * rr(0.84, 0.99); g.fillStyle = `rgba(35,16,6,${rr(0.4, 0.8)})`; blob(g, c + Math.cos(a) * d, c + Math.sin(a) * d, rr(2, 7)); }
    for (let i = 0; i < 25; i++) { const [x, y] = inDisc(c, c * 0.75); g.fillStyle = `rgba(80,40,10,${rr(0.25, 0.5)})`; blob(g, x, y, rr(2, 5)); }
  });
  pizzaCache[kind] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 });
  return pizzaCache[kind];
}
function makePizza(kind, r = 1.4) {
  const g = new THREE.Group();
  const top = pizzaTex(kind);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.98, 0.07, 64), [crustMat, top, crustMat]));
  const rimM = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.075, 12, 72).rotateX(-Math.PI / 2), crustMat);
  rimM.position.y = 0.035; g.add(rimM);
  return g;
}
function makeSlices(kind, r = 2, n = 8) {
  const g = new THREE.Group(); const top = pizzaTex(kind); const slices = [];
  for (let i = 0; i < n; i++) {
    const th0 = (i / n) * TAU, len = TAU / n - 0.025, mid = th0 + len / 2;
    const s = new THREE.Group();
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.98, 0.08, 20, 1, false, th0, len), [crustMat, top, crustMat]));
    const rg = new THREE.TorusGeometry(r, r * 0.075, 10, 14, len).rotateZ(th0 - Math.PI / 2).rotateX(-Math.PI / 2);
    const rm = new THREE.Mesh(rg, crustMat); rm.position.y = 0.04; s.add(rm);
    s.userData.dir = new THREE.Vector3(Math.sin(mid), 0, Math.cos(mid));
    g.add(s); slices.push(s);
  }
  g.userData.slices = slices;
  return g;
}

/* ---------------- ingredients ---------------- */
const tomatoMat = new THREE.MeshPhysicalMaterial({ color: 0xd8271b, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 });
const leafMat = new THREE.MeshPhysicalMaterial({ color: 0x2f8a2c, roughness: 0.45, side: THREE.DoubleSide, sheen: 1, sheenColor: new THREE.Color(0x9be07a), clearcoat: 0.4 });
const mozzMat = new THREE.MeshPhysicalMaterial({ color: 0xd9d2c4, roughness: 0.4, clearcoat: 0.4, sheen: 0.4, sheenColor: new THREE.Color(0xfff6ea), envMapIntensity: 0.6 });
const shroomCap = new THREE.MeshStandardMaterial({ color: 0x8a6446, roughness: 0.65 });
const shroomStem = new THREE.MeshStandardMaterial({ color: 0xe9dcc6, roughness: 0.7 });
const oliveMat = new THREE.MeshPhysicalMaterial({ color: 0x1b1512, roughness: 0.2, clearcoat: 1 });
const truffleMat = new THREE.MeshStandardMaterial({ color: 0x2a1d16, roughness: 1, flatShading: true });
const leafGeo = (() => {
  const s = new THREE.Shape(); s.moveTo(0, 0);
  s.quadraticCurveTo(0.28, 0.25, 0, 0.75); s.quadraticCurveTo(-0.28, 0.25, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 10); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.pow(p.getX(i) * 3, 2) * 0.12 + Math.sin(p.getY(i) * 4) * 0.03);
  geo.computeVertexNormals(); return geo;
})();
function makeTomato(s = 1) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 24), tomatoMat); b.scale.y = 0.88; g.add(b);
  for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.18), leafMat); l.position.y = 0.245; l.rotation.y = (i / 5) * TAU; l.translateZ(0.07); l.rotation.x = -0.3; g.add(l); }
  g.scale.setScalar(s); return g;
}
function makeLeaf(s = 1) { const m = new THREE.Mesh(leafGeo, leafMat); m.scale.setScalar(s); return m; }
function makeMozz(s = 1) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 24), mozzMat); m.scale.set(s, s * 0.92, s); return m; }
function makeShroom(s = 1) {
  const g = new THREE.Group();
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 14, 0, TAU, 0, Math.PI / 2), shroomCap); cap.scale.y = 0.7; cap.position.y = 0.2; g.add(cap);
  const under = new THREE.Mesh(new THREE.CircleGeometry(0.3, 28).rotateX(Math.PI / 2), shroomStem); under.position.y = 0.2; g.add(under);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.3, 16), shroomStem); stem.position.y = 0.05; g.add(stem);
  g.scale.setScalar(s); return g;
}
function makePepperRing(col, s = 1) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 10, 32), new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.25, clearcoat: 1 })); m.scale.set(s, s * 0.8, s); return m; }
function makeOlive(s = 1) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14), oliveMat); m.scale.set(s, s * 1.3, s); return m; }
function makeTruffle(s = 1) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 2), truffleMat); const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + rr(-0.08, 0.08); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } m.geometry.computeVertexNormals(); m.scale.setScalar(s); return m; }
const RANDOM_ING = [() => makeTomato(rr(0.8, 1.2)), () => makeLeaf(rr(0.6, 0.9)), () => makeMozz(rr(0.6, 0.9)), () => makeShroom(rr(0.7, 1)),
  () => makePepperRing([0xd4281c, 0xf0c419, 0x3f9a2e][Math.floor(rnd() * 3)], rr(0.8, 1.1)), () => makeOlive(rr(0.8, 1.2)), () => makeLeaf(rr(0.6, 0.9))];
function floatAround(obj, base, amp = 0.25, spin = 0.4) {
  const ph = rnd() * TAU, ax = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
  obj.position.copy(base);
  animated.push((t) => {
    obj.position.y = base.y + Math.sin(t * 0.8 + ph) * amp;
    obj.rotateOnAxis(ax, spin * 0.01);
  });
}

/* ---------------- flames, embers, dust ---------------- */
const NOISE = `
  float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
  float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(h21(i),h21(i+vec2(1,0)),u.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x), u.y); }
  float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.03; a*=0.5; } return v; }`;
function makeFlame(w, h, sd) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false,
    uniforms: { uTime: { value: 0 }, uSeed: { value: sd } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform float uTime, uSeed; varying vec2 vUv; ${NOISE}
      void main(){
        vec2 uv = vUv;
        float n = fbm(vec2(uv.x*3.0 + uSeed, uv.y*2.2 - uTime*1.7));
        float width = 0.46 * (1.0 - uv.y*0.85);
        float d = abs(uv.x - 0.5 + (n-0.5)*0.22*uv.y);
        float f = smoothstep(width, width*0.15, d) * smoothstep(0.0, 0.12, uv.y) * (1.0 - smoothstep(0.55, 1.0, uv.y + (n-0.5)*0.45));
        f *= 0.75 + n*0.6;
        vec3 col = mix(vec3(0.85,0.1,0.02), vec3(1.0,0.5,0.06), smoothstep(0.1,0.5,f));
        col = mix(col, vec3(1.0,0.9,0.55), smoothstep(0.55,0.95,f));
        gl_FragColor = vec4(col*2.4, clamp(f,0.0,1.0));
      }`,
  });
  timeMats.push(mat);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.geometry.translate(0, h / 2, 0);
  billboards.push(m);
  return m;
}
function makePoints(count, spread, center, opt) {
  const pos = new Float32Array(count * 3), sd = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = center.x + (rnd() - 0.5) * spread.x;
    pos[i * 3 + 1] = center.y + (rnd() - 0.5) * spread.y;
    pos[i * 3 + 2] = center.z + (rnd() - 0.5) * spread.z;
    sd[i] = rnd();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: opt.additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false,
    uniforms: { uTime: { value: 0 }, uSize: { value: opt.size * DPR }, uRise: { value: opt.rise }, uH: { value: spread.y }, uY0: { value: center.y - spread.y / 2 }, uColor: { value: new THREE.Color(opt.color).multiplyScalar(opt.boost || 1) }, uAlpha: { value: opt.alpha || 1 } },
    vertexShader: `uniform float uTime, uSize, uRise, uH, uY0; attribute float aSeed; varying float vA;
      void main(){
        vec3 p = position;
        p.y = uY0 + mod(p.y - uY0 + uTime*uRise*(0.4+aSeed), uH);
        p.x += sin(uTime*0.4 + aSeed*30.0)*0.5;
        p.z += cos(uTime*0.3 + aSeed*20.0)*0.4;
        vec4 mv = modelViewMatrix*vec4(p,1.0);
        gl_PointSize = uSize*(0.4+aSeed)*(30.0 / -mv.z);
        gl_Position = projectionMatrix*mv;
        vA = 0.45 + 0.55*sin(uTime*(1.0+aSeed*2.0) + aSeed*40.0);
        vA *= smoothstep(0.0, 0.08, (p.y-uY0)/uH) * (1.0 - smoothstep(0.85, 1.0, (p.y-uY0)/uH));
      }`,
    fragmentShader: `uniform vec3 uColor; uniform float uAlpha; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uColor, a*a*vA*uAlpha); }`,
  });
  timeMats.push(mat);
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  return pts;
}

/* ---------------- anchors & camera keyframes ---------------- */
const P = [
  [0, 0, 0],         // 0 horno
  [-15, 1, -36],     // 1 masa
  [13, 0, -72],      // 2 sabor
  [0, -1, -108],     // 3 carta
  [0, 0, -146],      // 4 equipo (túnel)
  [-13, 1, -182],    // 5 vino y cerveza
  [0, 0, -218],      // 6 contacto
].map((a) => new THREE.Vector3(...a));
// off: cámara respecto al ancla · side: -1 sujeto a la derecha (texto a la izquierda), 1 sujeto a la izquierda, 0 centrado
const K = [
  { off: [0.6, 1.4, 14.5], side: -1 },
  { off: [0.5, 6.2, 12], side: 1 },
  { off: [0, 0.8, 10.5], side: -1 },
  { off: [0, 5, 10], side: 0 },
  { off: [0, 0, 7], side: 0 },
  { off: [0.5, 1.6, 10.5], side: 1 },
  { off: [0, 0.6, 12], side: -1 },
];
const camPts = P.map((p, i) => p.clone().add(new THREE.Vector3(...K[i].off)));
const camCurve = new THREE.CatmullRomCurve3(camPts, false, 'centripetal', 0.5);

/* ---------------- 0 · el horno: foto real del horno Marana de Tómbola, flotando en 3D ---------------- */
const photoTex = (url) => { const t = new THREE.TextureLoader().load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
{
  const oven = new THREE.Group();
  oven.position.copy(P[0]).add(new THREE.Vector3(1.9, -0.1, 0));
  scene.add(oven);
  layoutFns.push((pt) => { oven.position.x = P[0].x + (pt ? 0 : 1.9); LOOK[0].x = pt ? 0 : 1.2; });
  const tex = photoTex('img/real/horno-real.png');
  const W = 5.9, H = W * 840 / 900;
  const card = new THREE.Group(); oven.add(card);
  // relieve: varias capas oscurecidas detrás de la foto, como un objeto recortado con grosor
  for (let k = 6; k >= 1; k--) {
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, color: new THREE.Color(0.16 + 0.03 * (6 - k), 0.06, 0.04), side: THREE.DoubleSide, toneMapped: false });
    const l = new THREE.Mesh(new THREE.PlaneGeometry(W, H), m); l.position.z = -k * 0.045; card.add(l);
  }
  const front = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.FrontSide, color: new THREE.Color(1.08, 1.04, 1.02), toneMapped: false }));
  card.add(front);
  // halo de brasa detrás y luz que parpadea en la mirilla del fuego
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.9, H * 1.7), new THREE.MeshBasicMaterial({ map: glowSprite, color: new THREE.Color(EMBER).multiplyScalar(0.9), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  halo.position.z = -0.6; card.add(halo);
  const fire = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: glowSprite, color: new THREE.Color(0xff8a30).multiplyScalar(2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  fire.position.set(-W / 2 + W * 0.145, H / 2 - H * 0.58, 0.05); card.add(fire);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.9, 1.4), new THREE.MeshBasicMaterial({ map: glowSprite, color: 0x000000, transparent: true, opacity: 0.8, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -H / 2 - 0.9; oven.add(shadow);
  const sparks = makePoints(isMobile ? 70 : 140, new THREE.Vector3(5, 6, 2), new THREE.Vector3(0, 2.2, 0.6), { size: 2.6, rise: 0.9, color: 0xff8a3a, boost: 2.6, additive: true });
  oven.add(sparks);
  [[4.6, 3.0, 1.2], [5.4, 0.6, -0.8], [4.4, -1.6, 1.8], [-1.5, 4.6, -2.5], [5.6, 4.6, -1]].forEach(([x, y, z], i) => {
    const o = RANDOM_ING[i % RANDOM_ING.length](); oven.add(o); floatAround(o, new THREE.Vector3(x, y, z), 0.3, 0.6);
  });
  animated.push((t) => {
    card.rotation.y = -0.28 + Math.sin(t * 0.45) * 0.26;
    card.rotation.x = Math.sin(t * 0.33) * 0.04;
    card.position.y = Math.sin(t * 0.8) * 0.18;
    shadow.scale.setScalar(1 - Math.sin(t * 0.8) * 0.05);
    const f = 0.85 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.07;
    fire.scale.setScalar(f); fire.material.opacity = f;
    halo.material.opacity = 0.55 + Math.sin(t * 2.1) * 0.08;
  });
}

/* ---------------- 1 · la masa (48 h) ---------------- */
const dough = { k: 1, target: 1 };
{
  const g = new THREE.Group(); g.position.copy(P[1]).add(new THREE.Vector3(-1.6, -1.4, 0)); scene.add(g);
  layoutFns.push((pt) => { g.position.x = P[1].x + (pt ? 0 : -1.6); });
  // bolas de masa reales (fotograma del vídeo de Tómbola) que crecen con el reloj de fermentación
  const ballTex = photoTex('img/real/bola-masa.png');
  const balls = [];
  const spots = [[-2.8, 0.1, 0.9, 0.85], [0, -0.1, 1.5, 1.0], [2.8, 0.2, 0.7, 0.8], [-1.5, 1.3, -1.3, 0.7], [1.5, 1.4, -1.1, 0.72], [3.9, 1.7, -2.0, 0.6]];
  spots.forEach(([x, y, z, s], i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ballTex, transparent: true, toneMapped: false, color: new THREE.Color(1.05, 1.0, 0.95) }));
    sp.position.set(x, y, z); sp.userData = { s, y, ph: i * 1.3 }; g.add(sp); balls.push(sp);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.8), new THREE.MeshBasicMaterial({ map: glowSprite, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.set(x, y - 0.9, z); g.add(sh); sp.userData.sh = sh;
  });
  // indicador circular de horas
  const ringG = new THREE.Group(); ringG.position.set(0, 3.7, -2.6); ringG.scale.setScalar(0.8); g.add(ringG);
  ringG.add(new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.03, 8, 160), new THREE.MeshBasicMaterial({ color: 0x4a2a1a, transparent: true, opacity: 0.6 })));
  const arcMat = new THREE.ShaderMaterial({
    transparent: true, toneMapped: false, uniforms: { uK: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform float uK; varying vec2 vUv;
      void main(){ float u = 1.0 - fract(vUv.x + 0.75); if (u > uK) discard;
        vec3 c = mix(vec3(1.0,0.25,0.15), vec3(1.0,0.75,0.35), u); gl_FragColor = vec4(c*3.0, 1.0); }`,
  });
  ringG.add(new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.07, 10, 200), arcMat));
  const hourCanvas = document.createElement('canvas'); hourCanvas.width = 512; hourCanvas.height = 256;
  const hourTex = new THREE.CanvasTexture(hourCanvas); hourTex.colorSpace = THREE.SRGBColorSpace;
  const hourLabel = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshBasicMaterial({ map: hourTex, transparent: true, toneMapped: false, color: new THREE.Color(1.6, 1.4, 1.2) }));
  ringG.add(hourLabel);
  let lastH = -1;
  const drawHour = (h) => {
    const c = hourCanvas.getContext('2d'); c.clearRect(0, 0, 512, 256);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffe6c4';
    c.font = '800 150px "Archivo Variable", Archivo, Arial Black, sans-serif';
    if ('fontStretch' in c) c.fontStretch = 'expanded';
    const w = c.measureText(String(h)).width;
    c.textAlign = 'left'; c.fillText(String(h), 256 - (w + 40) / 2, 120);
    c.font = 'italic 90px "Instrument Serif", Georgia, serif'; c.fillStyle = '#ff9a5a'; c.fillText('h', 256 - (w + 40) / 2 + w + 6, 140);
    hourTex.needsUpdate = true;
  };
  const flour = makePoints(isMobile ? 120 : 240, new THREE.Vector3(9, 5, 6), new THREE.Vector3(0, 2.4, 0), { size: 2.2, rise: 0.12, color: 0xfff4e4, boost: 1.4, alpha: 0.8 });
  g.add(flour);
  animated.push((t) => {
    if (typeof window.__doughHour === 'number') dough.target = window.__doughHour / 48;
    dough.k += (dough.target - dough.k) * 0.08;
    const k = dough.k;
    arcMat.uniforms.uK.value = Math.max(0.002, k);
    const h = Math.round(k * 48); if (h !== lastH) { lastH = h; drawHour(h); }
    balls.forEach((b) => {
      const u = b.userData, sc = (0.65 + k * 0.6) * u.s * (1 + Math.sin(t * 1.1 + u.ph) * 0.015);
      b.scale.set(sc * 1.95, sc * 1.6 * (0.92 + k * 0.08), 1);
      b.position.y = u.y + Math.sin(t * 0.7 + u.ph) * 0.12 + k * 0.25;
      u.sh.scale.setScalar(0.7 + k * 0.6);
    });
    ringG.lookAt(camera.position);
  });
}

/* ---------------- 2 · el sabor: porción y productos ---------------- */
{
  const g = new THREE.Group(); g.position.copy(P[2]); scene.add(g);
  const sl = makeSlices('burratina', 2.4, 6);
  sl.userData.slices.forEach((s, i) => { if (i) s.visible = false; });
  const slice = sl.userData.slices[0];
  const holder = new THREE.Group(); holder.add(sl); sl.position.set(-0.2, 0, -1.1);
  holder.rotation.set(0.55, 0.3, -0.25); g.add(holder);
  const rings = [];
  const make = [() => makeTomato(1.3), () => makeLeaf(1.1), () => makeMozz(1.1), () => makeShroom(1.2), () => makeTruffle(1.1), () => makeOlive(1.4),
    () => makePepperRing(0xd4281c, 1.2), () => makeLeaf(0.9), () => makeTomato(1), () => makeMozz(1.4), () => makePepperRing(0xf0c419, 1.1), () => makeShroom(1)];
  [[3.3, 0.3, 6, 0.18], [4.6, -0.6, 6, -0.12]].forEach(([rad, y, cnt, sp], ri) => {
    const ring = new THREE.Group(); ring.position.y = y; ring.rotation.x = ri ? -0.35 : 0.28; g.add(ring);
    for (let i = 0; i < cnt; i++) {
      const o = make[(ri * cnt + i) % make.length](); const a = (i / cnt) * TAU + ri * 0.4;
      o.position.set(Math.cos(a) * rad, Math.sin(i * 2.1) * 0.5, Math.sin(a) * rad); o.userData.spin = new THREE.Vector3(rnd(), rnd(), rnd());
      ring.add(o);
    }
    rings.push([ring, sp]);
  });
  // burrata grande
  const burrata = makeMozz(2.2); burrata.position.set(2.6, 2.2, -1.5); g.add(burrata);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 16), mozzMat); knot.position.set(2.6, 2.95, -1.5); g.add(knot);
  const l1 = makeLeaf(1.6); l1.position.set(2.2, 2.7, -1.2); l1.rotation.set(-0.6, 0.4, 0.8); g.add(l1);
  const oil = new THREE.PointLight(0xffb060, 12, 10, 1.6); oil.position.set(0, 3, 3); g.add(oil);
  animated.push((t) => {
    holder.rotation.y = 0.3 + Math.sin(t * 0.4) * 0.35;
    holder.position.y = Math.sin(t * 0.9) * 0.15;
    slice.position.y = 0;
    rings.forEach(([r, sp]) => { r.rotation.y = t * sp; r.children.forEach((o) => { o.rotation.x += o.userData.spin.x * 0.01; o.rotation.y += o.userData.spin.y * 0.012; }); });
    burrata.position.y = 2.2 + Math.sin(t * 0.7) * 0.18; knot.position.y = burrata.position.y + 0.75;
  });
}

/* ---------------- 3 · carta: pizza en porciones y bolas de tómbola ---------------- */
{
  const g = new THREE.Group(); g.position.copy(P[3]).add(new THREE.Vector3(0, -0.6, 0)); scene.add(g);
  const peel = new THREE.Group(); g.add(peel);
  peel.add(new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.12, 64), wood));
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 3.4), wood); handle.position.z = 4.5; peel.add(handle);
  const pz = makeSlices('pepperoni', 2.65, 8); pz.position.y = 0.1; peel.add(pz);
  // bolas de tómbola numeradas
  const nums = [7, 18, 1, 24, 15, 33, 9, 12, 21, 3, 27, 17];
  const balls = nums.map((n, i) => {
    const tex = canvasTex(256, 128, (c, w, h) => {
      c.fillStyle = '#fbf3e6'; c.fillRect(0, 0, w, h);
      c.fillStyle = i % 3 === 2 ? '#2f8a3c' : '#c8213a'; c.fillRect(0, h * 0.3, w, h * 0.4);
      c.fillStyle = '#fbf3e6'; c.beginPath(); c.ellipse(w * 0.25, h / 2, 26, 24, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(w * 0.75, h / 2, 26, 24, 0, 0, TAU); c.fill();
      c.fillStyle = '#1b0f0a'; c.font = '800 30px Archivo, Arial Black, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(n, w * 0.25, h / 2 + 2); c.fillText(n, w * 0.75, h / 2 + 2);
    });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 }));
    b.userData = { a: (i / nums.length) * TAU, r: 4.3 + (i % 3) * 0.55, y: 0.6 + Math.sin(i * 1.7) * 1.1, s: 0.18 + (i % 4) * 0.03 };
    g.add(b); return b;
  });
  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(3.45, 0.03, 8, 200).rotateX(Math.PI / 2), glow(EMBER, 3)); glowRing.position.y = 0.02; g.add(glowRing);
  const top = new THREE.PointLight(0xffd2a0, 22, 12, 1.5); top.position.set(0, 4, 1); g.add(top);
  animated.push((t) => {
    peel.rotation.y = t * 0.12;
    const open = 0.18 + Math.max(0, Math.sin(t * 0.8)) * 0.35;
    pz.userData.slices.forEach((s, i) => { s.position.copy(s.userData.dir).multiplyScalar(open); s.position.y = Math.max(0, Math.sin(t * 0.8 - i * 0.5)) * 0.15; });
    balls.forEach((b) => { const u = b.userData, a = u.a + t * u.s; b.position.set(Math.cos(a) * u.r, u.y + Math.sin(t + u.a * 3) * 0.3, Math.sin(a) * u.r); b.rotation.x = t * 0.7 + u.a; b.rotation.y = t * 0.5; });
  });
}

/* ---------------- arcos de luz entre escenas (la cámara los atraviesa) ---------------- */
{
  const tmp = new THREE.Vector3(), tan = new THREE.Vector3();
  const nScenes = P.length - 1;
  const ledGeo = new THREE.BoxGeometry(0.12, 0.12, 0.3);
  const cols = [EMBER, NEON, CREAM, EMBER, BASIL, NEON];
  for (let i = 0; i < nScenes; i++) {
    [0.42, 0.6].forEach((f, j) => {
      camCurve.getPoint((i + f) / nScenes, tmp); camCurve.getTangent((i + f) / nScenes, tan);
      const gate = new THREE.Group(); gate.position.copy(tmp); gate.lookAt(tmp.clone().add(tan));
      const col = cols[(i * 2 + j) % cols.length];
      const r = 4.2 + j * 0.5;
      const gm = glow(col, 3.2), lm = glow(col, 2.2); gm.transparent = lm.transparent = true; gm.depthWrite = lm.depthWrite = false;
      gate.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 8, 180), gm));
      const leds = new THREE.InstancedMesh(ledGeo, lm, 36); const m = new THREE.Matrix4();
      for (let k = 0; k < 36; k++) { const a = (k / 36) * TAU; m.makeRotationZ(a); m.setPosition(Math.cos(a) * (r + 0.25), Math.sin(a) * (r + 0.25), 0); leds.setMatrixAt(k, m); }
      gate.add(leds);
      scene.add(gate);
      animated.push((t) => {
        gate.rotation.z = t * (j ? 0.15 : -0.12);
        const d = camera.position.distanceTo(gate.position), o = (1 - Math.min(1, Math.max(0, (d - 3) / 8))) * Math.min(1, travelK * 1.6);
        gm.opacity = lm.opacity = o; gate.visible = o > 0.01;
      });
    });
  }
  const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(9, 34), new THREE.MeshBasicMaterial({ color: 0x3a1408, transparent: true, opacity: 0.5 }));
  floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.set(0, -1.65, P[4].z - 3); scene.add(floorGlow);
}

/* ---------------- 5 · vino y cerveza ---------------- */
{
  const g = new THREE.Group(); g.position.copy(P[5]).add(new THREE.Vector3(0, -1.6, 0)); scene.add(g);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.15, clearcoat: 1, envMapIntensity: 1.1, side: THREE.DoubleSide, depthWrite: false });
  const lathe = (pts, mat, seg = 64) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), mat);
  // copa
  const wine = new THREE.Group(); wine.position.set(-0.9, 0, 0.7); g.add(wine);
  wine.add(lathe([[0, 0], [0.62, 0], [0.62, 0.03], [0.1, 0.07], [0.05, 0.12], [0.045, 1.0], [0.09, 1.08], [0.38, 1.2], [0.6, 1.48], [0.66, 1.78], [0.6, 2.18], [0.52, 2.42]], glassMat));
  const wineLiquid = lathe([[0, 1.1], [0.36, 1.2], [0.56, 1.45], [0.62, 1.68], [0, 1.68]],
    new THREE.MeshPhysicalMaterial({ color: 0x7a0d22, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.93, emissive: 0x3a0410, emissiveIntensity: 0.6 }));
  wine.add(wineLiquid);
  // botella
  const bottle = new THREE.Group(); bottle.position.set(0.7, 0, -0.9); g.add(bottle);
  bottle.add(lathe([[0, 0], [0.48, 0], [0.5, 0.06], [0.5, 1.9], [0.44, 2.2], [0.22, 2.6], [0.15, 2.75], [0.15, 3.35], [0.18, 3.4], [0.18, 3.52], [0, 3.52]],
    new THREE.MeshPhysicalMaterial({ color: 0x163d22, roughness: 0.08, metalness: 0.2, clearcoat: 1, envMapIntensity: 2 })));
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.505, 0.505, 0.85, 48, 1, true, -1.1, 2.2), new THREE.MeshStandardMaterial({
    roughness: 0.8,
    map: canvasTex(512, 256, (c, w, h) => {
      c.fillStyle = '#f3e6cf'; c.fillRect(0, 0, w, h); c.strokeStyle = '#8a1a24'; c.lineWidth = 6; c.strokeRect(14, 14, w - 28, h - 28);
      c.fillStyle = '#8a1a24'; c.textAlign = 'center'; c.font = 'italic 82px "Instrument Serif", Georgia, serif'; c.fillText('Tómbola', w / 2, h / 2 + 4);
      c.font = '600 22px "JetBrains Mono", monospace'; c.fillStyle = '#3a2a20'; c.fillText('BURGOS', w / 2, h / 2 + 56);
    }),
  }));
  label.position.y = 1.0; bottle.add(label);
  // caña de cerveza
  const beer = new THREE.Group(); beer.position.set(-2.6, 0, -0.3); g.add(beer);
  beer.add(lathe([[0, 0], [0.34, 0], [0.34, 0.06], [0.42, 1.75], [0.44, 1.8]], glassMat));
  beer.add(lathe([[0, 0.08], [0.32, 0.08], [0.395, 1.42], [0, 1.42]], new THREE.MeshPhysicalMaterial({ color: 0xe89a1c, roughness: 0.1, transparent: true, opacity: 0.88, emissive: 0x6a3a00, emissiveIntensity: 0.5, clearcoat: 1 })));
  beer.add(lathe([[0, 1.42], [0.395, 1.42], [0.41, 1.62], [0.32, 1.7], [0, 1.72]], new THREE.MeshStandardMaterial({ color: 0xfff8ec, roughness: 1 })));
  const bubbles = makePoints(60, new THREE.Vector3(0.45, 1.25, 0.45), new THREE.Vector3(0, 0.75, 0), { size: 1.1, rise: 0.5, color: 0xfff0c0, boost: 1.6, additive: true });
  beer.add(bubbles);
  // tabla con uvas y una porción
  const plank = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.18, 3), wood); plank.position.y = -0.1; g.add(plank);
  const grapeMat = new THREE.MeshPhysicalMaterial({ color: 0x3a0f2e, roughness: 0.25, clearcoat: 1, sheen: 0.5, sheenColor: new THREE.Color(0x8a6aa0) });
  for (let i = 0; i < 14; i++) { const gr = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), grapeMat); gr.position.set(1.6 + (i % 4) * 0.24 + rr(-0.05, 0.05), 0.15 + Math.floor(i / 4) * 0.17, -0.9 + (i % 3) * 0.2); g.add(gr); }
  const slice = makeSlices('margarita', 1.3, 8); slice.userData.slices.forEach((s, i) => { if (i > 1) s.visible = false; }); slice.position.set(1.4, 0.05, 0.6); slice.rotation.y = 2.2; g.add(slice);
  const back = new THREE.PointLight(0xff2d48, 26, 9, 1.6); back.position.set(-1.6, 2.2, -1.8); g.add(back);
  const warm = new THREE.PointLight(0xffb070, 14, 9, 1.6); warm.position.set(2.5, 3, 2); g.add(warm);
  const spin = new THREE.Group(); // todo el bodegón gira despacio
  animated.push((t) => {
    g.rotation.y = Math.sin(t * 0.25) * 0.35;
    wineLiquid.rotation.y = t; wine.rotation.z = Math.sin(t * 0.9) * 0.02;
  });
  void spin;
}

/* ---------------- 6 · neón real "Viva la pizza" y la caja oficial de Tómbola (fotos reales) ---------------- */
{
  const g = new THREE.Group(); g.position.copy(P[6]); scene.add(g);
  layoutFns.push((pt) => { g.position.x = P[6].x + (pt ? -2.5 : 0); });
  // tarjeta flotante con relieve hecha a partir de una foto (igual que el horno)
  const photoCard = (url, w, h, rim) => {
    const tex = photoTex(url), grp = new THREE.Group();
    for (let k = 5; k >= 1; k--) {
      const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.3, color: new THREE.Color(rim).multiplyScalar(0.25 + 0.05 * (5 - k)), side: THREE.DoubleSide, toneMapped: false });
      const l = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); l.position.z = -k * 0.04; grp.add(l);
    }
    const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
    grp.add(front); grp.userData.front = front; return grp;
  };
  // neón real: la foto del letrero del local, enmarcada y con su resplandor
  const sign = photoCard('img/real/neon-real.jpg', 6.4, 6.4 * 540 / 940, 0x2a0a06);
  sign.position.set(2.9, 3.1, -3.2); g.add(sign);
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(6.62, 6.62 * 540 / 940), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5a2e).multiplyScalar(1.6), toneMapped: false }));
  frame.position.z = -0.24; sign.add(frame);
  const signGlow = new THREE.Mesh(new THREE.PlaneGeometry(12, 7), new THREE.MeshBasicMaterial({ map: glowSprite, color: new THREE.Color(0xff3a1a).multiplyScalar(0.9), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  signGlow.position.z = -0.5; sign.add(signGlow);
  const neonMat = sign.userData.front.material; neonMat.color = new THREE.Color(1.25, 1.2, 1.2);
  // caja oficial: pila de cajas reales de Tómbola (33 cm, www.pizzeriatombolaburgos.com)
  const boxW = 2.6, box = photoCard('img/real/caja-real.png', boxW, boxW * 724 / 650, 0x8a6a40);
  box.position.set(3.4, -1.3, 1.2); g.add(box);
  const boxShadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.1), new THREE.MeshBasicMaterial({ map: glowSprite, color: 0x000000, transparent: true, opacity: 0.75, depthWrite: false }));
  boxShadow.rotation.x = -Math.PI / 2; boxShadow.position.set(3.4, -3.0, 1.2); g.add(boxShadow);
  const steam = makePoints(50, new THREE.Vector3(2.4, 3, 1.5), new THREE.Vector3(3.4, 1.0, 1.2), { size: 4, rise: 0.4, color: 0xfff2e2, boost: 0.8, alpha: 0.3 });
  g.add(steam);
  [[5.6, 0.2, 0.5], [5.0, 2.4, -1.4], [-0.6, -0.6, 1.8]].forEach(([x, y, z], i) => { const o = RANDOM_ING[(i * 2) % RANDOM_ING.length](); g.add(o); floatAround(o, new THREE.Vector3(x, y, z), 0.25, 0.5); });
  animated.push((t) => {
    sign.rotation.y = -0.18 + Math.sin(t * 0.35) * 0.12; sign.position.y = 3.1 + Math.sin(t * 0.6) * 0.1;
    box.rotation.y = 0.35 + Math.sin(t * 0.5) * 0.3; box.rotation.z = Math.sin(t * 0.7) * 0.04;
    box.position.y = -1.3 + Math.sin(t * 0.9) * 0.18; boxShadow.scale.setScalar(1 - Math.sin(t * 0.9) * 0.06);
    const flick = Math.random() > 0.985 ? 0.55 : 1;
    neonMat.color.setScalar(1.22 * flick); signGlow.material.opacity = 0.8 * flick;
  });
}

/* ---------------- polvo de harina y brasas a lo largo de todo el recorrido ---------------- */
{
  const len = Math.abs(P[P.length - 1].z) + 30;
  scene.add(makePoints(isMobile ? 260 : 600, new THREE.Vector3(46, 22, len), new THREE.Vector3(0, 2, -len / 2 + 14), { size: 2.2, rise: 0.25, color: 0xff7a35, boost: 2.2, additive: true }));
  scene.add(makePoints(isMobile ? 200 : 450, new THREE.Vector3(46, 22, len), new THREE.Vector3(0, 2, -len / 2 + 14), { size: 1.6, rise: 0.05, color: 0xfff1de, boost: 1.1, alpha: 0.55 }));
}

/* ---------------- scroll → cámara ---------------- */
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
  if (!holds.length || y <= holds[0].start) return 0;
  for (let i = 0; i < holds.length; i++) {
    const h = holds[i], next = holds[i + 1];
    if (y <= h.end) return i;
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

/* ---------------- fondo: fotos reales de Tómbola, virado a dos tonos de brasa, Ken Burns ---------------- */
// Fondos: fotos reales del local y del equipo (Instagram de Tómbola)
// Vídeos reales (Instagram de Tómbola) en las escenas clave; fotos reales en el resto
const BG_PHOTOS = ['video/horno.mp4', 'video/masa.mp4', 'video/sabor.mp4', 'img/real/tombola.jpg', 'video/et.mp4', 'img/real/brindis.jpg', 'video/local.mp4'];
const BG_WEBM = { 0: 'video/horno.webm', 1: 'video/masa.webm', 2: 'video/sabor.webm', 4: 'video/et.webm', 6: 'video/local.webm' };
const texLoader = new THREE.TextureLoader();
const texCache = {};
const blank = new THREE.DataTexture(new Uint8Array([20, 8, 5, 255]), 1, 1); blank.needsUpdate = true;
function bgTex(i) {
  i = Math.max(0, Math.min(BG_PHOTOS.length - 1, i));
  if (!texCache[i]) {
    texCache[i] = { tex: null };
    if (BG_WEBM[i]) {
      const v = document.createElement('video');
      const mp4 = v.canPlayType('video/mp4; codecs="avc1.4D401F"');
      Object.assign(v, { src: mp4 ? BG_PHOTOS[i] : BG_WEBM[i], muted: true, loop: true, playsInline: true, preload: 'auto' });
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.addEventListener('loadeddata', () => {
        const t = new THREE.VideoTexture(v); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter;
        texCache[i].tex = t; texCache[i].video = v;
      }, { once: true });
      v.load();
    } else {
      texLoader.load(BG_PHOTOS[i], (t) => { t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; texCache[i].tex = t; });
    }
  }
  return texCache[i].tex;
}
const bgMat = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false, fog: false,
  uniforms: {
    uA: { value: blank }, uB: { value: blank }, uMix: { value: 0 }, uTime: { value: 0 },
    uAspA: { value: 1.5 }, uAspB: { value: 1.5 }, uScreen: { value: innerWidth / innerHeight }, uMouse: { value: new THREE.Vector2() },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
  fragmentShader: `
    uniform sampler2D uA, uB; uniform float uMix, uTime, uAspA, uAspB, uScreen; uniform vec2 uMouse; varying vec2 vUv;
    vec2 cover(vec2 uv, float imgAsp, float zoom, vec2 drift){
      vec2 s = uScreen > imgAsp ? vec2(1.0, imgAsp / uScreen) : vec2(uScreen / imgAsp, 1.0);
      return (uv - 0.5) * s / zoom + 0.5 + drift;
    }
    vec3 grade(vec3 c, vec2 uv){
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      vec3 duo = mix(vec3(0.05, 0.012, 0.008), vec3(0.95, 0.5, 0.26), smoothstep(0.04, 0.95, l));
      vec3 o = mix(duo, c, 0.62) * 0.62;   // más color real: se ve a la gente y el local
      o /= 1.0 + l * 0.5;
      float v = smoothstep(1.15, 0.15, length((uv - 0.5) * vec2(1.25, 1.0)));
      return o * mix(0.22, 1.0, v);
    }
    void main(){
      float kA = 1.08 + 0.05 * sin(uTime * 0.05) + uMix * 0.1, kB = 1.14 - uMix * 0.05;
      vec2 d = uMouse * 0.012 + vec2(sin(uTime*0.03)*0.015, 0.0);
      vec3 a = texture2D(uA, cover(vUv, uAspA, kA, d), 0.4).rgb;
      vec3 b = texture2D(uB, cover(vUv, uAspB, kB, -d), 0.4).rgb;
      vec3 c = mix(grade(a, vUv), grade(b, vUv), smoothstep(0.15, 0.85, uMix));
      c *= mix(1.0, 0.7, sin(uMix * 3.14159));
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
    }`,
});
const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
bgMesh.frustumCulled = false; bgMesh.renderOrder = -1000;
scene.add(bgMesh);
function updateBackdrop(i, e, t) {
  const a = bgTex(i), b = bgTex(i + 1); bgTex(i + 2);
  const ta = a || blank, tb = b || a || blank;
  bgMat.uniforms.uA.value = ta; bgMat.uniforms.uB.value = tb;
  const asp = (tx) => { const im = tx.image; if (!im) return 1.5; const w = im.videoWidth || im.width, h = im.videoHeight || im.height; return w && h ? w / h : 1.5; };
  bgMat.uniforms.uAspA.value = asp(ta); bgMat.uniforms.uAspB.value = asp(tb);
  // solo se reproducen los vídeos visibles; en las grabaciones el reloj controlado marca el fotograma
  Object.entries(texCache).forEach(([k, c]) => {
    const v = c.video; if (!v) return;
    const on = (+k === i) || (+k === i + 1 && e > 0.01);
    if (window.__driveVideo) { v.pause(); if (on && v.duration) v.currentTime = (t * (reduceMotion ? 4 : 1)) % v.duration; }
    else if (on && v.paused) v.play().catch(() => {}); else if (!on && !v.paused) v.pause();
  });
  bgMat.uniforms.uMix.value = e; bgMat.uniforms.uTime.value = t;
  bgMat.uniforms.uScreen.value = innerWidth / innerHeight;
  bgMat.uniforms.uMouse.value.set(mouse.sx, -mouse.sy);
}
bgTex(0); bgTex(1);

const LOOK = [[1.2, 0.4, 0], [0, 0.2, 0], [0, 0.3, 0], [0, -0.6, 0], [0, 0, -6], [0, 0.2, 0], [0, 0.6, 0]].map((a) => new THREE.Vector3(...a));
const tmpPos = new THREE.Vector3(), tmpTarget = new THREE.Vector3(), tA = new THREE.Vector3(), tB = new THREE.Vector3();
const n = P.length - 1;
let tunnelDrift = 0;
function updateCamera(dt, t) {
  const tf = targetF();
  scrollF += (tf - scrollF) * Math.min(1, dt * (reduceMotion ? 20 : 2.6));
  const i = Math.min(Math.floor(scrollF), n - 1);
  const raw = Math.min(1, Math.max(0, scrollF - i));
  const e = ease(raw);
  updateBackdrop(i, e, t);
  camCurve.getPoint((i + e) / n, tmpPos);
  const travel = Math.sin(e * Math.PI);
  travelK = travel;
  tmpPos.y += travel * 1.6;
  tA.copy(P[i]).add(LOOK[i]); tB.copy(P[i + 1]).add(LOOK[i + 1]);
  tmpTarget.lerpVectors(tA, tB, e);

  // túnel del equipo: avanza con la galería horizontal
  const g = holds[4];
  if (g && scrollY > g.start && scrollY < g.end) tunnelDrift = (scrollY - g.start) / Math.max(1, g.end - g.start);
  else tunnelDrift += ((g && scrollY >= g.end ? 1 : 0) - tunnelDrift) * 0.1;
  const gw = Math.max(0, 1 - Math.abs(scrollF - 4));
  tmpPos.z -= tunnelDrift * 12 * gw; tmpTarget.z -= tunnelDrift * 12 * gw;

  mouse.sx += (mouse.x - mouse.sx) * 0.05; mouse.sy += (mouse.y - mouse.sy) * 0.05;
  camera.position.set(tmpPos.x + mouse.sx * 1.1, tmpPos.y - mouse.sy * 0.7, tmpPos.z);
  camera.lookAt(tmpTarget);
  camera.rotation.z += travel * 0.07 * (i % 2 ? 1 : -1);   // ligero alabeo

  const portrait = innerWidth < 760 || innerWidth / innerHeight < 0.9;
  const side = K[i].side + (K[i + 1].side - K[i].side) * e;
  shift.x += ((portrait ? 0 : side * 0.22) - shift.x) * 0.08;
  shift.y += ((portrait ? 0.2 : 0) - shift.y) * 0.08;
  camera.setViewOffset(innerWidth, innerHeight, shift.x * innerWidth, shift.y * innerHeight, innerWidth, innerHeight);
  camera.fov = (portrait ? 62 : 42) + travel * 9;            // efecto de velocidad entre escenas
  camera.updateProjectionMatrix();
  bloom.strength = 0.65 + travel * 0.5;
}

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  measure();
  const pt = isPortrait(); layoutFns.forEach((f) => f(pt));
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
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime * (reduceMotion ? 0.25 : 1);
  animated.forEach((fn) => fn(t));
  timeMats.forEach((m) => { m.uniforms.uTime.value = t; });
  updateCamera(dt, t);
  billboards.forEach((b) => b.quaternion.copy(camera.quaternion));
  if (window.__driveVideo) document.querySelectorAll('.hs-card video').forEach((v) => { v.pause(); if (v.duration) v.currentTime = t % v.duration; });
  composer.render();
}
{ const pt = isPortrait(); layoutFns.forEach((f) => f(pt)); }
updateCamera(1, 0);
composer.render();
window.__sceneReady = true;
window.__snap = () => { scrollF = targetF(); };
frame();
