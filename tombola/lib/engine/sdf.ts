import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** 2D signed-distance field in millimetres. Negative = inside. */
export type SDF = (x: number, y: number) => number;

export const circle = (cx: number, cy: number, r: number): SDF => (x, y) =>
  Math.hypot(x - cx, y - cy) - r;

export const capsule = (ax: number, ay: number, bx: number, by: number, r: number): SDF => (x, y) => {
  const pax = x - ax, pay = y - ay, bax = bx - ax, bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
};

export const box = (cx: number, cy: number, hw: number, hh: number, r = 0): SDF => (x, y) => {
  const qx = Math.abs(x - cx) - hw + r, qy = Math.abs(y - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};

/** Smooth union ("melt"): k = fillet radius in mm. */
export const smooth = (k: number, ...fs: SDF[]): SDF => (x, y) =>
  fs.reduce((d, f) => {
    const b = f(x, y);
    const h = Math.max(k - Math.abs(d - b), 0) / k;
    return Math.min(d, b) - h * h * k * 0.25;
  }, Infinity);

export const union = (...fs: SDF[]): SDF => (x, y) => fs.reduce((d, f) => Math.min(d, f(x, y)), Infinity);
export const subtract = (a: SDF, ...bs: SDF[]): SDF => (x, y) =>
  bs.reduce((d, b) => Math.max(d, -b(x, y)), a(x, y));

function pointInPoly(p: THREE.Vector2, poly: THREE.Vector2[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Marching squares: traces the zero contour into THREE.Shapes (with holes). */
export function traceLoops(
  sdf: SDF,
  { min, max, step }: { min: [number, number]; max: [number, number]; step: number },
): THREE.Shape[] {
  const nx = Math.ceil((max[0] - min[0]) / step), ny = Math.ceil((max[1] - min[1]) / step);
  const W = nx + 1, v = new Float32Array(W * (ny + 1));
  for (let j = 0; j <= ny; j++)
    for (let i = 0; i <= nx; i++) {
      const d = sdf(min[0] + i * step, min[1] + j * step);
      v[j * W + i] = d === 0 ? 1e-9 : d;
    }
  const V = (i: number, j: number) => v[j * W + i];
  const edgePoint = (i0: number, j0: number, i1: number, j1: number) => {
    const a = V(i0, j0), b = V(i1, j1), t = a / (a - b);
    return new THREE.Vector2(min[0] + (i0 + (i1 - i0) * t) * step, min[1] + (j0 + (j1 - j0) * t) * step);
  };
  // oriented segments, interior on the left → outer loops CCW, holes CW
  const TABLE: Record<number, [number, number][]> = {
    1: [[0, 3]], 2: [[1, 0]], 3: [[1, 3]], 4: [[2, 1]], 5: [[0, 1], [2, 3]], 6: [[2, 0]], 7: [[2, 3]],
    8: [[3, 2]], 9: [[0, 2]], 10: [[1, 2], [3, 0]], 11: [[1, 2]], 12: [[3, 1]], 13: [[0, 1]], 14: [[3, 0]],
  };
  const next = new Map<string, string>(), pts = new Map<string, THREE.Vector2>();
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const idx = (+(V(i, j) < 0)) | (+(V(i + 1, j) < 0) << 1) | (+(V(i + 1, j + 1) < 0) << 2) | (+(V(i, j + 1) < 0) << 3);
      const T = TABLE[idx];
      if (!T) continue;
      const E: [string, number, number, number, number][] = [
        ["h", i, j, i + 1, j], ["v", i + 1, j, i + 1, j + 1], ["h", i, j + 1, i + 1, j + 1], ["v", i, j, i, j + 1],
      ];
      const id = (k: number) => E[k][0] + E[k][1] + "," + E[k][2];
      for (const [a, b] of T) {
        for (const k of [a, b]) if (!pts.has(id(k))) pts.set(id(k), edgePoint(E[k][1], E[k][2], E[k][3], E[k][4]));
        next.set(id(a), id(b));
      }
    }
  const loops: THREE.Vector2[][] = [];
  while (next.size) {
    let k = next.keys().next().value as string;
    const loop: THREE.Vector2[] = [];
    while (next.has(k)) {
      loop.push(pts.get(k)!);
      const n = next.get(k)!;
      next.delete(k);
      k = n;
    }
    if (loop.length > 2) loops.push(simplify(loop, step * 0.15));
  }
  const area = (l: THREE.Vector2[]) =>
    l.reduce((s, p, i) => s + p.x * l[(i + 1) % l.length].y - l[(i + 1) % l.length].x * p.y, 0) / 2;
  const outers = loops.filter((l) => area(l) > 0).map((l) => ({ pts: l, shape: new THREE.Shape(l) }));
  for (const l of loops.filter((l) => area(l) < 0)) {
    const host = outers.find((o) => pointInPoly(l[0], o.pts)) ?? outers[0];
    host?.shape.holes.push(new THREE.Path(l));
  }
  return outers.map((o) => o.shape);
}

/** Drop nearly-collinear points so extrusions stay light. */
function simplify(loop: THREE.Vector2[], tol: number) {
  const out: THREE.Vector2[] = [];
  for (let i = 0; i < loop.length; i++) {
    const a = out.length ? out[out.length - 1] : loop[loop.length - 1];
    const b = loop[i], c = loop[(i + 1) % loop.length];
    const cross = Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
    const len = Math.hypot(c.x - a.x, c.y - a.y) || 1;
    if (cross / len > tol) out.push(b);
  }
  return out.length > 2 ? out : loop;
}

/** Shapes → extruded plate, centred on its thickness, bevelled. Group 0 = faces, 1 = edges. */
export function plate(
  sdf: SDF,
  bounds: { min: [number, number]; max: [number, number]; step: number },
  depth: number,
  bevel: number,
) {
  const geo = new THREE.ExtrudeGeometry(traceLoops(sdf, bounds), {
    depth: depth - bevel * 2,
    curveSegments: 1,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
  });
  geo.translate(0, 0, -(depth - bevel * 2) / 2);
  // smooth the curved walls and the bevel, keep the crisp break between face and edge
  return toCreasedNormals(geo, THREE.MathUtils.degToRad(35));
}
