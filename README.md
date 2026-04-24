# Ultimate Motion Lab

Frame-accurate, in-browser video kinematics analysis. Calibrate a real-world
scale, set rotated axes, click-track moving objects across frames, and get
synced data tables and graphs.

Linked from the Tools section of [explainsims.com](https://explainsims.com/tools.html).

---

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # run math unit tests
npm run build    # production build (uses output: 'standalone')
npm start        # run the production server locally
```

## Smoke test

1. Open the dev server, drag a video file (any MP4/MOV) onto the Video pane,
   and confirm the recording fps in the prompt.
2. Step frame-by-frame with the toolbar arrows or `,` / `.` keys (`Space`
   plays/pauses).
3. Click **Calibrate**, click two endpoints of a known-length object on the
   first frame, enter the real-world distance.
4. Click **Origin** and click the desired (0,0). Click **Rotate** and drag the
   handle to align the x-axis with the motion (e.g. along an incline).
5. Click **Track** and click on the moving object frame-by-frame — the table
   and graph populate live. Step size auto-advances the video.
6. **Save** writes a `.motion` JSON file. **Load** restores the project (you'll
   need to re-pick the video file: blob URLs aren't portable across sessions).

## Deploy to Google Cloud Run

The Dockerfile builds a multi-stage image around Next.js's standalone output.

```bash
# From the repo root
gcloud run deploy ultimate-motion-lab \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --port 8080
```

Cloud Run will print a `*.a.run.app` URL on success. The CloudFlare worker that
fronts `explainsims.com` rewrites a friendly path onto that URL — no DNS or
custom-domain mapping needed for the MVP.

## Architecture overview

```
AnalysisStore (Zustand, lib/store.ts)
  └─ video meta · calibration · axes · objects · selectedFrame · mode
      ▲              ▲               ▲
      │              │               │
   VideoPane     GraphPane        TablePane
   + Canvas      (Recharts)        (HTML)
   overlay
      │
      └─ VideoEngine (lib/videoEngine.ts)
           requestVideoFrameCallback → emits {frame, mediaTime}
           seekToFrame, stepBy, play/pause
```

Pixel coordinates are canonical in the store. Display values (meters in the
rotated physics frame) are derived in `lib/derived.ts` so calibration/axis
edits are non-destructive.

## What's deferred (Phase B)

- Velocity / acceleration vector overlays drawn on the moving object
- Curve fitting (linear / quadratic) with a graph selection brush
- Auto-tracking via template matching on an OffscreenCanvas
- Google Drive OAuth (GIS) save/load and one-click Sheets export
- PWA manifest and offline shell
