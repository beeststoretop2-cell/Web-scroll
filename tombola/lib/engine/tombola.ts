import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { box, capsule, circle, plate, smooth, subtract, type SDF } from "./sdf";
import type { Materials } from "./materials";

/**
 * TÓMBOLA DE LATÓN — every part in real millimetres (1 unit = 1 mm).
 *
 * part              size (mm)                 material (face / edge)
 * ─────────────────────────────────────────────────────────────────────
 * aros (×2)         Ø300 × 6                  latón satinado circular / latón pulido
 * varillas (×18)    Ø5.2 × 360                latón pulido
 * compuerta         100 × 76 × 3, curvada     latón satinado / latón pulido
 * eje               Ø12 × 464                 acero templado (iridiscente)
 * manivela          Ø34 hub, 95 entre ejes, 9 latón satinado / latón pulido
 * empuñadura        Ø16 × 52                  laca roja
 * bastidor (×2)     250 × 270 × 12            acero satinado / acero pulido
 * peana             500 × 240 × 14            laca negra / acero pulido
 * bandeja           Ø76 × 26                  cristal
 * bolas (×48)       Ø30                       laca crema / roja
 *
 * Drum axis = X. Drum centre at the origin. Floor (top of base) at y = -260.
 */

export const DIM = {
  drumR: 150,
  rimInner: 139,
  halfLen: 180,
  rodR: 144.5,
  frameX: 205,
  floorY: -260,
  ballR: 15,
  balls: 48,
  tray: new THREE.Vector3(0, -260, 95),
};

/** The 0.05 mm rule is written for a ~50 mm object. This one is ~500 mm, so the same
 *  light-catching edge scales to 0.5 mm. */
const BEVEL = 0.5;

export type Part = {
  id: string;
  obj: THREE.Object3D;
  base: THREE.Vector3;
  lift: THREE.Vector3;
  order: number;
  label: string;
  spec: string;
  anchor: THREE.Vector3; // local point the callout points at
};

/** ExtrudeGeometry lies in XY; turn it so its thickness runs along X (plates facing the axle). */
const faceX = (g: THREE.BufferGeometry) => g.rotateY(Math.PI / 2);

