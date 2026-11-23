// Grandgym · motor 3D en vivo (skill live-3d-web)
// Un objeto: la barra olímpica cargada. Un verbo: mantener para levantar.
// Todo en milímetros reales (1 unidad = 1 mm). Cero vídeos, cero modelos descargados.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const $ = (s) => document.querySelector(s);
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const DEBUG = new URLSearchParams(location.search).has('debug');
const SNAP = new URLSearchParams(location.search).has('snap'); // capturas headless (≈1 fps): sin suavizado
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone = matchMedia('(pointer: coarse)').matches;

/* ════════════════════════════════════════════════════════════════════════════
   01 · EL OBJETO — barra olímpica de 20 kg cargada a 130 kg
   pieza                    medida (mm)              material (cara / canto)
   barra                    Ø28 × 2200, 20 kg        acero satinado + moleteado
   topes interiores (×2)    Ø74 × 30                 cromo pulido
   manguitos (×2)           Ø50 × 415, giratorios    cromo pulido
   bumper 20 kg (×2)        Ø450 × 53                caucho azul / buje de acero
   bumper 15 kg (×2)        Ø450 × 41                caucho celeste / buje
   bumper 10 kg (×2)        Ø450 × 30                caucho blanco hielo / buje
   disco acero 5 kg (×2)    Ø230 × 18                acero satinado / pulido
   disco acero 2,5 kg (×2)  Ø190 × 14                acero satinado / pulido
   collarín (×2)            Ø90 × 50, 2,5 kg         aluminio azul lacado / palanca
   ════════════════════════════════════════════════════════════════════════════ */
const D = { shaftR: 14, shaftHalf: 655, stopX: 670, sleeveR: 25, sleeveA: 685, end: 1100, plateR: 225 };
const BEVEL = 0.5; // la regla de 0,05 mm es para objetos de ~50 mm; esta barra mide 2200 mm

/* ---------- SDF 2D + marching squares + extrusión (paso 03) ---------- */
const circle = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;
const capsule = (ax, ay, bx, by, r) => (x, y) => {
  const pax = x - ax, pay = y - ay, bax = bx - ax, bay = by - ay;
  const h = clamp01((pax * bax + pay * bay) / (bax * bax + bay * bay));
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
};
const smooth = (k, ...fs) => (x, y) => fs.reduce((d, f) => {
  const b = f(x, y), h = Math.max(k - Math.abs(d - b), 0) / k;
  return Math.min(d, b) - h * h * k * 0.25;
}, Infinity);
const subtract = (a, ...bs) => (x, y) => bs.reduce((d, b) => Math.max(d, -b(x, y)), a(x, y));

function traceLoops(sdf, min, max, step) {
  const nx = Math.ceil((max[0] - min[0]) / step), ny = Math.ceil((max[1] - min[1]) / step), W = nx + 1;
  const v = new Float32Array(W * (ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const d = sdf(min[0] + i * step, min[1] + j * step); v[j * W + i] = d === 0 ? 1e-9 : d;
  }
  const V = (i, j) => v[j * W + i];
  const ep = (i0, j0, i1, j1) => { const a = V(i0, j0), t = a / (a - V(i1, j1)); return new THREE.Vector2(min[0] + (i0 + (i1 - i0) * t) * step, min[1] + (j0 + (j1 - j0) * t) * step); };
  const T = { 1: [[0, 3]], 2: [[1, 0]], 3: [[1, 3]], 4: [[2, 1]], 5: [[0, 1], [2, 3]], 6: [[2, 0]], 7: [[2, 3]], 8: [[3, 2]], 9: [[0, 2]], 10: [[1, 2], [3, 0]], 11: [[1, 2]], 12: [[3, 1]], 13: [[0, 1]], 14: [[3, 0]] };
  const next = new Map(), pts = new Map();
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const idx = (V(i, j) < 0) | ((V(i + 1, j) < 0) << 1) | ((V(i + 1, j + 1) < 0) << 2) | ((V(i, j + 1) < 0) << 3);
    if (!T[idx]) continue;
    const E = [['h', i, j, i + 1, j], ['v', i + 1, j, i + 1, j + 1], ['h', i, j + 1, i + 1, j + 1], ['v', i, j, i, j + 1]];
    const id = (k) => E[k][0] + E[k][1] + ',' + E[k][2];
    for (const [a, b] of T[idx]) {
      for (const k of [a, b]) if (!pts.has(id(k))) pts.set(id(k), ep(E[k][1], E[k][2], E[k][3], E[k][4]));
      next.set(id(a), id(b));
    }
  }
  const loops = [];
  while (next.size) {
    let k = next.keys().next().value; const loop = [];
    while (next.has(k)) { loop.push(pts.get(k)); const n = next.get(k); next.delete(k); k = n; }
    if (loop.length > 2) loops.push(loop);
  }
  const area = (l) => l.reduce((s, p, i) => s + p.x * l[(i + 1) % l.length].y - l[(i + 1) % l.length].x * p.y, 0) / 2;
  const inPoly = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if (a.y > p.y !== b.y > p.y && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; };
  const outers = loops.filter((l) => area(l) > 0).map((l) => ({ l, s: new THREE.Shape(l) }));
  for (const l of loops.filter((l) => area(l) < 0)) (outers.find((o) => inPoly(l[0], o.l)) || outers[0])?.s.holes.push(new THREE.Path(l));
  return outers.map((o) => o.s);
}
/** Plancha extruida, centrada en su grosor y con el grosor en X (de cara al eje de la barra). Grupo 0 = caras, 1 = cantos. */
function plate(sdf, R, depth, step, bevel = BEVEL) {
  const g = new THREE.ExtrudeGeometry(traceLoops(sdf, [-R - 3, -R - 3], [R + 3, R + 3], step), {
    depth: depth - bevel * 2, curveSegments: 1, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3,
  });
  g.translate(0, 0, -(depth - bevel * 2) / 2);
  return toCreasedNormals(g, THREE.MathUtils.degToRad(35)).rotateY(Math.PI / 2);
}
/** Perfil de torno dibujado en sentido antihorario (radio, eje) → normales hacia fuera. Eje final = X. */
const lathe = (pts, seg = 96) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg).rotateZ(-Math.PI / 2);

