"use client";

import { Eraser, FunctionSquare, TrendingUp } from "lucide-react";
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
import { deriveObject, type DerivedRow } from "@/lib/derived";
import { linearFit, quadraticFit } from "@/lib/math";
import { useAnalysisStore } from "@/lib/store";

type GraphMode = "xt" | "yt" | "xy" | "vt";
type FitKind = "linear" | "quadratic";

interface ModeDef {
  id: GraphMode;
  label: string;
  /** Y-axis unit display. */
  yUnit: string;
  /** Build chart rows from derived data. */
  build: (rows: DerivedRow[]) => ChartRow[];
  /** Series colors (1 or 2 series). Object color is the default for primary. */
  legend: { key: string; label: string; color: string | "object" | "objectAlt" }[];
  /** X-axis label. */
  xLabel: string;
  /** Whether this mode supports curve fitting. */
  fittable: boolean;
}

interface ChartRow {
  /** X-axis value (t for x-t/y-t/v-t, x for x-y). */
  xv: number;
  frame: number;
  /** Primary series value. */
  v1: number;
  /** Optional secondary series value (used by v-t for vy). */
  v2?: number;
}

const MODES: ModeDef[] = [
  {
    id: "xt",
    label: "x vs t",
    yUnit: "m",
    xLabel: "t (s)",
    fittable: true,
    legend: [{ key: "v1", label: "x", color: "object" }],
    build: (rows) => rows.map((r) => ({ xv: r.t, frame: r.frame, v1: r.x })),
  },
  {
    id: "yt",
    label: "y vs t",
    yUnit: "m",
    xLabel: "t (s)",
    fittable: true,
    legend: [{ key: "v1", label: "y", color: "object" }],
    build: (rows) => rows.map((r) => ({ xv: r.t, frame: r.frame, v1: r.y })),
  },
  {
    id: "xy",
    label: "y vs x",
    yUnit: "m",
    xLabel: "x (m)",
    fittable: false,
    legend: [{ key: "v1", label: "trajectory", color: "object" }],
    build: (rows) => rows.map((r) => ({ xv: r.x, frame: r.frame, v1: r.y })),
  },
  {
    id: "vt",
    label: "v vs t",
    yUnit: "m/s",
    xLabel: "t (s)",
    fittable: true,
    legend: [
      { key: "v1", label: "vₓ", color: "object" },
      { key: "v2", label: "vᵧ", color: "objectAlt" },
    ],
    build: (rows) =>
      rows.map((r) => ({ xv: r.t, frame: r.frame, v1: r.vx, v2: r.vy })),
  },
];

interface FitState {
  kind: FitKind;
  range: [number, number];
  fn: (x: number) => number;
  equation: string;
  r2: number;
}

interface ChartMouseEvent {
  activeLabel?: number | string;
  activePayload?: { payload?: { xv: number; frame: number } }[];
}

const fmtSig = (n: number, digits = 4): string => {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 0.01 && abs < 1e5) {
    let s = n.toFixed(digits);
    s = s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
    return s;
  }
  return n.toExponential(digits - 1);
};