function lathe(profile: [number, number][], segments = 64) {
  // profile is drawn counter-clockwise (radius, height) going up → normals face outwards
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

export function buildTombola(mat: Materials) {
  const root = new THREE.Group();
  root.name = "tombola";
  const rotor = new THREE.Group(); // everything that turns with the crank
  rotor.name = "rotor";
  root.add(rotor);
  const parts: Part[] = [];
  const add = (p: Omit<Part, "base">, parent: THREE.Object3D) => {
    parent.add(p.obj);
    parts.push({ ...p, base: p.obj.position.clone() });
  };

  // ── Aros (wheels): rim + 8 spokes + hub, melted together, axle hole cut ──────────
  const spokes: SDF[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    spokes.push(capsule(0, 0, Math.cos(a) * 145, Math.sin(a) * 145, 3.2));
  }
  const wheelSDF = subtract(
    smooth(4, subtract(circle(0, 0, DIM.drumR), circle(0, 0, DIM.rimInner)), circle(0, 0, 17), ...spokes),
    circle(0, 0, 6.4),
  );
  const wheelGeo = faceX(plate(wheelSDF, { min: [-153, -153], max: [153, 153], step: 0.5 }, 6, BEVEL));
  for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(wheelGeo, [mat.brassSatinWheel, mat.brassPolished]);
    wheel.position.x = side * DIM.halfLen;
    add({
      id: side < 0 ? "wheelL" : "wheelR", obj: wheel, lift: new THREE.Vector3(side * 120, 0, 0),
      order: side < 0 ? 0.7 : 0.75, label: "Aro de latón", spec: "Ø 300 mm · 8 radios",
      anchor: new THREE.Vector3(0, 110, 0),
    }, rotor);
  }

  // ── Varillas (rods) ──────────────────────────────────────────────────────────────
  const rods = new THREE.Group();
  const rodGeo = new THREE.CylinderGeometry(2.6, 2.6, DIM.halfLen * 2, 12, 1).rotateZ(Math.PI / 2);
  const RODS = 18;
  for (let i = 0; i < RODS; i++) {
    const a = (i / RODS) * Math.PI * 2;
    if (Math.abs(Math.sin(a) - 1) < 0.05) continue; // leave the hatch opening (top)
    const rod = new THREE.Mesh(rodGeo, mat.brassPolished);
    rod.position.set(0, Math.sin(a) * DIM.rodR, Math.cos(a) * DIM.rodR);
    rods.add(rod);
  }
  add({
    id: "rods", obj: rods, lift: new THREE.Vector3(0, 0, 0), order: 0.8,
    label: "Jaula de varillas", spec: "18 × Ø 5.2 × 360 mm", anchor: new THREE.Vector3(0, -DIM.rodR, 0),
  }, rotor);

  // ── Compuerta (hatch): slotted plate, bent onto the drum ────────────────────────
  const hatchSDF = subtract(
    smooth(3, box(0, 0, 50, 38, 9), circle(0, 38, 8)),
    capsule(-30, -14, 30, -14, 3.2), capsule(-30, 0, 30, 0, 3.2), capsule(-30, 14, 30, 14, 3.2),
    circle(0, 38, 3.5),
  );
  const hatchGeo = plate(hatchSDF, { min: [-53, -41], max: [53, 49], step: 0.25 }, 3, BEVEL * 0.6);
  // bend onto the drum: local x → drum axis (X), local y → arc length over the top, z → radial
  const pos = hatchGeo.attributes.position as THREE.BufferAttribute;
  const RH = DIM.rodR + 4.6;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = y / RH, r = RH + z;
    pos.setXYZ(i, x, Math.cos(a) * r, Math.sin(a) * r);
  }
  hatchGeo.computeBoundingSphere();
  // re-derive normals after the bend, keeping the face/edge crease
  hatchGeo.deleteAttribute("normal");
  const hatch = new THREE.Mesh(toCreasedNormals(hatchGeo, THREE.MathUtils.degToRad(35)), [mat.brassSatinHatch, mat.brassPolished]);
  add({
    id: "hatch", obj: hatch, lift: new THREE.Vector3(0, 150, 0), order: 1,
    label: "Compuerta", spec: "100 × 76 × 3 mm, curvada", anchor: new THREE.Vector3(0, RH, 0),
  }, rotor);

  // ── Eje (axle): lathe, heat-tinted steel ──────────────────────────────────────────
  const axleGeo = lathe([
    [0, -232], [5, -231.5], [8.5, -228], [9, -224], [7, -221], [6, -219],
    [6, 219], [7, 221], [9, 224], [8.5, 228], [5, 231.5], [0, 232],
  ], 48).rotateZ(-Math.PI / 2);
  const axle = new THREE.Mesh(axleGeo, mat.heatTint);
  add({
    id: "axle", obj: axle, lift: new THREE.Vector3(-330, 0, 0), order: 0.5,
    label: "Eje templado", spec: "Ø 12 × 464 mm", anchor: new THREE.Vector3(-200, 0, 0),
  }, rotor);

  // ── Manivela (crank): the guide's recipe — circle + capsule + circle, melted ─────
  const crankSDF = subtract(
    smooth(6, circle(0, 0, 17), capsule(0, 0, 95, 0, 7), circle(95, 0, 11)),
    capsule(32, 0, 66, 0, 2.6), circle(0, 0, 6.4), circle(95, 0, 4),
  );
  const crankGeo = faceX(plate(crankSDF, { min: [-20, -20], max: [109, 20], step: 0.2 }, 9, BEVEL));
  const crank = new THREE.Mesh(crankGeo, [mat.brassSatinCrank, mat.brassPolished]);
  crank.position.x = DIM.frameX + 17;
  // gem cap on the hub
  const gem = new THREE.Mesh(new THREE.SphereGeometry(7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-Math.PI / 2), mat.gem);
  gem.position.x = 4.5;
  crank.add(gem);
  add({
    id: "crank", obj: crank, lift: new THREE.Vector3(190, 0, 0), order: 0.6,
    label: "Manivela", spec: "95 mm entre ejes · 9 mm", anchor: new THREE.Vector3(0, 0, -50),
  }, rotor);

  // ── Empuñadura (handle): lathe, red lacquer, on a brass pin ─────────────────────
  const handle = new THREE.Group();
  const knob = new THREE.Mesh(lathe([
    [0, 0], [6, 0], [7.5, 4], [6.5, 14], [7.8, 30], [8, 42], [7, 49], [4, 52], [0, 52.5],
  ], 40).rotateZ(-Math.PI / 2), mat.lacquerRed);
  knob.position.x = 6;
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 8, 20).rotateZ(Math.PI / 2), mat.brassPolished);
  pin.position.x = 2;
  handle.add(knob, pin);
  handle.position.set(DIM.frameX + 17 + 4.5, 0, -95); // crank arm points to -Z after faceX
  add({
    id: "handle", obj: handle, lift: new THREE.Vector3(230, 0, 0), order: 0.62,
    label: "Empuñadura lacada", spec: "Ø 16 × 52 mm", anchor: new THREE.Vector3(30, 0, 0),
  }, rotor);

  // ── Bastidor (frames): legs + hub + brace + feet, melted, axle hole cut ─────────
  const frameSDF = subtract(
    smooth(5,
      capsule(0, 0, -122, -246, 9), capsule(0, 0, 122, -246, 9), circle(0, 0, 24),
      capsule(-86, -176, 86, -176, 6), box(-122, -252, 24, 8, 4), box(122, -252, 24, 8, 4),
    ),
    circle(0, 0, 6.6), circle(0, -120, 9),
  );
  const frameGeo = faceX(plate(frameSDF, { min: [-150, -264], max: [150, 28], step: 0.5 }, 12, BEVEL));
  for (const side of [-1, 1]) {
    const frame = new THREE.Mesh(frameGeo, [mat.steelSatin, mat.steelPolished]);
    frame.position.x = side * DIM.frameX;
    add({
      id: side < 0 ? "frameL" : "frameR", obj: frame, lift: new THREE.Vector3(side * 120, 0, 0),
      order: side < 0 ? 0.3 : 0.35, label: "Bastidor de acero", spec: "250 × 270 × 12 mm",
      anchor: new THREE.Vector3(0, -150, side * 60),
    }, root);
  }

  // ── Peana (base) ─────────────────────────────────────────────────────────────────
  const baseGeo = plate(box(0, 0, 250, 120, 22), { min: [-253, -123], max: [253, 123], step: 0.5 }, 14, BEVEL)
    .rotateX(-Math.PI / 2);
  const base = new THREE.Mesh(baseGeo, [mat.lacquerBlack, mat.steelPolished]);
  base.position.y = DIM.floorY - 7;
  add({
    id: "base", obj: base, lift: new THREE.Vector3(0, -120, 0), order: 0.1,
    label: "Peana lacada", spec: "500 × 240 × 14 mm", anchor: new THREE.Vector3(-200, 0, 60),
  }, root);

  // ── Bandeja (glass tray): lathe, CCW profile, glass + polished rim ──────────────
  const tray = new THREE.Group();
  const bowl = new THREE.Mesh(lathe([
    [0, 0], [26, 0], [33, 3], [37, 12], [38, 24], [38.6, 26], [36.8, 26], [36.2, 13], [32, 5], [25, 2.2], [0, 2.2],
  ], 72), mat.glass);
  bowl.renderOrder = 10;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(37.8, 1.2, 12, 72).rotateX(Math.PI / 2), mat.steelPolished);
  rim.position.y = 26;
  tray.add(bowl, rim);
  tray.position.copy(DIM.tray);
  add({
    id: "tray", obj: tray, lift: new THREE.Vector3(0, 0, 130), order: 0.2,
    label: "Bandeja de cristal", spec: "Ø 76 × 26 mm", anchor: new THREE.Vector3(0, 20, 0),
  }, root);

  // ── Bolas (balls) live in their own group; the simulation moves them ───────────
  const balls = new THREE.Group();
  balls.name = "balls";
  add({
    id: "balls", obj: balls, lift: new THREE.Vector3(0, 250, 0), order: 0.9,
    label: "48 bolas numeradas", spec: "Ø 30 mm · laca", anchor: new THREE.Vector3(0, -90, 0),
  }, root);

  // ── Contact shadow (soft, baked into a texture; no lights) ──────────────────────
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grd.addColorStop(0, "rgba(0,0,0,0.85)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 520).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }),
  );
  shadow.position.y = DIM.floorY - 14.2;
  root.add(shadow);

  return { root, rotor, balls, parts, shadow };
}