/* ---------- texturas generadas al arrancar (paso 04) ---------- */
function directionTexture(kind, size = 512) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size - 0.5, v = y / size - 0.5, j = (Math.random() - 0.5) * 0.08;
    const a = kind === 'circular' ? Math.atan2(v, u) + Math.PI / 2 + j : kind === 'radial' ? Math.atan2(v, u) + j : j;
    const i = (y * size + x) * 4;
    data[i] = (Math.cos(a) * 0.5 + 0.5) * 255; data[i + 1] = (Math.sin(a) * 0.5 + 0.5) * 255; data[i + 2] = 200 + Math.random() * 55; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}
const fitted = (tex, sizeMM, centred = true) => { const t = tex.clone(); t.repeat.set(1 / sizeMM, 1 / sizeMM); if (centred) t.offset.set(0.5, 0.5); t.needsUpdate = true; return t; };

/** Moleteado de la barra: bump map generado (paso 1,6 mm), solo en las zonas de agarre. */
function knurlTexture() {
  const W = 128, H = 4096, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, W, H);
  const mmPerPx = 1310 / H; // v recorre los 1310 mm del eje
  const knurled = (mm) => { const a = Math.abs(mm - 655); return (a < 60) || (a > 85 && a < 560); };
  const pitch = 1.6 / mmPerPx, circ = W / 16; // 16 picos alrededor
  for (let y = 0; y < H; y++) {
    if (!knurled(y * mmPerPx)) continue;
    for (let x = 0; x < W; x++) {
      const a = Math.abs(((y / pitch + x / circ) % 1) - 0.5), b = Math.abs(((y / pitch - x / circ) % 1 + 1) % 1 - 0.5);
      const h = Math.min(a, b) * 2; g.fillStyle = `rgb(${h * 255 | 0},${h * 255 | 0},${h * 255 | 0})`; g.fillRect(x, y, 1, 1);
    }
  }
  // marcas de agarre (anillos lisos a 455 mm del centro)
  g.fillStyle = '#808080';
  for (const mm of [655 - 455, 655 + 455]) g.fillRect(0, mm / mmPerPx - 2, W, 4);
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
/** Rotulación del disco (texto en arco) para el anillo frontal. */
function plateDecal(kg, ink) {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.translate(S / 2, S / 2);
  // arco superior: letras hacia fuera, de izquierda a derecha · arco inferior: letras de pie, también legibles
  const write = (txt, r, size, bottom, weight = 800) => {
    g.font = `${weight} ${size}px Unbounded, Manrope, sans-serif`; g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    const chars = [...txt], widths = chars.map((ch) => g.measureText(ch).width + size * 0.12);
    const total = widths.reduce((s, w) => s + w, 0) / r;
    let a = bottom ? total / 2 : -total / 2;
    chars.forEach((ch, i) => {
      const w = widths[i] / r; g.save();
      if (bottom) { g.rotate(a - w / 2); g.translate(0, r); a -= w; } else { g.rotate(a + w / 2); g.translate(0, -r); a += w; }
      g.fillText(ch, 0, 0); g.restore();
    });
  };
  write('GRANDGYM', 395, 64, false);
  write(`${kg} KG`, 395, 72, true, 900);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/* ---------- materiales: dos por pieza, cara y canto (paso 04) ---------- */
function materials() {
  const circular = directionTexture('circular'), striped = directionTexture('striped');
  const rubber = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.62, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.5, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color('#9fd8ff') });
  return {
    shaft: new THREE.MeshPhysicalMaterial({ color: '#c9ccd1', metalness: 1, roughness: 0.32, anisotropy: 0.7, anisotropyRotation: Math.PI / 2, bumpMap: knurlTexture(), bumpScale: 2.2 }),
    chrome: new THREE.MeshPhysicalMaterial({ color: '#e6e9ee', metalness: 1, roughness: 0.06 }),
    chromeSatin: new THREE.MeshPhysicalMaterial({ color: '#d4d8de', metalness: 1, roughness: 0.22, anisotropy: 0.6 }),
    hubFace: new THREE.MeshPhysicalMaterial({ color: '#b8bcc2', metalness: 1, roughness: 0.3, anisotropy: 0.85, anisotropyMap: fitted(circular, 220) }),
    steelFace5: new THREE.MeshPhysicalMaterial({ color: '#aeb3ba', metalness: 1, roughness: 0.3, anisotropy: 0.85, anisotropyMap: fitted(circular, 236) }),
    steelFace25: new THREE.MeshPhysicalMaterial({ color: '#aeb3ba', metalness: 1, roughness: 0.3, anisotropy: 0.85, anisotropyMap: fitted(circular, 196) }),
    steelEdge: new THREE.MeshPhysicalMaterial({ color: '#dde1e6', metalness: 1, roughness: 0.07 }),
    r20: rubber('#0b5fae'), r15: rubber('#3d9be0'), r10: rubber('#dfeaf3'),
    anodized: new THREE.MeshPhysicalMaterial({ color: '#1a6fc2', metalness: 0.9, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.15, iridescence: 0.25, iridescenceIOR: 1.5 }),
    lever: new THREE.MeshPhysicalMaterial({ color: '#0a0f17', metalness: 0.2, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.05, anisotropy: 0.5, anisotropyMap: fitted(striped, 60, false) }),
  };
}

