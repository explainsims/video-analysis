"use client";

import { Copy, FileDown, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { showAlert } from "@/lib/modal";
import { useAnalysisStore } from "@/lib/store";

function escapeCsvCell(s: string): string {
  if (s == null) return "";
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function tableToCsv(columns: string[], rows: string[][]): string {
  const head = columns.map(escapeCsvCell).join(",");
  const body = rows
    .filter((r) => r.some((c) => c !== ""))
    .map((r) => r.map(escapeCsvCell).join(","))
    .join("\n");
  return body ? `${head}\n${body}\n` : `${head}\n`;
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

export function CustomTablePane() {
  const customTable = useAnalysisStore((s) => s.customTable);
  const setShowCustomTable = useAnalysisStore((s) => s.setShowCustomTable);
  const addCustomTableColumn = useAnalysisStore((s) => s.addCustomTableColumn);
  const renameCustomTableColumn = useAnalysisStore(
    (s) => s.renameCustomTableColumn
  );
  const removeCustomTableColumn = useAnalysisStore(
    (s) => s.removeCustomTableColumn
  );
  const setCustomTableCell = useAnalysisStore((s) => s.setCustomTableCell);
  const removeCustomTableRow = useAnalysisStore((s) => s.removeCustomTableRow);

  const { columns, rows } = customTable;
  const filledRowCount = rows.filter((r) => r.some((c) => c !== "")).length;

  const [editingHeader, setEditingHeader] = useState<number | null>(null);

  const onExport = () => {
    if (filledRowCount === 0 && columns.length === 0) return;
    downloadCsv("custom_table.csv", tableToCsv(columns, rows));
  };

  const onCopy = async () => {
    const csv = tableToCsv(columns, rows);
    try {
      await navigator.clipboard.writeText(csv);
    } catch {
      await showAlert(
        "Couldn't copy to clipboard",
        "Your browser blocked clipboard access. You can still use Export CSV."
      );
    }
  };

  return (
    <div className="card h-full">
      <div className="card-header">
        <span>Custom data table</span>
        <span className="pill">
          {filledRowCount} {filledRowCount === 1 ? "row" : "rows"}
        </span>
        <div className="flex-1" />
        <button
          onClick={addCustomTableColumn}
          className="btn-soft"
          style={{ padding: "5px 10px", fontSize: 11 }}
          title="Add a new column"
        >
          <Plus size={12} /> Column
        </button>
        <button
          onClick={onCopy}
          className="btn-soft"
          style={{ padding: "5px 10px", fontSize: 11 }}
          title="Copy table as CSV"
        >
          <Copy size={12} /> Copy
        </button>
        <button
          onClick={onExport}
          className="btn-soft"
          style={{ padding: "5px 10px", fontSize: 11 }}
          title="Download as CSV"
        >
          <FileDown size={12} /> Export CSV
        </button>
        <button
          onClick={() => setShowCustomTable(false)}
          className="btn-soft"
          style={{ padding: "5px 8px", fontSize: 11 }}
          title="Close custom data table"
        >
          <X size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-auto table-scroll">
        <table className="w-full font-mono text-[11.5px] tabular">
          <thead
            className="sticky top-0 z-10"
            style={{ background: "rgb(var(--color-bg-alt))" }}
          >
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className="px-2 py-2 font-medium text-left"
                  style={{
                    borderBottom: "1px solid rgb(var(--color-grid-strong) / 0.7)",
                    borderRight: "1px solid rgb(var(--color-grid) / 0.45)",
                    minWidth: 80,
                  }}
                >
                  <div className="flex items-center gap-1">
                    {editingHeader === i ? (
                      <input
                        autoFocus
                        defaultValue={col}
                        onBlur={(e) => {
                          renameCustomTableColumn(i, e.currentTarget.value);
                          setEditingHeader(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            renameCustomTableColumn(
                              i,
                              e.currentTarget.value
                            );
                            setEditingHeader(null);
                          } else if (e.key === "Escape") {
                            setEditingHeader(null);
                          }
                        }}
                        className="w-full bg-transparent outline-none text-[12px] font-semibold"
                        style={{
                          borderBottom: "1.5px solid rgb(var(--color-brand))",
                          color: "rgb(var(--color-text))",
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => setEditingHeader(i)}
                        className="flex-1 text-left text-[12px] font-semibold hover:text-brand transition truncate"
                        style={{ color: "rgb(var(--color-text))" }}
                        title="Click to rename column"
                      >
                        {col || <span className="text-muted">(unnamed)</span>}
                      </button>
                    )}
                    {columns.length > 1 && (
                      <button
                        onClick={() => removeCustomTableColumn(i)}
                        className="opacity-40 hover:opacity-100 transition"
                        title="Remove column"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th
                style={{
                  borderBottom: "1px solid rgb(var(--color-grid-strong) / 0.7)",
                  width: 28,
                }}
              />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const rowEmpty = row.every((c) => c === "");
              return (
                <tr
                  key={ri}
                  style={{
                    borderTop: "1px solid rgb(var(--color-grid) / 0.45)",
                  }}
                >
                  {columns.map((_, ci) => (
                    <td
                      key={ci}
                      className="p-0 align-top"
                      style={{
                        borderRight: "1px solid rgb(var(--color-grid) / 0.45)",
                      }}
                    >
                      <input
                        value={row[ci] ?? ""}
                        onChange={(e) =>
                          setCustomTableCell(ri, ci, e.target.value)
                        }
                        className="w-full bg-transparent outline-none px-2 py-1.5 text-[11.5px] tabular"
                        style={{ color: "rgb(var(--color-text))" }}
                      />
                    </td>
                  ))}
                  <td className="p-0 align-middle text-right pr-1.5">
                    {!rowEmpty && (
                      <button
                        onClick={() => removeCustomTableRow(ri)}
                        className="opacity-30 hover:opacity-100 transition"
                        title="Remove row"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
