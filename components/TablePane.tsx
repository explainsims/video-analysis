"use client";

import { FileDown } from "lucide-react";
import { useMemo } from "react";
import { deriveObject, type DerivedRow } from "@/lib/derived";
import { useAnalysisStore } from "@/lib/store";

const COLS: { key: keyof DerivedRow; label: string; unit?: string }[] = [
  { key: "frame", label: "#" },
  { key: "t", label: "t", unit: "s" },
  { key: "x", label: "x", unit: "m" },
  { key: "y", label: "y", unit: "m" },
  { key: "vx", label: "vₓ", unit: "m/s" },
  { key: "vy", label: "vᵧ", unit: "m/s" },
  { key: "speed", label: "|v|", unit: "m/s" },
  { key: "ax", label: "aₓ", unit: "m/s²" },
  { key: "ay", label: "aᵧ", unit: "m/s²" },
];

const fmt = (n: number, key: string): string => {
  if (key === "frame") return n.toString();
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(3);
};

function rowsToCsv(name: string, rows: DerivedRow[]): string {
  const head = COLS.map((c) => (c.unit ? `${c.label} (${c.unit})` : c.label)).join(",");
  const body = rows
    .map((r) => COLS.map((c) => fmt(r[c.key] as number, c.key)).join(","))
    .join("\n");
  return `# Object: ${name}\n${head}\n${body}\n`;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

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

  const onExport = () => {
    if (!active || rows.length === 0) return;
    downloadCsv(
      `${active.name.replace(/\s+/g, "_").toLowerCase()}.csv`,
      rowsToCsv(active.name, rows)
    );
  };

  return (
    <div className="card h-full">
      <div className="card-header">
        <span>Data table — {active?.name ?? "—"}</span>
        <span className="pill">{rows.length} {rows.length === 1 ? "point" : "points"}</span>
        <div className="flex-1" />
        <button
          onClick={onExport}
          disabled={rows.length === 0}
          className="btn-soft"
          style={{ padding: "5px 12px", fontSize: 11.5 }}
          title="Download as CSV"
        >
          <FileDown size={12} /> Export CSV
        </button>
      </div>
      <div className="flex-1 overflow-auto table-scroll">
        {!calibration ? (
          <div className="p-4 text-sm text-muted">Calibrate the scale to see derived data.</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-muted">
            Switch to <span className="font-semibold">Add point</span> mode and click on the moving
            object in the video to add points.
          </div>
        ) : (
          <table className="w-full font-mono text-[11.5px] tabular">
            <thead className="sticky top-0 z-10" style={{ background: "rgb(var(--color-bg-alt))" }}>
              <tr className="text-right text-muted">
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    className="px-3 py-2 font-medium"
                    style={{ borderBottom: "1px solid rgb(var(--color-border) / 0.07)" }}
                  >
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
                    className="cursor-pointer transition"
                    style={{
                      borderTop: "1px solid rgb(var(--color-border) / 0.05)",
                      background: isCurrent ? `${active?.color ?? "#2563eb"}1a` : "transparent",
                      color: isCurrent ? active?.color ?? "rgb(var(--color-brand))" : undefined,
                      borderLeft: isCurrent
                        ? `2px solid ${active?.color ?? "#2563eb"}`
                        : "2px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrent)
                        e.currentTarget.style.background = "rgb(var(--color-border) / 0.04)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrent) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {COLS.map((c) => (
                      <td key={c.key} className="px-3 py-1.5 text-right">
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
