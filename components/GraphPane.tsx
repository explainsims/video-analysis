"use client";

import { Eraser } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { deriveObject } from "@/lib/derived";
import { linearFit, quadraticFit } from "@/lib/math";
import { useAnalysisStore } from "@/lib/store";

type SeriesKey = "x" | "y" | "speed" | "vx" | "vy" | "ax" | "ay";
type FitKind = "linear" | "quadratic";

const SERIES: { key: SeriesKey; label: string; unit: string }[] = [
  { key: "x", label: "x", unit: "m" },
  { key: "y", label: "y", unit: "m" },
  { key: "speed", label: "|v|", unit: "m/s" },
  { key: "vx", label: "vx", unit: "m/s" },
  { key: "vy", label: "vy", unit: "m/s" },
  { key: "ax", label: "ax", unit: "m/s²" },
  { key: "ay", label: "ay", unit: "m/s²" },
];

interface FitState {
  kind: FitKind;
  /** Inclusive [tStart, tEnd] window the fit was computed over. */
  range: [number, number];
  /** y(t) evaluator for drawing the fit curve. */
  fn: (t: number) => number;
  equation: string;
  r2: number;
}

interface ChartMouseEvent {
  activeLabel?: number | string;
  activePayload?: { payload?: { t: number } }[];
}

const fmtSig = (n: number, digits = 4): string => {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 0.01 && abs < 1e5) return n.toFixed(digits).replace(/\.?0+$/, "");
  return n.toExponential(digits - 1);
};

