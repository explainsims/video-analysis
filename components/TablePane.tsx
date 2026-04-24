"use client";

import { useMemo } from "react";
import { deriveObject } from "@/lib/derived";
import { useAnalysisStore } from "@/lib/store";

const COLS: { key: keyof import("@/lib/derived").DerivedRow; label: string; unit?: string }[] = [
  { key: "frame", label: "Frame" },
  { key: "t", label: "t", unit: "s" },
  { key: "x", label: "x", unit: "m" },
  { key: "y", label: "y", unit: "m" },
  { key: "vx", label: "vx", unit: "m/s" },
  { key: "vy", label: "vy", unit: "m/s" },
  { key: "speed", label: "|v|", unit: "m/s" },
  { key: "ax", label: "ax", unit: "m/s²" },
  { key: "ay", label: "ay", unit: "m/s²" },
];

const fmt = (n: number, key: string): string => {
  if (key === "frame") return n.toString();
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(3);
};

export function TablePane({ onSelect }: { onSelect: (frame: number) => void }) {
  const objects = useAnalysisStore((s) => s.objects);
  const activeObjectId = useAnalysisStore((s) => s.activeObjectId);
  const calibration = useAnalysisStore((s) => s.calibration);
  const axes = useAnalysisStore((s) => s.axes);
  const selectedFrame = useAnalysisStore((s) => s.selectedFrame);

  const active = objects.find((o) => o.id === activeObjectId);
  const rows = useMemo(
    () => (active ? deriveObject(active, calibration, axes) : []),
    [active, calibration, axes]
  );

  return (
    <div className="pane h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <span className="font-mono text-xs uppercase tracking-wider text-muted">
          Data — {active?.name ?? "—"}
        </span>
        <span className="font-mono text-xs text-muted">{rows.length} samples</span>
      </div>
      <div className="flex-1 overflow-auto table-scroll">
        {!calibration ? (
          <div className="p-4 text-sm text-muted">Calibrate the scale to see derived data.</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-muted">
            Switch to Track mode and click on the moving object in the video to add points.
          </div>
        ) : (
          <table className="w-full font-mono text-xs">
            <thead className="sticky top-0 bg-surface/90 backdrop-blur">
              <tr className="text-left text-muted">
                {COLS.map((c) => (
                  <th key={c.key} className="px-3 py-1.5 font-normal">
                    {c.label}
                    {c.unit && <span className="text-muted/70"> ({c.unit})</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isCurrent = r.frame === selectedFrame;
                return (
                  <tr
                    key={r.frame}
                    onClick={() => onSelect(r.frame)}
                    className={`cursor-pointer transition border-t border-border/40 hover:bg-brand/5 ${
                      isCurrent ? "bg-brand/10 text-brand" : ""
                    }`}
                  >
                    {COLS.map((c) => (
                      <td key={c.key} className="px-3 py-1">
                        {fmt(r[c.key] as number, c.key)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
