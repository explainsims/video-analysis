"use client";

import { create } from "zustand";
import type { Axes, Calibration, Vec2 } from "./math";

export type Mode = "idle" | "calibrate" | "setOrigin" | "track";

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

  // Tracking
  objects: TrackedObject[];
  activeObjectId: string;
  stepSize: number;
  fpsOverride: number | null;

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
  settings: { stepSize: number; fpsOverride: number | null };
  objects: TrackedObject[];
}

const DEFAULT_AXES: Axes = { originPx: [0, 0], rotationRad: 0 };

const OBJECT_COLORS = ["#22D3EE", "#FBBF24", "#A78BFA", "#34D399", "#F472B6"];

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
  | "objects"
  | "activeObjectId"
  | "stepSize"
  | "fpsOverride"
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
    objects: [first],
    activeObjectId: first.id,
    stepSize: 1,
    fpsOverride: null,
    mode: "idle",
    pendingCalibrationP1: null,
  };
};

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  ...initial(),

  loadVideo: (url, meta) =>
    set({
      videoUrl: url,
      video: meta,
      selectedFrame: 0,
      axes: { originPx: [meta.width / 2, meta.height / 2], rotationRad: 0 },
    }),

  unloadVideo: () => {
    const url = get().videoUrl;
    if (url) URL.revokeObjectURL(url);
    set(initial());
  },

  setSelectedFrame: (n) => {
    if (n !== get().selectedFrame) set({ selectedFrame: n });
  },
  setMode: (m) => set({ mode: m, pendingCalibrationP1: null }),
  setStepSize: (n) => set({ stepSize: Math.max(1, Math.round(n)) }),
  setFpsOverride: (fps) => set({ fpsOverride: fps }),

  setPendingCalibrationP1: (p) => set({ pendingCalibrationP1: p }),
  setCalibration: (c) => set({ calibration: c }),

  setOrigin: (p) => set((s) => ({ axes: { ...s.axes, originPx: p } })),
  setRotation: (rad) => set((s) => ({ axes: { ...s.axes, rotationRad: rad } })),

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

  loadProject: (snap) =>
    set((s) => ({
      calibration: snap.calibration,
      axes: snap.axes,
      stepSize: snap.settings.stepSize,
      fpsOverride: snap.settings.fpsOverride,
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
