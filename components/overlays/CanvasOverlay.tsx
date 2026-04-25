"use client";

import { useEffect, useRef, type RefObject } from "react";
import { metersPerPixel, type Vec2 } from "@/lib/math";
import { pointerToImageCoords } from "@/lib/input";
import { deriveObject } from "@/lib/derived";
import { effectiveFps, useAnalysisStore } from "@/lib/store";
import type { VideoEngine } from "@/lib/videoEngine";

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  engineRef: RefObject<VideoEngine | null>;
  showTrails?: boolean;
  showVectors?: boolean;
}

const ROTATION_HANDLE_PX = 96;
const HANDLE_RADIUS_PX = 12;
const AXIS_DRAW_LEN_PX = 90;

/**
 * Image-space direction vectors for the physics axes given a physics-frame
 * rotation θ (CCW positive in standard math convention, with y-up).
 *
 * Image y grows downward, so we negate the y-component to map physics-up to
 * screen-up. y-axis is the x-axis rotated 90° CCW visually.
 */
function axisDirs(theta: number): { xDir: Vec2; yDir: Vec2 } {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  // physics +x = (cosθ, sinθ); screen vec = (cosθ, -sinθ) (y-flip)
  // physics +y is +x rotated 90° CCW visually; in screen coords with y-down
  // a 90° visual-CCW rotation maps (vx, vy) → (vy, -vx).
  // → ( -sinθ, -cosθ )
  return { xDir: [c, -s], yDir: [-s, -c] };
}

