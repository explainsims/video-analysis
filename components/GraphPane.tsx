"use client";

import {
  Eraser,
  FunctionSquare,
  ImageDown,
  Maximize2,
  Minimize2,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { exportSvgAsA4Png } from "@/lib/exportGraphPng";
import { linearFit, quadraticFit } from "@/lib/math";
import { showAlert } from "@/lib/modal";
import { useAnalysisStore } from "@/lib/store";

type GraphMode = "xt" | "yt" | "vxt" | "vyt";
type FitKind = "linear" | "quadratic";

interface ModeDef {
  id: GraphMode;
  /** Plain-text label (no markup). Used for filenames & tooltips. */
  shortLabel: string;
  /** Rich React label with real subscripts and dash separator. */
  pillLabel: React.ReactNode;
  /** Y-axis label (used in Recharts; falls back to plain text — Recharts can't
   *  render React JSX inside SVG). */
  yLabelPlain: string;
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

// Subscripts in pill / footer labels: a small, baseline-aligned <sub> that
// stays readable. Plain text fallback (e.g. for filename) lives in shortLabel.
const Subscript = ({ children }: { children: React.ReactNode }) => (
  <sub
    style={{
      fontSize: "0.78em",
      lineHeight: 1,
      verticalAlign: "-0.18em",
      marginLeft: "0.02em",
    }}
  >
    {children}
  </sub>
);

const MODES: ModeDef[] = [
  {
    id: "xt",
    shortLabel: "x-t",
    pillLabel: <>x – t</>,
    yLabelPlain: "x (m)",
    yUnit: "m",
    build: (rows) => rows.map((r) => ({ t: r.t, frame: r.frame, v: r.x })),
  },
  {
    id: "yt",
    shortLabel: "y-t",
    pillLabel: <>y – t</>,
    yLabelPlain: "y (m)",
    yUnit: "m",
    build: (rows) => rows.map((r) => ({ t: r.t, frame: r.frame, v: r.y })),
  },
  {
    id: "vxt",
    shortLabel: "vx-t",
    pillLabel: (
      <>
        v<Subscript>x</Subscript> – t
      </>
    ),
    yLabelPlain: "vₓ (m/s)",
    yUnit: "m/s",
    build: (rows) => rows.map((r) => ({ t: r.t, frame: r.frame, v: r.vx })),
  },
  {
    id: "vyt",
    shortLabel: "vy-t",
    pillLabel: (
      <>
        v<Subscript>y</Subscript> – t
      </>
    ),
    yLabelPlain: "vᵧ (m/s)",
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
  /** True when the fit was applied to all data (no horizontal range was selected). */
  isFullData: boolean;
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
    out.push(Number(v.toFixed(12)));
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
  const projectName = useAnalysisStore((s) => s.projectName);
  const [graphMode, setGraphMode] = useState<GraphMode>("xt");

  const chartHostRef = useRef<HTMLDivElement>(null);

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

  // Reset selection/fit when mode/object/zero changes.
  useEffect(() => {
    setFit(null);
    setSelStart(null);
    setSelEnd(null);
    setDragging(false);
  }, [graphMode, activeObjectId, zeroFirstPoint]);

  // Auto-update the fit if it's "all data" and the data changes.
  useEffect(() => {
    if (!fit || !fit.isFullData) return;
    if (data.length < (fit.kind === "quadratic" ? 3 : 2)) {
      setFit(null);
      return;
    }
    const xs = data.map((d) => d.t);
    const ys = data.map((d) => d.v);
    const range: [number, number] = [xs[0], xs[xs.length - 1]];
    if (fit.kind === "linear") {
      const lf = linearFit(xs, ys);
      setFit({
        kind: "linear",
        range,
        fn: (x) => lf.m * x + lf.b,
        equation: `y = ${fmtSig(lf.m)} t + ${fmtSig(lf.b)}`,
        r2: lf.r2,
        isFullData: true,
      });
    } else {
      const qf = quadraticFit(xs, ys);
      setFit({
        kind: "quadratic",
        range,
        fn: (x) => qf.A * x * x + qf.B * x + qf.C,
        equation: `y = ${fmtSig(qf.A)} t² + ${fmtSig(qf.B)} t + ${fmtSig(qf.C)}`,
        r2: qf.r2,
        isFullData: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const cursor = data.find((d) => d.frame === selectedFrame);

  const selRange: [number, number] | null =
    selStart !== null && selEnd !== null
      ? [Math.min(selStart, selEnd), Math.max(selStart, selEnd)]
      : null;

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

  /** Apply a fit to either the selected range or, if no selection exists, all
   *  data points. The "isFullData" flag lets the fit keep updating as new
   *  points are tracked. */
  const applyFit = (kind: FitKind) => {
    const minPts = kind === "quadratic" ? 3 : 2;
    let inRange: ChartRow[];
    let isFullData: boolean;
    let range: [number, number];
    if (selRange) {
      const [t0, t1] = selRange;
      inRange = data.filter((d) => d.t >= t0 && d.t <= t1);
      isFullData = false;
      range = selRange;
    } else {
      inRange = data;
      isFullData = true;
      range = data.length > 0 ? [data[0].t, data[data.length - 1].t] : [0, 1];
    }
    if (inRange.length < minPts) {
      void showAlert(
        kind === "linear" ? "Need at least 2 points" : "Need at least 3 points",
        kind === "linear"
          ? "Track 2 or more points before fitting a line."
          : "Track 3 or more points before fitting a quadratic."
      );
      return;
    }
    const xs = inRange.map((d) => d.t);
    const ys = inRange.map((d) => d.v);
    if (kind === "linear") {
      const lf = linearFit(xs, ys);
      setFit({
        kind,
        range,
        fn: (x) => lf.m * x + lf.b,
        equation: `y = ${fmtSig(lf.m)} t + ${fmtSig(lf.b)}`,
        r2: lf.r2,
        isFullData,
      });
    } else {
      const qf = quadraticFit(xs, ys);
      setFit({
        kind,
        range,
        fn: (x) => qf.A * x * x + qf.B * x + qf.C,
        equation: `y = ${fmtSig(qf.A)} t² + ${fmtSig(qf.B)} t + ${fmtSig(qf.C)}`,
        r2: qf.r2,
        isFullData,
      });
    }
  };

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

  // Fits are available as soon as there are enough points overall; the buttons
  // operate on the selected range when one exists, otherwise on all data.
  const canFitLinear = data.length >= 2;
  const canFitQuad = data.length >= 3;

  const onExportPng = async () => {
    const host = chartHostRef.current;
    const svg = host?.querySelector("svg");
    if (!svg) {
      void showAlert(
        "Nothing to export yet",
        "Add tracked points so the graph has data to render."
      );
      return;
    }
    const subtitle = fit
      ? `${def.shortLabel} · ${fit.equation} · R² = ${fit.r2.toFixed(4)}`
      : `${def.shortLabel} · ${data.length} points · ${active?.name ?? ""}`;
    const safe = (projectName || "graph").trim().replace(/[^\w.\- ]+/g, "_");
    await exportSvgAsA4Png(svg as SVGSVGElement, {
      title: `${projectName || "Untitled project"} — ${def.shortLabel}`,
      subtitle,
      filename: `${safe}_${def.shortLabel}.png`,
    });
  };

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
            style={{ padding: "6px 14px", fontSize: 14 }}
          >
            {m.pillLabel}
          </button>
        ))}
        <button
          onClick={onExportPng}
          className="btn-soft"
          style={{ padding: "5px 10px", fontSize: 11, marginLeft: 4 }}
          title="Export as a landscape A4 PNG (light background, regardless of theme)"
          disabled={data.length === 0}
        >
          <ImageDown size={13} /> PNG
        </button>
        <button
          onClick={() => setExpandedPane(isExpanded ? null : "graph")}
          className="btn-soft"
          style={{ padding: "5px 8px", fontSize: 11 }}
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
          title={
            selRange
              ? "Linear fit over the selected range"
              : "Linear fit over all tracked points"
          }
        >
          <TrendingUp size={12} /> Linear fit
        </button>
        <button
          className="btn-soft"
          style={{ padding: "4px 10px", fontSize: 11 }}
          onClick={() => applyFit("quadratic")}
          disabled={!canFitQuad}
          title={
            selRange
              ? "Quadratic fit over the selected range"
              : "Quadratic fit over all tracked points"
          }
        >
          <FunctionSquare size={12} /> Quadratic fit
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

      <div
        ref={chartHostRef}
        className="flex-1 px-2 py-1 relative"
        style={{ minHeight: 0 }}
      >
        {!calibration ? (
          <div className="p-4 text-sm text-muted">Calibrate the scale to plot data.</div>
        ) : data.length < 1 ? (
          <div className="p-4 text-sm text-muted">Add tracked points to plot.</div>
        ) : (
          <ResponsiveContainer
            key={expandedPane ?? "split"}
            width="100%"
            height="100%"
          >
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
                  value: def.yLabelPlain,
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
          {def.pillLabel}
        </span>
        <div className="flex-1" />
        {fit ? (
          <div className="font-mono text-[11px] tabular flex items-center gap-3">
            <span style={{ color: "rgb(var(--color-accent))" }}>{fit.equation}</span>
            <span className="text-muted">R² = {fit.r2.toFixed(4)}</span>
            <span className="text-muted">
              {fit.isFullData
                ? `all ${data.length} pts`
                : `t ∈ [${fit.range[0].toFixed(2)}, ${fit.range[1].toFixed(2)}]`}
            </span>
          </div>
        ) : selRange ? (
          <span className="font-mono text-[11px] text-muted tabular">
            Selected: t ∈ [{selRange[0].toFixed(2)}, {selRange[1].toFixed(2)}] —
            choose a fit above.
          </span>
        ) : (
          <span className="text-[11px] text-muted">
            Drag a horizontal range, or apply a fit to all points.
          </span>
        )}
      </div>
    </div>
  );
}
