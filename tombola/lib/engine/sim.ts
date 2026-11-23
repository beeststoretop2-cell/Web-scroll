import * as THREE from "three";
import { ballTexture } from "./materials";
import { DIM } from "./tombola";

/**
 * Balls tumbling inside the turning drum — simulated, not keyframed.
 * Fixed 240 Hz steps fed by the one global clock (so slow motion is just timeScale).
 */
const G = 9810; // mm/s²
const H = 1 / 240;
const R = DIM.ballR;
const WALL = DIM.rimInner + 2 - R; // max radial distance of a ball centre
const XMAX = DIM.halfLen - 3 - R;

type Ball = {
  n: number;
  mesh: THREE.Mesh;
  p: THREE.Vector3;
  v: THREE.Vector3;
  active: boolean;
};

type Flight = { ball: Ball; from: THREE.Vector3; t: number };

export class BallSim {
  balls: Ball[] = [];
  group: THREE.Group;
  acc = 0;
  impacts = 0; // energy of wall hits since last read (drives the rattle sound)
  flight: Flight | null = null;
  drawn: Ball | null = null;
  onLanded: (n: number) => void = () => {};
  private tmpQ = new THREE.Quaternion();
  private tmpA = new THREE.Vector3();

  constructor(group: THREE.Group) {
    this.group = group;
    const geo = new THREE.SphereGeometry(R, 40, 24);
    for (let i = 0; i < DIM.balls; i++) {
      const n = i + 1;
      const red = n % 6 === 0;
      const mat = new THREE.MeshPhysicalMaterial({
        map: ballTexture(n, red), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, metalness: 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      // settle in a heap at the bottom of the drum
      const col = i % 8, row = Math.floor(i / 8);
      const p = new THREE.Vector3(-XMAX + col * ((XMAX * 2) / 7), -WALL + 6 + row * 26, ((row % 2) - 0.5) * 30);
      group.add(mesh);
      this.balls.push({ n, mesh, p, v: new THREE.Vector3(), active: true });
    }
    for (let i = 0; i < 480; i++) this.step(H, 0.4); // pre-settle
    this.sync(0);
  }

  /** Advance by simulated seconds `dt` with the drum turning at `omega` rad/s. */
  update(dt: number, omega: number) {
    this.acc = Math.min(this.acc + dt, H * 16);
    while (this.acc >= H) {
      this.step(H, omega);
      this.acc -= H;
    }
    this.sync(dt);
  }

  private step(h: number, omega: number) {
    const bs = this.balls;
    for (const b of bs) {
      if (!b.active) continue;
      b.v.y -= G * h;
      b.v.x *= 0.999;
      b.p.addScaledVector(b.v, h);
      // drum wall (cylinder around X)
      const d = Math.hypot(b.p.y, b.p.z);
      if (d > WALL) {
        const ny = b.p.y / d, nz = b.p.z / d;
        b.p.y -= ny * (d - WALL);
        b.p.z -= nz * (d - WALL);
        const vn = b.v.y * ny + b.v.z * nz;
        if (vn > 0) {
          b.v.y -= 1.35 * vn * ny;
          b.v.z -= 1.35 * vn * nz;
          if (vn > 250) this.impacts += vn;
        }
        // the rods drag the ball along with the wall (ω × r)
        const wy = -omega * b.p.z, wz = omega * b.p.y;
        const k = 0.12;
        b.v.y += (wy - b.v.y) * k;
        b.v.z += (wz - b.v.z) * k;
      }
      // end wheels
      if (Math.abs(b.p.x) > XMAX) {
        b.p.x = Math.sign(b.p.x) * XMAX;
        b.v.x *= -0.4;
      }
    }
    // ball ↔ ball
    const D = R * 2, D2 = D * D;
    for (let i = 0; i < bs.length; i++) {
      const a = bs[i];
      if (!a.active) continue;
      for (let j = i + 1; j < bs.length; j++) {
        const b = bs[j];
        if (!b.active) continue;
        const dx = b.p.x - a.p.x, dy = b.p.y - a.p.y, dz = b.p.z - a.p.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= D2 || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, nz = dz / d, push = (D - d) / 2;
        a.p.x -= nx * push; a.p.y -= ny * push; a.p.z -= nz * push;
        b.p.x += nx * push; b.p.y += ny * push; b.p.z += nz * push;
        const rv = (b.v.x - a.v.x) * nx + (b.v.y - a.v.y) * ny + (b.v.z - a.v.z) * nz;
        if (rv < 0) {
          const imp = -rv * 0.75;
          a.v.x -= nx * imp; a.v.y -= ny * imp; a.v.z -= nz * imp;
          b.v.x += nx * imp; b.v.y += ny * imp; b.v.z += nz * imp;
        }
      }
    }
  }

  /** Copy positions to meshes and roll them. */
  private sync(dt: number) {
    for (const b of this.balls) {
      if (!b.active) continue;
      b.mesh.position.copy(b.p);
      const speed = b.v.length();
      if (speed > 1 && dt > 0) {
        // roll: axis ⟂ to velocity and to the drum radius
        this.tmpA.set(0, b.p.y, b.p.z).normalize().cross(b.v).normalize();
        this.tmpQ.setFromAxisAngle(this.tmpA, (speed * dt) / R);
        b.mesh.quaternion.premultiply(this.tmpQ);
      }
    }
  }

  /** Pull one ball out through the hatch and fly it to the glass tray. */
  draw() {
    if (this.flight) return;
    if (this.drawn) {
      // previous winner goes back in the drum
      const b = this.drawn;
      b.p.set((Math.random() - 0.5) * 100, 60, 0);
      b.v.set(0, 0, 0);
      b.active = true;
      this.drawn = null;
    }
    const pool = this.balls.filter((b) => b.active);
    const ball = pool[Math.floor(Math.random() * pool.length)];
    ball.active = false;
    this.flight = { ball, from: ball.p.clone(), t: 0 };
  }

  /** Flight is driven by the same clock (seconds of simulated time). */
  updateFlight(dt: number) {
    const f = this.flight;
    if (!f) return;
    f.t = Math.min(f.t + dt / 1.5, 1);
    const t = f.t;
    const top = new THREE.Vector3(0, DIM.drumR + 70, 0);
    const end = DIM.tray.clone().add(new THREE.Vector3(0, 2.2 + R, 0));
    const m = f.ball.mesh.position;
    if (t < 0.4) {
      // up and out through the hatch
      const k = easeInOut(t / 0.4);
      m.lerpVectors(f.from, top, k);
    } else {
      // arc down into the tray
      const k = (t - 0.4) / 0.6;
      const ctrl = new THREE.Vector3(0, DIM.drumR + 120, end.z * 1.4);
      const a = top.clone().lerp(ctrl, k), b = ctrl.clone().lerp(end, k);
      m.lerpVectors(a, b, k);
    }
    f.ball.mesh.rotateY(dt * 6);
    if (t >= 1) {
      // face the number to the camera side
      f.ball.mesh.quaternion.identity();
      f.ball.mesh.rotation.y = Math.PI / 2;
      this.drawn = f.ball;
      this.flight = null;
      this.onLanded(f.ball.n);
    }
  }
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
