# Código de referencia · live-3d-web

Fragmentos en JS plano para Three.js (módulos ES). Unidades: **1 = 1 mm**. Adáptalos; no son una librería cerrada.

## 1 · Geometría: SDF 2D → contorno → extrusión

```js
// --- SDF 2D (negativo = dentro) ---
const circle  = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;
const capsule = (ax, ay, bx, by, r) => (x, y) => {
  const pax = x - ax, pay = y - ay, bax = bx - ax, bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
};
const box = (cx, cy, hw, hh, r = 0) => (x, y) => {
  const qx = Math.abs(x - cx) - hw + r, qy = Math.abs(y - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
// unión suave: k = radio de fillet en mm
const smooth = (k, ...fs) => (x, y) => fs.reduce((d, f) => {
  const b = f(x, y), h = Math.max(k - Math.abs(d - b), 0) / k;
  return Math.min(d, b) - h * h * k * 0.25;
}, Infinity);
const subtract = (a, b) => (x, y) => Math.max(a(x, y), -b(x, y));

// --- marching squares → THREE.Shape[] (con agujeros) ---
// Une segmentos por identidad de arista de la rejilla (exacto, sin claves de coma flotante).
function traceLoops(sdf, { min = [-40, -40], max = [40, 40], step = 0.1 } = {}) {
  const nx = Math.ceil((max[0] - min[0]) / step), ny = Math.ceil((max[1] - min[1]) / step);
  const W = nx + 1, v = new Float32Array(W * (ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const d = sdf(min[0] + i * step, min[1] + j * step);
    v[j * W + i] = d === 0 ? 1e-9 : d;                       // evita contornos que pasan justo por un vértice
  }
  const V = (i, j) => v[j * W + i];
  const edgePoint = (i0, j0, i1, j1) => {
    const a = V(i0, j0), b = V(i1, j1), t = a / (a - b);
    return new THREE.Vector2(min[0] + (i0 + (i1 - i0) * t) * step, min[1] + (j0 + (j1 - j0) * t) * step);
  };
  const next = new Map(), pts = new Map();
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    // aristas de la celda: 0 abajo, 1 derecha, 2 arriba, 3 izquierda
    const E = [['h', i, j, i + 1, j], ['v', i + 1, j, i + 1, j + 1], ['h', i, j + 1, i + 1, j + 1], ['v', i, j, i, j + 1]];
    const id = k => E[k][0] + E[k][1] + ',' + E[k][2];
    const idx = (V(i, j) < 0) | ((V(i + 1, j) < 0) << 1) | ((V(i + 1, j + 1) < 0) << 2) | ((V(i, j + 1) < 0) << 3);
    // segmentos orientados con el interior a la izquierda → exteriores antihorarios, agujeros horarios
    const T = { 1:[[0,3]],2:[[1,0]],3:[[1,3]],4:[[2,1]],5:[[0,1],[2,3]],6:[[2,0]],7:[[2,3]],
                8:[[3,2]],9:[[0,2]],10:[[1,2],[3,0]],11:[[1,2]],12:[[3,1]],13:[[0,1]],14:[[3,0]] }[idx];
    if (!T) continue;
    for (const [a, b] of T) {
      for (const k of [a, b]) if (!pts.has(id(k))) pts.set(id(k), edgePoint(...E[k].slice(1)));
      next.set(id(a), id(b));
    }
  }
  const loops = [];
  while (next.size) {
    let k = next.keys().next().value; const loop = [];
    while (next.has(k)) { loop.push(pts.get(k)); const n = next.get(k); next.delete(k); k = n; }
    if (loop.length > 2) loops.push(loop);
  }
  const area = l => l.reduce((s, p, i) => s + p.x * l[(i + 1) % l.length].y - l[(i + 1) % l.length].x * p.y, 0) / 2;
  const outers = loops.filter(l => area(l) > 0).map(l => new THREE.Shape(l));
  for (const l of loops.filter(l => area(l) < 0)) {
    const host = outers.find(s => pointInPoly(l[0], s.getPoints())) || outers[0];
    host?.holes.push(new THREE.Path(l));
  }
  return outers;
}
function pointInPoly(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

// --- receta ---
const plate = smooth(1.2, circle(0, 0, 3), capsule(0, 0, 12, 4, 1.1), circle(12, 4, 2));
const geo = new THREE.ExtrudeGeometry(traceLoops(plate, { min: [-5, -5], max: [16, 8], step: 0.05 }), {
  depth: 0.8, curveSegments: 1, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3,
});
geo.computeVertexNormals();
const mesh = new THREE.Mesh(geo, [satin, polished]); // grupo 0 = tapas, grupo 1 = laterales + bisel
```

