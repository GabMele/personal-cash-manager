"use client";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Moon, Sun, Tags } from "lucide-react";
import { useTheme } from "@/lib/theme";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" aria-label="Indietro" className="rounded-full bg-tint p-2"><ArrowLeft size={18} /></Link>
        <h1 className="text-xl font-bold">Impostazioni</h1>
      </div>

      <div className="card divide-y divide-line">
        <div className="flex items-center justify-between gap-3 p-4">
          <span className="font-medium">Tema</span>
          <div className="flex overflow-hidden rounded-xl border border-line2 text-sm">
            {([["light", "Chiaro", Sun], ["dark", "Scuro", Moon]] as const).map(([v, l, I]) => (
              <button key={v} onClick={() => setTheme(v)} className={`flex items-center gap-1.5 px-3 py-1.5 ${theme === v ? "bg-accent/40 font-semibold" : "text-muted"}`}>
                <I size={14} /> {l}
              </button>
            ))}
          </div>
        </div>
        <Link href="/settings/categories" className="flex items-center justify-between gap-3 p-4">
          <span className="flex items-center gap-2 font-medium"><Tags size={18} className="text-muted" /> Categorie</span>
          <ChevronRight size={18} className="text-muted" />
        </Link>
      </div>
    </div>
  );
}
