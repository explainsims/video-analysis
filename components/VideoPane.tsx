"use client";

import { Film, Upload } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { CanvasOverlay } from "@/components/overlays/CanvasOverlay";
import { useAnalysisStore } from "@/lib/store";
import { VideoEngine } from "@/lib/videoEngine";

interface Props {
  engineRef: RefObject<VideoEngine | null>;
  fps: number;
}

export function VideoPane({ engineRef, fps }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const videoUrl = useAnalysisStore((s) => s.videoUrl);
  const video = useAnalysisStore((s) => s.video);
  const loadVideo = useAnalysisStore((s) => s.loadVideo);
  const setSelectedFrame = useAnalysisStore((s) => s.setSelectedFrame);

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
  }, [videoUrl, engineRef, setSelectedFrame, fps]);

  useEffect(() => {
    engineRef.current?.setFps(fps);
  }, [fps, engineRef]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("video/")) {
      alert("Please choose a video file.");
      return;
    }
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = url;
    probe.onloadedmetadata = () => {
      // Browsers don't expose true fps; ask the user (default 30, common for phones; 60 for slow-mo).
      const guess = window.prompt(
        `Video loaded: ${probe.videoWidth}×${probe.videoHeight}, ${probe.duration.toFixed(2)}s.\n\nWhat is the recording frame rate (fps)?\nCommon: 24, 30, 60, 120, 240.`,
        "30"
      );
      const parsed = guess ? Number(guess) : 30;
      const fps = Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
      loadVideo(url, {
        filename: file.name,
        durationSec: probe.duration,
        width: probe.videoWidth,
        height: probe.videoHeight,
        fps,
      });
    };
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div className="pane h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <span className="font-mono text-xs uppercase tracking-wider text-muted">Video</span>
        {video && (
          <span className="font-mono text-xs text-muted">
            {video.filename} · {video.width}×{video.height} · {fps} fps
          </span>
        )}
      </div>
      <div
        className="relative flex-1 flex items-center justify-center bg-black/30"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {!videoUrl ? (
          <label className="flex flex-col items-center gap-3 cursor-pointer text-muted hover:text-brand transition">
            <Film size={48} />
            <div className="font-mono text-sm uppercase tracking-wider">
              Drop a video file here
            </div>
            <div className="btn">
              <Upload size={14} /> Choose file
            </div>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
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
            <CanvasOverlay videoRef={videoRef} />
          </>
        )}
        {dragOver && (
          <div className="absolute inset-0 border-2 border-dashed border-brand bg-brand/10 pointer-events-none" />
        )}
      </div>
    </div>
  );
}