Piezas de revolución: `new THREE.LatheGeometry(points, 96)` con el perfil **en sentido antihorario** (si sale del revés, invierte el array, no uses `DoubleSide`).

## 2 · Materiales y texturas anisotrópicas generadas

```js
// anisotropyMap: RG = dirección (codificada 0..1), B = intensidad
function directionTexture(kind = 'circular', size = 512) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size - 0.5, v = y / size - 0.5;
    let a = kind === 'circular' ? Math.atan2(v, u) + Math.PI / 2   // anillos (torneado)
          : kind === 'radial'   ? Math.atan2(v, u)                 // rayos
          : 0;                                                     // 'striped': cepillado lineal
    const i = (y * size + x) * 4;
    data[i] = (Math.cos(a) * 0.5 + 0.5) * 255;
    data[i + 1] = (Math.sin(a) * 0.5 + 0.5) * 255;
    data[i + 2] = 255; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true;
  return t;
}
const satin = new THREE.MeshPhysicalMaterial({
  color: '#a6a29c', metalness: 1, roughness: 0.3, anisotropy: 0.8, anisotropyMap: directionTexture('circular'),
});
const polished = new THREE.MeshPhysicalMaterial({ color: '#c9c5be', metalness: 1, roughness: 0.06 });
const heatTint = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.2, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [200, 600] });
const lacquer  = new THREE.MeshPhysicalMaterial({ color: '#7a0a0a', metalness: 0, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.03 });
// cristal: solo refleja el entorno, aditivo encima (bug 03)
const glass = new THREE.MeshPhysicalMaterial({
  color: '#000', metalness: 0, roughness: 0.02, envMapIntensity: 1.2,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
});
```
Las coordenadas UV de `ExtrudeGeometry` van en mm: escala la textura con `map.repeat` según el tamaño de la pieza.

## 3 · Estudio PMREM

```js
function buildStudio() {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color('#050505');               // habitación oscura
  const emit = (i) => new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(i), side: THREE.DoubleSide });
  const panel = (w, h, intensity, [x, y, z]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), emit(intensity));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); studio.add(m); return m;
  };
  panel(22, 14, 3.2, [-22, 20, 20]);   // softbox clave, fuera de eje
  panel(2.4, 34, 7, [30, 4, 12]);      // tira: línea de borde
  panel(2.4, 34, 5, [-30, 2, -14]);    // segunda tira
  return studio;
}
const pmrem = new THREE.PMREMGenerator(renderer);
const studio = buildStudio();
scene.environment = pmrem.fromScene(studio, 0.02).texture;

// cursor → rotación del entorno
// r162+: scene.environmentRotation.set(my * .45, -mx * .8, 0)
// r160 (este repo): rota `studio` y vuelve a hornear con throttle (≤ 15 Hz), o rota el grupo del objeto
// y compensa con la cámara. Recomendado: actualizar vendor/three a ≥ 0.162.
```
Nada de `DirectionalLight`/`PointLight` que afecten al cristal; si hacen falta para sombras, ponlas en una `layer` que el cristal no vea.

## 4 · Cues de scroll con encuadre por tamaño