export function GraphPane({ onScrub }: { onScrub: (frame: number) => void }) {
  const objects = useAnalysisStore((s) => s.objects);
  const activeObjectId = useAnalysisStore((s) => s.activeObjectId);
  const calibration = useAnalysisStore((s) => s.calibration);
  const axes = useAnalysisStore((s) => s.axes);
  const selectedFrame = useAnalysisStore((s) => s.selectedFrame);
  const [graphMode, setGraphMode] = useState<GraphMode>("xt");

  const [selStart, setSelStart] = useState<number | null>(null);
  const [selEnd, setSelEnd] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fit, setFit] = useState<FitState | null>(null);

  const active = objects.find((o) => o.id === activeObjectId);
  const objColor = active?.color ?? "#2563eb";
  const objAltColor = "#db2777";

  const derived = useMemo(
    () => (active ? deriveObject(active, calibration, axes) : []),
    [active, calibration, axes]
  );

  const def = MODES.find((m) => m.id === graphMode)!;
  const data = useMemo(() => def.build(derived), [def, derived]);

  // Reset fit/selection on mode/object/series change
  useEffect(() => {
    setFit(null);
    setSelStart(null);
    setSelEnd(null);
    setDragging(false);
  }, [graphMode, activeObjectId]);

  const cursor = data.find((d) => d.frame === selectedFrame);

  const selRange: [number, number] | null =
    selStart !== null && selEnd !== null
      ? [Math.min(selStart, selEnd), Math.max(selStart, selEnd)]
      : null;

  const numericLabel = (e: ChartMouseEvent): number | null => {
    const lbl = e.activeLabel;
    if (typeof lbl === "number") return lbl;
    if (typeof lbl === "string") {
      const n = Number(lbl);
      return Number.isFinite(n) ? n : null;
    }
    const pl = e.activePayload?.[0]?.payload;
    return pl && typeof pl.xv === "number" ? pl.xv : null;
  };

  const handleMouseDown = (e: ChartMouseEvent) => {
    if (!def.fittable) {
      // No drag-select for x-y mode; fall back to scrub on click.
      const pl = e.activePayload?.[0]?.payload;
      if (pl) onScrub(pl.frame);
      return;
    }
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
      const pl = e?.activePayload?.[0]?.payload;
      if (pl) onScrub(pl.frame);
      return;
    }
    setDragging(false);
    if (selStart !== null && selEnd !== null && Math.abs(selEnd - selStart) < 1e-6) {
      const r = data.find((d) => Math.abs(d.xv - selStart) < 1e-9);
      setSelStart(null);
      setSelEnd(null);
      if (r) onScrub(r.frame);
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
    const inRange = data.filter((d) => d.xv >= t0 && d.xv <= t1);
    if (kind === "linear" && inRange.length < 2) return;
    if (kind === "quadratic" && inRange.length < 3) return;
    const xs = inRange.map((d) => d.xv);
    const ys = inRange.map((d) => d.v1);
    if (kind === "linear") {
      const lf = linearFit(xs, ys);
      setFit({
        kind,
        range: selRange,
        fn: (x) => lf.m * x + lf.b,
        equation: `y = ${fmtSig(lf.m)} x + ${fmtSig(lf.b)}`,
        r2: lf.r2,
      });
    } else {
      const qf = quadraticFit(xs, ys);
      setFit({
        kind,
        range: selRange,
        fn: (x) => qf.A * x * x + qf.B * x + qf.C,
        equation: `y = ${fmtSig(qf.A)} x² + ${fmtSig(qf.B)} x + ${fmtSig(qf.C)}`,
        r2: qf.r2,
      });
    }
  };

  // Dense fit-curve points across selected x-range
  const fitData = useMemo(() => {
    if (!fit) return [];
    const [a, b] = fit.range;
    const N = 64;
    const out: { xv: number; fitValue: number }[] = [];
    for (let i = 0; i <= N; i++) {
      const x = a + ((b - a) * i) / N;
      out.push({ xv: x, fitValue: fit.fn(x) });
    }
    return out;
  }, [fit]);

  // Merge primary data + secondary (vᵧ) + fit into a single dataset for ComposedChart
  const merged = useMemo(() => {
    type Row = { xv: number; frame?: number; v1?: number; v2?: number; fitValue?: number };
    const map = new Map<number, Row>();
    for (const d of data) map.set(d.xv, { xv: d.xv, frame: d.frame, v1: d.v1, v2: d.v2 });
    for (const f of fitData) {
      const existing = map.get(f.xv);
      if (existing) existing.fitValue = f.fitValue;
      else map.set(f.xv, { xv: f.xv, fitValue: f.fitValue });
    }
    return Array.from(map.values()).sort((a, b) => a.xv - b.xv);
  }, [data, fitData]);

  const rangeCount = (range: [number, number]) =>
    data.filter((d) => d.xv >= range[0] && d.xv <= range[1]).length;
  const canFitLinear = !!selRange && def.fittable && rangeCount(selRange) >= 2;
  const canFitQuad = !!selRange && def.fittable && rangeCount(selRange) >= 3;

  return (
    <div className="card h-full">
      <div className="card-header">
        <span>Graph</span>
        <div className="flex-1" />
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setGraphMode(m.id)}
            data-active={graphMode === m.id}
            className="btn-soft"
            style={{ padding: "5px 10px", fontSize: 11 }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 px-4 py-2 border-b" style={{ borderColor: "rgb(var(--color-border) / 0.07)" }}>
        <button
          className="btn-soft"
          style={{ padding: "4px 10px", fontSize: 11 }}
          onClick={() => applyFit("linear")}
          disabled={!canFitLinear}
          title="Drag a range on the chart, then apply a linear fit"
        >
          <TrendingUp size={12} /> Line of best fit
        </button>
        <button
          className="btn-soft"
          style={{ padding: "4px 10px", fontSize: 11 }}
          onClick={() => applyFit("quadratic")}
          disabled={!canFitQuad}
        >
          <FunctionSquare size={12} /> Curve fit (quadratic)
        </button>
        {(selRange || fit) && (
          <button
            className="btn-soft"
            style={{ padding: "4px 10px", fontSize: 11 }}
            onClick={clearSelection}
            title="Clear selection / fit"
          >
            <Eraser size={12} /> Clear
          </button>
        )}
        <div className="flex-1" />
        {!def.fittable && (
          <span className="text-[11px] text-muted">Fitting available on x-t, y-t, v-t.</span>
        )}
      </div>

      <div className="flex-1 px-2 py-1 relative" style={{ minHeight: 0 }}>
        {!calibration ? (
          <div className="p-4 text-sm text-muted">Calibrate the scale to plot data.</div>
        ) : data.length < 1 ? (
          <div className="p-4 text-sm text-muted">Add tracked points to plot.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={merged}
              margin={{ top: 12, right: 18, left: -8, bottom: 4 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => setDragging(false)}
            >
              <CartesianGrid stroke="rgb(var(--color-border) / 0.10)" strokeDasharray="3 3" />
              <XAxis
                dataKey="xv"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v: number) => v.toFixed(2)}
                stroke="rgb(var(--color-muted))"
                style={{ fontSize: 11, fontFamily: "ui-monospace, monospace" }}
                label={{
                  value: def.xLabel,
                  fill: "rgb(var(--color-muted))",
                  fontSize: 11,
                  dy: 8,
                }}
              />
              <YAxis
                stroke="rgb(var(--color-muted))"
                style={{ fontSize: 11, fontFamily: "ui-monospace, monospace" }}
                tickFormatter={(v: number) => v.toFixed(2)}
              />
              <Tooltip
                contentStyle={{
                  background: "rgb(var(--color-surface))",
                  border: "1px solid rgb(var(--color-border) / 0.2)",
                  fontSize: 12,
                  fontFamily: "ui-monospace, monospace",
                }}
                formatter={(v: number) => v.toFixed(3)}
                labelFormatter={(v: number) => `${def.xLabel.split(" ")[0]} = ${v.toFixed(3)}`}
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
                dataKey="v1"
                fill={objColor}
                isAnimationActive={false}
              />
              {def.legend.length > 1 && (
                <Scatter
                  dataKey="v2"
                  fill={objAltColor}
                  isAnimationActive={false}
                />
              )}

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

              {cursor && def.id !== "xy" && (
                <ReferenceLine
                  x={cursor.xv}
                  stroke="rgb(var(--color-brand))"
                  strokeDasharray="4 3"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stats footer */}
      <div className="card-footer flex items-center gap-2 flex-wrap">
        {def.legend.map((l) => (
          <span key={l.key} className="flex items-center gap-1.5 text-[11px] text-muted">
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background:
                  l.color === "object" ? objColor : l.color === "objectAlt" ? objAltColor : l.color,
              }}
            />
            {l.label} ({def.yUnit})
          </span>
        ))}
        <div className="flex-1" />
        {fit ? (
          <div className="font-mono text-[11px] tabular flex items-center gap-3">
            <span style={{ color: "rgb(var(--color-accent))" }}>{fit.equation}</span>
            <span className="text-muted">R² = {fit.r2.toFixed(4)}</span>
            <span className="text-muted">
              {def.xLabel.split(" ")[0]} ∈ [{fit.range[0].toFixed(2)}, {fit.range[1].toFixed(2)}]
            </span>
          </div>
        ) : selRange ? (
          <span className="font-mono text-[11px] text-muted tabular">
            Selected: {def.xLabel.split(" ")[0]} ∈ [{selRange[0].toFixed(2)},{" "}
            {selRange[1].toFixed(2)}] — choose a fit above.
          </span>
        ) : (
          <span className="text-[11px] text-muted">
            {def.fittable ? "Drag a horizontal range to enable fitting." : "Scatter mode."}
          </span>
        )}
      </div>
    </div>
  );
}
