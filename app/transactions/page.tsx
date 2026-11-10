"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Pencil, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { money, toEur } from "@/lib/fx";
import { STAR_COLORS, assetValue, destOf } from "@/lib/destinations";
import { catColor, projectColor, tagColor } from "@/lib/colors";
import AddTx from "@/components/AddTx";
import Badge from "@/components/Badge";
import MultiSelect from "@/components/MultiSelect";
import type { Tx } from "@/lib/types";

// "Ven 22 ottobre 2026"
const dayLabel = (iso: string) => {
  const t = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z")).replace(".", "");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export default function Transactions() {
  return (
    <Suspense fallback={null}>
      <TransactionsView />
    </Suspense>
  );
}

function TransactionsView() {
  const { state, upsert, remove, rates } = useStore();
  const initAcc = useSearchParams().get("account");
  const [accF, setAccF] = useState<string[]>(initAcc ? [initAcc] : []);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"" | "in" | "out">("");
  const [cat, setCat] = useState<string[]>([]);
  const [proj, setProj] = useState<string[]>([]);
  const [edit, setEdit] = useState<Tx>();
  const [menu, setMenu] = useState<string | null>(null);

  const projects = useMemo(() => [...new Set(state.txs.map((t) => t.project).filter((p): p is string => !!p))].sort(), [state.txs]);
  // categorie divise in Spese / Entrate (giroconti e saldi iniziali esclusi)
  const catOpts = useMemo(() => {
    const out = new Set<string>(), inc = new Set<string>();
    for (const t of state.txs) {
      if (t.kind === "transfer" || t.kind === "opening") continue;
      (t.amount < 0 ? out : inc).add(t.category);
    }
    const mk = (c: string, group: string) => ({ value: c, label: c, color: catColor(c), group });
    const spese = [...out].sort().map((c) => mk(c, "Spese"));
    const entrate = [...inc].filter((c) => !out.has(c)).sort().map((c) => mk(c, "Entrate"));
    return type === "out" ? spese : type === "in" ? [...inc].sort().map((c) => mk(c, "Entrate")) : [...spese, ...entrate];
  }, [state.txs, type]);
  const acc = (id: string) => state.accounts.find((a) => a.id === id);
  const list = state.txs
    .filter((t) => !accF.length || accF.includes(t.account_id))
    .filter((t) => !type || (t.kind !== "transfer" && t.kind !== "opening" && (type === "in" ? t.amount > 0 : t.amount < 0)))
    .filter((t) => !cat.length || cat.includes(t.category))
    .filter((t) => !proj.length || proj.includes(t.project ?? ""))
    .filter((t) => !q || `${t.description} ${t.payee ?? ""} ${t.tags.join(" ")} ${t.subcategory}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));
  const groups = list.reduce<[string, Tx[]][]>((g, t) => {
    if (g.at(-1)?.[0] === t.date) g.at(-1)![1].push(t); else g.push([t.date, [t]]);
    return g;
  }, []);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 overflow-hidden rounded-xl border border-line2 text-xs">
          {([["", "Tutti"], ["out", "Spese"], ["in", "Entrate"]] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => { setType(v); setCat([]); }}
              className={`px-2.5 py-1.5 ${type === v ? "bg-accent/40 font-semibold" : "text-muted"}`}>{l}</button>
          ))}
        </div>
        <input className="inp min-w-0 !py-1.5 !text-sm" placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-x-2 pt-1.5">
        <MultiSelect compact label="Conti" selected={accF} onChange={setAccF} options={state.accounts.map((a) => ({ value: a.id, label: a.name, color: a.color }))} />
        <MultiSelect compact label="Categorie" selected={cat} onChange={setCat} options={catOpts} />
        <MultiSelect compact right label="Progetti" selected={proj} onChange={setProj} options={projects.map((p) => ({ value: p, label: p, color: projectColor(p) }))} />
      </div>

      {groups.map(([date, items]) => {
        const net = items.filter((t) => t.kind !== "transfer" && t.kind !== "opening").reduce((n, t) => n + toEur(t.amount, acc(t.account_id)?.currency, rates), 0);
        return (
        <section key={date}>
          <div className="mb-1 flex items-baseline justify-between px-1">
            <h2 className="text-xs font-semibold text-muted">{dayLabel(date)}</h2>
            {net !== 0 && <span className={`num text-xs ${net < 0 ? "text-muted" : "text-accent2"}`}>{net > 0 ? "+" : "−"}{Math.abs(net).toLocaleString("it-IT", { maximumFractionDigits: 2, minimumFractionDigits: 2 })} €</span>}
          </div>
          <div className="rounded-2xl border border-line bg-row divide-y divide-line">
        {items.map((t) => {
          const a = acc(t.account_id);
          const pending = t.status === "pending";
          return (
            <div key={t.id} role="button" tabIndex={0} aria-label="Apri transazione"
              onClick={() => (t.kind === "transfer" || t.kind === "opening" ? setMenu(menu === t.id ? null : t.id) : setEdit(t))}
              onKeyDown={(e) => e.key === "Enter" && (t.kind === "transfer" || t.kind === "opening" ? setMenu(t.id) : setEdit(t))}
              className={`relative flex cursor-pointer gap-2 px-3 py-1.5 outline-none ${menu === t.id ? "z-20" : ""}`}>
              <div className={`min-w-0 flex-1 space-y-1 ${pending ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm">{t.description || "—"}</p>
                  <span className={`num shrink-0 text-sm font-semibold ${t.amount < 0 ? "text-bad" : "text-accent2"}`}>{money(t.amount, a?.currency)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1 [&>span]:!py-0 [&>span]:!text-[10px]">
                  {a && <Badge color={a.color} solid>{a.name}</Badge>}
                  {pending && <Badge color="#ffd23d">da confermare</Badge>}
                  {t.tags.map((x) => <Badge key={x} color={tagColor(x)}>#{x}</Badge>)}
                  {t.kind === "opening"
                    ? <Badge color="#9a9ab5">🏁 Saldo iniziale</Badge>
                    : t.kind === "transfer"
                    ? <Badge color="#9a9ab5">↔ Giroconto</Badge>
                    : <Badge color={catColor(t.category)}>{t.category}</Badge>}
                  {t.project && <Badge color={projectColor(t.project)}>📁 {t.project}</Badge>}
                  {destOf(t.destination) && <Badge color={destOf(t.destination)!.color}>{destOf(t.destination)!.emoji} {destOf(t.destination)!.label}</Badge>}
                  {assetValue(t) > 0 && Math.round(assetValue(t)) !== Math.round(Math.abs(t.amount)) && (
                    <Badge color="#3da5ff">valore {money(assetValue(t), a?.currency)}</Badge>
                  )}
                  {t.stars > 0 && <span className="text-xs tracking-tight" style={{ color: STAR_COLORS[t.stars] }} aria-label={`${t.stars} stelle`}>{"★".repeat(t.stars)}<span className="text-tint2">{"★".repeat(5 - t.stars)}</span></span>}
                </div>
              </div>
              {menu === t.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenu(null); }} />
                  <div onClick={(e) => e.stopPropagation()} className="absolute right-3 top-2 z-20 w-40 overflow-hidden rounded-xl border border-line bg-pop text-sm shadow-xl">
                    {t.kind !== "transfer" && t.kind !== "opening" && <button className="flex w-full items-center gap-2 px-3 py-2.5 hover:bg-tint2" onClick={() => { setEdit(t); setMenu(null); }}><Pencil size={14} /> Modifica</button>}
                    {pending && <button className="flex w-full items-center gap-2 px-3 py-2.5 text-accent2 hover:bg-tint2" onClick={() => { upsert("txs", { ...t, status: "confirmed" }); setMenu(null); }}><Check size={14} /> Conferma</button>}
                    <button className="flex w-full items-center gap-2 px-3 py-2.5 text-bad hover:bg-tint2" onClick={() => { setMenu(null); confirm(t.kind === "transfer" ? "Eliminare il giroconto (entrambe le gambe)?" : "Eliminare?") && remove("txs", t.id); }}><Trash2 size={14} /> Elimina</button>
                  </div>
                </>
              )}
            </div>
          );
        })}
          </div>
        </section>
        );
      })}
      {list.length === 0 && <p className="p-4 text-sm text-muted">Nessun risultato.</p>}
      {edit && <AddTx edit={edit} onClose={() => setEdit(undefined)} />}
    </div>
  );
}
