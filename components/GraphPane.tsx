"use client";

import { Eraser, FunctionSquare, Maximize2, Minimize2, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Label,
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

type GraphMode = "xt" | "yt" | "vxt" | "vyt";
type FitKind = "linear" | "quadratic";

interface ModeDef {
  id: GraphMode;
  /** Plain-text label for tooltips / footer (no Unicode subscripts). */
  shortLabel: string;
  /** Rich React label for the mode pill, with real subscripts. */
  pillLabel: React.ReactNode;
  /** Y-axis label, also rich. */
  yAxisLabel: React.ReactNode;
  /** Y-axis units, plain text. */
  yUnit: string;
  /** Build chart rows from derived data. */
  build: (rows: DerivedRow[]) => ChartRow[];
}

interface ChartRow {
  t: number;
  frame: number;
  v: number;
}

const MODES: ModeDef[] = [
  {
    id: "xt",
    shortLabel: "x vs t",
    pillLabel: <>x vs t</>,
    yAxisLabel: <>x (m)</>,
    yUnit: "m",
    build: (rows) => rows.map((r) => ({ t: r.t, frame: r.frame, v: r.x })),
  },
  {
    id: "yt",
    shortLabel: "y vs t",
    pillLabel: <>y vs t</>,
    yAxisLabel: <>y (m)</>,
    yUnit: "m",
    build: (rows) => rows.map((r) => ({ t: r.t, frame: r.frame, v: r.y })),
  },
  {
    id: "vxt",
    shortLabel: "vx vs t",
    pillLabel: (
      <>
        v<sub>x</sub> vs t
      </>
    ),
    yAxisLabel: (
      <>
        v<sub>x</sub> (m/s)
      </>
    ),
    yUnit: "m/s",
    build: (rows) => rows.map((r) => ({ t: r.t, frame: r.frame, v: r.vx })),
  },
  {
    id: "vyt",
    shortLabel: "vy vs t",
    pillLabel: (
      <>
        v<sub>y</sub> vs t
      </>
    ),
    yAxisLabel: (
      <>
        v<sub>y</sub> (m/s)
      </>
    ),
    yUnit: "m/s",
    build: (rows) => rows.map((r) => ({ t: r.t, frame: r.frame, v: r.vy })),
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
  activePayload?: { payload?: { t: number; frame: number } }[];
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

/**
 * Generate ~tickCount evenly-spaced "nice" tick values across [min, max].
 * Picks a step that's a multiple of 1/2/5 × 10^k so labels are readable.
 */
function niceTicks(min: number, max: number, tickCount = 6): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return [min];
  }
  const range = max - min;
  const rough = range / Math.max(1, tickCount - 1);
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const f = rough / pow;
  let step: number;
  if (f < 1.5) step = 1 * pow;
  else if (f < 3) step = 2 * pow;
  else if (f < 7) step = 5 * pow;
  else step = 10 * pow;
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 1e-9; v += step) {
    out.push(Number(v.toFixed(12))); // prevent FP drift
  }
  return out;
}

