"use client";

import { create } from "zustand";
import type { Axes, Calibration, Vec2 } from "./math";

export type Mode = "idle" | "calibrate" | "setOrigin" | "track" | "delete";

export interface SelectedPoint {
  objectId: string;
  frame: number;
}

export interface TrackedPoint {
  frame: number;
  tSec: number;
  xPx: number;
  yPx: number;
}

export interface TrackedObject {
  id: string;
  name: string;
  color: string;
  points: TrackedPoint[];
}

export interface VideoMeta {
  filename: string;
  durationSec: number;
  width: number;
  height: number;
  fps: number;
}

export interface AnalysisState {
  // Video
  videoUrl: string | null;
  video: VideoMeta | null;
  selectedFrame: number;

  // Coordinates
  calibration: Calibration | null;
  axes: Axes;
  /** True once the user has set the origin (or rotation). Until then, axes
   *  shouldn't be drawn — the default-centered axes were misleading users
   *  into thinking they were already configured. */
  axesSet: boolean;

  // Tracking
  objects: TrackedObject[];
  activeObjectId: string;
  stepSize: number;
  fpsOverride: number | null;

  // Display toggles
  /** Render axes & calibration markers on top of the video. */
  showOverlays: boolean;
  /** Treat the first tracked point's t as t=0 (subtracts the offset from
   *  every row). Useful when tracking starts mid-clip. */
  zeroFirstPoint: boolean;
  /** Manually-zeroed reference frame (the time displayed under the video is
   *  shown relative to this frame). Mutually exclusive with zeroFirstPoint —
   *  this lets users time experiments without placing tracking dots. */
  manualTimeZeroFrame: number | null;
  /** Which pane is full-screen-within-page, if any. */
  expandedPane: "video" | "graph" | null;
  /** When on, the whole app is constrained to the viewport so the entire
   *  interface stays visible on a single page (no scrolling). */
  fitToWindow: boolean;

  /** User-editable custom data table (independent of tracked points). */
  customTable: CustomTableData;
  /** Whether the custom data table pane is shown. */
  showCustomTable: boolean;

  /** User-editable project title (used for save / export filenames). */
  projectName: string;
  /** The currently-selected tracked point (only set when mode === 'delete'). */
  selectedPoint: SelectedPoint | null;
  /** Playback rate (1 = real time, 0.5 = half speed, etc.). */
  playSpeed: number;

  // UI
  mode: Mode;
  // Transient state for a multi-step calibration in progress
  pendingCalibrationP1: Vec2 | null;

  // Actions
  loadVideo: (url: string, meta: VideoMeta) => void;
  unloadVideo: () => void;
  setSelectedFrame: (n: number) => void;
  setMode: (m: Mode) => void;
  setStepSize: (n: number) => void;
  setFpsOverride: (fps: number | null) => void;

  setShowOverlays: (b: boolean) => void;
  setZeroFirstPoint: (b: boolean) => void;
  setManualTimeZeroFrame: (frame: number | null) => void;
  setExpandedPane: (p: "video" | "graph" | null) => void;
  setFitToWindow: (b: boolean) => void;

  setShowCustomTable: (b: boolean) => void;
  addCustomTableColumn: () => void;
  renameCustomTableColumn: (idx: number, name: string) => void;
  removeCustomTableColumn: (idx: number) => void;
  setCustomTableCell: (row: number, col: number, value: string) => void;
  removeCustomTableRow: (row: number) => void;
  clearCustomTable: () => void;

  setProjectName: (s: string) => void;
  setSelectedPoint: (p: SelectedPoint | null) => void;
  setPlaySpeed: (n: number) => void;

  setPendingCalibrationP1: (p: Vec2 | null) => void;
  setCalibration: (c: Calibration | null) => void;

  setOrigin: (p: Vec2) => void;
  setRotation: (rad: number) => void;

  setActiveObject: (id: string) => void;
  addObject: () => void;
  renameObject: (id: string, name: string) => void;
  removeObject: (id: string) => void;

  /** Add or replace the point for the active object at `frame`. */
  addPoint: (frame: number, tSec: number, xPx: number, yPx: number) => void;
  removePoint: (objectId: string, frame: number) => void;
  clearPoints: (objectId: string) => void;
  clearAllPoints: () => void;

  loadProject: (snapshot: ProjectSnapshot) => void;
  resetAll: () => void;
}

export interface ProjectSnapshot {
  schemaVersion: number;
  name: string;
  createdAt: string;
  video: VideoMeta & { driveFileId: string | null };
  calibration: Calibration | null;
  axes: Axes;
  axesSet?: boolean;
  settings: {
    stepSize: number;
    fpsOverride: number | null;
    zeroFirstPoint?: boolean;
  };
  objects: TrackedObject[];
}

