"use client";

import { Aperture, Crosshair, Plus, Ruler, Target, Upload } from "lucide-react";
import { useRef } from "react";
import { loadVideoFile } from "@/lib/loadVideoFile";
import { showAlert, showModal, showPrompt } from "@/lib/modal";
import { downloadProject, exportProject, readProjectFile } from "@/lib/projectFile";
import { effectiveFps, useAnalysisStore, type Mode } from "@/lib/store";

const STEP_OPTIONS = [1, 2, 5];

type ToolId = "import" | "calibrate" | "setOrigin" | "track" | "auto";

interface ToolDef {
  id: ToolId;
  label: string;
  Icon: typeof Upload;
  cssColorVar: string;
  hex: string;
  /** Optional store mode this tool toggles. Import / auto have no mode. */
  mode?: Mode;
}

const TOOLS: ToolDef[] = [
  { id: "import", label: "New video", Icon: Upload, cssColorVar: "--color-brand", hex: "#2563eb" },
  { id: "calibrate", label: "Calibrate", Icon: Ruler, cssColorVar: "--color-tool-cal", hex: "#0891b2", mode: "calibrate" },
  { id: "setOrigin", label: "Set origin", Icon: Crosshair, cssColorVar: "--color-tool-origin", hex: "#7c3aed", mode: "setOrigin" },
  { id: "track", label: "Add point", Icon: Plus, cssColorVar: "--color-tool-add", hex: "#16a34a", mode: "track" },
  { id: "auto", label: "Auto-track", Icon: Target, cssColorVar: "--color-tool-auto", hex: "#ea580c" },
];

/** "Anything to lose" check: does the user have tracked points in any object? */
function hasUnsavedWork(state: ReturnType<typeof useAnalysisStore.getState>): boolean {
  return state.objects.some((o) => o.points.length > 0);
}

