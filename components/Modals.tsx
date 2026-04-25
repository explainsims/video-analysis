"use client";

import { useEffect, useRef } from "react";
import { useModalStore, type ModalAction } from "@/lib/modal";

export function Modals() {
  const queue = useModalStore((s) => s.queue);
  if (queue.length === 0) return null;
  // Stack: render only the top modal so the user always answers in order.
  const modal = queue[queue.length - 1];
  return <ModalCard key={modal.id} entry={modal} />;
}

function ModalCard({ entry }: { entry: ReturnType<typeof useModalStore.getState>["queue"][number] }) {
  const resolve = useModalStore((s) => s.resolve);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input (or the primary button) when the modal mounts.
  useEffect(() => {
    if (entry.input) inputRef.current?.focus();
    inputRef.current?.select();
  }, [entry.input]);

  // Esc → dismiss
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        resolve(entry.id, entry.dismissValue);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entry.id, entry.dismissValue, resolve]);

  const handleAction = (action: ModalAction) => {
    let value = action.value;
    if (entry.input && action.variant === "primary" && action.value === "__INPUT__") {
      value = inputRef.current?.value ?? "";
    }
    resolve(entry.id, value);
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const primary =
        entry.actions.find((a) => a.variant === "primary") ?? entry.actions[entry.actions.length - 1];
      handleAction(primary);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(20, 23, 32, 0.45)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) resolve(entry.id, entry.dismissValue);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`modal-title-${entry.id}`}
        className="card"
        style={{
          width: "min(420px, calc(100vw - 32px))",
          padding: 0,
          boxShadow: "0 8px 32px rgba(20, 23, 32, 0.18)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 pt-5 pb-3 flex flex-col gap-2"
          style={{ borderBottom: "1px solid rgb(var(--color-border) / 0.07)" }}
        >
          <h2
            id={`modal-title-${entry.id}`}
            className="font-bold text-[15px] tracking-tight leading-tight"
          >
            {entry.title}
          </h2>
          {entry.body && (
            <div className="text-[13px] text-muted leading-relaxed">{entry.body}</div>
          )}
        </div>

        {entry.input && (
          <div className="px-5 py-4">
            <input
              ref={inputRef}
              type={entry.input.type}
              defaultValue={entry.input.initialValue}
              placeholder={entry.input.placeholder}
              onKeyDown={onInputKey}
              className="w-full text-[14px] tabular"
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1.5px solid rgb(var(--color-border) / 0.18)",
                background: "rgb(var(--color-bg-alt))",
                color: "rgb(var(--color-text))",
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgb(var(--color-brand))";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgb(var(--color-border) / 0.18)";
              }}
            />
          </div>
        )}

        <div
          className="px-5 py-3 flex justify-end gap-2"
          style={{
            background: "rgb(var(--color-bg-alt))",
            borderTop: "1px solid rgb(var(--color-border) / 0.07)",
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
          }}
        >
          {entry.actions.map((a, i) => (
            <ActionButton key={i} action={a} onClick={() => handleAction(a)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ action, onClick }: { action: ModalAction; onClick: () => void }) {
  const v = action.variant ?? "secondary";
  if (v === "secondary") {
    return (
      <button
        onClick={onClick}
        className="text-[13px] font-semibold transition"
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "1.5px solid rgb(var(--color-border) / 0.15)",
          background: "rgb(var(--color-surface))",
          color: "rgb(var(--color-text))",
          cursor: "pointer",
        }}
      >
        {action.label}
      </button>
    );
  }
  const bg =
    v === "danger" ? "#dc2626" : action.colorHex ?? "rgb(var(--color-brand))";
  return (
    <button
      onClick={onClick}
      className="text-[13px] font-semibold transition text-white"
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: "none",
        background: bg,
        cursor: "pointer",
        boxShadow: `0 2px 8px ${bg}55`,
      }}
    >
      {action.label}
    </button>
  );
}