export function GraphPane({ onScrub }: { onScrub: (frame: number) => void }) {
  const objects = useAnalysisStore((s) => s.objects);
  const activeObjectId = useAnalysisStore((s) => s.activeObjectId);
  const calibration = useAnalysisStore((s) => s.calibration);
  const axes = useAnalysisStore((s) => s.axes);
  const selectedFrame = useAnalysisStore((s) => s.selectedFrame);
  const [series, setSeries] = useState<SeriesKey>("x");

  // Selection drag state — both nullable; non-null while dragging or selected.
  const [selStart, setSelStart] = useState<number | null>(null);
  const [selEnd, setSelEnd] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fit, setFit] = useState<FitState | null>(null);

  const active = objects.find((o) => o.id === activeObjectId);
  const rows = useMemo(
    () => (active ? deriveObject(active, calibration, axes) : []),
    [active, calibration, axes]
  );

  // Reset fit/selection when the underlying series or object changes.
  useEffect(() => {
    setFit(null);
    setSelStart(null);
    setSelEnd(null);
    setDragging(false);
  }, [activeObjectId, series]);

  const data = rows.map((r) => ({ t: r.t, frame: r.frame, value: r[series] }));
  const cursor = rows.find((r) => r.frame === selectedFrame);

  const selRange: [number, number] | null =
    selStart !== null && selEnd !== null
      ? [Math.min(selStart, selEnd), Math.max(selStart, selEnd)]
      : null;

  const handleMouseDown = (e: ChartMouseEvent) => {
    const t = numericLabel(e);
    if (t === null) return;
    setDragging(true);
    setSelStart(t);
    setSelEnd(t);
    setFit(null);
  };

  const handleMouseMove = (e: ChartMouseEvent) => {
    if (!dragging) return;
    const t = numericLabel(e);
    if (t !== null) setSelEnd(t);
  };

  const handleMouseUp = (e: ChartMouseEvent) => {
    if (!dragging) {
      // No drag — treat as a click to scrub the video.
      const pl = e?.activePayload?.[0]?.payload;
      if (pl && typeof pl.t === "number") {
        const row = rows.find((r) => r.t === pl.t) ?? rows[0];
        if (row) onScrub(row.frame);
      }
      return;
    }
    setDragging(false);
    if (selStart !== null && selEnd !== null && Math.abs(selEnd - selStart) < 1e-6) {
      // Tap, not a drag — clear selection and treat as scrub.
      const row = rows.find((r) => Math.abs(r.t - selStart) < 1e-9) ?? rows[0];
      setSelStart(null);
      setSelEnd(null);
      if (row) onScrub(row.frame);
    }
  };

  const clearSelection = () => {
    setSelStart(null);
    setSelEnd(null);
    setFit(null);
  };

  const applyFit = (kind: FitKind) => {
    if (!selRange) return;
    const [t0, t1] = selRange;
    const inRange = data.filter((d) => d.t >= t0 && d.t <= t1);
    if (kind === "linear" && inRange.length < 2) return;
    if (kind === "quadratic" && inRange.length < 3) return;
    const xs = inRange.map((d) => d.t);
    const ys = inRange.map((d) => d.value);
    if (kind === "linear") {
      const lf = linearFit(xs, ys);
      setFit({
        kind,
        range: selRange,
        fn: (t) => lf.m * t + lf.b,
        equation: `y = ${fmtSig(lf.m)} t + ${fmtSig(lf.b)}`,
        r2: lf.r2,
      });
    } else {
      const qf = quadraticFit(xs, ys);
      setFit({
        kind,
        range: selRange,
        fn: (t) => qf.A * t * t + qf.B * t + qf.C,
        equation: `y = ${fmtSig(qf.A)} t² + ${fmtSig(qf.B)} t + ${fmtSig(qf.C)}`,
        r2: qf.r2,
      });
    }
  };

  // Build dense fit-curve points across the selected x-range so the line is smooth.
  const fitData = useMemo(() => {
    if (!fit) return [];
    const [t0, t1] = fit.range;
    const N = 64;
    const out: { t: number; fitValue: number }[] = [];
    for (let i = 0; i <= N; i++) {
      const t = t0 + ((t1 - t0) * i) / N;
      out.push({ t, fitValue: fit.fn(t) });
    }
    return out;
  }, [fit]);

  // Merge data + fit into one array for ComposedChart (Recharts wants a single
  // dataset with optional missing keys per row).
  const merged = useMemo(() => {
    type Row = { t: number; frame?: number; value?: number; fitValue?: number };
    const map = new Map<number, Row>();
    for (const d of data) map.set(d.t, { t: d.t, frame: d.frame, value: d.value });
    for (const f of fitData) {
      const existing = map.get(f.t);
      if (existing) existing.fitValue = f.fitValue;
      else map.set(f.t, { t: f.t, fitValue: f.fitValue });
    }
    return Array.from(map.values()).sort((a, b) => a.t - b.t);
  }, [data, fitData]);

  const seriesUnit = SERIES.find((s) => s.key === series)?.unit ?? "";
  const seriesLabel = SERIES.find((s) => s.key === series)?.label ?? series;
  const canFitLinear = !!selRange && rangeCount(data, selRange) >= 2;
  const canFitQuad = !!selRange && rangeCount(data, selRange) >= 3;

  return (
    <div className="pane h-full">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border flex-wrap">
        <span className="font-mono text-xs uppercase tracking-wider text-muted">Graph</span>
        <div className="flex items-center gap-1">
          <select
            className="input"
            value={series}
            onChange={(e) => setSeries(e.target.value as SeriesKey)}
          >
            {SERIES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label} ({s.unit}) vs t
              </option>
            ))}
          </select>
          <button
            className="btn"
            onClick={() => applyFit("linear")}
            disabled={!canFitLinear}
            title="Linear fit on selected range (drag horizontally on the chart first)"
          >
            Linear fit
          </button>
          <button
            className="btn"
            onClick={() => applyFit("quadratic")}
            disabled={!canFitQuad}
            title="Quadratic fit on selected range"
          >
            Quadratic fit
          </button>
          {(selRange || fit) && (
            <button className="btn" onClick={clearSelection} title="Clear selection / fit">
              <Eraser size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-2 relative">
        {!calibration ? (
          <div className="p-4 text-sm text-muted">Calibrate the scale to plot data.</div>
        ) : data.length < 1 ? (
          <div className="p-4 text-sm text-muted">Add tracked points to plot.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={merged}
              margin={{ top: 8, right: 16, left: -8, bottom: 4 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => setDragging(false)}
            >
              <CartesianGrid stroke="rgb(var(--color-border))" strokeDasharray="3 3" />
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v: number) => v.toFixed(2)}
                stroke="rgb(var(--color-muted))"
                style={{ fontSize: 11, fontFamily: "ui-monospace, monospace" }}
                label={{ value: "t (s)", fill: "rgb(var(--color-muted))", fontSize: 11, dy: 8 }}
              />
              <YAxis
                stroke="rgb(var(--color-muted))"
                style={{ fontSize: 11, fontFamily: "ui-monospace, monospace" }}
                tickFormatter={(v: number) => v.toFixed(2)}
              />
              <Tooltip
                contentStyle={{
                  background: "rgb(var(--color-surface))",
                  border: "1px solid rgb(var(--color-border))",
                  fontSize: 12,
                  fontFamily: "ui-monospace, monospace",
                }}
                formatter={(v: number) => v.toFixed(3)}
                labelFormatter={(v: number) => `t = ${v.toFixed(3)} s`}
              />

              {selRange && (
                <ReferenceArea
                  x1={selRange[0]}
                  x2={selRange[1]}
                  strokeOpacity={0}
                  fill="rgb(var(--color-accent))"
                  fillOpacity={0.18}
                />
              )}

              <Scatter
                dataKey="value"
                fill={active?.color ?? "rgb(var(--color-brand))"}
                isAnimationActive={false}
              />

              {fit && (
                <Line
                  type="monotone"
                  dataKey="fitValue"
                  stroke="rgb(var(--color-accent))"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              )}

              {cursor && (
                <ReferenceLine
                  x={cursor.t}
                  stroke="rgb(var(--color-brand))"
                  strokeDasharray="4 3"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {(fit || (selRange && !fit)) && (
          <div className="absolute left-3 right-3 bottom-2 pointer-events-none">
            <div className="glass rounded-md px-2 py-1 inline-block max-w-full font-mono text-[11px]">
              {fit ? (
                <>
                  <span className="text-accent">{fit.equation}</span>
                  <span className="text-muted">
                    {"  "}R² = {fit.r2.toFixed(4)}
                    {"  "}({seriesLabel} {seriesUnit && `[${seriesUnit}]`} on t∈[
                    {fit.range[0].toFixed(2)}, {fit.range[1].toFixed(2)}] s)
                  </span>
                </>
              ) : selRange ? (
                <span className="text-muted">
                  Selected t ∈ [{selRange[0].toFixed(2)}, {selRange[1].toFixed(2)}] s — choose a
                  fit above.
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- helpers ----

function numericLabel(e: ChartMouseEvent): number | null {
  const lbl = e.activeLabel;
  if (typeof lbl === "number") return lbl;
  if (typeof lbl === "string") {
    const n = Number(lbl);
    return Number.isFinite(n) ? n : null;
  }
  const pl = e.activePayload?.[0]?.payload;
  return pl && typeof pl.t === "number" ? pl.t : null;
}

function rangeCount(data: { t: number }[], range: [number, number]): number {
  let n = 0;
  for (const d of data) if (d.t >= range[0] && d.t <= range[1]) n++;
  return n;
}