```js
const cues = [
  { id: 'hero',    at: 0,    shot: { frame: 52, polar: 14, azimuth: 0,   offsetX: .17, explode: 0, timeScale: 1 } },
  { id: 'close',   at: .4,   shot: { frame: 12, polar: 30, azimuth: 20,  offsetX: 0,   explode: 0, timeScale: 1 / 12 } },
  { id: 'apart',   at: .62,  shot: { frame: 80, polar: 60, azimuth: 35,  offsetX: 0,   explode: 1, timeScale: 1 } },
  { id: 'around',  at: .8,   shot: { frame: 80, polar: 55, azimuth: 200, offsetX: 0,   explode: 1, timeScale: 1 } },
  { id: 'outro',   at: 1,    shot: { frame: 60, polar: 20, azimuth: 360, offsetX: 0,   explode: 0, timeScale: 1 } },
];
// mejor: `at` calculado desde el offsetTop de cada <section data-cue="id">
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function sample(p) {
  let i = cues.findIndex(c => c.at > p); if (i <= 0) i = i === 0 ? 1 : cues.length - 1;
  const a = cues[i - 1], b = cues[i], t = ease(THREE.MathUtils.clamp((p - a.at) / (b.at - a.at), 0, 1));
  const out = {}; for (const k in a.shot) out[k] = a.shot[k] + (b.shot[k] - a.shot[k]) * t; return out;
}
// "que quepan N mm": distancia desde FOV y aspect
function distanceFor(frameMM, cam) {
  const vFov = THREE.MathUtils.degToRad(cam.fov);
  const fitH = frameMM / 2 / Math.tan(vFov / 2);
  const fitW = frameMM / 2 / (Math.tan(vFov / 2) * cam.aspect);
  return Math.max(fitH, fitW);
}
const cur = { ...cues[0].shot };
function updateCamera(dt) {
  const p = scrollY / (document.documentElement.scrollHeight - innerHeight);
  const target = sample(p);
  const k = 1 - Math.exp(-dt * 6);                         // damping independiente del fps
  for (const key in target) cur[key] += (target[key] - cur[key]) * k;
  const d = distanceFor(cur.frame, camera);
  const pol = THREE.MathUtils.degToRad(90 - cur.polar), az = THREE.MathUtils.degToRad(cur.azimuth);
  camera.position.setFromSphericalCoords(d, pol, az);
  camera.lookAt(0, 0, 0);
  camera.setViewOffset(innerWidth, innerHeight, -cur.offsetX * innerWidth, 0, innerWidth, innerHeight); // desplaza el objeto en pantalla
}
```

## 5 · Explode, etiquetas, blueprint

```js
// parts: [{ obj, base: Vector3, lift: Vector3, order: 0..1, label }]
function explode(e) {
  for (const p of parts) {
    const delay = (1 - p.order) * .42;
    const t = ease(THREE.MathUtils.clamp((e - delay) / .58, 0, 1));
    p.obj.position.copy(p.base).addScaledVector(p.lift, t);
  }
}
// etiquetas en dos columnas con líneas guía (SVG overlay)
function layoutLabels() {
  const v = new THREE.Vector3(), cols = { L: [], R: [] };
  for (const p of parts) {
    p.obj.getWorldPosition(v).project(camera);
    const x = (v.x * .5 + .5) * innerWidth, y = (-v.y * .5 + .5) * innerHeight;
    (x < innerWidth / 2 ? cols.L : cols.R).push({ p, x, y });
  }
  for (const [side, list] of Object.entries(cols)) {
    list.sort((a, b) => a.y - b.y);
    let minY = 80;
    for (const it of list) {                         // separación mínima, sin solapes
      it.ly = Math.max(it.y, minY); minY = it.ly + 44;
      it.lx = side === 'L' ? 48 : innerWidth - 48;
      // posiciona it.p.labelEl en (lx, ly) y dibuja <line> de (x,y) a (lx,ly)
    }
  }
}
// blueprint: aristas de toda la escena
function makeBlueprint(root) {
  const lineMat = new THREE.LineBasicMaterial({ color: '#e8dcc0', transparent: true, opacity: .8 });
  root.traverse(o => { if (o.isMesh) {
    o.userData.edges = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 20), lineMat);
    o.userData.edges.visible = false; o.add(o.userData.edges);
  }});
}
const setBlueprint = on => root.traverse(o => { if (o.isMesh) {
  o.material.visible = !on;                       // (si es array, recorre cada material)
  if (o.userData.edges) o.userData.edges.visible = on;
}});
```

## 6 · Reloj único + Web Audio + mantener-para-[VERBO]

