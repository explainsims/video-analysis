"use client";

import {
  Crosshair,
  Download,
  Moon,
  Pause,
  Play,
  Plus,
  Ruler,
  Sun,
  Target,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { effectiveFps, useAnalysisStore } from "@/lib/store";
import { downloadProject, exportProject, readProjectFile } from "@/lib/projectFile";
import type { VideoEngine } from "@/lib/videoEngine";

const STEP_OPTIONS = [1, 2, 5, 10];

export function Toolbar({ engineRef }: { engineRef: RefObject<VideoEngine | null> }) {
  const mode = useAnalysisStore((s) => s.mode);
  const setMode = useAnalysisStore((s) => s.setMode);
  const stepSize = useAnalysisStore((s) => s.stepSize);
  const setStepSize = useAnalysisStore((s) => s.setStepSize);
  const objects = useAnalysisStore((s) => s.objects);
  const activeObjectId = useAnalysisStore((s) => s.activeObjectId);
  const setActiveObject = useAnalysisStore((s) => s.setActiveObject);
  const addObject = useAnalysisStore((s) => s.addObject);
  const removeObject = useAnalysisStore((s) => s.removeObject);
  const clearPoints = useAnalysisStore((s) => s.clearPoints);
  const video = useAnalysisStore((s) => s.video);
  const fps = useAnalysisStore((s) => effectiveFps(s));
  const setFpsOverride = useAnalysisStore((s) => s.setFpsOverride);
  const calibration = useAnalysisStore((s) => s.calibration);
  const loadProject = useAnalysisStore((s) => s.loadProject);

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [paused, setPaused] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = (localStorage.getItem("uml-theme") as "light" | "dark" | null) ?? "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setPaused(engineRef.current?.isPaused() ?? true), 200);
    return () => clearInterval(id);
  }, [engineRef]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("uml-theme", next);
  };

  const togglePlay = () => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.isPaused() ? eng.play() : eng.pause();
    setPaused(eng.isPaused());
  };

  const onSave = () => {
    const state = useAnalysisStore.getState();
    const snap = exportProject(state, video?.filename?.replace(/\.[^.]+$/, "") ?? "project");
    downloadProject(snap, `${snap.name || "project"}.motion`);
  };

  const onLoadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const snap = await readProjectFile(file);
      loadProject(snap);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      e.target.value = "";
    }
  };

  const calibrationLabel = calibration
    ? `${(calibration.realWorldMeters * 100).toFixed(0)} cm set`
    : "Not calibrated";

  return (
    <div className="glass rounded-xl px-3 py-2 flex flex-wrap items-center gap-2">
      <span className="font-display text-base font-bold tracking-tight pr-2 border-r border-border">
        Ultimate Motion Lab
      </span>
      <span className="pill">{calibrationLabel}</span>

      <div className="flex items-center gap-1 ml-1">
        <button className="btn" onClick={togglePlay} disabled={!video} title="Play / Pause (Space)">
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
        <button
          className="btn"
          onClick={() => engineRef.current?.stepBy(-stepSize)}
          disabled={!video}
          title="Step back (,)"
        >
          ◀ {stepSize}
        </button>
        <button
          className="btn"
          onClick={() => engineRef.current?.stepBy(stepSize)}
          disabled={!video}
          title="Step forward (.)"
        >
          {stepSize} ▶
        </button>
        <select
          className="input ml-1"
          value={stepSize}
          onChange={(e) => setStepSize(Number(e.target.value))}
          aria-label="Step size"
        >
          {STEP_OPTIONS.map((n) => (
            <option key={n} value={n}>
              step {n}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1 ml-2">
        <button
          className="btn"
          data-active={mode === "calibrate"}
          onClick={() => setMode(mode === "calibrate" ? "idle" : "calibrate")}
          disabled={!video}
          title="Calibrate scale (2-click line)"
        >
          <Ruler size={14} /> Calibrate
        </button>
        <button
          className="btn"
          data-active={mode === "setOrigin"}
          onClick={() => setMode(mode === "setOrigin" ? "idle" : "setOrigin")}
          disabled={!video}
          title="Set origin (then drag the +x handle to rotate)"
        >
          <Crosshair size={14} /> Origin
        </button>
        <button
          className="btn"
          data-active={mode === "track"}
          onClick={() => setMode(mode === "track" ? "idle" : "track")}
          disabled={!video || !calibration}
          title="Track points (click on video)"
        >
          <Target size={14} /> Track
        </button>
      </div>

      <div className="flex items-center gap-1 ml-2 border-l border-border pl-2">
        <select
          className="input"
          value={activeObjectId}
          onChange={(e) => setActiveObject(e.target.value)}
          aria-label="Active object"
        >
          {objects.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.points.length})
            </option>
          ))}
        </select>
        <button className="btn" onClick={addObject} title="Add object">
          <Plus size={14} />
        </button>
        <button
          className="btn"
          onClick={() => clearPoints(activeObjectId)}
          title="Clear points for active object"
        >
          <Trash2 size={14} />
        </button>
        {objects.length > 1 && (
          <button
            className="btn"
            onClick={() => removeObject(activeObjectId)}
            title="Remove active object"
          >
            ✕
          </button>
        )}
      </div>

      {video && (
        <div className="flex items-center gap-1 ml-2 border-l border-border pl-2">
          <span className="font-mono text-xs text-muted">fps</span>
          <input
            type="number"
            min={1}
            max={240}
            step={1}
            className="input w-16"
            value={fps}
            onChange={(e) => setFpsOverride(Number(e.target.value))}
          />
        </div>
      )}

      <div className="flex items-center gap-1 ml-auto">
        <input
          ref={fileInputRef}
          type="file"
          accept=".motion,application/json"
          className="hidden"
          onChange={onLoadFile}
        />
        <button className="btn" onClick={() => fileInputRef.current?.click()} title="Load .motion">
          <Upload size={14} /> Load
        </button>
        <button className="btn" onClick={onSave} disabled={!video} title="Save .motion">
          <Download size={14} /> Save
        </button>
        <button className="btn" onClick={toggleTheme} title="Toggle theme">
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </div>
  );
}