export function CanvasOverlay({
  videoRef,
  engineRef,
  showTrails = true,
  showVectors = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRotationRef = useRef(false);

  const video = useAnalysisStore((s) => s.video);
  const calibration = useAnalysisStore((s) => s.calibration);
  const axes = useAnalysisStore((s) => s.axes);
  const objects = useAnalysisStore((s) => s.objects);
  const activeObjectId = useAnalysisStore((s) => s.activeObjectId);
  const selectedFrame = useAnalysisStore((s) => s.selectedFrame);
  const mode = useAnalysisStore((s) => s.mode);
  const pendingP1 = useAnalysisStore((s) => s.pendingCalibrationP1);

  // Keep canvas backing-store size in sync with the displayed video box.
  useEffect(() => {
    const canvas = canvasRef.current;
    const v = videoRef.current;
    if (!canvas || !v) return;
    const update = () => {
      const rect = v.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      canvas.style.left = `${v.offsetLeft}px`;
      canvas.style.top = `${v.offsetTop}px`;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(v);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [videoRef]);

  // Redraw on any input change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;
    const sx = cssW / video.width;
    const sy = cssH / video.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const toCss = (p: Vec2): Vec2 => [p[0] * sx, p[1] * sy];

    // --- Calibration line ---
    if (calibration) {
      const a = toCss(calibration.p1);
      const b = toCss(calibration.p2);
      ctx.strokeStyle = "#FBBF24";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.setLineDash([]);
      drawHandle(ctx, a, "#FBBF24");
      drawHandle(ctx, b, "#FBBF24");
      ctx.fillStyle = "#FBBF24";
      ctx.font = "12px ui-monospace, monospace";
      ctx.fillText(
        `${calibration.realWorldMeters} m`,
        (a[0] + b[0]) / 2 + 6,
        (a[1] + b[1]) / 2 - 6
      );
    }

    if (mode === "calibrate" && pendingP1) {
      drawHandle(ctx, toCss(pendingP1), "#FBBF24");
    }

    // --- Axes (rigid 90° pair, always perpendicular) ---
    {
      const o = toCss(axes.originPx);
      const { xDir, yDir } = axisDirs(axes.rotationRad);
      const xEnd: Vec2 = [o[0] + AXIS_DRAW_LEN_PX * xDir[0], o[1] + AXIS_DRAW_LEN_PX * xDir[1]];
      const yEnd: Vec2 = [o[0] + AXIS_DRAW_LEN_PX * yDir[0], o[1] + AXIS_DRAW_LEN_PX * yDir[1]];

      // x axis (cyan, solid)
      ctx.strokeStyle = "rgba(34, 211, 238, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(o[0], o[1]);
      ctx.lineTo(xEnd[0], xEnd[1]);
      ctx.stroke();
      drawArrowHead(ctx, o, xEnd, "rgba(34, 211, 238, 0.9)");

      // y axis (cyan, dimmer)
      ctx.strokeStyle = "rgba(34, 211, 238, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(o[0], o[1]);
      ctx.lineTo(yEnd[0], yEnd[1]);
      ctx.stroke();
      drawArrowHead(ctx, o, yEnd, "rgba(34, 211, 238, 0.6)");

      // Origin marker
      ctx.fillStyle = "#22D3EE";
      ctx.beginPath();
      ctx.arc(o[0], o[1], 4, 0, Math.PI * 2);
      ctx.fill();

      // Rotation handle along +x at fixed CSS distance, with "+x" label inside.
      const handle: Vec2 = [
        o[0] + ROTATION_HANDLE_PX * xDir[0],
        o[1] + ROTATION_HANDLE_PX * xDir[1],
      ];
      const dragging = draggingRotationRef.current;
      ctx.fillStyle = dragging ? "#FBBF24" : "#22D3EE";
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(handle[0], handle[1], HANDLE_RADIUS_PX, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#0B0B12";
      ctx.font = "bold 11px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+x", handle[0], handle[1] + 0.5);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    }

    // --- Tracked points ---
    for (const obj of objects) {
      ctx.fillStyle = obj.color;
      ctx.strokeStyle = obj.color;
      ctx.lineWidth = 1.5;
      if (showTrails && obj.points.length > 1) {
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        const first = toCss([obj.points[0].xPx, obj.points[0].yPx]);
        ctx.moveTo(first[0], first[1]);
        for (let i = 1; i < obj.points.length; i++) {
          const p = toCss([obj.points[i].xPx, obj.points[i].yPx]);
          ctx.lineTo(p[0], p[1]);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      for (const pt of obj.points) {
        const p = toCss([pt.xPx, pt.yPx]);
        const isCurrent = pt.frame === selectedFrame;
        ctx.beginPath();
        ctx.arc(p[0], p[1], isCurrent ? 6 : 3, 0, Math.PI * 2);
        ctx.fill();
        if (isCurrent && obj.id === activeObjectId) {
          ctx.beginPath();
          ctx.arc(p[0], p[1], 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // --- Velocity vector overlay (active object, current frame) ---
    if (showVectors && calibration) {
      const obj = objects.find((o) => o.id === activeObjectId);
      const cur = obj?.points.find((p) => p.frame === selectedFrame);
      if (obj && cur) {
        const derived = deriveObject(obj, calibration, axes);
        const d = derived.find((r) => r.frame === selectedFrame);
        if (d) {
          // Convert physics-frame velocity (m/s) into image-pixel direction.
          // The same axisDirs mapping (physics → image) applies to vectors:
          //   image_dx = vx * xDir + vy * yDir.
          const { xDir, yDir } = axisDirs(axes.rotationRad);
          const mPerPx = metersPerPixel(calibration);
          // Length of the velocity vector in image pixels per second.
          const ARROW_SECONDS = 0.5; // arrow length = how far the object travels in 0.5 s
          const lenScale = ARROW_SECONDS / mPerPx;
          const ivx = (d.vx * xDir[0] + d.vy * yDir[0]) * lenScale;
          const ivy = (d.vx * xDir[1] + d.vy * yDir[1]) * lenScale;
          const tail = toCss([cur.xPx, cur.yPx]);
          const tip: Vec2 = [tail[0] + ivx * sx, tail[1] + ivy * sy];
          if (Math.hypot(tip[0] - tail[0], tip[1] - tail[1]) > 4) {
            ctx.strokeStyle = obj.color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(tail[0], tail[1]);
            ctx.lineTo(tip[0], tip[1]);
            ctx.stroke();
            drawArrowHead(ctx, tail, tip, obj.color);
          }
        }
      }
    }

    function drawHandle(c: CanvasRenderingContext2D, p: Vec2, color: string) {
      c.fillStyle = color;
      c.strokeStyle = "rgba(0,0,0,0.5)";
      c.lineWidth = 1;
      c.beginPath();
      c.arc(p[0], p[1], 5, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    function drawArrowHead(c: CanvasRenderingContext2D, from: Vec2, to: Vec2, color: string) {
      const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
      const size = 8;
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(to[0], to[1]);
      c.lineTo(to[0] - size * Math.cos(ang - 0.4), to[1] - size * Math.sin(ang - 0.4));
      c.lineTo(to[0] - size * Math.cos(ang + 0.4), to[1] - size * Math.sin(ang + 0.4));
      c.closePath();
      c.fill();
    }
    void sx;
    void sy;
  }, [video, calibration, axes, objects, activeObjectId, selectedFrame, mode, pendingP1, showTrails, showVectors]);

  // Hit-test the rotation handle in CSS coords against the current canvas.
  const isOnRotationHandle = (cssX: number, cssY: number): boolean => {
    const v = video;
    const canvas = canvasRef.current;
    if (!v || !canvas) return false;
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width / v.width;
    const sy = rect.height / v.height;
    const oCss: Vec2 = [axes.originPx[0] * sx, axes.originPx[1] * sy];
    const { xDir } = axisDirs(axes.rotationRad);
    const handle: Vec2 = [
      oCss[0] + ROTATION_HANDLE_PX * xDir[0],
      oCss[1] + ROTATION_HANDLE_PX * xDir[1],
    ];
    return Math.hypot(cssX - handle[0], cssY - handle[1]) <= HANDLE_RADIUS_PX + 4;
  };

  const updateRotationFromImagePoint = (ix: number, iy: number) => {
    const state = useAnalysisStore.getState();
    const dx = ix - state.axes.originPx[0];
    const dy = iy - state.axes.originPx[1];
    // Physics convention: y-up, so flip image-y. θ = atan2(dy_phys, dx).
    state.setRotation(Math.atan2(-dy, dx));
  };

  // ---- Pointer interaction ----
  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !video) return;

    const rect = canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const [ix, iy] = pointerToImageCoords(e, canvas, video.width, video.height);
    const state = useAnalysisStore.getState();

    // Rotation handle drag is always available regardless of mode (it's a
    // direct-manipulation widget, not a separate tool).
    if (state.mode === "idle" && isOnRotationHandle(cssX, cssY)) {
      canvas.setPointerCapture(e.pointerId);
      draggingRotationRef.current = true;
      updateRotationFromImagePoint(ix, iy);
      // trigger redraw to highlight the handle
      state.setMode("idle");
      return;
    }

    if (state.mode === "calibrate") {
      if (!state.pendingCalibrationP1) {
        state.setPendingCalibrationP1([ix, iy]);
      } else {
        const meters = window.prompt(
          "Real-world distance between the two points (meters):",
          "1.0"
        );
        const m = meters ? Number(meters) : NaN;
        if (Number.isFinite(m) && m > 0) {
          state.setCalibration({
            p1: state.pendingCalibrationP1,
            p2: [ix, iy],
            realWorldMeters: m,
          });
        }
        state.setPendingCalibrationP1(null);
        state.setMode("idle");
      }
      return;
    }

    if (state.mode === "setOrigin") {
      state.setOrigin([ix, iy]);
      state.setMode("idle");
      return;
    }

    if (state.mode === "track" && state.calibration) {
      const fpsNow = effectiveFps(state);
      state.addPoint(state.selectedFrame, state.selectedFrame / fpsNow, ix, iy);
      // Advance through the engine (same path as the toolbar step buttons).
      // Using engineRef.stepBy keeps the rVFC → setSelectedFrame loop healthy
      // and avoids races between direct currentTime writes and the engine's
      // internal lastEmittedFrame tracking.
      engineRef.current?.stepBy(state.stepSize);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !video) return;
    if (draggingRotationRef.current) {
      const [ix, iy] = pointerToImageCoords(e, canvas, video.width, video.height);
      updateRotationFromImagePoint(ix, iy);
      return;
    }
    // hover affordance for the handle when idle
    if (mode === "idle") {
      const rect = canvas.getBoundingClientRect();
      const cssX = e.clientX - rect.left;
      const cssY = e.clientY - rect.top;
      canvas.style.cursor = isOnRotationHandle(cssX, cssY) ? "grab" : "default";
    }
  };

  const onPointerUp = () => {
    if (draggingRotationRef.current) {
      draggingRotationRef.current = false;
      // force a redraw so the handle returns to its idle color
      useAnalysisStore.getState().setMode("idle");
    }
  };

  const interactive = mode !== "idle" || video !== null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute"
      style={{
        pointerEvents: interactive ? "auto" : "none",
        touchAction: "none",
        cursor: mode !== "idle" ? "crosshair" : "default",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