```js
let time = 0, lastBeat = -1;
const BPM = 90;
function tick(dt) {
  time += dt * cur.timeScale;              // cámara lenta = una multiplicación
  pose(time);                              // TODAS las piezas leen el mismo reloj
  const beat = Math.floor(time * BPM / 60);
  if (beat !== lastBeat) { lastBeat = beat; sound.tick(); }
}

const sound = {
  ctx: null,
  unlock() { this.ctx ??= new AudioContext(); this.ctx.resume(); },
  noise(dur = .03, freq = 3200, q = 8, gain = .25) {          // clic/toque = ruido filtrado
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime;
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(f).connect(g).connect(c.destination); src.start(t);
  },
  tick() { this.noise(.02, 4200, 12, .12); },
  thunk() { this.noise(.12, 180, 1.5, .5); },
};

// mantener para [VERBO]: anillo de progreso (SVG circle, stroke-dashoffset)
function holdTo(el, ring, ms, onDone) {
  let start = 0, raf = 0; const C = 2 * Math.PI * ring.r.baseVal.value;
  ring.style.strokeDasharray = C;
  const loop = now => { const k = Math.min((now - start) / ms, 1);
    ring.style.strokeDashoffset = C * (1 - k); if (k < 1) raf = requestAnimationFrame(loop); else onDone(); };
  el.addEventListener('pointerdown', async () => {
    sound.unlock();                                                 // el gesto desbloquea audio…
    if (typeof DeviceOrientationEvent?.requestPermission === 'function')
      try { await DeviceOrientationEvent.requestPermission(); } catch {}   // …y la inclinación en iOS
    start = performance.now(); raf = requestAnimationFrame(loop);
  });
  const cancel = () => { cancelAnimationFrame(raf); ring.style.strokeDashoffset = C; };
  el.addEventListener('pointerup', cancel); el.addEventListener('pointerleave', cancel);
}
```

## 7 · Post, calidad adaptativa, sin tirones

```js
import { EffectComposer } from './vendor/three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from './vendor/three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from './vendor/three/addons/postprocessing/OutputPass.js';

const isPhone = matchMedia('(pointer: coarse)').matches;
let pr = Math.min(devicePixelRatio, isPhone ? 1.75 : 2);
renderer.setPixelRatio(pr);
renderer.toneMapping = THREE.ACESFilmicToneMapping;     // aplicado en OutputPass
renderer.toneMappingExposure = 1;

const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }); // MSAA HDR
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.4, 0.92); // umbral alto: solo destellos
composer.addPass(bloom);
composer.addPass(new OutputPass());                    // ACES + sRGB
const grain = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmount: { value: 0.035 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uAmount; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime) * 43758.5453); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv); c.rgb += (h(vUv * 1000.) - .5) * uAmount; gl_FragColor = c; }`,
});
composer.addPass(grain);                                // grano después del tone mapping

// calidad adaptativa: < 40 fps → baja resolución → luego apaga bloom
let frames = 0, acc = 0;
function adapt(dt) {
  frames++; acc += dt; if (acc < 2) return;
  const fps = frames / acc; frames = acc = 0;
  if (fps < 40) {
    if (pr > 1) { pr = Math.max(1, pr - .25); renderer.setPixelRatio(pr); composer.setPixelRatio(pr); }
    else if (bloom.enabled) bloom.enabled = false;
  }
}

// sin tirones: compila todo detrás del loader
await renderer.compileAsync(scene, camera);
document.body.classList.add('ready');
(window.requestIdleCallback || setTimeout)(() => buildHeavyExtras());
```

## 8 · Revelados de texto desde el scroll (bug 04)

```js
const reveals = [...document.querySelectorAll('[data-reveal]')];
function updateReveals() {
  for (const el of reveals) {
    const r = el.getBoundingClientRect();
    const k = THREE.MathUtils.clamp((innerHeight * .9 - r.top) / (innerHeight * .35), 0, 1);
    el.style.setProperty('--k', k);   // CSS: opacity: var(--k); transform: translateY(calc((1 - var(--k)) * 24px));
  }
}
// llamar dentro del mismo rAF que el render, no con IntersectionObserver
```

## 9 · Verificación

- Playwright (preinstalado): recorre cada `section`, `scrollIntoView`, espera unos frames y captura. Revisa encuadre, legibilidad, etiquetas, sticky.
- Mide el peso: `du -ch` de HTML+JS+CSS+fuentes (sin contar `vendor/three` si se sirve tree-shaken; con él completo, avisa del total).
- El movimiento y los fps **no** se juzgan en headless (~1 fps): pide al usuario que lo pruebe en un móvil real.
