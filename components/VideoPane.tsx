"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  Film,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { CanvasOverlay } from "@/components/overlays/CanvasOverlay";
import { deriveObject } from "@/lib/derived";
import { loadVideoFile } from "@/lib/loadVideoFile";
import { showConfirm } from "@/lib/modal";
import { useAnalysisStore } from "@/lib/store";
import { VideoEngine } from "@/lib/videoEngine";

interface Props {
  engineRef: RefObject<VideoEngine | null>;
  fps: number;
}

export function VideoPane({ engineRef, fps }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [paused, setPaused] = useState(true);

  const videoUrl = useAnalysisStore((s) => s.videoUrl);
  const video = useAnalysisStore((s) => s.video);
  const setSelectedFrame = useAnalysisStore((s) => s.setSelectedFrame);
  const selectedFrame = useAnalysisStore((s) => s.selectedFrame);
  const stepSize = useAnalysisStore((s) => s.stepSize);
  const mode = useAnalysisStore((s) => s.mode);
  const objects = useAnalysisStore((s) => s.objects);
  const activeObjectId = useAnalysisStore((s) => s.activeObjectId);
  const calibration = useAnalysisStore((s) => s.calibration);
  const axes = useAnalysisStore((s) => s.axes);
  const axesSet = useAnalysisStore((s) => s.axesSet);
  const showOverlays = useAnalysisStore((s) => s.showOverlays);
  const setShowOverlays = useAnalysisStore((s) => s.setShowOverlays);
  const zeroFirstPoint = useAnalysisStore((s) => s.zeroFirstPoint);
  const setZeroFirstPoint = useAnalysisStore((s) => s.setZeroFirstPoint);
  const expandedPane = useAnalysisStore((s) => s.expandedPane);
  const setExpandedPane = useAnalysisStore((s) => s.setExpandedPane);
  const clearPoints = useAnalysisStore((s) => s.clearPoints);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoUrl) return;
    const eng = new VideoEngine(el, fps);
    engineRef.current = eng;
    const off = eng.onFrame(({ frame }) => setSelectedFrame(frame));
    return () => {
      off();
      eng.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl, engineRef, setSelectedFrame]);

  useEffect(() => {
    engineRef.current?.setFps(fps);
  }, [fps, engineRef]);

  useEffect(() => {
    const id = setInterval(
      () => setPaused(engineRef.current?.isPaused() ?? true),
      200
    );
    return () => clearInterval(id);
  }, [engineRef]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) loadVideoFile(f);
  };

  const togglePlay = () => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.isPaused() ? eng.play() : eng.pause();
    setPaused(eng.isPaused());
  };

  const active = objects.find((o) => o.id === activeObjectId);
  const derived =
    active && calibration
      ? deriveObject(active, calibration, axes, { zeroFirstPoint })
      : [];
  const cur = derived.find((d) => d.frame === selectedFrame);

  const sizeLabel =
    video && video.durationSec
      ? `${video.width}×${video.height} · ${video.durationSec.toFixed(1)}s`
      : null;

  const overlaysToggleEnabled = axesSet || calibration != null;
  const isExpanded = expandedPane === "video";

  const onClearActive = async () => {
    if (!active || active.points.length === 0) return;
    const ok = await showConfirm({
      title: `Clear all points for ${active.name}?`,
      body: `This will remove ${active.points.length} tracked ${
        active.points.length === 1 ? "point" : "points"
      }. The video and calibration are kept.`,
      confirmLabel: "Clear points",
      danger: true,
    });
    if (ok) clearPoints(active.id);
  };

  return (
    <div className="card h-full">
      {/* Header */}
      <div className="card-header">
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            background: video ? "#16a34a" : "rgb(var(--color-muted))",
          }}
        />
        <span>Video tracker</span>
        {sizeLabel && <span className="pill ml-1">{sizeLabel}</span>}
        <div className="flex-1" />
        <Toggle
          label="Show axes & calibration"
          on={showOverlays}
          onChange={setShowOverlays}
          disabled={!overlaysToggleEnabled}
          title={
            overlaysToggleEnabled
              ? "Hide or show the calibration line and the coordinate axes."
              : "Set the origin or calibrate first to enable this toggle."
          }
        />
        <Toggle
          label="Zero first point time"
          on={zeroFirstPoint}
          onChange={setZeroFirstPoint}
          title="When on, the first tracked point is taken as t = 0 and the same offset is subtracted from every other point. Off keeps actual video time."
        />
        {video && active && active.points.length > 0 && (
          <button
            onClick={onClearActive}
            className="btn-soft"
            style={{ padding: "5px 10px", fontSize: 11 }}
            title="Remove all tracked points for this object (keeps the video)"
          >
            <Trash2 size={12} /> Clear points
          </button>
        )}
        <button
          onClick={() => setExpandedPane(isExpanded ? null : "video")}
          className="btn-soft"
          style={{ padding: "5px 8px", fontSize: 11 }}
          title={isExpanded ? "Restore split layout" : "Expand to fill window"}
        >
          {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>

      {/* Video area */}
      <div
        className="relative flex-1 flex items-center justify-center bg-black/85"
        style={{ minHeight: 0 }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {!videoUrl ? (
          <label className="flex flex-col items-center gap-3 cursor-pointer text-white/60 hover:text-white transition">
            <Film size={48} />
            <div className="font-mono text-sm uppercase tracking-wider">
              Drop a video file here
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold"
              style={{ background: "rgb(var(--color-brand))", color: "#fff" }}
            >
              <Upload size={14} /> Choose file
            </div>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) loadVideoFile(f);
              }}
            />
          </label>
        ) : (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              className="max-w-full max-h-full"
              playsInline
              muted
              controls={false}
            />
            <CanvasOverlay videoRef={videoRef} engineRef={engineRef} />

            {cur && (
              <div className="absolute top-3 right-3 flex flex-col gap-1.5 pointer-events-none">
                <div
                  className="text-[11px] font-semibold tabular"
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.92)",
                    color: "#1d2433",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                  }}
                >
                  ({cur.x.toFixed(2)}, {cur.y.toFixed(2)}) m
                </div>
                <div
                  className="text-[11px] font-semibold tabular text-white"
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: `${active?.color ?? "#2563eb"}eb`,
                  }}
                >
                  v = {cur.speed.toFixed(2)} m/s
                </div>
              </div>
            )}

            {mode === "track" && (
              <div
                className="absolute bottom-3 left-3 text-[11px] font-bold tracking-wider uppercase pointer-events-none"
                style={{
                  padding: "4px 12px",
                  borderRadius: 999,
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                }}
              >
                Click on the object to add a point
              </div>
            )}
            {mode === "delete" && (
              <div
                className="absolute bottom-3 left-3 text-[11px] font-bold tracking-wider uppercase pointer-events-none"
                style={{
                  padding: "4px 12px",
                  borderRadius: 999,
                  background: "rgba(220,38,38,0.85)",
                  color: "#fff",
                }}
              >
                Click a point to select · press Delete to remove
              </div>
            )}
          </>
        )}
        {dragOver && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              border: "2px dashed rgb(var(--color-brand))",
              background: "rgb(var(--color-brand) / 0.10)",
            }}
          />
        )}
      </div>

      {/* Transport */}
      <div className="card-footer flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => engineRef.current?.seekToFrame(0)}
            disabled={!video}
            className="btn-soft disabled:opacity-50"
            title="Jump to first frame"
          >
            <ChevronsLeft size={14} />
          </button>
          <button
            onClick={() => engineRef.current?.stepBy(-stepSize)}
            disabled={!video}
            className="btn-soft disabled:opacity-50"
            title="Step back (,)"
          >
            <ChevronLeft size={14} /> {stepSize}
          </button>
          <button
            onClick={togglePlay}
            disabled={!video}
            className="btn-pill"
            style={{ background: "rgb(var(--color-brand))" }}
            title="Play / Pause (Space)"
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
            {paused ? "Play" : "Pause"}
          </button>
          <button
            onClick={() => engineRef.current?.stepBy(stepSize)}
            disabled={!video}
            className="btn-soft disabled:opacity-50"
            title="Step forward (.)"
          >
            {stepSize} <ChevronRight size={14} />
          </button>
          <div className="flex-1" />
          <span className="font-mono text-[11px] text-muted tabular">
            frame {selectedFrame}
            {video && ` / ${Math.max(1, Math.floor(video.durationSec * fps)) - 1}`}
          </span>
        </div>
        {video && (
          <input
            type="range"
            min={0}
            max={Math.max(0, Math.floor(video.durationSec * fps) - 1)}
            value={selectedFrame}
            onChange={(e) => {
              const n = Number(e.target.value);
              engineRef.current?.seekToFrame(n);
              setSelectedFrame(n);
            }}
            className="uml-scrubber w-full"
            aria-label="Video scrubber"
          />
        )}
      </div>
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
  disabled = false,
  title,
}: {
  label: string;
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      title={title}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition"
      style={{
        background: disabled
          ? "rgb(var(--color-border) / 0.04)"
          : on
          ? "rgb(var(--color-brand) / 0.10)"
          : "rgb(var(--color-border) / 0.06)",
        color: disabled
          ? "rgb(var(--color-muted) / 0.5)"
          : on
          ? "rgb(var(--color-brand))"
          : "rgb(var(--color-muted))",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <span
        style={{
          width: 22,
          height: 12,
          borderRadius: 999,
          background: disabled
            ? "rgb(var(--color-border) / 0.20)"
            : on
            ? "rgb(var(--color-brand))"
            : "rgb(var(--color-border) / 0.30)",
          position: "relative",
          flexShrink: 0,
          transition: "background 0.15s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 1,
            left: on ? 11 : 1,
            width: 10,
            height: 10,
            borderRadius: 5,
            background: "#fff",
            transition: "left 0.15s",
          }}
        />
      </span>
      {label}
    </button>
  );
}
