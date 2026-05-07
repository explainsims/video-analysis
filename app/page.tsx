"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActionRibbon } from "@/components/ActionRibbon";
import { CustomTablePane } from "@/components/CustomTablePane";
import { GraphPane } from "@/components/GraphPane";
import { Modals } from "@/components/Modals";
import { TablePane } from "@/components/TablePane";
import { TopBar } from "@/components/TopBar";
import { VideoPane } from "@/components/VideoPane";
import { effectiveFps, useAnalysisStore } from "@/lib/store";
import type { VideoEngine } from "@/lib/videoEngine";

// p-4 (top + bottom) + gap-4 between rows + minmax floor for the table row.
// Used to compute the pinned video-row height in default layout so the video
// pane keeps its initial size as users add data.
const TABLE_ROW_RESERVED_PX = 180; // empty-table card height
const PADDING_AND_GAP_PX = 16 + 16 + 16; // p-4 top + p-4 bottom + gap-4

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

  // Measure TopBar + ActionRibbon so the video row can be pinned to the size
  // it had at the empty/no-video state. Without pinning, the video pane shrinks
  // as the data table grows, which makes click placement annoying (every new
  // point repositions the video).
  const chromeRef = useRef<HTMLDivElement>(null);
  const [chromeH, setChromeH] = useState(140);
  useLayoutEffect(() => {
    const el = chromeRef.current;
    if (!el) return;
    const update = () => setChromeH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const pinnedTopRow = `calc(100vh - ${
    chromeH + TABLE_ROW_RESERVED_PX + PADDING_AND_GAP_PX
  }px)`;

  const mainClass = fitToWindow
    ? "h-screen overflow-hidden flex flex-col bg-bg"
    : "min-h-screen flex flex-col bg-bg";

  return (
    <main className={mainClass}>
      <div ref={chromeRef}>
        <TopBar />
        <ActionRibbon />
      </div>
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
      ) : fitToWindow ? (
        <div
          className="flex-1 grid gap-4 p-4 grid-cols-1 lg:grid-cols-[1.55fr_1fr] min-h-0"
          style={{ gridTemplateRows: "minmax(0, 1fr) minmax(0, auto)" }}
        >
          <div className="min-w-0 min-h-0">
            <VideoPane engineRef={engineRef} fps={fps} />
          </div>
          <div className="min-w-0 min-h-0">
            <GraphPane onScrub={seekToFrame} />
          </div>
          <div
            className={`lg:col-span-2 min-w-0 min-h-0 grid gap-4 ${
              showCustomTable ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
            }`}
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
      ) : (
        <div
          className="grid gap-4 p-4 grid-cols-1 lg:grid-cols-[1.55fr_1fr]"
          style={{
            gridTemplateRows: `minmax(320px, ${pinnedTopRow}) auto`,
          }}
        >
          <div className="min-w-0 min-h-0">
            <VideoPane engineRef={engineRef} fps={fps} />
          </div>
          <div className="min-w-0 min-h-0">
            <GraphPane onScrub={seekToFrame} />
          </div>
          <div
            className={`lg:col-span-2 min-w-0 grid gap-4 ${
              showCustomTable ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
            }`}
            style={{ minHeight: TABLE_ROW_RESERVED_PX }}
          >
            <div className="min-w-0">
              <TablePane onSelect={seekToFrame} />
            </div>
            {showCustomTable && (
              <div className="min-w-0">
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