/* ---------- construcción de la barra ---------- */
function buildBarbell(M) {
  const rig = new THREE.Group(); // altura de levantamiento
  const parts = [];
  const add = (p, parent) => { parent.add(p.obj); p.base = p.obj.position.clone(); parts.push(p); };

  // barra (eje) — deformable para el latigazo
  const shaftGeo = new THREE.CylinderGeometry(D.shaftR, D.shaftR, D.shaftHalf * 2, 48, 160, true).rotateZ(Math.PI / 2);
  const shaft = new THREE.Mesh(shaftGeo, M.shaft);
  shaft.userData.rest = Float32Array.from(shaftGeo.attributes.position.array);
  add({ id: 'shaft', obj: shaft, lift: new THREE.Vector3(0, 0, 0), order: 0.05, label: 'Barra olímpica 20 kg', spec: 'Ø 28 × 2200 mm · moleteado 1,6 mm', anchor: new THREE.Vector3(-300, 0, 0) }, rig);

  const sides = [];
  for (const s of [-1, 1]) {
    // tope interior (fijo a la barra)
    const stop = new THREE.Mesh(lathe([[0, -15], [30, -15], [36, -13], [37, -9], [37, 9], [36, 13], [30, 15], [0, 15]], 64), M.chrome);
    stop.position.x = s * D.stopX;
    const bend = new THREE.Group(); // recibe la flexión
    const spin = new THREE.Group(); // el manguito gira sobre rodamientos
    bend.add(spin); rig.add(bend); bend.add(stop);
    // manguito
    const L = D.end - D.sleeveA;
    const sleeve = new THREE.Mesh(lathe([[0, 0], [22, 0], [25, 3], [25, L - 8], [24, L - 4], [21, L - 1], [12, L], [0, L]].map(([r, y]) => [r, y]), 72), M.chrome);
    if (s < 0) sleeve.scale.x = -1;
    sleeve.position.x = s * D.sleeveA;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(25.2, 0.6, 8, 72).rotateY(Math.PI / 2), M.steelEdge);
    ring.position.x = s * (D.sleeveA + 40);
    const sleeveG = new THREE.Group(); sleeveG.add(sleeve, ring);
    add({ id: 'sleeve' + s, obj: sleeveG, lift: new THREE.Vector3(s * 60, 0, 0), order: 0.25, label: 'Manguito giratorio', spec: 'Ø 50 × 415 mm · rodamientos', anchor: new THREE.Vector3(s * (D.end - 30), 0, 0) }, spin);

    // discos, de dentro a fuera
    const loads = [
      { kg: 20, w: 53, mat: M.r20, ink: '#d8ecff', order: 0.45 },
      { kg: 15, w: 41, mat: M.r15, ink: '#0a2a4a', order: 0.55 },
      { kg: 10, w: 30, mat: M.r10, ink: '#0b5fae', order: 0.65 },
    ];
    let x = D.sleeveA + 2;
    for (const p of loads) {
      const g = new THREE.Group();
      const R = D.plateR, w = p.w, rIn = 104;
      const prof = [[rIn, -w / 2], [rIn + 12, -w / 2 + 2.5], [R - 32, -w / 2 + 2.5], [R - 26, -w / 2], [R - 5, -w / 2], [R, -w / 2 + 5], [R, w / 2 - 5], [R - 5, w / 2], [R - 26, w / 2], [R - 32, w / 2 - 2.5], [rIn + 12, w / 2 - 2.5], [rIn, w / 2]];
      const body = new THREE.Mesh(lathe(prof, 128), p.mat);
      const hubSDF = subtract(smooth(3, circle(0, 0, 105)), circle(0, 0, 25.6), ...Array.from({ length: 6 }, (_, i) => circle(Math.cos(i * Math.PI / 3) * 78, Math.sin(i * Math.PI / 3) * 78, 6)));
      const hub = new THREE.Mesh(plate(hubSDF, 105, w + 1, 0.5), [M.hubFace, M.steelEdge]);
      // bolts
      const boltGeo = new THREE.CylinderGeometry(4.2, 4.2, w + 3, 16).rotateZ(Math.PI / 2);
      for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(boltGeo, M.chrome); b.position.set(0, Math.sin(i * Math.PI / 3) * 78, Math.cos(i * Math.PI / 3) * 78); g.add(b); }
      const decal = new THREE.Mesh(new THREE.RingGeometry(150, 218, 128, 1).rotateY(Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: plateDecal(p.kg, p.ink), transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      // RingGeometry UVs son planos: encaja el lienzo de 1024 en el radio 230
      const uv = decal.geometry.attributes.uv, pos = decal.geometry.attributes.position;
      // el decal izquierdo se gira 180° para mirar hacia fuera; así ambos se leen bien
      for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 - pos.getZ(i) / 460, 0.5 + pos.getY(i) / 460);
      decal.position.x = s * (w / 2 - 2.3);
      if (s < 0) decal.rotation.y = Math.PI;
      g.add(body, hub, decal);
      g.position.x = s * (x + w / 2);
      add({ id: `p${p.kg}${s}`, obj: g, lift: new THREE.Vector3(s * (90 + (p.order - 0.45) * 900), 0, 0), order: p.order, label: `Disco bumper ${p.kg} kg`, spec: `Ø 450 × ${w} mm · buje de acero`, anchor: new THREE.Vector3(0, 170, 0) }, spin);
      x += w + 1;
    }
    // discos de acero (SDF con asas)
    for (const p of [{ kg: 5, R: 115, w: 18, face: M.steelFace5, order: 0.75 }, { kg: 2.5, R: 95, w: 14, face: M.steelFace25, order: 0.85 }]) {
      const grips = [0, 1, 2].map((i) => { const a = i * 2 * Math.PI / 3 + Math.PI / 2, r = p.R * 0.64, da = 0.32; return capsule(Math.cos(a - da) * r, Math.sin(a - da) * r, Math.cos(a + da) * r, Math.sin(a + da) * r, p.R * 0.09); });
      const sdf = subtract(circle(0, 0, p.R), circle(0, 0, 25.6), ...grips);
      const m = new THREE.Mesh(plate(sdf, p.R, p.w, 0.4), [p.face, M.steelEdge]);
      m.position.x = s * (x + p.w / 2);
      add({ id: `s${p.kg}${s}`, obj: m, lift: new THREE.Vector3(s * (90 + (p.order - 0.45) * 900), 0, 0), order: p.order, label: `Disco de acero ${String(p.kg).replace('.', ',')} kg`, spec: `Ø ${p.R * 2} × ${p.w} mm · asas`, anchor: new THREE.Vector3(0, p.R * 0.8, 0) }, spin);
      x += p.w + 1;
    }
    // collarín
    const col = new THREE.Group();
    const body = new THREE.Mesh(lathe([[25.5, -25], [40, -25], [45, -21], [45, 21], [40, 25], [25.5, 25]], 72), M.anodized);
    const leverSDF = smooth(4, circle(0, 0, 14), capsule(0, 0, 0, 70, 7), circle(0, 70, 10));
    const lever = new THREE.Mesh(plate(subtract(leverSDF, circle(0, 0, 4)), 82, 10, 0.25), [M.lever, M.chrome]);
    lever.position.set(s * 14, 38, 0);
    lever.rotation.x = 0.2;
    col.add(body, lever);
    col.position.x = s * (x + 26);
    add({ id: 'col' + s, obj: col, lift: new THREE.Vector3(s * 420, 0, 0), order: 1, label: 'Collarín de bloqueo', spec: 'Ø 90 × 50 mm · 2,5 kg', anchor: new THREE.Vector3(0, 45, 0) }, spin);
    sides.push({ s, bend, spin, xMid: (D.sleeveA + D.end) / 2 });
  }
  // sombra de contacto (horneada, sin luces)
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), grd = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,4,12,.9)'); grd.addColorStop(1, 'rgba(0,4,12,0)'); g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2900, 900).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  shadow.position.y = -D.plateR + 0.5;
  rig.position.y = D.plateR;
  return { rig, parts, sides, shaft, shadow };
}

