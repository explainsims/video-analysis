"use client";

import { Download, FileSpreadsheet, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { downloadProject, exportProject } from "@/lib/projectFile";
import { useAnalysisStore } from "@/lib/store";

export function TopBar() {
  const video = useAnalysisStore((s) => s.video);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const t = (localStorage.getItem("uml-theme") as "light" | "dark" | null) ?? "light";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("uml-theme", next);
  };

  const onSave = () => {
    const state = useAnalysisStore.getState();
    const snap = exportProject(
      state,
      video?.filename?.replace(/\.[^.]+$/, "") ?? "project"
    );
    downloadProject(snap, `${snap.name || "project"}.motion`);
  };

  const onExportSheets = () => {
    alert(
      "Export to Sheets is coming in a follow-up release (Google Drive OAuth + Sheets API)."
    );
  };

  const subtitle = video ? `Project: ${video.filename}` : "Drop a video to begin";

  return (
    <div
      className="flex items-center bg-surface px-5 gap-3"
      style={{
        height: 56,
        borderBottom: "1px solid rgb(var(--color-border) / 0.08)",
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex items-center justify-center text-white font-extrabold text-sm"
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "linear-gradient(135deg, #2563eb, #db2777)",
          }}
          aria-label="Motion Lab"
        >
          M
        </div>
        <div>
          <div className="font-bold text-[15px] tracking-tight leading-none">
            Motion Lab
          </div>
          <div className="text-[11px] text-muted mt-0.5 truncate max-w-[40ch]">
            {subtitle}
          </div>
        </div>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-1.5">
        <button
          className="btn-pill"
          style={{ background: "rgb(var(--color-tool-add))" }}
          onClick={onSave}
          disabled={!video}
          title="Save .motion project file"
        >
          <Download size={14} /> Save
        </button>
        <button
          className="btn-pill"
          style={{ background: "rgb(var(--color-brand))" }}
          onClick={onExportSheets}
          disabled={!video}
          title="Export tracking data to Google Sheets (coming soon)"
        >
          <FileSpreadsheet size={14} /> Export to Sheets
        </button>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title="Toggle light / dark"
          className="ml-1 p-1.5 rounded-md text-muted hover:text-text transition"
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </div>
  );
}
