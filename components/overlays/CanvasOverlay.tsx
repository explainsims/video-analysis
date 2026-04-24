"use client";

import { useEffect, useRef, type RefObject } from "react";
import { type Vec2 } from "@/lib/math";
import { pointerToImageCoords } from "@/lib/input";
import { effectiveFps, useAnalysisStore } from "@/lib/store";

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
}

const ROTATION_HANDLE_PX = 96;
const AXIS_DRAW_LEN_PX = 90;

export function CanvasOverlay({ videoRef }: Props) {
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

    // Pending calibration first-click marker
    if (mode === "calibrate" && pendingP1) {
      drawHandle(ctx, toCss(pendingP1), "#FBBF24");
    }

    // --- Axes (only meaningful once calibrated, but origin/rotation can be set early) ---
    {
      const o = toCss(axes.originPx);
      // x-axis direction in image space (image-y grows down → match toAxisFrame convention)
      const cosT = Math.cos(axes.rotationRad);
      const sinT = Math.sin(axes.rotationRad);
      // x-axis points along (cos, sin) in image-pixel space
      const xEnd: Vec2 = [o[0] + AXIS_DRAW_LEN_PX * cosT, o[1] + AXIS_DRAW_LEN_PX * sinT];
      // y-axis is +90deg from x in physics space, which in image-pixel space is (-sin, cos)
      // But image y is flipped, so visually we negate the image-y direction.
      const yEnd: Vec2 = [o[0] - AXIS_DRAW_LEN_PX * sinT, o[1] + AXIS_DRAW_LEN_PX * cosT];
      // Wait — the line above draws +y in physics down in image. We want +y to look "up" on
      // the screen for the physics frame. The actual image-pixel direction of physics +y is
      // the direction in which y-coordinate INCREASES when we move along it. From the math
      // module: y_phys = -dx*sinT + dy*cosT  with dy = -(pyPx - oPyPx). So an increase in
      // y_phys corresponds to image-pixel direction (-sinT, -cosT).
      const yEndUp: Vec2 = [o[0] - AXIS_DRAW_LEN_PX * sinT, o[1] - AXIS_DRAW_LEN_PX * cosT];
      void yEnd;

      // x axis (cyan, solid)
      ctx.strokeStyle = "rgba(34, 211, 238, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(o[0], o[1]);
      ctx.lineTo(xEnd[0], xEnd[1]);
      ctx.stroke();
      drawArrowHead(ctx, o, xEnd, "rgba(34, 211, 238, 0.9)");

      // y axis (cyan, dimmer)
      ctx.strokeStyle = "rgba(34, 211, 238, 0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(o[0], o[1]);
      ctx.lineTo(yEndUp[0], yEndUp[1]);
      ctx.stroke();
      drawArrowHead(ctx, o, yEndUp, "rgba(34, 211, 238, 0.55)");

      // Origin marker
      ctx.fillStyle = "#22D3EE";
      ctx.beginPath();
      ctx.arc(o[0], o[1], 4, 0, Math.PI * 2);
      ctx.fill();

      // Rotation handle along +x at fixed CSS distance
      const handle: Vec2 = [
        o[0] + ROTATION_HANDLE_PX * cosT,
        o[1] + ROTATION_HANDLE_PX * sinT,
      ];
      ctx.fillStyle = mode === "setRotation" ? "#FBBF24" : "rgba(34,211,238,0.85)";
      ctx.beginPath();
      ctx.arc(handle[0], handle[1], 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // --- Tracked points ---
    for (const obj of objects) {
      ctx.fillStyle = obj.color;
      ctx.strokeStyle = obj.color;
      ctx.lineWidth = 1.5;
      if (obj.points.length > 1) {
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
  }, [video, calibration, axes, objects, activeObjectId, selectedFrame, mode, pendingP1]);

  // ---- Pointer interaction ----
  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !video) return;
    canvas.setPointerCapture(e.pointerId);
    const [ix, iy] = pointerToImageCoords(e, canvas, video.width, video.height);
    const state = useAnalysisStore.getState();

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

    if (state.mode === "setRotation") {
      draggingRotationRef.current = true;
      const dx = ix - state.axes.originPx[0];
      const dy = iy - state.axes.originPx[1];
      state.setRotation(Math.atan2(dy, dx));
      return;
    }

    if (state.mode === "track" && state.calibration) {
      const fpsNow = effectiveFps(state);
      state.addPoint(state.selectedFrame, state.selectedFrame / fpsNow, ix, iy);
      const nextFrame = state.selectedFrame + state.stepSize;
      setTimeout(() => {
        const v = videoRef.current;
        if (!v) return;
        v.currentTime = (nextFrame + 0.5) / fpsNow;
      }, 0);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRotationRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas || !video) return;
    const [ix, iy] = pointerToImageCoords(e, canvas, video.width, video.height);
    const state = useAnalysisStore.getState();
    const dx = ix - state.axes.originPx[0];
    const dy = iy - state.axes.originPx[1];
    state.setRotation(Math.atan2(dy, dx));
  };

  const onPointerUp = () => {
    if (draggingRotationRef.current) {
      draggingRotationRef.current = false;
      useAnalysisStore.getState().setMode("idle");
    }
  };

  const interactive = mode !== "idle";

  return (
    <canvas
      ref={canvasRef}
      className="absolute"
      style={{
        pointerEvents: interactive ? "auto" : "none",
        touchAction: "none",
        cursor: interactive ? "crosshair" : "default",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