export function GraphPane({ onScrub }: { onScrub: (frame: number) => void }) {
  const objects = useAnalysisStore((s) => s.objects);
  const activeObjectId = useAnalysisStore((s) => s.activeObjectId);
  const calibration = useAnalysisStore((s) => s.calibration);
  const axes = useAnalysisStore((s) => s.axes);
  const selectedFrame = useAnalysisStore((s) => s.selectedFrame);
  const zeroFirstPoint = useAnalysisStore((s) => s.zeroFirstPoint);
  const expandedPane = useAnalysisStore((s) => s.expandedPane);
  const setExpandedPane = useAnalysisStore((s) => s.setExpandedPane);
  const [graphMode, setGraphMode] = useState<GraphMode>("xt");

  const [selStart, setSelStart] = useState<number | null>(null);
  const [selEnd, setSelEnd] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fit, setFit] = useState<FitState | null>(null);

  const active = objects.find((o) => o.id === activeObjectId);
  const objColor = active?.color ?? "#2563eb";

  const derived = useMemo(
    () => (active ? deriveObject(active, calibration, axes, { zeroFirstPoint }) : []),
    [active, calibration, axes, zeroFirstPoint]
  );

  const def = MODES.find((m) => m.id === graphMode)!;
  const data = useMemo(() => def.build(derived), [def, derived]);

  // Reset fit/selection on mode/object change.
  useEffect(() => {
    setFit(null);
    setSelStart(null);
    setSelEnd(null);
    setDragging(false);
  }, [graphMode, activeObjectId, zeroFirstPoint]);

  const cursor = data.find((d) => d.frame === selectedFrame);

  const selRange: [number, number] | null =
    selStart !== null && selEnd !== null
      ? [Math.min(selStart, selEnd), Math.max(selStart, selEnd)]
      : null;

  // Domain & ticks (consistent, evenly-spaced) derived from data range.
  const tDomain = useMemo<[number, number]>(() => {
    if (data.length === 0) return [0, 1];
    const min = data[0].t;
    const max = data[data.length - 1].t;
    if (min === max) return [min - 0.5, max + 0.5];
    const pad = (max - min) * 0.04;
    return [min - pad, max + pad];
  }, [data]);
  const tTicks = useMemo(() => niceTicks(tDomain[0], tDomain[1], 7), [tDomain]);

  const yDomain = useMemo<[number, number]>(() => {
    if (data.length === 0) return [0, 1];
    let min = Infinity;
    let max = -Infinity;
    for (const d of data) {
      if (Number.isFinite(d.v)) {
        if (d.v < min) min = d.v;
        if (d.v > max) max = d.v;
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
    if (min === max) return [min - 0.5, max + 0.5];
    const pad = (max - min) * 0.1;
    return [min - pad, max + pad];
  }, [data]);
  const yTicks = useMemo(() => niceTicks(yDomain[0], yDomain[1], 6), [yDomain]);

  const numericLabel = (e: ChartMouseEvent): number | null => {
    const lbl = e.activeLabel;
    if (typeof lbl === "number") return lbl;
    if (typeof lbl === "string") {
      const n = Number(lbl);
      return Number.isFinite(n) ? n : null;
    }
    const pl = e.activePayload?.[0]?.payload;
    return pl && typeof pl.t === "number" ? pl.t : null;
  };

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
      const pl = e?.activePayload?.[0]?.payload;
      if (pl) onScrub(pl.frame);
      return;
    }
    setDragging(false);
    if (selStart !== null && selEnd !== null && Math.abs(selEnd - selStart) < 1e-6) {
      const r = data.find((d) => Math.abs(d.t - selStart) < 1e-9);
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
    const inRange = data.filter((d) => d.t >= t0 && d.t <= t1);
    if (kind === "linear" && inRange.length < 2) return;
    if (kind === "quadratic" && inRange.length < 3) return;
    const xs = inRange.map((d) => d.t);
    const ys = inRange.map((d) => d.v);
    if (kind === "linear") {
      const lf = linearFit(xs, ys);
      setFit({
        kind,
        range: selRange,
        fn: (x) => lf.m * x + lf.b,
        equation: `y = ${fmtSig(lf.m)} t + ${fmtSig(lf.b)}`,
        r2: lf.r2,
      });
    } else {
      const qf = quadraticFit(xs, ys);
      setFit({
        kind,
        range: selRange,
        fn: (x) => qf.A * x * x + qf.B * x + qf.C,
        equation: `y = ${fmtSig(qf.A)} t² + ${fmtSig(qf.B)} t + ${fmtSig(qf.C)}`,
        r2: qf.r2,
      });
    }
  };

  // Dense fit-curve points across selected x-range
  const fitData = useMemo(() => {
    if (!fit) return [];
    const [a, b] = fit.range;
    const N = 64;
    const out: { t: number; fitValue: number }[] = [];
    for (let i = 0; i <= N; i++) {
      const x = a + ((b - a) * i) / N;
      out.push({ t: x, fitValue: fit.fn(x) });
    }
    return out;
  }, [fit]);

  const merged = useMemo(() => {
    type Row = { t: number; frame?: number; v?: number; fitValue?: number };
    const map = new Map<number, Row>();
    for (const d of data) map.set(d.t, { t: d.t, frame: d.frame, v: d.v });
    for (const f of fitData) {
      const existing = map.get(f.t);
      if (existing) existing.fitValue = f.fitValue;
      else map.set(f.t, { t: f.t, fitValue: f.fitValue });
    }
    return Array.from(map.values()).sort((a, b) => a.t - b.t);
  }, [data, fitData]);

  const rangeCount = (range: [number, number]) =>
    data.filter((d) => d.t >= range[0] && d.t <= range[1]).length;
  const canFitLinear = !!selRange && rangeCount(selRange) >= 2;
  const canFitQuad = !!selRange && rangeCount(selRange) >= 3;

  const isExpanded = expandedPane === "graph";

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
            style={{ padding: "6px 12px", fontSize: 13 }}
          >
            {m.pillLabel}
          </button>
        ))}
        <button
          onClick={() => setExpandedPane(isExpanded ? null : "graph")}
          className="btn-soft"
          style={{ padding: "5px 8px", fontSize: 11, marginLeft: 4 }}
          title={isExpanded ? "Restore split layout" : "Expand to fill window"}
        >
          {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>

      <div
        className="flex items-center gap-1.5 px-4 py-2 border-b"
        style={{ borderColor: "rgb(var(--color-border) / 0.07)" }}
      >
        <button
          className="btn-soft"
          style={{ padding: "4px 10px", fontSize: 11 }}
          onClick={() => applyFit("linear")}
          disabled={!canFitLinear}
          title="Drag a horizontal range on the chart, then apply a linear fit"
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
        {zeroFirstPoint && (
          <span className="text-[11px] text-muted">
            t = 0 set to first tracked point
          </span>
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
              margin={{ top: 16, right: 24, left: 24, bottom: 36 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => setDragging(false)}
            >
              <CartesianGrid stroke="rgb(var(--color-border) / 0.10)" strokeDasharray="3 3" />
              <XAxis
                dataKey="t"
                type="number"
                domain={tDomain}
                ticks={tTicks}
                tickFormatter={(v: number) => v.toFixed(2)}
                stroke="rgb(var(--color-muted))"
                tick={{ fontSize: 12, fontFamily: "ui-monospace, monospace" }}
                tickMargin={8}
                height={48}
              >
                <Label
                  value="t (s)"
                  position="insideBottom"
                  offset={-12}
                  style={{
                    fill: "rgb(var(--color-text))",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "var(--font-sans), Inter, sans-serif",
                  }}
                />
              </XAxis>
              <YAxis
                domain={yDomain}
                ticks={yTicks}
                stroke="rgb(var(--color-muted))"
                tick={{ fontSize: 12, fontFamily: "ui-monospace, monospace" }}
                tickFormatter={(v: number) => v.toFixed(2)}
                tickMargin={6}
                width={64}
                label={{
                  value: def.shortLabel.split(" vs ")[0] + ` (${def.yUnit})`,
                  angle: -90,
                  position: "insideLeft",
                  offset: 0,
                  style: {
                    fill: "rgb(var(--color-text))",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "var(--font-sans), Inter, sans-serif",
                    textAnchor: "middle",
                  },
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "rgb(var(--color-surface))",
                  border: "1px solid rgb(var(--color-border) / 0.2)",
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

              <Scatter dataKey="v" fill={objColor} isAnimationActive={false} />

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
      </div>

      {/* Stats footer */}
      <div className="card-footer flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-[12px] text-muted">
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              background: objColor,
            }}
          />
          {def.yAxisLabel}
        </span>
        <div className="flex-1" />
        {fit ? (
          <div className="font-mono text-[11px] tabular flex items-center gap-3">
            <span style={{ color: "rgb(var(--color-accent))" }}>{fit.equation}</span>
            <span className="text-muted">R² = {fit.r2.toFixed(4)}</span>
            <span className="text-muted">
              t ∈ [{fit.range[0].toFixed(2)}, {fit.range[1].toFixed(2)}]
            </span>
          </div>
        ) : selRange ? (
          <span className="font-mono text-[11px] text-muted tabular">
            Selected: t ∈ [{selRange[0].toFixed(2)}, {selRange[1].toFixed(2)}] —
            choose a fit above.
          </span>
        ) : (
          <span className="text-[11px] text-muted">
            Drag a horizontal range to enable fitting.
          </span>
        )}
      </div>
    </div>
  );
}
