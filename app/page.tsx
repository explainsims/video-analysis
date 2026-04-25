"use client";

import { useEffect, useRef } from "react";
import { ActionRibbon } from "@/components/ActionRibbon";
import { GraphPane } from "@/components/GraphPane";
import { Modals } from "@/components/Modals";
import { TablePane } from "@/components/TablePane";
import { TopBar } from "@/components/TopBar";
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
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      // Delete-point keyboard handler runs even without an engine
      if (e.key === "Delete" || e.key === "Backspace") {
        const state = useAnalysisStore.getState();
        if (state.mode === "delete" && state.selectedPoint) {
          e.preventDefault();
          state.removePoint(
            state.selectedPoint.objectId,
            state.selectedPoint.frame
          );
          state.setSelectedPoint(null);
          return;
        }
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

  const expandedPane = useAnalysisStore((s) => s.expandedPane);

  return (
    <main className="min-h-screen flex flex-col bg-bg">
      <TopBar />
      <ActionRibbon />
      {expandedPane ? (
        <div
          className="flex-1 grid p-4 gap-0 min-h-0 min-w-0"
          style={{ gridTemplateRows: "1fr", gridTemplateColumns: "1fr" }}
        >
          <div className="min-h-0 min-w-0">
            {expandedPane === "video" ? (
              <VideoPane engineRef={engineRef} fps={fps} />
            ) : (
              <GraphPane onScrub={seekToFrame} />
            )}
          </div>
        </div>
      ) : (
        <div
          className="flex-1 grid gap-4 p-4 grid-cols-1 lg:grid-cols-[1.55fr_1fr]"
          style={{ gridTemplateRows: "minmax(280px, 1fr) minmax(180px, auto)" }}
        >
          <div className="min-h-[280px] min-w-0">
            <VideoPane engineRef={engineRef} fps={fps} />
          </div>
          <div className="min-h-[280px] min-w-0">
            <GraphPane onScrub={seekToFrame} />
          </div>
          <div className="lg:col-span-2 min-h-[180px]">
            <TablePane onSelect={seekToFrame} />
          </div>
        </div>
      )}
      <Modals />
    </main>
  );
}
