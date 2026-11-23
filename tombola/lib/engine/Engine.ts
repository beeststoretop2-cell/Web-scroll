import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { createMaterials, type Materials } from "./materials";
import { buildTombola, DIM, type Part } from "./tombola";
import { BallSim } from "./sim";
import { Sound } from "./sound";
import { CUES, type Shot } from "./cues";

export type EngineUI = {
  labels: HTMLElement;
  leaders: SVGSVGElement;
  onProgress: (k: number, text: string) => void;
  onReady: () => void;
  onHold: (k: number) => void;
  onDrawn: (n: number) => void;
  onFps?: (fps: number, pixelRatio: number, bloom: boolean) => void;
};

const HOLD_SECONDS = 1.6;
const IDLE_OMEGA = 0.9;
const POWER_OMEGA = 7.5;
const BEAT = Math.PI / 6; // a ratchet click every 30°

const X_AXIS = new THREE.Vector3(1, 0, 0);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** Dark room, one off-axis softbox, two strip lights — baked to an environment with PMREM. */
function buildStudio() {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color("#030303");
  const panel = (w: number, h: number, intensity: number, at: [number, number, number], tint = "#ffffff") => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    m.position.set(...at);
    m.lookAt(0, 0, 0);
    studio.add(m);
  };
  panel(22, 14, 3.2, [-22, 20, 20]); // key softbox, off-axis
  panel(2.4, 34, 2.6, [30, 4, 12]); // strip light — edge line
  panel(2.4, 34, 1.9, [-28, 2, -16]); // second strip
  panel(60, 8, 0.25, [0, -18, 0], "#ffddb0"); // faint warm floor bounce
  panel(10, 10, 0.9, [8, 26, -24], "#ff3020"); // red kicker from the brand
  return studio;
}

