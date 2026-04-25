import { showAlert } from "./modal";
import { useAnalysisStore } from "./store";

export const DEFAULT_FPS = 30;

/**
 * Probe a user-provided video file and load it into the AnalysisStore.
 *
 * Browsers don't reliably expose recording fps, so we default to 30 and let
 * the user override via the FPS pill in the action ribbon. (Common values:
 * 24 / 30 / 60 / 120 / 240.)
 */
export function loadVideoFile(file: File): void {
  if (!file.type.startsWith("video/")) {
    void showAlert("Unsupported file", "Please choose a video file (MP4, MOV, WebM, …).");
    return;
  }
  const url = URL.createObjectURL(file);
  const probe = document.createElement("video");
  probe.preload = "metadata";
  probe.src = url;
  probe.onloadedmetadata = () => {
    useAnalysisStore.getState().loadVideo(url, {
      filename: file.name,
      durationSec: probe.duration,
      width: probe.videoWidth,
      height: probe.videoHeight,
      fps: DEFAULT_FPS,
    });
  };
  probe.onerror = () => {
    URL.revokeObjectURL(url);
    void showAlert(
      "Couldn't read this video",
      "The file's metadata didn't decode. Try a different format (MP4 / H.264 is most reliable)."
    );
  };
}