/* ---------- estudio de luz: habitación oscura, softbox fuera de eje, dos tiras (paso 05) ---------- */
function buildStudio() {
  const st = new THREE.Scene(); st.background = new THREE.Color('#02060d');
  const panel = (w, h, k, at, tint = '#ffffff') => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...at); m.lookAt(0, 0, 0); st.add(m);
  };
  panel(22, 14, 3.0, [-22, 20, 20]);            // softbox clave
  panel(2.4, 34, 2.6, [30, 4, 12]);             // tira: línea de canto
  panel(2.4, 34, 1.9, [-28, 2, -16]);           // segunda tira
  panel(12, 10, 1.1, [6, 24, -24], '#4aa6e0');  // acento azul Grandmontagne
  panel(70, 8, 0.18, [0, -18, 0], '#c1e7fe');   // rebote frío del suelo
  return st;
}

/* ---------- sonido sintetizado (paso 08) ---------- */
const sound = {
  ctx: null, out: null, buf: null, muted: false, last: 0,
  unlock() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext; this.ctx = new C();
      this.out = this.ctx.createGain(); this.out.gain.value = 0.85;
      this.out.connect(this.ctx.createDynamicsCompressor()).connect(this.ctx.destination);
      const n = this.ctx.sampleRate * 0.6; this.buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = this.buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    this.ctx.resume();
  },
  get on() { return this.ctx && this.ctx.state === 'running' && !this.muted; },
  noise(dur, f, q, gain, type = 'bandpass', delay = 0) {
    if (!this.on) return; const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.buf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(this.out); s.start(t, Math.random() * 0.5, dur + 0.05);
  },
  tone(f, dur, gain, delay = 0, type = 'sine', drop = 1) {
    if (!this.on) return; const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * drop, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.05);
  },
  /** golpe de los bumpers contra el suelo + choque metálico de los discos */
  drop(v) {
    const k = Math.min(1, v / 2600);
    this.noise(0.22, 140, 1.2, 0.25 + k * 0.5, 'lowpass'); this.tone(78, 0.3, 0.2 + k * 0.4, 0, 'sine', 0.55);
    for (const [f, d] of [[1180, 0.35], [1910, 0.28], [3120, 0.2]]) this.tone(f * (0.97 + Math.random() * 0.06), d, 0.03 + k * 0.05, 0.012);
    this.noise(0.08, 2800, 4, 0.06 + k * 0.1, 'bandpass', 0.015);
  },
  /** traqueteo de los discos en el latigazo, en el beat */
  rattle(k) { if (!this.ctx || this.ctx.currentTime - this.last < 0.05) return; this.last = this.ctx.currentTime; this.noise(0.05, 2200 + Math.random() * 1600, 6, 0.02 + k * 0.08); },
  tick() { this.noise(0.02, 4600, 10, 0.03); },
  lift(k) { this.noise(0.14, 260 + k * 900, 1, 0.015 + k * 0.04, 'lowpass'); },
};

/* ---------- guion de cámara: un cue por sección (paso 06) ----------
   frame = mm que deben caber en pantalla · polar/azimuth en grados · offsetX fracción de pantalla
   explode 0→1 · timeScale (1/12 = cámara lenta) · labels: columnas de etiquetas [desde, hasta] en fracción de ancho */
