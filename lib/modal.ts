"use client";

import { create } from "zustand";

export interface ModalAction<T = unknown> {
  label: string;
  /** Visual prominence of this button. */
  variant?: "primary" | "secondary" | "danger";
  /** What to resolve the modal's promise with when this button is pressed. */
  value: T;
  /** Brand color for the primary button (hex). Defaults to var(--color-brand). */
  colorHex?: string;
}

export interface ModalSpec<T = unknown> {
  title: string;
  body?: React.ReactNode;
  /** If set, renders an input with this initial value and Enter submits the primary action. */
  input?: { initialValue: string; placeholder?: string; type?: "text" | "number" };
  actions: ModalAction<T>[];
  /** Value to resolve with on Escape / backdrop click. Defaults to undefined. */
  dismissValue?: T;
}

interface ModalEntry<T = unknown> extends ModalSpec<T> {
  id: number;
  resolve: (value: T) => void;
}

interface ModalStore {
  queue: ModalEntry<unknown>[];
  push: (entry: ModalEntry<unknown>) => void;
  resolve: (id: number, value: unknown) => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  queue: [],
  push: (entry) => set((s) => ({ queue: [...s.queue, entry] })),
  resolve: (id, value) =>
    set((s) => {
      const e = s.queue.find((x) => x.id === id);
      if (e) e.resolve(value);
      return { queue: s.queue.filter((x) => x.id !== id) };
    }),
}));

let nextId = 1;

export function showModal<T>(spec: ModalSpec<T>): Promise<T> {
  return new Promise<T>((resolve) => {
    useModalStore.getState().push({
      ...spec,
      id: nextId++,
      resolve: resolve as (value: unknown) => void,
    } as ModalEntry<unknown>);
  });
}

/** Themed replacement for window.alert. */
export function showAlert(title: string, body?: React.ReactNode): Promise<void> {
  return showModal<void>({
    title,
    body,
    actions: [{ label: "OK", value: undefined, variant: "primary" }],
    dismissValue: undefined,
  });
}

/** Themed replacement for window.confirm. Resolves true / false. */
export function showConfirm(opts: {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}): Promise<boolean> {
  return showModal<boolean>({
    title: opts.title,
    body: opts.body,
    actions: [
      { label: opts.cancelLabel ?? "Cancel", value: false, variant: "secondary" },
      {
        label: opts.confirmLabel ?? "OK",
        value: true,
        variant: opts.danger ? "danger" : "primary",
      },
    ],
    dismissValue: false,
  });
}

/** Themed replacement for window.prompt. Resolves to the entered string, or null on cancel. */
export function showPrompt(opts: {
  title: string;
  body?: React.ReactNode;
  initialValue?: string;
  placeholder?: string;
  type?: "text" | "number";
  confirmLabel?: string;
  cancelLabel?: string;
}): Promise<string | null> {
  return showModal<string | null>({
    title: opts.title,
    body: opts.body,
    input: {
      initialValue: opts.initialValue ?? "",
      placeholder: opts.placeholder,
      type: opts.type ?? "text",
    },
    actions: [
      { label: opts.cancelLabel ?? "Cancel", value: null, variant: "secondary" },
      // value: "__INPUT__" sentinel — Modal component substitutes the input value.
      { label: opts.confirmLabel ?? "OK", value: "__INPUT__", variant: "primary" },
    ],
    dismissValue: null,
  });
}
