import { useAnalysisStore } from "./store";

/**
 * Probe a user-provided video file, prompt for fps (browsers don't expose it
 * reliably), and load it into the AnalysisStore.
 */
export function loadVideoFile(file: File): void {
  if (!file.type.startsWith("video/")) {
    alert("Please choose a video file.");
    return;
  }
  const url = URL.createObjectURL(file);
  const probe = document.createElement("video");
  probe.preload = "metadata";
  probe.src = url;
  probe.onloadedmetadata = () => {
    const guess = window.prompt(
      `Video loaded: ${probe.videoWidth}×${probe.videoHeight}, ${probe.duration.toFixed(2)}s.\n\nWhat is the recording frame rate (fps)?\nCommon: 24, 30, 60, 120, 240.`,
      "30"
    );
    const parsed = guess ? Number(guess) : 30;
    const fps = Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
    useAnalysisStore.getState().loadVideo(url, {
      filename: file.name,
      durationSec: probe.duration,
      width: probe.videoWidth,
      height: probe.videoHeight,
      fps,
    });
  };
}
