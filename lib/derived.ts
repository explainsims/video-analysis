import { derive, metersPerPixel, toAxisFrame, type Calibration, type Axes } from "./math";
import type { TrackedObject } from "./store";

export interface DerivedRow {
  frame: number;
  t: number;
  x: number; // meters in physics frame
  y: number;
  vx: number;
  vy: number;
  speed: number;
  ax: number;
  ay: number;
}

export function deriveObject(
  obj: TrackedObject,
  calibration: Calibration | null,
  axes: Axes
): DerivedRow[] {
  if (!calibration || obj.points.length === 0) return [];
  const mPerPx = metersPerPixel(calibration);
  const samples = obj.points.map((p) => {
    const [x, y] = toAxisFrame([p.xPx, p.yPx], axes, mPerPx);
    return { t: p.tSec, x, y };
  });
  const d = derive(samples);
  return obj.points.map((p, i) => ({
    frame: p.frame,
    t: p.tSec,
    x: samples[i].x,
    y: samples[i].y,
    vx: d[i].vx,
    vy: d[i].vy,
    speed: d[i].speed,
    ax: d[i].ax,
    ay: d[i].ay,
  }));
}
