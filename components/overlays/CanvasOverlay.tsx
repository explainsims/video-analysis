"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { type Vec2 } from "@/lib/math";
import { pointerToImageCoords } from "@/lib/input";
import { showPrompt } from "@/lib/modal";
import { effectiveFps, useAnalysisStore } from "@/lib/store";
import type { VideoEngine } from "@/lib/videoEngine";

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  engineRef: RefObject<VideoEngine | null>;
}

const POINT_HIT_RADIUS_PX = 10;

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

export function CanvasOverlay({ videoRef, engineRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRotationRef = useRef(false);
  // Live cursor position (in image coords) for the calibrate preview line.
  const [calibrateHover, setCalibrateHover] = useState<Vec2 | null>(null);

  const video = useAnalysisStore((s) => s.video);
  const calibration = useAnalysisStore((s) => s.calibration);
  const axes = useAnalysisStore((s) => s.axes);
  const axesSet = useAnalysisStore((s) => s.axesSet);
  const showOverlays = useAnalysisStore((s) => s.showOverlays);
  const objects = useAnalysisStore((s) => s.objects);
  const activeObjectId = useAnalysisStore((s) => s.activeObjectId);
  const selectedFrame = useAnalysisStore((s) => s.selectedFrame);
  const mode = useAnalysisStore((s) => s.mode);
  const pendingP1 = useAnalysisStore((s) => s.pendingCalibrationP1);
  const selectedPoint = useAnalysisStore((s) => s.selectedPoint);

  // Clear the hover preview whenever we leave calibrate mode or commit p1.
  useEffect(() => {
    if (mode !== "calibrate" || !pendingP1) setCalibrateHover(null);
  }, [mode, pendingP1]);

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

    // --- Calibration line (committed) ---
    // Skipped while drawing a new calibration, and skipped entirely when
    // the user has hidden overlays.
    if (calibration && mode !== "calibrate" && showOverlays) {
      const a = toCss(calibration.p1);
      const b = toCss(calibration.p2);
      drawAlternatingDashedLine(ctx, a, b);
      drawBracket(ctx, a, b, "start");
      drawBracket(ctx, a, b, "end");
      ctx.fillStyle = "#1d2433";
      ctx.font = "bold 12px ui-monospace, monospace";
      ctx.fillText(
        `${calibration.realWorldMeters} m`,
        (a[0] + b[0]) / 2 + 8,
        (a[1] + b[1]) / 2 - 8
      );
    }

    // --- Calibration in progress: live preview from p1 to cursor ---
    if (mode === "calibrate" && pendingP1) {
      const a = toCss(pendingP1);
      const cursor = calibrateHover ? toCss(calibrateHover) : null;
      if (cursor) {
        drawAlternatingDashedLine(ctx, a, cursor);
        drawBracket(ctx, a, cursor, "end");
      }
      drawBracket(ctx, a, cursor ?? [a[0] + 1, a[1]], "start");
    }

    // --- Axes (rigid 90° pair) ---
    // Hidden until the user explicitly sets the origin (axesSet), hidden
    // during calibrate so it doesn't fight that tool for attention, and
    // hidden when the user has toggled overlays off.
    if (axesSet && mode !== "calibrate" && showOverlays) {
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

    // --- Tracked points (rendered as discrete dots — no connecting line) ---
    for (const obj of objects) {
      for (const pt of obj.points) {
        const p = toCss([pt.xPx, pt.yPx]);
        const isCurrent = pt.frame === selectedFrame;
        const isSelectedForDelete =
          selectedPoint != null &&
          selectedPoint.objectId === obj.id &&
          selectedPoint.frame === pt.frame;
        // While in delete mode, the selected point recolors red and gets
        // a thick ring so the user has clear feedback before pressing Delete.
        const fill = isSelectedForDelete ? "#dc2626" : obj.color;
        ctx.fillStyle = fill;
        ctx.strokeStyle = fill;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p[0], p[1], isSelectedForDelete ? 7 : isCurrent ? 6 : 3, 0, Math.PI * 2);
        ctx.fill();
        if (isSelectedForDelete) {
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(p[0], p[1], 13, 0, Math.PI * 2);
          ctx.stroke();
        } else if (isCurrent && obj.id === activeObjectId) {
          ctx.beginPath();
          ctx.arc(p[0], p[1], 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
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

    /**
     * Two-pass alternating yellow / black dashed line, so the calibration is
     * visible against both bright and dark video backgrounds. Dashes are short
     * (~2 px) — roughly a third of the prior committed-line dash length.
     */
    function drawAlternatingDashedLine(
      c: CanvasRenderingContext2D,
      a: Vec2,
      b: Vec2
    ) {
      const segLen = 2;
      c.lineWidth = 2.25;
      c.lineCap = "butt";
      c.setLineDash([segLen, segLen]);
      // Pass 1: yellow, no offset
      c.strokeStyle = "#FBBF24";
      c.lineDashOffset = 0;
      c.beginPath();
      c.moveTo(a[0], a[1]);
      c.lineTo(b[0], b[1]);
      c.stroke();
      // Pass 2: black, offset by one segment so it fills the gaps
      c.strokeStyle = "#0B0B12";
      c.lineDashOffset = segLen;
      c.beginPath();
      c.moveTo(a[0], a[1]);
      c.lineTo(b[0], b[1]);
      c.stroke();
      c.setLineDash([]);
      c.lineDashOffset = 0;
    }

    /**
     * Square-bracket marker at one end of a calibration line, oriented
     * perpendicular to the line. The bracket is drawn yellow with a thin
     * black halo so it reads against any backdrop. Faces inward toward the
     * other endpoint, so the [...] reads naturally as "between these".
     */
    function drawBracket(
      c: CanvasRenderingContext2D,
      from: Vec2,
      to: Vec2,
      which: "start" | "end"
    ) {
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      const len = Math.hypot(dx, dy);
      if (len < 1) return;
      // Tangent (along line, pointing from from→to) and normal.
      const tx = dx / len;
      const ty = dy / len;
      const nx = -ty;
      const ny = tx;
      // Geometry of the bracket: ascender length & cap length.
      const asc = 9; // perpendicular extent each side of the line
      const cap = 5; // tangential cap length, points inward (toward center)
      const p = which === "start" ? from : to;
      const inwardSign = which === "start" ? 1 : -1;
      const cx = inwardSign * tx * cap;
      const cy = inwardSign * ty * cap;
      const top: Vec2 = [p[0] + nx * asc, p[1] + ny * asc];
      const bot: Vec2 = [p[0] - nx * asc, p[1] - ny * asc];
      const topCap: Vec2 = [top[0] + cx, top[1] + cy];
      const botCap: Vec2 = [bot[0] + cx, bot[1] + cy];

      const path = () => {
        c.beginPath();
        c.moveTo(topCap[0], topCap[1]);
        c.lineTo(top[0], top[1]);
        c.lineTo(bot[0], bot[1]);
        c.lineTo(botCap[0], botCap[1]);
      };
      // Black halo (thicker, drawn first)
      c.lineCap = "round";
      c.lineJoin = "round";
      c.strokeStyle = "#0B0B12";
      c.lineWidth = 4;
      path();
      c.stroke();
      // Yellow body
      c.strokeStyle = "#FBBF24";
      c.lineWidth = 2;
      path();
      c.stroke();
    }
    void sx;
    void sy;
  }, [video, calibration, axes, axesSet, showOverlays, objects, activeObjectId, selectedFrame, mode, pendingP1, calibrateHover, selectedPoint]);

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

  /** Find the (objectId, frame) of the tracked point closest to the given
   *  CSS-space coordinate, within hit radius. Returns null if no hit. */
  const hitTestPoint = (cssX: number, cssY: number) => {
    const v = video;
    const canvas = canvasRef.current;
    if (!v || !canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width / v.width;
    const sy = rect.height / v.height;
    let best: { objectId: string; frame: number; dist: number } | null = null;
    for (const obj of objects) {
      for (const pt of obj.points) {
        const px = pt.xPx * sx;
        const py = pt.yPx * sy;
        const dist = Math.hypot(cssX - px, cssY - py);
        if (dist <= POINT_HIT_RADIUS_PX && (!best || dist < best.dist)) {
          best = { objectId: obj.id, frame: pt.frame, dist };
        }
      }
    }
    return best;
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
        setCalibrateHover([ix, iy]);
      } else {
        const p1 = state.pendingCalibrationP1;
        const p2: Vec2 = [ix, iy];
        // Ask for the real-world length in a themed modal.
        void (async () => {
          const v = await showPrompt({
            title: "How long is this line?",
            body: (
              <>
                Enter the real-world distance between the two endpoints, in
                meters. (1 m for a meter stick, 0.3048 for a foot, etc.)
              </>
            ),
            initialValue: "1.0",
            placeholder: "meters",
            type: "number",
            confirmLabel: "Set scale",
          });
          if (v === null) {
            // Cancelled — drop the pending point and exit calibrate.
            useAnalysisStore.getState().setPendingCalibrationP1(null);
            useAnalysisStore.getState().setMode("idle");
            setCalibrateHover(null);
            return;
          }
          const m = Number(v);
          const s = useAnalysisStore.getState();
          if (Number.isFinite(m) && m > 0) {
            s.setCalibration({ p1, p2, realWorldMeters: m });
          }
          s.setPendingCalibrationP1(null);
          s.setMode("idle");
          setCalibrateHover(null);
        })();
      }
      return;
    }

    if (state.mode === "setOrigin") {
      state.setOrigin([ix, iy]);
      state.setMode("idle");
      return;
    }

    if (state.mode === "delete") {
      const hit = hitTestPoint(cssX, cssY);
      // Hit a point → select it. Miss → clear any current selection.
      state.setSelectedPoint(hit ? { objectId: hit.objectId, frame: hit.frame } : null);
      return;
    }

    if (state.mode === "track" && state.calibration) {
      const fpsNow = effectiveFps(state);
      const eng = engineRef.current;
      // Use the engine's view of "what frame did we last seek to?" rather
      // than state.selectedFrame, which lags through requestVideoFrameCallback
      // and can be stale on heavy video — leading to addPoint overwriting the
      // previous point's slot when the user clicks faster than rVFC fires.
      const frame = eng ? eng.currentFrame() : state.selectedFrame;
      state.addPoint(frame, frame / fpsNow, ix, iy);
      eng?.stepBy(state.stepSize);
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
    if (mode === "calibrate" && pendingP1) {
      const [ix, iy] = pointerToImageCoords(e, canvas, video.width, video.height);
      setCalibrateHover([ix, iy]);
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
