"use client";
import { useRef, useState } from "react";
import { Camera, Mic, X } from "lucide-react";
import { useCategories, useStore } from "@/lib/store";
import { convert } from "@/lib/fx";
import { DESTINATIONS, STAR_COLORS, defaultDestination, destOf, isMaterial } from "@/lib/destinations";
import type { Tx } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function AddTx({ onClose, edit }: { onClose: () => void; edit?: Tx }) {
  const { state, upsert, remove, rates } = useStore();
  const { cats: CATEGORIES } = useCategories();
  const [type, setType] = useState<"expense" | "income" | "transfer">(edit && edit.amount > 0 ? "income" : "expense");
  const [toId, setToId] = useState(state.accounts[1]?.id ?? "");
  const [recv, setRecv] = useState<string | null>(null); // importo ricevuto, se modificato a mano
  const [f, setF] = useState({
    account_id: edit?.account_id ?? state.accounts[0]?.id ?? "",
    amount: edit ? String(Math.abs(edit.amount)) : "",
    date: edit?.date ?? new Date().toISOString().slice(0, 10),
    description: edit?.description ?? "",
    category: edit?.category ?? "Altro",
    subcategory: edit?.subcategory ?? "Varie",
    tags: edit?.tags.join(", ") ?? "",
    project: edit?.project ?? "",
    payee: edit?.payee ?? "",
  });
  const [destState, setDestState] = useState<string | null>(null); // null = suggerita dalla sottocategoria
  const [stars, setStars] = useState(edit?.stars ?? 0); // le stelle le decidi sempre tu
  const [assetStr, setAssetStr] = useState<string | null>(null); // null = default (valore già salvato o costo)
  const dest = destState ?? (edit ? edit.destination ?? "" : defaultDestination(f.subcategory));
  const material = isMaterial({ destination: dest as Tx["destination"] });
  const assetShown = assetStr ?? (edit?.asset_value != null ? String(edit.asset_value) : f.amount);
  const [source, setSource] = useState<Tx["source"]>(edit?.source ?? "manual");
  const [busy, setBusy] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const apply = (r: any) => {
    if (r.type) setType(r.type);
    setF((p) => ({
      ...p,
      amount: r.amount ? String(r.amount) : p.amount,
      date: r.date || p.date,
      description: r.description || p.description,
      category: CATEGORIES[r.category] ? r.category : p.category,
      subcategory: r.subcategory || p.subcategory,
      tags: Array.isArray(r.tags) && r.tags.length ? r.tags.join(", ") : p.tags,
      payee: r.payee || p.payee,
    }));
    if (r.note) setBusy(r.note);
    else setBusy("");
  };
  const call = async (body: object) => {
    const res = await fetch("/api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, categories: CATEGORIES }) });
    apply(await res.json());
  };

  const onReceipt = async (file0?: File) => {
    if (!file0) return;
    setBusy("Leggo lo scontrino…");
    setSource("receipt");
    const bmp = await createImageBitmap(file0);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas");
    cv.width = bmp.width * scale; cv.height = bmp.height * scale;
    cv.getContext("2d")!.drawImage(bmp, 0, 0, cv.width, cv.height);
    const data = cv.toDataURL("image/jpeg", 0.85).split(",")[1];
    await call({ image: data, mediaType: "image/jpeg" });
  };

  const onVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return setBusy("Dettatura non supportata da questo browser.");
    const r = new SR();
    r.lang = "it-IT";
    r.onresult = async (e: any) => {
      setBusy("Capisco…");
      setSource("voice");
      await call({ text: e.results[0][0].transcript });
    };
    r.onerror = () => setBusy("Microfono non disponibile.");
    r.onend = () => setBusy((b) => (b === "Ascolto…" ? "" : b));
    setBusy("Ascolto…");
    r.start();
  };

  const from = state.accounts.find((a) => a.id === f.account_id);
  const to = state.accounts.find((a) => a.id === toId);
  const amtNum = Math.abs(parseFloat(f.amount.replace(",", "."))) || 0;
  const sameCur = (from?.currency ?? "EUR") === (to?.currency ?? "EUR");
  const autoRecv = Math.round(convert(amtNum, from?.currency, to?.currency, rates) * 100) / 100;
  const recvNum = sameCur ? amtNum : recv !== null ? Math.abs(parseFloat(recv.replace(",", "."))) || 0 : autoRecv;

  const saveTransfer = async () => {
    if (!amtNum || !from || !to || from.id === to.id) return setBusy("Scegli due conti diversi e un importo.");
    const tid = crypto.randomUUID();
    const base = { date: f.date, category: "Trasferimento", subcategory: "", tags: [] as string[], project: "", payee: "", destination: "" as const, stars: 0, asset_value: null, status: "confirmed" as const, kind: "transfer" as const, transfer_id: tid, ref: null, source: "manual" as const };
    const note = f.description.trim();
    await upsert("txs", { ...base, id: crypto.randomUUID(), account_id: from.id, amount: -amtNum, description: note || `Giroconto → ${to.name}` } satisfies Tx);
    await upsert("txs", { ...base, id: crypto.randomUUID(), account_id: to.id, amount: recvNum, description: note || `Giroconto da ${from.name}` } satisfies Tx);
    onClose();
  };

  const save = async () => {
    if (type === "transfer") return saveTransfer();
    const amt = Math.abs(parseFloat(f.amount.replace(",", ".")));
    if (!amt || !f.account_id) return setBusy("Inserisci importo e conto.");
    await upsert("txs", {
      id: edit?.id ?? crypto.randomUUID(),
      account_id: f.account_id,
      date: f.date,
      amount: type === "expense" ? -amt : amt,
      description: f.description,
      category: f.category,
      subcategory: f.subcategory,
      tags: f.tags.split(",").map((s) => s.trim()).filter(Boolean),
      project: f.project.trim(),
      payee: f.payee.trim(),
      destination: type === "expense" ? (dest as Tx["destination"]) : "",
      stars: type === "expense" ? stars : 0,
      asset_value: type === "expense" && material ? Math.abs(parseFloat(assetShown.replace(",", "."))) || amt : null,
      status: "confirmed",
      kind: edit?.kind ?? "normal",
      transfer_id: edit?.transfer_id ?? null,
      ref: edit?.ref ?? null,
      source,
    } satisfies Tx);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/60 sm:items-center sm:justify-center" onClick={onClose}>
      <div className="card max-h-[92dvh] w-full overflow-y-auto rounded-b-none bg-pop p-5 sm:max-w-md sm:rounded-b-[22px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{edit ? "Modifica" : "Nuova transazione"}</h2>
          <button onClick={onClose} aria-label="Chiudi"><X /></button>
        </div>
        {!edit && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button className="btn-ghost flex items-center justify-center gap-2" onClick={() => file.current?.click()}><Camera size={18} /> Scontrino</button>
            <button className="btn-ghost flex items-center justify-center gap-2" onClick={onVoice}><Mic size={18} /> Voce</button>
            <input ref={file} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onReceipt(e.target.files?.[0])} />
          </div>
        )}
        <div className={`mb-3 grid ${edit ? "grid-cols-2" : "grid-cols-3"} rounded-xl bg-tint p-1 text-sm`}>
          {(edit ? (["expense", "income"] as const) : (["expense", "income", "transfer"] as const)).map((t) => (
            <button key={t} onClick={() => setType(t)} className={`rounded-lg py-2 ${type === t ? (t === "expense" ? "bg-bad/80" : t === "income" ? "bg-accent2/80 text-black" : "bg-accent") : "text-muted"}`}>
              {t === "expense" ? "Uscita" : t === "income" ? "Entrata" : "Giroconto"}
            </button>
          ))}
        </div>
        {type === "transfer" && (
          <div className="grid grid-cols-2 gap-3">
            <label><span className="lbl">Da conto</span>
              <select className="inp" value={f.account_id} onChange={(e) => set("account_id", e.target.value)}>
                {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency ?? "EUR"})</option>)}
              </select></label>
            <label><span className="lbl">A conto</span>
              <select className="inp" value={toId} onChange={(e) => setToId(e.target.value)}>
                {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency ?? "EUR"})</option>)}
              </select></label>
            <label><span className="lbl">Importo inviato ({from?.currency ?? "EUR"})</span><input className="inp num" inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value)} /></label>
            <label><span className="lbl">Data</span><input className="inp" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></label>
            {!sameCur && (
              <label className="col-span-2"><span className="lbl">Importo ricevuto ({to?.currency ?? "EUR"}) · cambio {amtNum && recvNum ? (recvNum / amtNum).toFixed(4) : "—"}</span>
                <input className="inp num" inputMode="decimal" value={recv ?? (autoRecv || "")} onChange={(e) => setRecv(e.target.value)} />
                <span className="mt-1 block text-[11px] text-muted">Precompilato col cambio BCE: correggilo con l&apos;importo reale (commissioni incluse).</span></label>
            )}
            <label className="col-span-2"><span className="lbl">Nota</span><input className="inp" value={f.description} onChange={(e) => set("description", e.target.value)} /></label>
          </div>
        )}
        <div className={`grid grid-cols-2 gap-3 ${type === "transfer" ? "hidden" : ""}`}>
          <label><span className="lbl">Importo €</span><input className="inp num" inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value)} /></label>
          <label><span className="lbl">Data</span><input className="inp" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></label>
          <label className="col-span-2"><span className="lbl">Conto</span>
            <select className="inp" value={f.account_id} onChange={(e) => set("account_id", e.target.value)}>
              {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select></label>
          <label className="col-span-2"><span className="lbl">Destinatario / pagatore</span><input className="inp" list="payees" value={f.payee} onChange={(e) => set("payee", e.target.value)} />
            <datalist id="payees">{[...new Set(state.txs.map((t) => t.payee).filter(Boolean))].map((p) => <option key={p} value={p} />)}</datalist></label>
          <label className="col-span-2"><span className="lbl">Descrizione</span><input className="inp" value={f.description} onChange={(e) => set("description", e.target.value)} /></label>
          <label><span className="lbl">Categoria</span>
            <select className="inp" value={f.category} onChange={(e) => { set("category", e.target.value); set("subcategory", CATEGORIES[e.target.value]?.[0] ?? ""); }}>
              {[...new Set([...Object.keys(CATEGORIES), f.category])].map((c) => <option key={c}>{c}</option>)}
            </select></label>
          <label><span className="lbl">Sottocategoria</span>
            <select className="inp" value={f.subcategory} onChange={(e) => set("subcategory", e.target.value)}>
              {[...new Set([...(CATEGORIES[f.category] ?? []), f.subcategory].filter(Boolean))].map((c) => <option key={c}>{c}</option>)}
            </select></label>
          <label><span className="lbl">Tag (virgole)</span><input className="inp" value={f.tags} onChange={(e) => set("tags", e.target.value)} /></label>
          <label><span className="lbl">Progetto</span><input className="inp" value={f.project} onChange={(e) => set("project", e.target.value)} /></label>
        </div>
        {type === "expense" && (
          <div className="mt-4 space-y-3 rounded-2xl border border-line bg-tint p-3">
            <div>
              <span className="lbl">Cosa è diventata la spesa?</span>
              <div className="flex flex-wrap gap-1.5">
                {DESTINATIONS.map((d) => (
                  <button key={d.id} type="button" title={d.hint} onClick={() => setDestState(dest === d.id ? "" : d.id)}
                    className="rounded-full border px-3 py-1 text-xs font-medium"
                    style={dest === d.id ? { background: d.color, color: "#0b0b14", borderColor: d.color } : { color: d.color, borderColor: `${d.color}55`, background: `${d.color}14` }}>
                    {d.emoji} {d.label}
                  </button>
                ))}
              </div>
              {destOf(dest) && <p className="mt-1 text-[11px] text-muted">{destOf(dest)!.hint}</p>}
            </div>
            <div>
              <span className="lbl">Valore per te (lo decidi tu)</span>
              <div className="flex items-center gap-1" role="radiogroup" aria-label="Valore in stelle">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} stelle`} onClick={() => setStars(stars === n ? 0 : n)}
                    className="text-3xl leading-none transition-transform active:scale-90" style={{ color: n <= stars ? STAR_COLORS[stars] : "#3a3a55" }}>★</button>
                ))}
                {stars > 0 && <button type="button" className="ml-2 text-xs text-muted" onClick={() => setStars(0)}>azzera</button>}
              </div>
            </div>
            {material && (
              <label className="block"><span className="lbl">Valore attuale stimato (€) · entra nel patrimonio</span>
                <input className="inp num" inputMode="decimal" value={assetShown} onChange={(e) => setAssetStr(e.target.value)} />
                <span className="mt-1 block text-[11px] text-muted">La spesa resta {f.amount || "0"} €; qui metti quanto vale il bene (anche più o meno di quanto l&apos;hai pagato).</span></label>
            )}
          </div>
        )}
        {busy && <p className="mt-3 text-sm text-accent2">{busy}</p>}
        <button className="btn mt-5 w-full" onClick={save}>{edit?.status === "pending" ? "Salva e conferma" : "Salva"}</button>
        {edit && (
          <button className="mt-3 w-full text-sm text-bad" onClick={() => { if (confirm("Eliminare?")) { remove("txs", edit.id); onClose(); } }}>Elimina</button>
        )}
      </div>
    </div>
  );
}
