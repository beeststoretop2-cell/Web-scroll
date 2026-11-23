import * as THREE from "three";

/**
 * Direction texture for anisotropy, generated at boot (no image files).
 * RG = brushing direction in tangent space, B = strength.
 * Tiny per-texel jitter gives the "brushed" grain.
 */
export function directionTexture(kind: "circular" | "radial" | "striped", size = 512) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size - 0.5, v = y / size - 0.5;
      const jitter = (Math.random() - 0.5) * 0.08;
      const a =
        kind === "circular" ? Math.atan2(v, u) + Math.PI / 2 + jitter
        : kind === "radial" ? Math.atan2(v, u) + jitter
        : jitter;
      const i = (y * size + x) * 4;
      data[i] = (Math.cos(a) * 0.5 + 0.5) * 255;
      data[i + 1] = (Math.sin(a) * 0.5 + 0.5) * 255;
      data[i + 2] = 200 + Math.random() * 55;
      data[i + 3] = 255;
    }
  const t = new THREE.DataTexture(data, size, size);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

/** Fit a texture to a part whose UVs are in millimetres (ExtrudeGeometry). */
function fitted(tex: THREE.Texture, sizeMM: number, centred = true) {
  const t = tex.clone();
  t.repeat.set(1 / sizeMM, 1 / sizeMM);
  if (centred) t.offset.set(0.5, 0.5);
  t.needsUpdate = true;
  return t;
}

export function createMaterials() {
  const circular = directionTexture("circular");
  const striped = directionTexture("striped");
  const radial = directionTexture("radial");

  const BRASS = "#c9a46a";
  const STEEL = "#a6a29c";

  const m = {
    // Brass: satin faces with circular brushing, polished edges
    brassSatinWheel: new THREE.MeshPhysicalMaterial({
      color: BRASS, metalness: 1, roughness: 0.3, anisotropy: 0.8, anisotropyMap: fitted(circular, 310),
    }),
    brassSatinCrank: new THREE.MeshPhysicalMaterial({
      color: BRASS, metalness: 1, roughness: 0.3, anisotropy: 0.8, anisotropyMap: fitted(striped, 60, false),
    }),
    brassSatinHatch: new THREE.MeshPhysicalMaterial({
      color: BRASS, metalness: 1, roughness: 0.32, anisotropy: 0.8, anisotropyMap: fitted(striped, 40, false),
    }),
    brassPolished: new THREE.MeshPhysicalMaterial({ color: "#e0bd82", metalness: 1, roughness: 0.07 }),
    // Steel: satin faces with linear brushing, polished edges
    steelSatin: new THREE.MeshPhysicalMaterial({
      color: STEEL, metalness: 1, roughness: 0.34, anisotropy: 0.6, anisotropyMap: fitted(striped, 120, false),
    }),
    steelPolished: new THREE.MeshPhysicalMaterial({ color: "#d4d0c9", metalness: 1, roughness: 0.06 }),
    // Heat-tinted steel axle (iridescence)
    heatTint: new THREE.MeshPhysicalMaterial({
      color: "#8f8a84", metalness: 1, roughness: 0.18, iridescence: 0.45, iridescenceIOR: 1.6,
      iridescenceThicknessMinimum: 280, iridescenceThicknessMaximum: 420,
    }),
    // Lacquer (clearcoat)
    lacquerRed: new THREE.MeshPhysicalMaterial({
      color: "#8a0a0a", metalness: 0, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.03,
    }),
    lacquerBlack: new THREE.MeshPhysicalMaterial({
      color: "#0c0b0b", metalness: 0, roughness: 0.45, clearcoat: 1, clearcoatRoughness: 0.04,
      anisotropy: 0.4, anisotropyMap: fitted(radial, 520),
    }),
    // Glass: reflects the studio only, added on top (no direct lights in the scene at all)
    glass: new THREE.MeshPhysicalMaterial({
      color: "#000000", metalness: 0, roughness: 0.02, envMapIntensity: 1.4,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
    // Red gem in the crank hub (IOR)
    gem: new THREE.MeshPhysicalMaterial({
      color: "#d40000", metalness: 0, roughness: 0, ior: 2.4, transmission: 0.6, thickness: 6,
      specularIntensity: 1, clearcoat: 1,
    }),
  };
  return m;
}

export type Materials = ReturnType<typeof createMaterials>;

/** Numbered ball texture (equirect): number printed front and back on a band. */
export function ballTexture(n: number, red: boolean) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = red ? "#b10e0e" : "#efe4cc";
  g.fillRect(0, 0, 256, 128);
  for (const cx of [64, 192]) {
    g.fillStyle = red ? "#efe4cc" : "#ffffff";
    g.beginPath(); g.ellipse(cx, 64, 30, 34, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = red ? "#8a0a0a" : "#b10e0e";
    g.font = "700 36px Inter, Arial, sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(String(n), cx, 66);
    if (n === 6 || n === 9) g.fillRect(cx - 9, 86, 18, 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
