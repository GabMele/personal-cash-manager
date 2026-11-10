"use client";
import { useStore } from "@/lib/store";

/** Interruttore patrimonio: senza beni (solo conti e titoli) o con beni materiali al valore stimato. */
export default function AssetsToggle() {
  const { includeAssets, setIncludeAssets } = useStore();
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-tint p-1 text-xs" role="radiogroup" aria-label="Patrimonio con o senza beni">
      {([[false, "Senza beni"], [true, "Con beni"]] as const).map(([v, l]) => (
        <button key={l} role="radio" aria-checked={includeAssets === v} onClick={() => setIncludeAssets(v)}
          className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 ${includeAssets === v ? "bg-accent" : "text-muted"}`}>{l}</button>
      ))}
    </div>
  );
}
