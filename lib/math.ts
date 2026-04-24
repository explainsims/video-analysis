export type Vec2 = [number, number];

export interface Calibration {
  p1: Vec2;
  p2: Vec2;
  realWorldMeters: number;
}

export interface Axes {
  originPx: Vec2;
  rotationRad: number;
}

export function metersPerPixel(cal: Calibration): number {
  const dx = cal.p2[0] - cal.p1[0];
  const dy = cal.p2[1] - cal.p1[1];
  const pxDist = Math.hypot(dx, dy);
  if (pxDist === 0) return 0;
  return cal.realWorldMeters / pxDist;
}

/**
 * Convert raw pixel coords → physics axis frame (meters, rotated, y-up).
 * Image y grows downward, so we flip y before rotation.
 */
export function toAxisFrame(pPx: Vec2, axes: Axes, mPerPx: number): Vec2 {
  const dx = (pPx[0] - axes.originPx[0]) * mPerPx;
  const dy = -(pPx[1] - axes.originPx[1]) * mPerPx; // flip to y-up
  const c = Math.cos(axes.rotationRad);
  const s = Math.sin(axes.rotationRad);
  return [dx * c + dy * s, -dx * s + dy * c];
}

/**
 * Inverse of toAxisFrame: physics-frame meters → raw pixel coords.
 * Used for drawing rotated axes/grids back onto the canvas.
 */
export function fromAxisFrame([x, y]: Vec2, axes: Axes, mPerPx: number): Vec2 {
  if (mPerPx === 0) return axes.originPx;
  const c = Math.cos(axes.rotationRad);
  const s = Math.sin(axes.rotationRad);
  // inverse rotation
  const dx = x * c - y * s;
  const dy = x * s + y * c;
  // unscale + flip y back to image coords
  return [axes.originPx[0] + dx / mPerPx, axes.originPx[1] - dy / mPerPx];
}

export interface Sample {
  t: number;
  x: number;
  y: number;
}

export interface Derived {
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  speed: number;
}

/**
 * Compute velocity and acceleration directly from position samples on a
 * potentially-irregular time grid (frames may skip due to step-size).
 *
 * - Velocity: central difference on positions.
 *   v[i] ≈ (x[i+1] - x[i-1]) / (t[i+1] - t[i-1])
 * - Acceleration: 3-point non-uniform second derivative on positions.
 *   For uniform spacing this reduces to (x[i+1] - 2x[i] + x[i-1]) / h^2,
 *   which is exact for quadratics — important for projectile / free-fall.
 *
 * Endpoints use one-sided (forward/backward) differences, which are less
 * accurate but unavoidable without extra samples.
 */
export function derive(samples: Sample[]): Derived[] {
  const n = samples.length;
  const out: Derived[] = new Array(n);
  if (n === 0) return out;

  const ts = samples.map((s) => s.t);
  const xs = samples.map((s) => s.x);
  const ys = samples.map((s) => s.y);

  for (let i = 0; i < n; i++) {
    let vx = 0,
      vy = 0,
      ax = 0,
      ay = 0;

    if (n >= 2) {
      // Velocity
      if (i === 0) {
        const dt = ts[1] - ts[0];
        if (dt !== 0) {
          vx = (xs[1] - xs[0]) / dt;
          vy = (ys[1] - ys[0]) / dt;
        }
      } else if (i === n - 1) {
        const dt = ts[n - 1] - ts[n - 2];
        if (dt !== 0) {
          vx = (xs[n - 1] - xs[n - 2]) / dt;
          vy = (ys[n - 1] - ys[n - 2]) / dt;
        }
      } else {
        const dt = ts[i + 1] - ts[i - 1];
        if (dt !== 0) {
          vx = (xs[i + 1] - xs[i - 1]) / dt;
          vy = (ys[i + 1] - ys[i - 1]) / dt;
        }
      }
    }

    // Acceleration: requires at least 3 samples for a real value at any i.
    if (n >= 3) {
      if (i === 0) {
        // Forward 3-point: same formula evaluated using i, i+1, i+2.
        ax = secondDerivNonUniform(ts[0], ts[1], ts[2], xs[0], xs[1], xs[2]);
        ay = secondDerivNonUniform(ts[0], ts[1], ts[2], ys[0], ys[1], ys[2]);
      } else if (i === n - 1) {
        ax = secondDerivNonUniform(
          ts[n - 3],
          ts[n - 2],
          ts[n - 1],
          xs[n - 3],
          xs[n - 2],
          xs[n - 1]
        );
        ay = secondDerivNonUniform(
          ts[n - 3],
          ts[n - 2],
          ts[n - 1],
          ys[n - 3],
          ys[n - 2],
          ys[n - 1]
        );
      } else {
        ax = secondDerivNonUniform(ts[i - 1], ts[i], ts[i + 1], xs[i - 1], xs[i], xs[i + 1]);
        ay = secondDerivNonUniform(ts[i - 1], ts[i], ts[i + 1], ys[i - 1], ys[i], ys[i + 1]);
      }
    }

    out[i] = { vx, vy, ax, ay, speed: Math.hypot(vx, vy) };
  }
  return out;
}

/**
 * Three-point second derivative of f at the middle node on a non-uniform grid.
 * Exact for any quadratic regardless of spacing.
 */
function secondDerivNonUniform(
  t0: number,
  t1: number,
  t2: number,
  f0: number,
  f1: number,
  f2: number
): number {
  const hMinus = t1 - t0;
  const hPlus = t2 - t1;
  const denom = hMinus * hPlus * (hMinus + hPlus);
  if (denom === 0) return 0;
  return (2 * (hMinus * f2 - (hMinus + hPlus) * f1 + hPlus * f0)) / denom;
}

export interface LinearFit {
  m: number;
  b: number;
  r2: number;
}

export function linearFit(xs: number[], ys: number[]): LinearFit {
  const n = xs.length;
  if (n < 2) return { m: 0, b: ys[0] ?? 0, r2: 0 };
  let sx = 0,
    sy = 0,
    sxx = 0,
    sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
    sxx += xs[i] * xs[i];
    sxy += xs[i] * ys[i];
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return { m: 0, b: sy / n, r2: 0 };
  const m = (n * sxy - sx * sy) / denom;
  const b = (sy - m * sx) / n;
  let ssRes = 0,
    ssTot = 0;
  const yMean = sy / n;
  for (let i = 0; i < n; i++) {
    const yi = m * xs[i] + b;
    ssRes += (ys[i] - yi) ** 2;
    ssTot += (ys[i] - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { m, b, r2 };
}
