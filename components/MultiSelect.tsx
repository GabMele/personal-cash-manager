"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface Opt { value: string; label: string; color?: string; group?: string }

export default function MultiSelect({ label, options, selected, onChange, compact, right }: {
  compact?: boolean; right?: boolean; label: string; options: Opt[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const active = selected.length > 0;
  const names = selected.map((v) => options.find((o) => o.value === v)?.label ?? v);
  const summary = !active ? "Tutti" : names.length <= 2 ? names.join(", ") : `${names.length} selezionati`;
  const groups = [...new Set(options.map((o) => o.group ?? ""))];
  return (
    <div className={`relative ${compact ? "min-w-0" : ""}`}>
      {/* label sul bordo, stile fieldset */}
      <span className={`pointer-events-none absolute -top-2 left-2.5 z-10 rounded bg-lbl px-1 text-[10px] leading-4 ${active ? "text-accent2" : "text-muted"}`}>{label}</span>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between gap-1 rounded-xl border text-sm ${compact ? "w-full px-2 py-1.5 text-xs" : "w-full px-3 py-2"} ${active ? "border-accent2 text-accent2" : "border-line2 text-fg"}`}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown size={14} className="shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className={`absolute ${right ? "right-0" : "left-0"} top-full z-40 mt-1 max-h-64 w-56 overflow-y-auto rounded-xl border border-line bg-pop p-1 shadow-2xl`}>
            {options.length === 0 && <p className="p-3 text-xs text-muted">Nessuna voce</p>}
            {groups.map((g) => (
              <div key={g}>
                {g && <p className="px-2 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">{g}</p>}
                {options.filter((o) => (o.group ?? "") === g).map((o) => (
                  <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-tint2">
                    <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
                    {o.color && <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: o.color }} />}
                    <span className="truncate">{o.label}</span>
                  </label>
                ))}
              </div>
            ))}
            {active && <button className="w-full p-2 text-left text-xs text-muted" onClick={() => onChange([])}>Azzera</button>}
          </div>
        </>
      )}
    </div>
  );
}
