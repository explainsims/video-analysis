"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function HelpPanel({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden={!open}
        style={{
          display: open ? "block" : "none",
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.25)",
          zIndex: 199,
        }}
      />
      <aside
        aria-label="Help"
        aria-hidden={!open}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 360,
          maxWidth: "92vw",
          height: "100dvh",
          background: "rgb(var(--color-surface))",
          borderLeft: "1px solid rgb(var(--color-border) / 0.15)",
          boxShadow: "-6px 0 24px rgba(0,0,0,0.18)",
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease",
          color: "rgb(var(--color-text))",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid rgb(var(--color-border) / 0.12)",
            fontWeight: 700,
            fontSize: "0.92rem",
            flexShrink: 0,
          }}
        >
          <span>Video Analysis Guide</span>
          <button
            onClick={onClose}
            aria-label="Close help"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.2rem",
              lineHeight: 1,
              padding: "4px 8px",
              borderRadius: 6,
              color: "rgb(var(--color-muted))",
            }}
          >
            ✕
          </button>
        </div>
        <div
          style={{
            padding: "16px 18px",
            overflowY: "auto",
            flex: 1,
            fontSize: "0.84rem",
            lineHeight: 1.6,
          }}
        >
          <Section title="What this app does">
            <p>
              Ultimate Video Analysis turns any video into kinematics data. Track an
              object frame by frame, calibrate the real-world scale, and the app
              derives position, velocity, and acceleration in physical units — and
              plots them in real time.
            </p>
          </Section>

          <Section title="Loading a video">
            <p>
              Drop a video file onto the dark video pane, click <b>Choose file</b>,
              or use the <b>New video</b> button in the toolbar. Loading a new video
              with unsaved tracking offers to save first.
            </p>
            <p>
              <b>FPS pill</b> (next to the video size): browsers can&apos;t read frame
              rate from a video file directly, so the app defaults to 30. Click the
              pill to enter the actual recording rate (24, 60, 120, 240, etc.). All
              time and velocity values depend on this — set it correctly.
            </p>
          </Section>

          <Section title="Toolbar — left side">
            <p>
              <b>New video</b> — load or replace the current video. Prompts to save
              if you have tracked points.
            </p>
            <p>
              <b>Calibrate</b> (cyan) — click two points on the video that are a
              known real-world distance apart (e.g. the ends of a meter stick). You
              are then asked for the distance in meters. Without calibration, no
              numeric data is shown.
            </p>
            <p>
              <b>Set origin</b> (purple) — click on the video to drop the origin
              for the coordinate system. Drag again to rotate the axes. Toggle{" "}
              <b>Show axes &amp; calibration</b> in the video header to display them.
            </p>
            <p>
              <b>Add point</b> (green) — click on the moving object in the video to
              record its position on that frame. The video then auto-advances by the
              current Step size, ready for the next click.
            </p>
            <p>
              <b>Delete point</b> (red) — click an existing point on the video to
              select it, then press Delete or Backspace to remove it.
            </p>
          </Section>

          <Section title="Step size, Load data, Custom table">
            <p>
              <b>Step</b> picks how many frames the video advances after each
              tracked click and how far the arrow keys jump. Use 1 for frame-accurate
              work, 2 or 5 for higher-fps slow-mo, or click the … button to enter a
              custom value.
            </p>
            <p>
              <b>Load data</b> opens a previously-saved <code>.motion</code>{" "}
              project file (video reference plus all tracked points and settings).
            </p>
            <p>
              <b>Custom table</b> opens a free-form table next to the data table.
              Use it to record any extra observations — distances, masses, trial
              numbers — alongside the tracking data.
            </p>
          </Section>

          <Section title="Object chips (right of the toolbar)">
            <p>
              Each chip is one tracked object (e.g. <i>Object A</i>, <i>Object B</i>).
              Click a chip to make it the active object — new points and the data
              table both follow the active object. Use <b>+ object</b> to track a
              second body in the same video; each gets its own color.
            </p>
          </Section>

          <Section title="Top bar — Save, Export to Sheets, theme">
            <p>
              <b>Save</b> downloads a <code>.motion</code> project file containing
              your tracked points, calibration, axes, custom table, and project name.
              Reopen it later with <b>Load data</b>.
            </p>
            <p>
              <b>Export to Sheets</b> will one-click push the data straight into
              Google Sheets (coming soon — needs Drive sign-in). For now, use the
              Copy buttons described below.
            </p>
            <p>
              The <b>sun/moon</b> button toggles light and dark themes. The project
              name next to the logo is editable — click the pencil.
            </p>
          </Section>

          <Section title="Video pane controls">
            <p>
              <b>Play / Pause</b> — Space bar. <b>Step ◀ ▶</b> — comma / period or
              the ← / → arrow keys. <b>Home</b> — jump to frame 0. The frame
              scrubber under the video drags to any frame.
            </p>
            <p>
              <b>Speed</b> — sets video playback speed (¼, ½, 1×, etc.) without
              changing the recording fps.
            </p>
            <p>
              <b>Show axes &amp; calibration</b> — hide or show the calibration
              line and the coordinate axes on top of the video.
            </p>
            <p>
              <b>Zero first point time</b> — when on, t = 0 is the first tracked
              point and the same offset is subtracted from every other point. Off
              keeps actual video time.
            </p>
            <p>
              <b>Zero here</b> — sets t = 0 at the current frame even before any
              tracking — useful for syncing time to an event in the clip. Disabled
              while &quot;Zero first point time&quot; is on.
            </p>
            <p>
              <b>Clear points</b> — removes every tracked point for the active
              object. Calibration and the video are kept.
            </p>
            <p>
              The expand/collapse icon in each pane&apos;s header maximizes that
              pane to fill the workspace; click it again to restore the split layout.
            </p>
          </Section>

          <Section title="Graph pane">
            <p>
              Choose the plot type with the pills: <b>x – t</b>, <b>y – t</b>,{" "}
              <b>vₓ – t</b>, <b>vᵧ – t</b>. Click any point on the graph to seek
              the video to that frame.
            </p>
            <p>
              <b>Drag horizontally</b> across the graph to highlight a time range,
              then click <b>Linear fit</b> or <b>Quadratic fit</b> to fit just that
              range. With no selection, the fit uses all points and updates as you
              add more. The footer shows the equation and R². <b>Clear</b> removes
              the selection and the fit.
            </p>
            <p>
              <b>PNG</b> exports the current graph as a landscape A4 PNG, with a
              white background regardless of theme — good for lab reports.
            </p>
          </Section>

          <Section title="Data table">
            <p>
              The data table shows derived values per frame for the active object:
              frame number, t, x, y, vₓ, vᵧ, |v|, aₓ, aᵧ. Click any row to seek
              the video to that frame.
            </p>
            <p>
              <b>Export CSV</b> downloads the table as a <code>.csv</code> file.
            </p>
          </Section>

          <Section title="Copy buttons → Google Sheets (important!)">
            <p>
              The <b>Copy</b> buttons on both the data table and the custom table
              copy the data as <b>CSV</b> (comma-separated values), <i>not</i> as a
              tab-separated table. Pasting into Google Sheets or Excel will dump
              everything into a single column.
            </p>
            <p>
              <b>To recreate the table:</b> after pasting, with the pasted column
              still selected, go to <b>Data &gt; Split text to columns</b> in
              Google Sheets (or <b>Data &gt; Text to Columns</b> in Excel) and pick{" "}
              <b>Comma</b> as the separator. Each value lands in its own cell.
            </p>
          </Section>

          <Section title="Custom table">
            <p>
              A free-form spreadsheet next to the main data table. Click a column
              header to rename it, click the × on a header to delete that column,
              and use <b>+ Column</b> to add more. Type into any cell to add data;
              empty trailing rows disappear automatically.
            </p>
            <p>
              <b>Copy</b> and <b>Export CSV</b> work the same way as the main data
              table — see the note above about Split text to columns.
            </p>
          </Section>

          <Section title="Keyboard shortcuts">
            <p>
              <b>Space</b> — play / pause<br />
              <b>← / ,</b> — step back by current Step size<br />
              <b>→ / .</b> — step forward by current Step size<br />
              <b>Home</b> — jump to first frame<br />
              <b>Delete / Backspace</b> — remove the selected point (in Delete mode)<br />
              <b>Esc</b> — close this Help panel
            </p>
          </Section>
        </div>
      </aside>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <h3
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "rgb(var(--color-brand))",
            marginBottom: 6,
          }}
        >
          {title}
        </h3>
        <div
          style={{
            color: "rgb(var(--color-text))",
          }}
        >
          {children}
        </div>
      </div>
      <div
        style={{
          height: 1,
          background: "rgb(var(--color-border) / 0.12)",
          marginBottom: 18,
        }}
      />
    </>
  );
}
