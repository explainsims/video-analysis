import { describe, expect, it } from "vitest";
import {
  derive,
  fromAxisFrame,
  linearFit,
  metersPerPixel,
  quadraticFit,
  toAxisFrame,
} from "../lib/math";

describe("metersPerPixel", () => {
  it("computes scale from a horizontal calibration line", () => {
    const m = metersPerPixel({ p1: [0, 0], p2: [100, 0], realWorldMeters: 1 });
    expect(m).toBeCloseTo(0.01, 10);
  });

  it("computes scale from a diagonal calibration line", () => {
    const m = metersPerPixel({ p1: [0, 0], p2: [3, 4], realWorldMeters: 5 });
    expect(m).toBeCloseTo(1, 10);
  });

  it("returns 0 if the two points coincide", () => {
    expect(
      metersPerPixel({ p1: [10, 10], p2: [10, 10], realWorldMeters: 1 })
    ).toBe(0);
  });
});

describe("toAxisFrame / fromAxisFrame", () => {
  const axes = { originPx: [100, 100] as [number, number], rotationRad: 0 };

  it("translates origin (no rotation, y-flip)", () => {
    const [x, y] = toAxisFrame([150, 80], axes, 0.01);
    expect(x).toBeCloseTo(0.5, 10);
    expect(y).toBeCloseTo(0.2, 10); // pixel-y above origin → positive physics-y
  });

  it("applies a 90deg rotation correctly", () => {
    // image-space point one meter to the right of origin (pixel-x +100)
    // after a +90deg axis rotation, the data should appear along physics +y
    const rotated = { originPx: [100, 100] as [number, number], rotationRad: Math.PI / 2 };
    const [x, y] = toAxisFrame([200, 100], rotated, 0.01);
    expect(x).toBeCloseTo(0, 10);
    expect(y).toBeCloseTo(-1, 10);
  });

  it("inverse round-trips for an arbitrary point", () => {
    const a = { originPx: [320, 240] as [number, number], rotationRad: -0.3 };
    const mPerPx = 0.005;
    const original: [number, number] = [400, 180];
    const physics = toAxisFrame(original, a, mPerPx);
    const back = fromAxisFrame(physics, a, mPerPx);
    expect(back[0]).toBeCloseTo(original[0], 6);
    expect(back[1]).toBeCloseTo(original[1], 6);
  });
});

describe("derive", () => {
  it("constant velocity → ~zero acceleration", () => {
    const samples = [0, 1, 2, 3, 4].map((t) => ({ t, x: 2 * t, y: 0 }));
    const d = derive(samples);
    for (const row of d) {
      expect(row.vx).toBeCloseTo(2, 10);
      expect(row.vy).toBeCloseTo(0, 10);
      expect(row.ax).toBeCloseTo(0, 10);
      expect(row.ay).toBeCloseTo(0, 10);
      expect(row.speed).toBeCloseTo(2, 10);
    }
  });

  it("constant acceleration → flat acceleration value", () => {
    // x = 0.5 * a * t^2, with a = 9.8
    const a = 9.8;
    const samples = [0, 0.1, 0.2, 0.3, 0.4, 0.5].map((t) => ({
      t,
      x: 0,
      y: 0.5 * a * t * t,
    }));
    const d = derive(samples);
    // central-difference on a quadratic gives the exact second derivative
    for (let i = 1; i < d.length - 1; i++) {
      expect(d[i].ay).toBeCloseTo(a, 6);
    }
  });

  it("handles single-point input", () => {
    const d = derive([{ t: 0, x: 0, y: 0 }]);
    expect(d).toHaveLength(1);
    expect(d[0].vx).toBe(0);
    expect(d[0].ax).toBe(0);
  });
});

describe("linearFit", () => {
  it("recovers a known slope and intercept", () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = xs.map((x) => 2.5 * x + 1.3);
    const fit = linearFit(xs, ys);
    expect(fit.m).toBeCloseTo(2.5, 10);
    expect(fit.b).toBeCloseTo(1.3, 10);
    expect(fit.r2).toBeCloseTo(1, 10);
  });
});

describe("quadraticFit", () => {
  it("recovers known A, B, C from a noiseless quadratic", () => {
    const xs = [-2, -1, 0, 1, 2, 3];
    const ys = xs.map((x) => 0.7 * x * x - 1.4 * x + 0.5);
    const fit = quadraticFit(xs, ys);
    expect(fit.A).toBeCloseTo(0.7, 8);
    expect(fit.B).toBeCloseTo(-1.4, 8);
    expect(fit.C).toBeCloseTo(0.5, 8);
    expect(fit.r2).toBeCloseTo(1, 8);
  });

  it("falls back to linear-equivalent on a perfect line", () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = xs.map((x) => 3 * x + 1);
    const fit = quadraticFit(xs, ys);
    expect(fit.A).toBeCloseTo(0, 8);
    expect(fit.B).toBeCloseTo(3, 8);
    expect(fit.C).toBeCloseTo(1, 8);
  });
});
