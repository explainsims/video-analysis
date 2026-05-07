"use client";

import { useEffect, useRef } from "react";
import { ActionRibbon } from "@/components/ActionRibbon";
import { CustomTablePane } from "@/components/CustomTablePane";
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
  const fitToWindow = useAnalysisStore((s) => s.fitToWindow);
  const showCustomTable = useAnalysisStore((s) => s.showCustomTable);

  const mainClass = fitToWindow
    ? "h-screen overflow-hidden flex flex-col bg-bg"
    : "min-h-screen flex flex-col bg-bg";
  const splitMinRow = fitToWindow ? 0 : 280;
  const tableMinRow = fitToWindow ? 0 : 180;

  return (
    <main className={mainClass}>
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
          className="flex-1 grid gap-4 p-4 grid-cols-1 lg:grid-cols-[1.55fr_1fr] min-h-0"
          style={{
            gridTemplateRows: `minmax(${splitMinRow}px, 1fr) minmax(${tableMinRow}px, ${
              fitToWindow ? "1fr" : "auto"
            })`,
          }}
        >
          <div
            className="min-w-0 min-h-0"
            style={{ minHeight: fitToWindow ? 0 : 280 }}
          >
            <VideoPane engineRef={engineRef} fps={fps} />
          </div>
          <div
            className="min-w-0 min-h-0"
            style={{ minHeight: fitToWindow ? 0 : 280 }}
          >
            <GraphPane onScrub={seekToFrame} />
          </div>
          <div
            className={`lg:col-span-2 min-w-0 min-h-0 grid gap-4 ${
              showCustomTable ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
            }`}
            style={{ minHeight: fitToWindow ? 0 : 180 }}
          >
            <div className="min-w-0 min-h-0">
              <TablePane onSelect={seekToFrame} />
            </div>
            {showCustomTable && (
              <div className="min-w-0 min-h-0">
                <CustomTablePane />
              </div>
            )}
          </div>
        </div>
      )}
      <Modals />
    </main>
  );
}
