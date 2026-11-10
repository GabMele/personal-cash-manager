"use client";
import { useCallback, useSyncExternalStore } from "react";

export type Theme = "dark" | "light";
const KEY = "pcm-theme";
const listeners = new Set<() => void>();

const read = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

/** Lo script in <head> (layout) imposta data-theme prima del primo paint. */
export function useTheme() {
  const theme = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    read,
    () => "dark" as Theme,
  );
  const setTheme = useCallback((t: Theme) => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(KEY, t); } catch {}
    listeners.forEach((l) => l());
  }, []);
  return { theme, setTheme };
}
