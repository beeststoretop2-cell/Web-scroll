/**
 * Camera script. Each cue is pinned to a page section ([data-cue="id"]); `at` is computed
 * from the DOM so the shot lands exactly when that section is centred.
 *
 * frame     mm that must fit on screen (frame by size, not distance)
 * polar     camera elevation in degrees
 * azimuth   degrees around the vertical axis (0 = front, + = crank side)
 * offsetX   where the object sits horizontally (fraction of the viewport, + = right)
 * explode   0 assembled → 1 exploded
 * timeScale simulation speed (1/12 = slow motion)
 * labels    callouts visible (0/1)
 * tx,ty,tz  look-at target in mm
 */
export type Shot = {
  frame: number; polar: number; azimuth: number; offsetX: number;
  explode: number; timeScale: number; labels: number; tx: number; ty: number; tz: number;
};
export type Cue = { id: string; shot: Shot };

export const CUES: Cue[] = [
  { id: "hero",    shot: { frame: 640,  polar: 14, azimuth: 32,  offsetX: 0.17,  explode: 0, timeScale: 1,      labels: 0, tx: 0,   ty: -45,  tz: 0 } },
  { id: "close",   shot: { frame: 330,  polar: 26, azimuth: 14,  offsetX: -0.2,  explode: 0, timeScale: 1 / 12, labels: 0, tx: -20, ty: -75,  tz: 0 } },
  { id: "apart",   shot: { frame: 1250, polar: 30, azimuth: 38,  offsetX: 0,     explode: 1, timeScale: 1,      labels: 1, tx: 40,  ty: -150, tz: 0 } },
  { id: "around",  shot: { frame: 1150, polar: 22, azimuth: 160, offsetX: -0.17, explode: 1, timeScale: 1,      labels: 0, tx: 40,  ty: -10,  tz: 0 } },
  { id: "rebuild", shot: { frame: 700,  polar: 18, azimuth: 300, offsetX: 0.17,  explode: 0, timeScale: 1,      labels: 0, tx: 0,   ty: -45,  tz: 0 } },
  { id: "outro",   shot: { frame: 960,  polar: 10, azimuth: 392, offsetX: 0,     explode: 0, timeScale: 1,      labels: 0, tx: 0,   ty: -215, tz: 0 } },
];