export function ActionRibbon() {
  const mode = useAnalysisStore((s) => s.mode);
  const setMode = useAnalysisStore((s) => s.setMode);
  const setCalibration = useAnalysisStore((s) => s.setCalibration);
  const setPendingCalibrationP1 = useAnalysisStore(
    (s) => s.setPendingCalibrationP1
  );
  const stepSize = useAnalysisStore((s) => s.stepSize);
  const setStepSize = useAnalysisStore((s) => s.setStepSize);
  const objects = useAnalysisStore((s) => s.objects);
  const activeObjectId = useAnalysisStore((s) => s.activeObjectId);
  const setActiveObject = useAnalysisStore((s) => s.setActiveObject);
  const addObject = useAnalysisStore((s) => s.addObject);
  const video = useAnalysisStore((s) => s.video);
  const fps = useAnalysisStore((s) => effectiveFps(s));
  const setFpsOverride = useAnalysisStore((s) => s.setFpsOverride);
  const calibration = useAnalysisStore((s) => s.calibration);
  const loadProject = useAnalysisStore((s) => s.loadProject);

  const importInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);

  const startImport = () => importInput.current?.click();

  const onNewVideo = async () => {
    const state = useAnalysisStore.getState();
    if (!hasUnsavedWork(state)) {
      startImport();
      return;
    }
    type Choice = "save" | "discard" | "cancel";
    const choice = await showModal<Choice>({
      title: "Save before loading a new video?",
      body: (
        <>
          You have tracking data in this session. Loading a new video will replace
          everything in this workspace.
        </>
      ),
      actions: [
        { label: "Cancel", value: "cancel", variant: "secondary" },
        { label: "Discard", value: "discard", variant: "danger" },
        { label: "Save & continue", value: "save", variant: "primary" },
      ],
      dismissValue: "cancel",
    });
    if (choice === "cancel") return;
    if (choice === "save") {
      const snap = exportProject(
        state,
        video?.filename?.replace(/\.[^.]+$/, "") ?? "project"
      );
      downloadProject(snap, `${snap.name || "project"}.motion`);
    }
    startImport();
  };

  const onTool = (t: ToolDef) => {
    if (t.id === "import") {
      void onNewVideo();
      return;
    }
    if (t.id === "auto") {
      void showAlert(
        "Auto-track — coming soon",
        "Template-matching auto-tracking lands in a follow-up release."
      );
      return;
    }
    if (!t.mode) return;
    if (t.id === "track" && !calibration) {
      void showAlert(
        "Calibrate first",
        "Set a real-world scale with the Calibrate tool so tracked points get meaningful units."
      );
      return;
    }
    // Toggle behavior. Entering calibrate clears any previous calibration so
    // the canvas isn't littered with the old line while drawing the new one.
    const goingTo = mode === t.mode ? "idle" : t.mode;
    if (goingTo === "calibrate") {
      setCalibration(null);
      setPendingCalibrationP1(null);
    }
    setMode(goingTo);
  };

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadVideoFile(f);
    e.target.value = "";
  };

  const onLoadProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const snap = await readProjectFile(file);
      loadProject(snap);
    } catch (err) {
      void showAlert(
        "Couldn't load .motion file",
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      e.target.value = "";
    }
  };

  const onFpsClick = async () => {
    if (!video) return;
    const v = await showPrompt({
      title: "Recording frame rate",
      body: (
        <>
          Browsers can't read fps from a video file directly. Common values: 24, 30,
          60, 120, 240. Defaults to 30 unless you set it here.
        </>
      ),
      initialValue: String(fps),
      type: "number",
      placeholder: "e.g. 60",
    });
    if (v === null) return;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) setFpsOverride(n);
  };

  return (
    <div
      className="flex items-center gap-2 px-5 py-3 flex-wrap"
      style={{
        background: "rgb(var(--color-bg-alt))",
        borderBottom: "1px solid rgb(var(--color-border) / 0.08)",
      }}
    >
      {TOOLS.map((t) => {
        const active = t.mode != null && mode === t.mode;
        const disabled = t.id !== "import" && !video;
        const Icon = t.Icon;
        const bg = active ? t.hex : "rgb(var(--color-surface))";
        const fg = active ? "#fff" : "rgb(var(--color-text))";
        const borderColor = active ? t.hex : "rgb(var(--color-border) / 0.15)";
        const iconBg = active ? "rgba(255,255,255,0.18)" : `${t.hex}1c`;
        const iconFg = active ? "#fff" : t.hex;
        return (
          <button
            key={t.id}
            onClick={() => onTool(t)}
            disabled={disabled}
            className="flex items-center gap-2 font-semibold text-[13px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition"
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: `1.5px solid ${borderColor}`,
              background: bg,
              color: fg,
              boxShadow: active
                ? `0 1px 0 rgba(0,0,0,0.06), 0 4px 12px ${t.hex}33`
                : "0 1px 0 rgba(0,0,0,0.04)",
            }}
          >
            <span
              className="flex items-center justify-center"
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: iconBg,
                color: iconFg,
              }}
            >
              <Icon size={13} strokeWidth={2.5} />
            </span>
            {t.label}
          </button>
        );
      })}

      <div
        className="self-stretch"
        style={{ width: 1, background: "rgb(var(--color-border) / 0.12)", margin: "0 4px" }}
      />

      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface"
        style={{ border: "1.5px solid rgb(var(--color-border) / 0.12)" }}
      >
        <span className="text-xs text-muted font-semibold">Step</span>
        {STEP_OPTIONS.map((n) => (
          <button
            key={n}
            onClick={() => setStepSize(n)}
            className="text-xs font-bold cursor-pointer rounded-full transition tabular"
            style={{
              padding: "2px 10px",
              background: stepSize === n ? "rgb(var(--color-text))" : "transparent",
              color: stepSize === n ? "rgb(var(--color-surface))" : "rgb(var(--color-muted))",
            }}
          >
            {n}
          </button>
        ))}
      </div>

      <button
        onClick={onFpsClick}
        disabled={!video}
        title="Click to change frame rate"
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ border: "1.5px solid rgb(var(--color-border) / 0.12)" }}
      >
        <span className="text-xs text-muted font-semibold">FPS</span>
        <span className="text-xs font-semibold tabular">{fps}</span>
      </button>

      <button
        onClick={() => projectInput.current?.click()}
        title="Load .motion file"
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface text-xs font-semibold text-muted hover:text-text transition"
        style={{ border: "1.5px solid rgb(var(--color-border) / 0.12)" }}
      >
        <Aperture size={13} /> Load .motion
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {objects.map((o) => {
          const active = o.id === activeObjectId;
          return (
            <button
              key={o.id}
              onClick={() => setActiveObject(o.id)}
              className="chip"
              style={{
                background: active ? `${o.color}1a` : "transparent",
                borderColor: active ? o.color : "rgb(var(--color-border) / 0.15)",
                color: active ? o.color : "rgb(var(--color-muted))",
              }}
              title={`Switch to ${o.name} (${o.points.length} points)`}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: o.color,
                  boxShadow: `0 0 0 2px ${o.color}33`,
                }}
              />
              {o.name}
            </button>
          );
        })}
        <button
          onClick={addObject}
          className="chip"
          style={{
            border: "1.5px dashed rgb(var(--color-border) / 0.25)",
            background: "transparent",
            color: "rgb(var(--color-muted))",
          }}
          title="Add another tracked object"
        >
          + object
        </button>
      </div>

      <input ref={importInput} type="file" accept="video/*" hidden onChange={onImport} />
      <input
        ref={projectInput}
        type="file"
        accept=".motion,application/json"
        hidden
        onChange={onLoadProject}
      />
    </div>
  );
}