const DEFAULT_AXES: Axes = { originPx: [0, 0], rotationRad: 0 };

const OBJECT_COLORS = ["#2563eb", "#db2777", "#7c3aed", "#16a34a", "#ea580c"];

export interface CustomTableData {
  columns: string[];
  rows: string[][];
}

function defaultCustomTable(): CustomTableData {
  return {
    columns: ["Column 1", "Column 2"],
    rows: [
      ["", ""],
      ["", ""],
    ],
  };
}

function ensureRowLength(row: string[], cols: number): string[] {
  if (row.length === cols) return row;
  if (row.length > cols) return row.slice(0, cols);
  return [...row, ...Array(cols - row.length).fill("")];
}

function newObject(index: number): TrackedObject {
  const letter = String.fromCharCode(65 + index);
  return {
    id: `obj-${letter}`,
    name: `Object ${letter}`,
    color: OBJECT_COLORS[index % OBJECT_COLORS.length],
    points: [],
  };
}

const initial = (): Pick<
  AnalysisState,
  | "videoUrl"
  | "video"
  | "selectedFrame"
  | "calibration"
  | "axes"
  | "axesSet"
  | "objects"
  | "activeObjectId"
  | "stepSize"
  | "fpsOverride"
  | "showOverlays"
  | "zeroFirstPoint"
  | "manualTimeZeroFrame"
  | "expandedPane"
  | "fitToWindow"
  | "customTable"
  | "showCustomTable"
  | "projectName"
  | "selectedPoint"
  | "playSpeed"
  | "mode"
  | "pendingCalibrationP1"
