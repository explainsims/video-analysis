type FrameInfo = { frame: number; mediaTime: number };
type FrameListener = (info: FrameInfo) => void;

interface RVFCMetadata {
  mediaTime: number;
  presentedFrames?: number;
}

type RVFCVideoElement = HTMLVideoElement & {
  requestVideoFrameCallback?: (
    cb: (now: DOMHighResTimeStamp, metadata: RVFCMetadata) => void
  ) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

/**
 * Wraps an HTMLVideoElement to deliver frame-accurate seek and playback.
 *
 * Why rVFC: `video.currentTime` is approximate during playback. The
 * requestVideoFrameCallback API hands us the actual `mediaTime` of the frame
 * the compositor is about to draw — that's the only reliable way to map time
 * to a discrete frame index.
 */
export class VideoEngine {
  private video: RVFCVideoElement;
  private fps: number;
  private rvfcHandle: number | null = null;
  private listeners = new Set<FrameListener>();
  private lastEmittedFrame = -1;
  private seekedHandler: (() => void) | null = null;

  constructor(video: HTMLVideoElement, fps: number) {
    this.video = video as RVFCVideoElement;
    this.fps = fps;
    this.start();
  }

  setFps(fps: number) {
    this.fps = fps;
    this.lastEmittedFrame = -1; // force re-emit at new resolution
  }

  getFps(): number {
    return this.fps;
  }

  onFrame(listener: FrameListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Seek so the displayed frame is exactly `n`. We aim for the middle of the
   * frame's time slot to avoid landing on a boundary that some demuxers round
   * the wrong way.
   */
  seekToFrame(n: number) {
    const clamped = Math.max(0, Math.min(this.totalFrames() - 1, Math.round(n)));
    const t = (clamped + 0.5) / this.fps;
    if (Math.abs(this.video.currentTime - t) > 1e-6) {
      this.video.currentTime = t;
    }
  }

  stepBy(delta: number) {
    if (!this.video.paused) this.video.pause();
    this.seekToFrame(this.currentFrame() + delta);
  }

  currentFrame(): number {
    // floor, not round: seekToFrame parks currentTime at (n + 0.5)/fps so a
    // round here would report n+1. floor((n + 0.5)) === n, which round-trips.
    return Math.floor(this.video.currentTime * this.fps);
  }

  totalFrames(): number {
    if (!isFinite(this.video.duration)) return Number.MAX_SAFE_INTEGER;
    return Math.max(1, Math.floor(this.video.duration * this.fps));
  }

  play() {
    void this.video.play();
  }

  pause() {
    this.video.pause();
  }

  isPaused(): boolean {
    return this.video.paused;
  }

  destroy() {
    if (this.rvfcHandle != null && this.video.cancelVideoFrameCallback) {
      this.video.cancelVideoFrameCallback(this.rvfcHandle);
    }
    if (this.seekedHandler) {
      this.video.removeEventListener("seeked", this.seekedHandler);
      this.seekedHandler = null;
    }
    this.listeners.clear();
  }

  private start() {
    if (typeof this.video.requestVideoFrameCallback === "function") {
      const tick = (_now: DOMHighResTimeStamp, meta: RVFCMetadata) => {
        this.emitIfChanged(meta.mediaTime);
        this.rvfcHandle = this.video.requestVideoFrameCallback!(tick);
      };
      this.rvfcHandle = this.video.requestVideoFrameCallback(tick);
    } else {
      // Safari fallback: fire on `seeked` and during play via rAF polling.
      this.seekedHandler = () => this.emitIfChanged(this.video.currentTime);
      this.video.addEventListener("seeked", this.seekedHandler);
      const poll = () => {
        if (!this.video.paused) this.emitIfChanged(this.video.currentTime);
        requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
    }
  }

  private emitIfChanged(mediaTime: number) {
    const frame = Math.round(mediaTime * this.fps);
    if (frame === this.lastEmittedFrame) return;
    this.lastEmittedFrame = frame;
    for (const l of this.listeners) l({ frame, mediaTime });
  }
}
