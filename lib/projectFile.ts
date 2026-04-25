import type { ProjectSnapshot, AnalysisState } from "./store";

export const SCHEMA_VERSION = 1;

export function exportProject(state: AnalysisState, projectName: string): ProjectSnapshot {
  const v = state.video;
  return {
    schemaVersion: SCHEMA_VERSION,
    name: projectName,
    createdAt: new Date().toISOString(),
    video: v
      ? { ...v, driveFileId: null }
      : {
          filename: "",
          durationSec: 0,
          width: 0,
          height: 0,
          fps: 30,
          driveFileId: null,
        },
    calibration: state.calibration,
    axes: state.axes,
    axesSet: state.axesSet,
    settings: {
      stepSize: state.stepSize,
      fpsOverride: state.fpsOverride,
      zeroFirstPoint: state.zeroFirstPoint,
    },
    objects: state.objects,
  };
}

export function downloadProject(snapshot: ProjectSnapshot, filename = "project.motion") {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function readProjectFile(file: File): Promise<ProjectSnapshot> {
  const text = await file.text();
  const parsed = JSON.parse(text) as ProjectSnapshot;
  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `Unsupported .motion schemaVersion: ${parsed.schemaVersion} (expected ${SCHEMA_VERSION})`
    );
  }
  return parsed;
}