> => {
  const first = newObject(0);
  return {
    videoUrl: null,
    video: null,
    selectedFrame: 0,
    calibration: null,
    axes: DEFAULT_AXES,
    axesSet: false,
    objects: [first],
    activeObjectId: first.id,
    stepSize: 1,
    fpsOverride: null,
    showOverlays: true,
    zeroFirstPoint: false,
    manualTimeZeroFrame: null,
    expandedPane: null,
    fitToWindow: false,
    customTable: defaultCustomTable(),
    showCustomTable: false,
    projectName: "Untitled project",
    selectedPoint: null,
    playSpeed: 1,
    mode: "idle",
    pendingCalibrationP1: null,
  };
};

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  ...initial(),

  loadVideo: (url, meta) =>
    set((s) => ({
      videoUrl: url,
      video: meta,
      selectedFrame: 0,
      axes: { originPx: [meta.width / 2, meta.height / 2], rotationRad: 0 },
      axesSet: false,
      calibration: null,
      manualTimeZeroFrame: null,
      // If the user hasn't named the project yet, derive one from the file.
      projectName:
        s.projectName === "Untitled project" || s.projectName === ""
          ? meta.filename.replace(/\.[^.]+$/, "")
          : s.projectName,
    })),

  unloadVideo: () => {
    const url = get().videoUrl;
    if (url) URL.revokeObjectURL(url);
    set(initial());
  },

  setSelectedFrame: (n) => {
    if (n !== get().selectedFrame) set({ selectedFrame: n });
  },
  setMode: (m) =>
    set({ mode: m, pendingCalibrationP1: null, selectedPoint: null }),
  setStepSize: (n) => set({ stepSize: Math.max(1, Math.round(n)) }),
  setFpsOverride: (fps) => set({ fpsOverride: fps }),

  setShowOverlays: (b) => set({ showOverlays: b }),
  setZeroFirstPoint: (b) =>
    set((s) => ({
      zeroFirstPoint: b,
      // Switching to point-based zero clears any manual zero so the two
      // sources can't fight each other.
      manualTimeZeroFrame: b ? null : s.manualTimeZeroFrame,
    })),
  setManualTimeZeroFrame: (frame) => set({ manualTimeZeroFrame: frame }),
  setExpandedPane: (p) => set({ expandedPane: p }),
  setFitToWindow: (b) => set({ fitToWindow: b }),

  setShowCustomTable: (b) => set({ showCustomTable: b }),
  addCustomTableColumn: () =>
    set((s) => {
      const columns = [...s.customTable.columns, `Column ${s.customTable.columns.length + 1}`];
      const rows = s.customTable.rows.map((r) => [...r, ""]);
      return { customTable: { columns, rows } };
    }),
  renameCustomTableColumn: (idx, name) =>
    set((s) => {
      if (idx < 0 || idx >= s.customTable.columns.length) return s;
      const columns = s.customTable.columns.map((c, i) => (i === idx ? name : c));
      return { customTable: { ...s.customTable, columns } };
    }),
  removeCustomTableColumn: (idx) =>
    set((s) => {
      if (s.customTable.columns.length <= 1) return s;
      const columns = s.customTable.columns.filter((_, i) => i !== idx);
      const rows = s.customTable.rows.map((r) => r.filter((_, i) => i !== idx));
      return { customTable: { columns, rows } };
    }),
  setCustomTableCell: (row, col, value) =>
    set((s) => {
      const cols = s.customTable.columns.length;
      let rows = s.customTable.rows.map((r) => ensureRowLength([...r], cols));
      while (rows.length <= row) rows.push(Array(cols).fill(""));
      rows = rows.map((r, i) =>
        i === row ? r.map((c, j) => (j === col ? value : c)) : r
      );
      // Auto-add a trailing empty row when the user types into the last row.
      const last = rows[rows.length - 1];
      const lastIsEmpty = last.every((c) => c === "");
      if (!lastIsEmpty) rows.push(Array(cols).fill(""));
      return { customTable: { columns: s.customTable.columns, rows } };
    }),
  removeCustomTableRow: (row) =>
    set((s) => {
      if (row < 0 || row >= s.customTable.rows.length) return s;
      const rows = s.customTable.rows.filter((_, i) => i !== row);
      const cols = s.customTable.columns.length;
      // Always keep at least one empty trailing row so the user can add data.
      if (rows.length === 0) rows.push(Array(cols).fill(""));
      return { customTable: { ...s.customTable, rows } };
    }),
  clearCustomTable: () =>
    set(() => ({ customTable: defaultCustomTable() })),

  setProjectName: (s) => set({ projectName: s }),
  setSelectedPoint: (p) => set({ selectedPoint: p }),
  setPlaySpeed: (n) => set({ playSpeed: Math.max(0.05, Math.min(4, n)) }),

  setPendingCalibrationP1: (p) => set({ pendingCalibrationP1: p }),
  setCalibration: (c) => set({ calibration: c }),

  setOrigin: (p) =>
    set((s) => ({ axes: { ...s.axes, originPx: p }, axesSet: true })),
  setRotation: (rad) =>
    set((s) => ({ axes: { ...s.axes, rotationRad: rad }, axesSet: true })),

  setActiveObject: (id) => set({ activeObjectId: id }),
  addObject: () =>
    set((s) => {
      const next = newObject(s.objects.length);
      return { objects: [...s.objects, next], activeObjectId: next.id };
    }),
  renameObject: (id, name) =>
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? { ...o, name } : o)),
    })),
  removeObject: (id) =>
    set((s) => {
      if (s.objects.length <= 1) return s;
      const objects = s.objects.filter((o) => o.id !== id);
      const activeObjectId =
        s.activeObjectId === id ? objects[0].id : s.activeObjectId;
      return { objects, activeObjectId };
    }),

  addPoint: (frame, tSec, xPx, yPx) =>
    set((s) => ({
      objects: s.objects.map((o) => {
        if (o.id !== s.activeObjectId) return o;
        const filtered = o.points.filter((p) => p.frame !== frame);
        const next = [...filtered, { frame, tSec, xPx, yPx }].sort(
          (a, b) => a.frame - b.frame
        );
        return { ...o, points: next };
      }),
    })),

  removePoint: (objectId, frame) =>
    set((s) => ({
      objects: s.objects.map((o) =>
        o.id === objectId
          ? { ...o, points: o.points.filter((p) => p.frame !== frame) }
          : o
      ),
    })),

  clearPoints: (objectId) =>
    set((s) => ({
      objects: s.objects.map((o) =>
        o.id === objectId ? { ...o, points: [] } : o
      ),
    })),

  clearAllPoints: () =>
    set((s) => ({
      objects: s.objects.map((o) => ({ ...o, points: [] })),
    })),

  loadProject: (snap) =>
    set((s) => ({
      calibration: snap.calibration,
      axes: snap.axes,
      axesSet: snap.axesSet ?? true, // older files: axes drawn as before
      stepSize: snap.settings.stepSize,
      fpsOverride: snap.settings.fpsOverride,
      zeroFirstPoint: snap.settings.zeroFirstPoint ?? false,
      objects: snap.objects.length > 0 ? snap.objects : s.objects,
      activeObjectId: snap.objects[0]?.id ?? s.activeObjectId,
      mode: "idle",
      pendingCalibrationP1: null,
    })),

  resetAll: () => set(initial()),
}));

export function effectiveFps(state: Pick<AnalysisState, "video" | "fpsOverride">): number {
  return state.fpsOverride ?? state.video?.fps ?? 30;
}
