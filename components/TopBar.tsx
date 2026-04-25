"use client";

import { Download, FileSpreadsheet, Moon, Pencil, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { showAlert } from "@/lib/modal";
import { downloadProject, exportProject } from "@/lib/projectFile";
import { useAnalysisStore } from "@/lib/store";

export function TopBar() {
  const video = useAnalysisStore((s) => s.video);
  const projectName = useAnalysisStore((s) => s.projectName);
  const setProjectName = useAnalysisStore((s) => s.setProjectName);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = (localStorage.getItem("uml-theme") as "light" | "dark" | null) ?? "light";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("uml-theme", next);
  };

  const onSave = () => {
    const state = useAnalysisStore.getState();
    const safeName =
      (state.projectName || "project").trim().replace(/[^\w.\- ]+/g, "_") ||
      "project";
    const snap = exportProject(state, safeName);
    downloadProject(snap, `${safeName}.motion`);
  };

  const onExportSheets = () => {
    void showAlert(
      "Export to Sheets — coming soon",
      "One-click Google Sheets export lands once Drive OAuth ships."
    );
  };

  const commitTitle = () => {
    const v = (inputRef.current?.value ?? "").trim();
    setProjectName(v || "Untitled project");
    setEditing(false);
  };

  const subtitle = video ? video.filename : "Drop a video to begin";

  return (
    <div
      className="flex items-center bg-surface px-5 gap-3"
      style={{
        height: 56,
        borderBottom: "1px solid rgb(var(--color-border) / 0.08)",
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0"
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
        <div className="min-w-0">
          <div className="font-bold text-[15px] tracking-tight leading-none flex items-center gap-1.5">
            Motion Lab
            <span className="text-muted font-normal">·</span>
            {editing ? (
              <input
                ref={inputRef}
                defaultValue={projectName}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTitle();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setEditing(false);
                  }
                }}
                className="font-semibold text-[14px] bg-transparent outline-none"
                style={{
                  borderBottom: "1.5px solid rgb(var(--color-brand))",
                  minWidth: 80,
                  maxWidth: 360,
                  color: "rgb(var(--color-text))",
                }}
              />
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="group flex items-center gap-1 font-semibold text-[14px] hover:text-brand transition truncate max-w-[40ch]"
                title="Click to rename project"
                style={{ color: "rgb(var(--color-text))" }}
              >
                <span className="truncate">{projectName}</span>
                <Pencil
                  size={11}
                  className="opacity-0 group-hover:opacity-60 flex-shrink-0"
                />
              </button>
            )}
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