export class Engine {
  private canvas: HTMLCanvasElement;
  private ui: EngineUI;
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 10, 20000);
  private composer!: EffectComposer;
  private bloom!: UnrealBloomPass;
  private grain!: ShaderPass;
  private mat!: Materials;
  private rotor!: THREE.Group;
  private parts: Part[] = [];
  private sim!: BallSim;
  private shadow!: THREE.Mesh;
  readonly sound = new Sound();

  private cueAt: number[] = [];
  private cur: Shot = { ...CUES[0].shot };
  private time = 0;
  private angle = 0;
  private omega = IDLE_OMEGA;
  private lastBeat = 0;
  private holding = false;
  private holdK = 0;
  private holdSpent = false;
  private pointer = new THREE.Vector2();
  private pointerS = new THREE.Vector2();
  private tilt = new THREE.Vector2();
  private blueprint = false;
  private blueprintBuilt = false;
  private invisible = new THREE.MeshBasicMaterial({ visible: false });
  private callouts: { part: Part; el: HTMLElement; line: SVGPolylineElement; dot: SVGCircleElement }[] = [];
  private reveals: HTMLElement[] = [];
  private raf = 0;
  private last = 0;
  private pr = 1;
  private fpsFrames = 0;
  private fpsAcc = 0;
  private sinceStart = 0;
  private disposed = false;
  private v = new THREE.Vector3();
  /** ?snap — camera lands on the shot instantly (for headless screenshots, which run at ~1 fps). */
  private snap = typeof location !== "undefined" && new URLSearchParams(location.search).has("snap");

  constructor(canvas: HTMLCanvasElement, ui: EngineUI) {
    this.canvas = canvas;
    this.ui = ui;
  }

  async init() {
    const { ui } = this;
    ui.onProgress(0.05, "Encendiendo el render");
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: "high-performance" });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    const phone = matchMedia("(pointer: coarse)").matches;
    this.pr = Math.min(devicePixelRatio, phone ? 1.75 : 2);
    r.setPixelRatio(this.pr);
    this.renderer = r;
    this.scene.background = new THREE.Color("#0a0909");
    await nextFrame();

    ui.onProgress(0.2, "Montando el estudio de luz");
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(buildStudio(), 0.02).texture;
    pmrem.dispose();
    await nextFrame();

    ui.onProgress(0.35, "Generando acabados cepillados");
    this.mat = createMaterials();
    await nextFrame();

    ui.onProgress(0.5, "Trazando piezas en milímetros");
    const t = buildTombola(this.mat);
    this.scene.add(t.root);
    this.rotor = t.rotor;
    this.parts = t.parts;
    this.shadow = t.shadow;
    await nextFrame();

    ui.onProgress(0.65, "Cargando 48 bolas");
    this.sim = new BallSim(t.balls);
    this.sim.onLanded = (n) => {
      this.sound.land();
      this.sound.bell();
      ui.onDrawn(n);
    };
    await nextFrame();

    ui.onProgress(0.75, "Revelando la película");
    this.buildPost();
    this.buildCallouts();
    this.resize();
    this.update(0);

    ui.onProgress(0.85, "Compilando shaders");
    await r.compileAsync(this.scene, this.camera);
    this.composer.render();
    ui.onProgress(1, "Listo");

    addEventListener("resize", this.resize);
    addEventListener("pointermove", this.onPointer, { passive: true });
    this.reveals = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    ui.onReady();
    if (this.snap) (window as unknown as { __engine: Engine }).__engine = this;
    // heavy extras once the page is idle
    const idle = (window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 300))) as (cb: () => void) => void;
    idle(() => this.buildBlueprint());
  }

  // ── post: Scene → MSAA HDR → Bloom → ACES → Grain ─────────────────────────────────
  private buildPost() {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(this.renderer, rt);
    composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.4, 0.98); // high threshold: glints only
    composer.addPass(this.bloom);
    composer.addPass(new OutputPass()); // ACES + sRGB
    this.grain = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmount: { value: 0.045 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float uTime, uAmount; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
        void main(){
          vec4 c = texture2D(tDiffuse, vUv);
          float luma = dot(c.rgb, vec3(0.299, 0.587, 0.114));
          c.rgb += (h(gl_FragCoord.xy) - 0.5) * uAmount * (1.0 - luma * 0.6);
          gl_FragColor = c;
        }`,
    });
    composer.addPass(this.grain);
    this.composer = composer;
  }

  // ── callouts: two clean columns with leader lines ─────────────────────────────────
  private buildCallouts() {
    const keep = new Set(["hatch", "balls", "wheelR", "rods", "crank", "handle", "axle", "frameL", "tray", "base"]);
    for (const part of this.parts.filter((p) => keep.has(p.id))) {
      const el = document.createElement("div");
      el.className = "callout";
      el.innerHTML = `<b>${part.label}</b><span>${part.spec}</span>`;
      this.ui.labels.appendChild(el);
      const ns = "http://www.w3.org/2000/svg";
      const line = document.createElementNS(ns, "polyline");
      const dot = document.createElementNS(ns, "circle");
      dot.setAttribute("r", "3");
      this.ui.leaders.append(line, dot);
      this.callouts.push({ part, el, line, dot });
    }
  }

  // ── blueprint: every surface swapped for its edges ────────────────────────────────
  private buildBlueprint() {
    if (this.disposed || this.blueprintBuilt) return;
    const lineMat = new THREE.LineBasicMaterial({ color: "#e8dcc0", transparent: true, opacity: 0.85 });
    const ballMat = new THREE.LineBasicMaterial({ color: "#d40000", transparent: true, opacity: 0.9 });
    const ballEdges = new THREE.EdgesGeometry(new THREE.SphereGeometry(DIM.ballR, 12, 8), 1);
    const cache = new Map<THREE.BufferGeometry, THREE.EdgesGeometry>();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || m === this.shadow) return;
      const isBall = m.parent?.name === "balls";
      let eg: THREE.BufferGeometry;
      if (isBall) eg = ballEdges;
      else {
        if (!cache.has(m.geometry)) cache.set(m.geometry, new THREE.EdgesGeometry(m.geometry, 24));
        eg = cache.get(m.geometry)!;
      }
      const lines = new THREE.LineSegments(eg, isBall ? ballMat : lineMat);
      lines.visible = false;
      m.userData.edges = lines;
      m.userData.surface = m.material;
      m.add(lines);
    });
    this.blueprintBuilt = true;
    if (this.blueprint) this.applyBlueprint();
  }

  private applyBlueprint() {
    const on = this.blueprint;
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.userData.edges) return;
      m.material = on ? this.invisible : m.userData.surface;
      (m.userData.edges as THREE.LineSegments).visible = on;
    });
    this.shadow.visible = !on;
    this.bloom.enabled = !on && this.bloom.enabled;
  }

  setBlueprint(on: boolean) {
    this.blueprint = on;
    if (!this.blueprintBuilt) this.buildBlueprint();
    else this.applyBlueprint();
    if (!on) this.bloom.enabled = true;
  }

  // ── hold-to-spin ──────────────────────────────────────────────────────────────────
  async setHolding(on: boolean) {
    this.holding = on;
    if (on) {
      this.sound.unlock(); // the same gesture switches on audio…
      this.enableTilt(); // …and phone tilt
    } else {
      this.holdSpent = false;
    }
  }

  setMuted(m: boolean) {
    this.sound.muted = m;
  }

  private tiltEnabled = false;
  private async enableTilt() {
    if (this.tiltEnabled) return;
    this.tiltEnabled = true;
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
    try {
      if (DOE?.requestPermission) await DOE.requestPermission();
    } catch {
      /* denied — cursor still works */
    }
    addEventListener("deviceorientation", this.onTilt, { passive: true });
  }

  private onTilt = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return;
    this.tilt.set(THREE.MathUtils.clamp(e.gamma / 35, -1, 1), THREE.MathUtils.clamp((e.beta - 45) / 35, -1, 1));
  };

  private onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    this.pointer.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
  };

  // ── layout ────────────────────────────────────────────────────────────────────────
  private resize = () => {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.pr);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.ui.leaders.setAttribute("viewBox", `0 0 ${w} ${h}`);
    // cue positions from the sections themselves
    const max = Math.max(1, document.documentElement.scrollHeight - h);
    this.cueAt = CUES.map((c) => {
      const el = document.querySelector<HTMLElement>(`[data-cue="${c.id}"]`);
      if (!el) return 0;
      const top = el.getBoundingClientRect().top + scrollY;
      return clamp01((top + el.offsetHeight / 2 - h / 2) / max);
    });
    this.cueAt[0] = 0;
    this.cueAt[this.cueAt.length - 1] = 1;
  };

  private sample(p: number): Shot {
    const at = this.cueAt;
    const i = at.findIndex((a) => a > p);
    if (i === -1) return { ...CUES[CUES.length - 1].shot };
    if (i === 0) return { ...CUES[0].shot };
    const a = CUES[i - 1].shot, b = CUES[i].shot;
    // hold each shot for a while around its section centre, then blend
    const raw = clamp01((p - at[i - 1]) / Math.max(1e-6, at[i] - at[i - 1]));
    const t = ease(clamp01((raw - 0.18) / 0.64));
    const out = {} as Shot;
    for (const k of Object.keys(a) as (keyof Shot)[]) out[k] = a[k] + (b[k] - a[k]) * t;
    return out;
  }

  private distanceFor(frame: number) {
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const fitH = frame / 2 / Math.tan(vFov / 2);
    const fitW = frame / 2 / (Math.tan(vFov / 2) * this.camera.aspect);
    return Math.max(fitH, fitW);
  }

  // ── the loop ──────────────────────────────────────────────────────────────────────
  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min((now - this.last) / 1000, 1 / 20);
    this.last = now;
    this.update(dt);
    this.composer.render(dt);
    this.adapt(dt);
  };

  private update(dt: number) {
    // camera script: sample the cue list, then ease toward it every frame
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const target = this.sample(clamp01(scrollY / max));
    const k = dt === 0 || this.snap ? 1 : 1 - Math.exp(-dt * 5);
    for (const key of Object.keys(target) as (keyof Shot)[]) this.cur[key] += (target[key] - this.cur[key]) * k;
    const s = this.cur;

    // one clock drives every moving part
    const sdt = dt * s.timeScale; // slow motion is one multiply
    this.time += sdt;
    if (this.holding && !this.holdSpent) this.holdK = Math.min(1, this.holdK + dt / HOLD_SECONDS);
    else this.holdK = Math.max(0, this.holdK - dt * 2.5);
    const targetOmega = this.holding ? IDLE_OMEGA + (POWER_OMEGA - IDLE_OMEGA) * ease(this.holdK) : IDLE_OMEGA;
    this.omega += (targetOmega - this.omega) * (1 - Math.exp(-dt * (this.holding ? 3 : 0.9)));
    this.angle += this.omega * sdt;
    this.rotor.rotation.x = this.angle;
    this.sim.update(sdt, this.omega);
    this.sim.updateFlight(sdt);

    const beat = Math.floor(this.angle / BEAT);
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      this.sound.tick(this.omega);
    }
    if (this.sim.impacts > 0) {
      this.sound.rattle(this.sim.impacts * Math.min(1, s.timeScale * 3));
      this.sim.impacts = 0;
    }
    if (this.holding && this.holdK > 0 && this.holdK < 1 && Math.random() < dt * 8) this.sound.whoosh(this.holdK);
    if (this.holdK >= 1 && !this.holdSpent) {
      this.holdSpent = true;
      this.sound.hatch();
      this.sim.draw();
    }
    this.ui.onHold(this.holdK);
    this.mat.gem.emissive.set("#ff1a00");
    this.mat.gem.emissiveIntensity = 0.15 + this.holdK * 4;

    // exploded view: top parts leave first and come back last
    for (const p of this.parts) {
      const delay = (1 - p.order) * 0.42;
      const t = ease(clamp01((s.explode - delay) / 0.58));
      const lift = p.obj.parent === this.rotor ? this.v.copy(p.lift).applyAxisAngle(X_AXIS, -this.angle) : p.lift;
      p.obj.position.copy(p.base).addScaledVector(lift, t);
    }
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 1 - s.explode * 0.6;

    // cursor (or phone tilt) rotates the studio
    const px = this.pointer.x + this.tilt.x, py = this.pointer.y + this.tilt.y;
    this.pointerS.x += (px - this.pointerS.x) * (dt === 0 ? 1 : 1 - Math.exp(-dt * 3));
    this.pointerS.y += (py - this.pointerS.y) * (dt === 0 ? 1 : 1 - Math.exp(-dt * 3));
    this.scene.environmentRotation.set(this.pointerS.y * 0.45, -this.pointerS.x * 0.8, 0);

    // camera: frame by size, not distance
    const portrait = this.camera.aspect < 0.9;
    const d = this.distanceFor(s.frame * (portrait ? 1.22 : 1));
    const phi = THREE.MathUtils.degToRad(90 - s.polar - this.pointerS.y * 2);
    const theta = THREE.MathUtils.degToRad(s.azimuth + this.pointerS.x * 3);
    this.v.setFromSphericalCoords(d, phi, theta);
    this.camera.position.set(s.tx, s.ty, s.tz).add(this.v);
    this.camera.lookAt(s.tx, s.ty, s.tz);
    const w = innerWidth, h = innerHeight;
    const ox = portrait ? 0 : -s.offsetX * w;
    const oy = portrait ? h * 0.2 : 0;
    this.camera.setViewOffset(w, h, ox, oy, w, h);
    this.camera.updateMatrixWorld();

    this.layoutCallouts(s.explode * s.labels);
    this.updateReveals();
    (this.grain.uniforms.uTime as { value: number }).value = this.time % 100;
  }

  private layoutCallouts(e: number) {
    const vis = clamp01((e - 0.75) / 0.25);
    this.ui.labels.style.opacity = String(vis);
    this.ui.leaders.style.opacity = String(vis);
    if (vis <= 0) return;
    const w = innerWidth, h = innerHeight;
    const narrow = w < 720;
    const items = this.callouts.map((c) => {
      c.part.obj.localToWorld(this.v.copy(c.part.anchor));
      this.v.project(this.camera);
      return { c, x: (this.v.x * 0.5 + 0.5) * w, y: (-this.v.y * 0.5 + 0.5) * h };
    });
    items.sort((a, b) => a.x - b.x);
    const half = Math.ceil(items.length / 2);
    const cols = [items.slice(0, half), items.slice(half)];
    const gap = narrow ? 40 : 54;
    const top = narrow ? h * 0.1 : 96, bottom = narrow ? h * 0.5 : h - 280;
    cols.forEach((col, side) => {
      col.sort((a, b) => a.y - b.y);
      let y = top;
      const placed = col.map((it) => {
        const ly = Math.max(it.y, y);
        y = ly + gap;
        return ly;
      });
      const overflow = placed.length ? placed[placed.length - 1] - bottom : 0;
      col.forEach((it, i) => {
        const ly = Math.max(top, placed[i] - Math.max(0, overflow));
        const el = it.c.el;
        const ew = el.offsetWidth;
        const edge = narrow ? 12 : 40;
        const lx = side === 0 ? edge : w - edge - ew;
        el.style.transform = `translate(${lx}px, ${ly - 16}px)`;
        el.dataset.side = side === 0 ? "l" : "r";
        const ax = side === 0 ? lx + ew + 8 : lx - 8;
        const knee = side === 0 ? ax + 24 : ax - 24;
        it.c.line.setAttribute("points", `${ax},${ly} ${knee},${ly} ${it.x},${it.y}`);
        it.c.dot.setAttribute("cx", String(it.x));
        it.c.dot.setAttribute("cy", String(it.y));
      });
    });
  }

  /** Text reveals are driven from scroll position (observers skip beats on heavy GPU frames). */
  private updateReveals() {
    const h = innerHeight;
    for (const el of this.reveals) {
      const r = el.getBoundingClientRect();
      const k = clamp01((h * 0.98 - r.top) / (h * 0.2));
      el.style.setProperty("--k", k.toFixed(3));
    }
  }

  /** Adaptive quality: under 40 fps step resolution down, then switch bloom off. */
  private adapt(dt: number) {
    this.sinceStart += dt;
    this.fpsFrames++;
    this.fpsAcc += dt;
    if (this.fpsAcc < 2) return;
    const fps = this.fpsFrames / this.fpsAcc;
    this.fpsFrames = 0;
    this.fpsAcc = 0;
    this.ui.onFps?.(fps, this.pr, this.bloom.enabled);
    if (this.sinceStart < 3 || document.hidden) return;
    if (fps < 40) {
      if (this.pr > 1) {
        this.pr = Math.max(1, this.pr - 0.25);
        this.renderer.setPixelRatio(this.pr);
        this.resize();
      } else if (this.bloom.enabled) this.bloom.enabled = false;
    }
  }

  /** Debug: draw a ball now. */
  debugDraw() {
    this.sim.draw();
  }

  refreshLayout() {
    this.resize();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    removeEventListener("resize", this.resize);
    removeEventListener("pointermove", this.onPointer);
    removeEventListener("deviceorientation", this.onTilt);
    this.ui.labels.innerHTML = "";
    this.ui.leaders.innerHTML = "";
    this.renderer?.dispose();
    void this.sound.ctx?.close();
  }
}
