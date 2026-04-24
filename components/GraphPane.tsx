"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { deriveObject } from "@/lib/derived";
import { useAnalysisStore } from "@/lib/store";

type SeriesKey = "x" | "y" | "speed" | "vx" | "vy" | "ax" | "ay";

const SERIES: { key: SeriesKey; label: string; unit: string }[] = [
  { key: "x", label: "x", unit: "m" },
  { key: "y", label: "y", unit: "m" },
  { key: "speed", label: "|v|", unit: "m/s" },
  { key: "vx", label: "vx", unit: "m/s" },
  { key: "vy", label: "vy", unit: "m/s" },
  { key: "ax", label: "ax", unit: "m/s²" },
  { key: "ay", label: "ay", unit: "m/s²" },
];

export function GraphPane({ onScrub }: { onScrub: (frame: number) => void }) {
  const objects = useAnalysisStore((s) => s.objects);
  const activeObjectId = useAnalysisStore((s) => s.activeObjectId);
  const calibration = useAnalysisStore((s) => s.calibration);
  const axes = useAnalysisStore((s) => s.axes);
  const selectedFrame = useAnalysisStore((s) => s.selectedFrame);
  const [series, setSeries] = useState<SeriesKey>("x");

  const active = objects.find((o) => o.id === activeObjectId);
  const rows = useMemo(
    () => (active ? deriveObject(active, calibration, axes) : []),
    [active, calibration, axes]
  );

  const data = rows.map((r) => ({ t: r.t, frame: r.frame, value: r[series] }));
  const cursor = rows.find((r) => r.frame === selectedFrame);

  const handleClick = (e: { activePayload?: { payload?: { frame: number } }[] }) => {
    const pl = e?.activePayload?.[0]?.payload;
    if (pl && typeof pl.frame === "number") onScrub(pl.frame);
  };

  return (
    <div className="pane h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <span className="font-mono text-xs uppercase tracking-wider text-muted">Graph</span>
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
      </div>
      <div className="flex-1 p-2">
        {!calibration ? (
          <div className="p-4 text-sm text-muted">Calibrate the scale to plot data.</div>
        ) : data.length < 2 ? (
          <div className="p-4 text-sm text-muted">Add at least two tracked points to plot.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 16, left: -8, bottom: 4 }}
              onClick={handleClick}
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
              <Line
                type="monotone"
                dataKey="value"
                stroke={active?.color ?? "rgb(var(--color-brand))"}
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
              {cursor && (
                <ReferenceLine
                  x={cursor.t}
                  stroke="rgb(var(--color-accent))"
                  strokeDasharray="4 3"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
