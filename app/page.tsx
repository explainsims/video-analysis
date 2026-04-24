"use client";

import { useEffect, useRef } from "react";
import { GraphPane } from "@/components/GraphPane";
import { TablePane } from "@/components/TablePane";
import { Toolbar } from "@/components/Toolbar";
import { VideoPane } from "@/components/VideoPane";
import { effectiveFps, useAnalysisStore } from "@/lib/store";
import type { VideoEngine } from "@/lib/videoEngine";

export default function Page() {
  const engineRef = useRef<VideoEngine | null>(null);
  const stepSize = useAnalysisStore((s) => s.stepSize);
  const setSelectedFrame = useAnalysisStore((s) => s.setSelectedFrame);
  const fps = useAnalysisStore((s) => effectiveFps(s));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      const eng = engineRef.current;
      if (!eng) return;
      if (e.key === " ") {
        e.preventDefault();
        eng.isPaused() ? eng.play() : eng.pause();
      } else if (e.key === "ArrowRight" || e.key === ".") {
        e.preventDefault();
        eng.stepBy(stepSize);
      } else if (e.key === "ArrowLeft" || e.key === ",") {
        e.preventDefault();
        eng.stepBy(-stepSize);
      } else if (e.key === "Home") {
        eng.seekToFrame(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepSize]);

  const seekToFrame = (n: number) => {
    engineRef.current?.seekToFrame(n);
    setSelectedFrame(n);
  };

  return (
    <main className="min-h-screen p-3 lg:p-4 flex flex-col gap-3">
      <Toolbar engineRef={engineRef} />
      <div className="flex-1 grid gap-3 grid-cols-1 lg:grid-cols-2 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="lg:row-span-1 min-h-[280px]">
          <VideoPane engineRef={engineRef} fps={fps} />
        </div>
        <div className="lg:row-span-1 min-h-[280px]">
          <GraphPane onScrub={seekToFrame} />
        </div>
        <div className="lg:col-span-2 min-h-[180px]">
          <TablePane onSelect={seekToFrame} />
        </div>
      </div>
    </main>
  );
}