const CUES = {
  inicio:      { frame: 2250, polar: 14, azimuth: 62,  offsetX: 0.24,   explode: 0, timeScale: 1,      tx: 0,    ty: 225, tz: 0 },
  centro:      { frame: 760,  polar: 8,  azimuth: -58, offsetX: -0.2,  explode: 0, timeScale: 1,      tx: -820, ty: 225, tz: 0 },
  panatta:     { frame: 300,  polar: 10, azimuth: 62,  offsetX: 0.21,  explode: 0, timeScale: 1 / 12, tx: 1010, ty: 225, tz: 0 },
  galeria:     { frame: 3400, polar: 30, azimuth: 12,  offsetX: 0,     explode: 0, timeScale: 1,      tx: 0,    ty: 600, tz: 0 },
  actividades: { frame: 3600, polar: 62, azimuth: 90,  offsetX: 0,     explode: 0, timeScale: 1,      tx: 0,    ty: 400, tz: 0 },
  piscina:     { frame: 2900, polar: 22, azimuth: 30,  offsetX: -0.2,  explode: 1, timeScale: 1,      tx: 0,    ty: 225, tz: 0, labels: [0, 0.5] },
  horario:     { frame: 4200, polar: 18, azimuth: 160, offsetX: 0,     explode: 1, timeScale: 1,      tx: 0,    ty: 900, tz: 0 },
  precios:     { frame: 3800, polar: 16, azimuth: 300, offsetX: 0,     explode: 0, timeScale: 1,      tx: 0,    ty: 800, tz: 0 },
  estetica:    { frame: 3600, polar: 24, azimuth: 200, offsetX: 0,     explode: 0, timeScale: 1,      tx: 0,    ty: 700, tz: 0 },
  judo:        { frame: 620,  polar: 6,  azimuth: 92,  offsetX: 0.21,  explode: 0, timeScale: 1,      tx: 1000, ty: 225, tz: 0 },
  resenas:     { frame: 3600, polar: 4,  azimuth: 0,   offsetX: 0,     explode: 0, timeScale: 1,      tx: 0,    ty: 800, tz: 0 },
  contacto:    { frame: 3000, polar: 16, azimuth: 24,  offsetX: 0,     explode: 0, timeScale: 1,      tx: 0,    ty: 760, tz: 0 },
};
// en móvil vertical algunas tomas se acercan más (mframe) para que la barra no quede diminuta tras el texto
CUES.inicio.mframe = 1150; CUES.inicio.mazimuth = 48;
CUES.contacto.mframe = 1600;
for (const c of Object.values(CUES)) { c.mframe ??= c.frame * 1.15; c.mazimuth ??= c.azimuth; }
const KEYS = ['frame', 'mframe', 'mazimuth', 'polar', 'azimuth', 'offsetX', 'explode', 'timeScale', 'tx', 'ty', 'tz'];

/* fondos fotográficos reales de Grandgym, uno por sección, oscurecidos para que mande el objeto */
const BG_PHOTOS = {
  inicio: 'img/eleiko-racks.jpg', centro: 'img/sala-panorama.jpg', panatta: 'img/panatta-logo.jpg', galeria: 'img/pasillo-maquinas.jpg',
  actividades: 'img/ciclo-sala.jpg', piscina: 'img/act/fondo-piscina.jpg', horario: 'img/sala-led.jpg', precios: 'img/rack-eleiko.jpg',
  estetica: 'img/est/fondo-estetica.jpg', judo: 'img/judo/fondo-judo.jpg', resenas: 'img/cardio-azul.jpg', contacto: 'img/eleiko-zona-2.jpg',
};

/* ════════════════════════════════ ENGINE ════════════════════════════════ */
const canvas = $('#webgl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
let pr = Math.min(devicePixelRatio, phone ? 1.75 : 2);
renderer.setPixelRatio(pr);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#00122e');
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 5, 60000);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(buildStudio(), 0.02).texture;
scene.environmentIntensity = 1.45;
pmrem.dispose();

const M = materials();
const bb = buildBarbell(M);
scene.add(bb.rig, bb.shadow);

/* backdrop: foto de la sección con el tratamiento de color de marca, muy oscurecida */
const texLoader = new THREE.TextureLoader(), texCache = {};
const blank = new THREE.DataTexture(new Uint8Array([2, 14, 36, 255]), 1, 1); blank.needsUpdate = true;
const bgTex = (id) => {
  if (!id || !BG_PHOTOS[id]) return null;
  if (!texCache[id]) { texCache[id] = { tex: null }; texLoader.load(BG_PHOTOS[id], (t) => { t.colorSpace = THREE.SRGBColorSpace; texCache[id].tex = t; }); }
  return texCache[id].tex;
};
const bgMat = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false, toneMapped: false,
  uniforms: { uA: { value: blank }, uB: { value: blank }, uMix: { value: 0 }, uAspA: { value: 1.5 }, uAspB: { value: 1.5 }, uScreen: { value: 1 }, uMouse: { value: new THREE.Vector2() }, uDim: { value: 0.36 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
  fragmentShader: `
    uniform sampler2D uA, uB; uniform float uMix, uAspA, uAspB, uScreen, uDim; uniform vec2 uMouse; varying vec2 vUv;
    vec2 cover(vec2 uv, float a, float z, vec2 d){ vec2 s = uScreen > a ? vec2(1.0, a / uScreen) : vec2(uScreen / a, 1.0); return (uv - 0.5) * s / z + 0.5 + d; }
    vec3 grade(vec3 c, vec2 uv){
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      vec3 duo = mix(vec3(0.0, 0.04, 0.13), vec3(0.55, 0.8, 1.0), smoothstep(0.05, 0.95, l));
      vec3 o = mix(duo, c, 0.35) * uDim; o /= 1.0 + l * 0.6;
      float v = smoothstep(1.1, 0.2, length((uv - 0.5) * vec2(1.3, 1.0)));
      return o * mix(0.25, 1.0, v);
    }
    void main(){
      vec2 d = uMouse * 0.01;
      vec3 a = texture2D(uA, cover(vUv, uAspA, 1.08 + uMix * 0.06, d), 2.0).rgb;
      vec3 b = texture2D(uB, cover(vUv, uAspB, 1.12 - uMix * 0.04, d), 2.0).rgb;
      gl_FragColor = vec4(mix(grade(a, vUv), grade(b, vUv), smoothstep(0.15, 0.85, uMix)), 1.0);
      #include <colorspace_fragment>
    }`,
});
const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
bgMesh.frustumCulled = false; bgMesh.renderOrder = -1000;
scene.add(bgMesh);

