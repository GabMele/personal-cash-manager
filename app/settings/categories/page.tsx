"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, GripVertical, Plus, Trash2 } from "lucide-react";
import { useCategories, useStore } from "@/lib/store";
import { catColor } from "@/lib/colors";
import type { Cats } from "@/lib/categories";


type Drag = { kind: "cat"; cat: string } | { kind: "sub"; cat: string; sub: string };

export default function Settings() {
  const { state, upsert } = useStore();
  const { cats, save, reset } = useCategories();
  const [preview, setPreview] = useState<Cats | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const live = useRef<Cats>(cats);       // stato corrente durante il trascinamento
  const cur = useRef<Drag | null>(null);  // elemento trascinato (segue i cambi di categoria)
  const origin = useRef<Drag | null>(null);
  const [newCat, setNewCat] = useState("");
  const [newSub, setNewSub] = useState<Record<string, string>>({});

  const view = preview ?? cats;
  const used = (c: string, s?: string) => state.txs.filter((t) => t.category === c && (s === undefined || t.subcategory === s)).length;

  // Aggiorna i movimenti esistenti quando una categoria/sottocategoria cambia nome o posto
  const retag = (c: string, s: string | undefined, nc: string, ns?: string) =>
    state.txs
      .filter((t) => t.category === c && (s === undefined || t.subcategory === s))
      .forEach((t) => upsert("txs", { ...t, category: nc, subcategory: s === undefined ? t.subcategory : (ns ?? s) }));

  const entries = (c: Cats) => Object.entries(c);
  const rebuild = (e: [string, string[]][]) => Object.fromEntries(e) as Cats;

  const startDrag = (d: Drag) => (ev: React.PointerEvent) => {
    ev.preventDefault();
    live.current = cats; cur.current = d; origin.current = d;
    setDrag(d); setPreview(cats);

    const move = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const d0 = cur.current!;
      let next: Cats | null = null;
      if (d0.kind === "cat") {
        const target = el?.closest<HTMLElement>("[data-cat]")?.dataset.cat;
        if (target && target !== d0.cat) {
          const list = entries(live.current);
          const from = list.findIndex(([k]) => k === d0.cat), to = list.findIndex(([k]) => k === target);
          const [x] = list.splice(from, 1); list.splice(to, 0, x);
          next = rebuild(list);
        }
      } else {
        const subEl = el?.closest<HTMLElement>("[data-sub]");
        const catEl = el?.closest<HTMLElement>("[data-cat]");
        const tCat = subEl?.dataset.subcat ?? catEl?.dataset.cat;
        if (tCat) {
          const tSub = subEl?.dataset.sub;
          if (!(tCat === d0.cat && tSub === d0.sub)) {
            const c = Object.fromEntries(entries(live.current).map(([k, v]) => [k, [...v]])) as Cats;
            c[d0.cat] = c[d0.cat].filter((s) => s !== d0.sub);
            if (c[tCat].includes(d0.sub) && tCat !== d0.cat) return; // nome già presente nell'altra categoria
            const idx = tSub ? c[tCat].indexOf(tSub) : c[tCat].length;
            c[tCat].splice(idx < 0 ? c[tCat].length : idx, 0, d0.sub);
            cur.current = { kind: "sub", cat: tCat, sub: d0.sub };
            next = c;
          }
        }
      }
      if (next) { live.current = next; setPreview(next); setDrag(cur.current); }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const o = origin.current, c = cur.current;
      if (o?.kind === "sub" && c?.kind === "sub" && o.cat !== c.cat) retag(o.cat, o.sub, c.cat);
      save(live.current);
      setPreview(null); setDrag(null); cur.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const renameCat = (old: string, name: string) => {
    name = name.trim();
    if (!name || name === old || cats[name]) return;
    save(rebuild(entries(cats).map(([k, v]) => [k === old ? name : k, v])));
    retag(old, undefined, name);
  };
  const renameSub = (c: string, old: string, name: string) => {
    name = name.trim();
    if (!name || name === old || cats[c].includes(name)) return;
    save({ ...cats, [c]: cats[c].map((s) => (s === old ? name : s)) });
    retag(c, old, c, name);
  };
  // Eliminazione: se ci sono movimenti collegati si sceglie dove spostarli
  const [del, setDel] = useState<{ cat: string; sub?: string; tCat: string; tSub: string } | null>(null);
  const targetSubs = (d: { cat: string; sub?: string; tCat: string }) => (cats[d.tCat] ?? []).filter((x) => !(d.tCat === d.cat && x === d.sub));
  const removeNow = (c: string, s?: string) => {
    if (s === undefined) { const { [c]: _, ...rest } = cats; void _; save(rest); }
    else save({ ...cats, [c]: cats[c].filter((x) => x !== s) });
  };
  const askDelete = (c: string, s?: string) => {
    const n = used(c, s);
    if (!n) { if (confirm(`Eliminare "${s ?? c}"?`)) removeNow(c, s); return; }
    const tCat = s === undefined ? Object.keys(cats).find((k) => k !== c) ?? "" : c;
    const first = (cats[tCat] ?? []).find((x) => !(tCat === c && x === s));
    setDel({ cat: c, sub: s, tCat, tSub: first ?? "" });
  };
  const confirmDelete = () => {
    if (!del) return;
    state.txs
      .filter((t) => t.category === del.cat && (del.sub === undefined || t.subcategory === del.sub))
      .forEach((t) => upsert("txs", { ...t, category: del.tCat, subcategory: del.tSub }));
    removeNow(del.cat, del.sub);
    setDel(null);
  };
  const addSub = (c: string) => {
    const s = (newSub[c] ?? "").trim();
    if (!s || cats[c].includes(s)) return;
    save({ ...cats, [c]: [...cats[c], s] });
    setNewSub({ ...newSub, [c]: "" });
  };
  const addCat = () => {
    const c = newCat.trim();
    if (!c || cats[c]) return;
    save({ ...cats, [c]: [] });
    setNewCat("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/settings" aria-label="Indietro" className="rounded-full bg-tint p-2"><ArrowLeft size={18} /></Link>
        <h1 className="text-xl font-bold">Categorie</h1>
      </div>
      <p className="text-xs text-muted">Trascina ⠿ per cambiare ordine; una sottocategoria si può spostare in un&apos;altra categoria. Tocca un nome per rinominarlo.</p>

      <div className="space-y-3">
        {entries(view).map(([c, subs]) => (
          <div key={c} data-cat={c} className={`card p-3 ${drag?.kind === "cat" && drag.cat === c ? "ring-2 ring-accent" : ""}`}>
            <div className="flex items-center gap-2">
              <span onPointerDown={startDrag({ kind: "cat", cat: c })} className="cursor-grab touch-none p-1 text-muted" aria-label="Sposta categoria"><GripVertical size={18} /></span>
              <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: catColor(c) }} />
              <input key={c} className="min-w-0 flex-1 bg-transparent font-semibold outline-none focus:underline" defaultValue={c}
                onBlur={(e) => { renameCat(c, e.target.value); e.target.value = c; }} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
              <button onClick={() => askDelete(c)} aria-label="Elimina categoria" className="p-1 text-muted hover:text-bad"><Trash2 size={16} /></button>
            </div>
            <div className="mt-2 space-y-1 pl-4">
              {subs.map((s) => (
                <div key={s} data-sub={s} data-subcat={c}
                  className={`flex items-center gap-2 rounded-lg bg-tint px-2 py-1 ${drag?.kind === "sub" && drag.sub === s && drag.cat === c ? "ring-2 ring-accent2" : ""}`}>
                  <span onPointerDown={startDrag({ kind: "sub", cat: c, sub: s })} className="cursor-grab touch-none p-1 text-muted" aria-label="Sposta sottocategoria"><GripVertical size={16} /></span>
                  <input key={s} className="min-w-0 flex-1 bg-transparent text-sm outline-none focus:underline" defaultValue={s}
                    onBlur={(e) => { renameSub(c, s, e.target.value); e.target.value = s; }} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
                  <button onClick={() => askDelete(c, s)} aria-label="Elimina sottocategoria" className="p-1 text-muted hover:text-bad"><Trash2 size={14} /></button>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <input className="inp !py-1.5 !text-sm" placeholder="Nuova sottocategoria" value={newSub[c] ?? ""}
                  onChange={(e) => setNewSub({ ...newSub, [c]: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addSub(c)} />
                <button onClick={() => addSub(c)} aria-label="Aggiungi sottocategoria" className="rounded-full bg-tint2 p-2"><Plus size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input className="inp" placeholder="Nuova categoria" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCat()} />
        <button onClick={addCat} aria-label="Aggiungi categoria" className="btn !px-3"><Plus size={18} /></button>
      </div>
      <button className="text-xs text-muted underline" onClick={() => confirm("Ripristinare le categorie predefinite?") && reset()}>Ripristina predefinite</button>

      {del && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setDel(null)}>
          <div className="card w-full max-w-sm space-y-3 bg-pop p-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold">Elimina {del.sub ? `${del.cat} › ${del.sub}` : del.cat}</h2>
            <p className="text-sm text-muted">{used(del.cat, del.sub)} movimenti collegati: scegli dove spostarli.</p>
            <label className="block"><span className="lbl">Categoria</span>
              <select className="inp" value={del.tCat} onChange={(e) => {
                const tCat = e.target.value;
                setDel({ ...del, tCat, tSub: targetSubs({ ...del, tCat })[0] ?? "" });
              }}>
                {Object.keys(cats).filter((k) => del.sub !== undefined || k !== del.cat).map((k) => <option key={k}>{k}</option>)}
              </select></label>
            <label className="block"><span className="lbl">Sottocategoria</span>
              <select className="inp" value={del.tSub} onChange={(e) => setDel({ ...del, tSub: e.target.value })}>
                <option value="">— nessuna —</option>
                {targetSubs(del).map((k) => <option key={k}>{k}</option>)}
              </select></label>
            <div className="flex justify-end gap-2 pt-1">
              <button className="btn-ghost text-sm" onClick={() => setDel(null)}>Annulla</button>
              <button className="btn !bg-none bg-bad text-sm" disabled={!del.tCat} onClick={confirmDelete}>Sposta ed elimina</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