/* post: Scene → MSAA HDR → Bloom (umbral alto) → ACES → grano (paso 09) */
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.4, 0.98);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grain = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmount: { value: 0.04 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uAmount; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(.299,.587,.114)); c.rgb += (h(gl_FragCoord.xy) - .5) * uAmount * (1. - l * .6); gl_FragColor = c; }`,
});
composer.addPass(grain);

/* ---------- etiquetas: dos columnas limpias con líneas guía (paso 07) ---------- */
const labelsEl = $('#callouts'), leadersEl = $('#leaders');
const SVGNS = 'http://www.w3.org/2000/svg';
const callouts = bb.parts.filter((p) => ['shaft', 'sleeve1', 'p201', 'p151', 'p101', 's51', 's2.51', 'col1'].includes(p.id)).map((part) => {
  const el = document.createElement('div'); el.className = 'callout'; el.innerHTML = `<b>${part.label}</b><span>${part.spec}</span>`; labelsEl.appendChild(el);
  const line = document.createElementNS(SVGNS, 'polyline'), dot = document.createElementNS(SVGNS, 'circle'); dot.setAttribute('r', '3');
  leadersEl.append(line, dot);
  return { part, el, line, dot };
});

/* ---------- modo plano: aristas en lugar de superficies ---------- */
let blueprint = false, blueprintBuilt = false;
const invisible = new THREE.MeshBasicMaterial({ visible: false });
function buildBlueprint() {
  if (blueprintBuilt) return;
  const lineMat = new THREE.LineBasicMaterial({ color: '#c1e7fe', transparent: true, opacity: 0.85 });
  const cache = new Map();
  bb.rig.traverse((o) => {
    if (!o.isMesh || o.userData.edges) return;
    if (!cache.has(o.geometry)) cache.set(o.geometry, o === bb.shaft
      ? new THREE.EdgesGeometry(new THREE.CylinderGeometry(D.shaftR, D.shaftR, D.shaftHalf * 2, 8, 1).rotateZ(Math.PI / 2), 20) // silueta de la barra
      : new THREE.EdgesGeometry(o.geometry, 24));
    const l = new THREE.LineSegments(cache.get(o.geometry), lineMat); l.visible = false;
    o.userData.edges = l; o.userData.surface = o.material; o.add(l);
  });
  blueprintBuilt = true;
}
function applyBlueprint() {
  bb.rig.traverse((o) => { if (o.isMesh && o.userData.edges) { o.material = blueprint ? invisible : o.userData.surface; o.userData.edges.visible = blueprint; } });
  bb.shadow.visible = !blueprint;
  bgMat.uniforms.uDim.value = blueprint ? 0.16 : 0.36;
}

/* ---------- estado ---------- */
const cur = { ...CUES.inicio };
let cueEls = [], cueAt = [];
let time = 0, last = performance.now();
let holding = false, holdK = 0, holdDone = false;
let liftH = 0, liftV = 0, whip = 0, whipV = 0, spinA = 0, spinW = 0.25, lastBeat = 0, prevV = 0;
const pointer = new THREE.Vector2(), pointerS = new THREE.Vector2(), tilt = new THREE.Vector2();
const v3 = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0);

function measure() {
  cueEls = [...document.querySelectorAll('[data-scene]')].filter((el) => CUES[el.id]);
  const h = innerHeight, max = Math.max(1, document.documentElement.scrollHeight - h);
  cueAt = cueEls.map((el) => {
    const top = el.getBoundingClientRect().top + scrollY;
    // la toma se mantiene mientras la sección ocupa la pantalla
    return clamp01((top + Math.min(el.offsetHeight, h * 1.4) / 2 - h / 2) / max);
  });
  if (cueAt.length) { cueAt[0] = 0; cueAt[cueAt.length - 1] = Math.max(cueAt[cueAt.length - 1], cueAt[cueAt.length - 2] + 1e-3); }
}
function sample(p) {
  const n = cueEls.length;
  let i = cueAt.findIndex((a) => a > p);
  if (i === -1) return { shot: CUES[cueEls[n - 1].id], a: cueEls[n - 1].id, b: null, t: 0 };
  if (i === 0) return { shot: CUES[cueEls[0].id], a: cueEls[0].id, b: null, t: 0 };
  const A = CUES[cueEls[i - 1].id], B = CUES[cueEls[i].id];
  const raw = clamp01((p - cueAt[i - 1]) / Math.max(1e-6, cueAt[i] - cueAt[i - 1]));
  const t = ease(clamp01((raw - 0.2) / 0.6));
  const shot = {}; for (const k of KEYS) shot[k] = A[k] + (B[k] - A[k]) * t;
  shot.labelsA = A.labels; shot.labelsB = B.labels; shot.labelsT = t;
  return { shot, a: cueEls[i - 1].id, b: cueEls[i].id, t };
}
const distanceFor = (frame) => {
  const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  return Math.max(frame / 2 / tv, frame / 2 / (tv * camera.aspect));
};

/* ---------- simulación: un reloj mueve todo (paso 08) ---------- */
function simulate(dt, sdt) {
  // mantener para levantar
  if (holding && !holdDone) holdK = Math.min(1, holdK + dt / 1.4);
  else if (!holding) holdK = Math.max(0, holdK - dt * 3);
  if (holdK >= 1 && !holdDone) { holdDone = true; onLifted(); }
  const target = 700 * ease(holdK);
  const h = 1 / 240; let acc = sdt;
  while (acc > 1e-6) {
    const step = Math.min(h, acc); acc -= step;
    let a;
    if (holding) a = (target - liftH) * 60 - liftV * 13; // tirón controlado
    else a = -9810;                                     // al soltar: caída libre sobre los bumpers
    liftV += a * step; liftH += liftV * step;
    if (liftH < 0) {
      liftH = 0;
      if (liftV < -120) {
        const v = -liftV; sound.drop(v); spinW += (Math.random() - 0.5) * v * 0.002;
        liftV = v * 0.3; // rebote del bumper
      } else liftV = 0;
    }
    // latigazo: oscilador amortiguado forzado por la aceleración de la barra (~4 Hz)
    const accel = (liftV - prevV) / step; prevV = liftV;
    whipV += (-631 * whip - 2.2 * whipV - THREE.MathUtils.clamp(accel, -32000, 32000) * 3.2) * step;
    whip += whipV * step;
  }
  spinW += (0.25 - spinW) * (1 - Math.exp(-sdt * 0.4));
  spinA += spinW * sdt;
  const beat = Math.floor(spinA / (Math.PI / 4)); // un clic de rodamiento cada 45°
  if (beat !== lastBeat) { lastBeat = beat; if (Math.abs(whip) > 2) sound.rattle(Math.min(1, Math.abs(whip) / 40)); else if (holding) sound.tick(); }
  if (holding && holdK < 1 && Math.random() < dt * 7) sound.lift(holdK);
}
function onLifted() {
  const el = $('#liftResult'); if (!el) return;
  el.hidden = false; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}

/* aplica pose: altura, flexión de la barra y de los manguitos, giro */
function pose() {
  bb.rig.position.y = D.plateR + liftH;
  const bend = (x) => whip * (x / D.end) ** 2;
  const slope = (x) => 2 * whip * x / (D.end * D.end);
  const g = bb.shaft.geometry, pos = g.attributes.position, rest = bb.shaft.userData.rest;
  if (Math.abs(whip) > 0.02 || bb.shaft.userData.bent) {
    for (let i = 0; i < pos.count; i++) pos.setY(i, rest[i * 3 + 1] + bend(rest[i * 3]));
    pos.needsUpdate = true; g.computeBoundingSphere();
    bb.shaft.userData.bent = Math.abs(whip) > 0.02;
  }
  for (const s of bb.sides) {
    const xm = s.s * s.xMid;
    s.bend.position.y = bend(xm);
    s.bend.rotation.z = Math.atan(slope(xm));
    s.spin.rotation.x = spinA * s.s;
  }
  bb.shadow.material.opacity = 1 - Math.min(0.7, liftH / 900) - cur.explode * 0.4;
  bb.shadow.scale.setScalar(1 + liftH / 1400);
}
function explode(e) {
  for (const p of bb.parts) {
    const t = ease(clamp01((e - (1 - p.order) * 0.42) / 0.58));
    p.obj.position.copy(p.base).addScaledVector(p.lift, t);
  }
}

function layoutCallouts(vis, area) {
  if (innerWidth < 760) vis = 0; // en móvil los paneles ocupan la pantalla: sin etiquetas
  labelsEl.style.opacity = vis; leadersEl.style.opacity = vis;
  if (vis <= 0.001) return;
  const w = innerWidth, h = innerHeight, narrow = w < 760;
  const [a0, a1] = narrow ? [0, 1] : area || [0, 1];
  const items = callouts.map((c) => { c.part.obj.localToWorld(v3.copy(c.part.anchor)).project(camera); return { c, x: (v3.x * 0.5 + 0.5) * w, y: (-v3.y * 0.5 + 0.5) * h }; });
  items.sort((a, b) => a.x - b.x);
  const half = Math.ceil(items.length / 2), cols = [items.slice(0, half), items.slice(half)];
  const gap = narrow ? 38 : 52, top = narrow ? h * 0.12 : 110, bottom = narrow ? h * 0.5 : h - 140;
  cols.forEach((col, side) => {
    col.sort((a, b) => a.y - b.y);
    let y = top; const ys = col.map((it) => { const ly = Math.max(it.y, y); y = ly + gap; return ly; });
    const over = Math.max(0, (ys[ys.length - 1] || 0) - bottom);
    col.forEach((it, i) => {
      const ly = Math.max(top, ys[i] - over), el = it.c.el, ew = el.offsetWidth, edge = narrow ? 12 : 36;
      const lx = side === 0 ? a0 * w + edge : a1 * w - edge - ew;
      el.style.transform = `translate(${lx}px,${ly - 16}px)`; el.dataset.side = side ? 'r' : 'l';
      const ax = side === 0 ? lx + ew + 8 : lx - 8, knee = side === 0 ? ax + 22 : ax - 22;
      it.c.line.setAttribute('points', `${ax},${ly} ${knee},${ly} ${it.x},${it.y}`);
      it.c.dot.setAttribute('cx', it.x); it.c.dot.setAttribute('cy', it.y);
    });
  });
}


function update(dt) {
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const S = sample(clamp01(scrollY / max)), tgt = S.shot;
  const k = SNAP || dt === 0 ? 1 : 1 - Math.exp(-dt * 4);
  for (const key of KEYS) cur[key] += (tgt[key] - cur[key]) * k;
  // etiquetas solo en el plano de despiece que las pide
  const lv = (tgt.labelsA ? 1 - (tgt.labelsT || 0) : 0) + (tgt.labelsB ? tgt.labelsT : 0) + (S.b === null && CUES[S.a].labels ? 1 : 0);
  cur.labels = (cur.labels ?? 0) + (Math.min(1, lv) - (cur.labels ?? 0)) * k;
  const area = (S.t < 0.5 || !S.b ? CUES[S.a] : CUES[S.b]).labels;

  const sdt = (reduceMotion ? 0.5 : 1) * dt * cur.timeScale; // cámara lenta = una multiplicación
  time += sdt;
  simulate(dt, sdt);
  explode(cur.explode);
  pose();

  // el cursor (o la inclinación del móvil) rota el estudio
  const kp = dt === 0 ? 1 : 1 - Math.exp(-dt * 3);
  pointerS.x += (pointer.x + tilt.x - pointerS.x) * kp; pointerS.y += (pointer.y + tilt.y - pointerS.y) * kp;
  scene.environmentRotation.set(pointerS.y * 0.45, -pointerS.x * 0.8, 0);

  // cámara: encuadre por tamaño, no por distancia
  const portrait = camera.aspect < 0.9;
  const d = distanceFor(portrait ? cur.mframe : cur.frame);
  v3.setFromSphericalCoords(d, THREE.MathUtils.degToRad(90 - cur.polar - pointerS.y * 2), THREE.MathUtils.degToRad((portrait ? cur.mazimuth : cur.azimuth) + pointerS.x * 3));
  camera.position.set(cur.tx, cur.ty, cur.tz).add(v3);
  camera.lookAt(cur.tx, cur.ty, cur.tz);
  const w = innerWidth, h = innerHeight;
  camera.setViewOffset(w, h, portrait ? 0 : -cur.offsetX * w, portrait ? h * 0.2 : 0, w, h);
  camera.updateMatrixWorld();

  // fondo fotográfico de la sección
  const ta = bgTex(S.a) || blank, tb = (S.b && bgTex(S.b)) || ta;
  bgMat.uniforms.uA.value = ta; bgMat.uniforms.uB.value = tb; bgMat.uniforms.uMix.value = S.b ? S.t : 0;
  bgMat.uniforms.uAspA.value = ta.image?.width ? ta.image.width / ta.image.height : 1.5;
  bgMat.uniforms.uAspB.value = tb.image?.width ? tb.image.width / tb.image.height : 1.5;
  bgMat.uniforms.uScreen.value = camera.aspect; bgMat.uniforms.uMouse.value.set(pointerS.x, -pointerS.y);
  if (S.b) bgTex(S.b);

  layoutCallouts(Math.min(cur.labels, clamp01((cur.explode - 0.75) / 0.25)), area);
  grain.uniforms.uTime.value = time % 100;
  const ring = $('#holdRing'); if (ring) ring.style.strokeDashoffset = 1 - holdK;
  holdBtn?.style.setProperty('--hold', holdK.toFixed(3));
}

/* calidad adaptativa: < 40 fps → baja resolución → luego apaga el bloom */
let fpsN = 0, fpsT = 0, since = 0;
function adapt(dt) {
  since += dt; fpsN++; fpsT += dt;
  if (fpsT < 2) return;
  const fps = fpsN / fpsT; fpsN = 0; fpsT = 0;
  const dbg = DEBUG && $('#fps'); if (dbg) dbg.textContent = `${fps.toFixed(0)} fps · dpr ${pr.toFixed(2)} · bloom ${bloom.enabled ? 'on' : 'off'}`;
  if (since < 3 || document.hidden || fps >= 40) return;
  if (pr > 1) { pr = Math.max(1, pr - 0.25); renderer.setPixelRatio(pr); resize(); } else bloom.enabled = false;
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setPixelRatio(pr); composer.setSize(w, h); bloom.resolution.set(w / 2, h / 2);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  leadersEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
  measure();
}

function loop(now) {
  requestAnimationFrame(loop);
  if (document.hidden) { last = now; return; }
  const dt = Math.min((now - last) / 1000, 1 / 20); last = now;
  update(dt);
  composer.render(dt);
  adapt(dt);
}

/* ---------- interacción: mantener para levantar ---------- */
const holdBtn = $('#hold');
let tiltOn = false;
async function enableTilt() {
  if (tiltOn) return; tiltOn = true;
  try { if (typeof DeviceOrientationEvent?.requestPermission === 'function') await DeviceOrientationEvent.requestPermission(); } catch { /* sin permiso: sigue el cursor */ }
  addEventListener('deviceorientation', (e) => { if (e.gamma != null && e.beta != null) tilt.set(THREE.MathUtils.clamp(e.gamma / 35, -1, 1), THREE.MathUtils.clamp((e.beta - 45) / 35, -1, 1)); }, { passive: true });
}
function setHolding(on, why = '') {
  if (SNAP && on !== holding) console.log('[hold]', on, why, performance.now() | 0);
  holding = on;
  if (on) { sound.unlock(); enableTilt(); } // el mismo gesto enciende el audio y la inclinación
  else holdDone = false;
}
if (holdBtn) {
  holdBtn.addEventListener('pointerdown', (e) => { holdBtn.setPointerCapture(e.pointerId); setHolding(true, 'down'); });
  holdBtn.addEventListener('pointerup', () => setHolding(false, 'up'));
  holdBtn.addEventListener('pointercancel', (e) => { if (e.pointerType !== 'mouse') setHolding(false); });
  addEventListener('blur', () => setHolding(false, 'blur')); // si la ventana pierde el foco, se suelta
  holdBtn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); setHolding(true); } });
  holdBtn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') setHolding(false); });
  holdBtn.addEventListener('contextmenu', (e) => e.preventDefault());
}
$('#bpToggle')?.addEventListener('click', (e) => {
  blueprint = !blueprint; buildBlueprint(); applyBlueprint();
  e.currentTarget.setAttribute('aria-pressed', blueprint); e.currentTarget.classList.toggle('on', blueprint);
});
$('#sndToggle')?.addEventListener('click', (e) => {
  sound.muted = !sound.muted; if (!sound.muted) sound.unlock();
  e.currentTarget.setAttribute('aria-pressed', !sound.muted); e.currentTarget.classList.toggle('on', !sound.muted);
});
addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') pointer.set(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1); }, { passive: true });
addEventListener('resize', resize);
addEventListener('load', measure);
new ResizeObserver(measure).observe($('#content'));

/* ---------- arranque: compilar todo detrás del loader (sin tirones) ---------- */
(async () => {
  resize();
  bgTex('inicio'); bgTex('centro');
  update(0);
  await renderer.compileAsync(scene, camera);
  composer.render();
  window.__sceneReady = true;
  if (SNAP) window.__gg = { setHolding, get state() { return { liftH, whip, holdK, holding }; } };
  last = performance.now();
  requestAnimationFrame(loop);
  (window.requestIdleCallback || ((f) => setTimeout(f, 400)))(buildBlueprint); // extras pesados con la página en reposo
})();
