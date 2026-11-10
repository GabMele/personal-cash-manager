"use client";
import { useState } from "react";
import { Settings } from "lucide-react";
import { useStore } from "@/lib/store";
import { cashBalance, holdingsValue, net, r2 } from "@/lib/tax";
import { money, toEur } from "@/lib/fx";
import CurrencySelect from "@/components/CurrencySelect";
import { ACCOUNT_COLORS } from "@/lib/colors";
import type { Account, Tx } from "@/lib/types";

/** Gestione conti: crea, modifica, elimina. `external` = elenco dei conti «Esterni» (nascosti) invece dei normali. */
export default function AccountManager({ external = false }: { external?: boolean }) {
  const { all: state, upsert, remove, rates, ratesInfo } = useStore();
  const list = state.accounts.filter((a) => !!a.external === external);
  const [adding, setAdding] = useState(false);
  const [openSet, setOpenSet] = useState<string | null>(null);
  const [n, setN] = useState({ name: "", kind: "bank" as Account["kind"], gross_rate: "0", currency: "EUR", opening: "" });
  const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
  const openingTx = (id: string) => state.txs.find((t) => t.account_id === id && t.kind === "opening");
  const setOpening = async (a: { id: string; created_at: string }, v: number) => {
    const ex = openingTx(a.id);
    if (ex) return upsert("txs", { ...ex, amount: v });
    await upsert("txs", {
      id: crypto.randomUUID(), account_id: a.id, date: a.created_at, amount: v, description: "Saldo iniziale",
      category: "Altro", subcategory: "", tags: [], project: "", payee: "", destination: "", stars: 0, asset_value: null, status: "confirmed", kind: "opening",
      transfer_id: null, ref: null, source: "manual",
    } satisfies Tx);
  };
  const [h, setH] = useState({ account_id: "", symbol: "", kind: "stock", qty: "", price: "" });

  const addAccount = async () => {
    if (!n.name) return;
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString().slice(0, 10);
    await upsert("accounts", {
      id, name: n.name, kind: n.kind, gross_rate: parseFloat(n.gross_rate) || 0,
      apply_bollo: n.kind === "bank" && n.currency === "EUR", auto_interest: false, currency: n.currency,
      color: ACCOUNT_COLORS[state.accounts.length % ACCOUNT_COLORS.length], created_at, featured: true, external,
    });
    await setOpening({ id, created_at }, num(n.opening));
    setN({ name: "", kind: "bank", gross_rate: "0", currency: "EUR", opening: "" });
    setAdding(false);
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{external ? "Conti esterni" : "Tutti i conti"}</h2>
        <button className="text-sm text-accent2" onClick={() => setAdding(!adding)}>+ Conto</button>
      </div>

      {adding && (
        <div className="card grid grid-cols-2 gap-3 p-4">
          <input className="inp col-span-2" placeholder="Nome (es. Fineco, Revolut, PayPal)" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
          <select className="inp" value={n.kind} onChange={(e) => setN({ ...n, kind: e.target.value as Account["kind"] })}>
            <option value="bank">Conto bancario</option><option value="wallet">Wallet</option><option value="broker">Titoli</option>
          </select>
          <input className="inp" inputMode="decimal" placeholder="Tasso lordo %" value={n.gross_rate} onChange={(e) => setN({ ...n, gross_rate: e.target.value })} />
          <CurrencySelect className="inp" value={n.currency} onChange={(v) => setN({ ...n, currency: v })} />
          <input className="inp" inputMode="decimal" placeholder="Saldo iniziale" value={n.opening} onChange={(e) => setN({ ...n, opening: e.target.value })} />
          <button className="btn col-span-2" onClick={addAccount}>Crea</button>
        </div>
      )}

      {list.map((a) => {
        const bal = cashBalance(state.txs, a.id);
        const hs = state.holdings.filter((x) => x.account_id === a.id);
        const yearGross = (bal * a.gross_rate) / 100;
        const isOpen = openSet === a.id;
        const cu = a.currency ?? "EUR";
        const m = (v: number) => money(v, cu);
        return (
          <div
            key={a.id}
            className="card overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${a.color}4d 0%, ${a.color2 ?? a.color}40 100%)`, borderColor: `${a.color}45` }}
          >
            <div className="space-y-2 px-3 py-2">
              <div className="flex items-center gap-2">
                <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: a.color }} />
                <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight">
                  {a.name}<span className="ml-1.5 text-[10px] font-normal capitalize text-muted">{a.kind}{cu !== "EUR" && ` · ${cu}`}{a.featured === false && " · non in evidenza"}</span>
                </p>
                <div className="text-right">
                  <p className="num text-sm font-semibold leading-tight">{m(bal)}</p>
                  {cu !== "EUR" && <p className="num text-[11px] text-muted">≈ {money(toEur(bal, cu, rates), "EUR")}</p>}
                  {hs.length > 0 && <p className="num text-[11px] text-muted">+ {m(holdingsValue(state.holdings, a.id))} titoli</p>}
                </div>
                <button aria-label="Impostazioni conto" onClick={() => setOpenSet(isOpen ? null : a.id)} className={`rounded-full p-1.5 ${isOpen ? "bg-tint2" : "bg-tint"}`}>
                  <Settings size={16} />
                </button>
              </div>
              {isOpen && (
                <div className="space-y-4 rounded-2xl border border-line bg-tint p-4 text-sm">
                  <label className="block"><span className="lbl">Nome</span><input className="inp" defaultValue={a.name} onBlur={(e) => e.target.value && upsert("accounts", { ...a, name: e.target.value })} /></label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={a.featured !== false} onChange={(e) => upsert("accounts", { ...a, featured: e.target.checked })} /> In evidenza (mostrato in home; altrimenti finisce in «Altri»)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block"><span className="lbl">Saldo iniziale</span>
                      <input className="inp num" inputMode="decimal" defaultValue={openingTx(a.id)?.amount ?? 0} key={openingTx(a.id)?.amount ?? "none"} onBlur={(e) => setOpening(a, num(e.target.value))} /></label>
                    <label className="block" title={ratesInfo.date ? `Cambi BCE del ${ratesInfo.date}` : "Cambi indicativi (offline)"}><span className="lbl">Valuta</span>
                      <CurrencySelect value={cu} onChange={(v) => upsert("accounts", { ...a, currency: v })} /></label>
                  </div>
                  <div className="grid grid-cols-3 items-start gap-3">
                    <label className="block"><span className="lbl">Tasso annuo %</span>
                      <input className="inp num" inputMode="decimal" defaultValue={a.gross_rate} onBlur={(e) => upsert("accounts", { ...a, gross_rate: parseFloat(e.target.value.replace(",", ".")) || 0 })} /></label>
                    <div><span className="lbl">Lordo / mese</span><p className="num pt-2.5">{r2(a.gross_rate / 12)}%<span className="block text-[11px] text-muted">≈ {m(yearGross / 12)}/mese</span></p></div>
                    <div><span className="lbl">Netto / mese</span><p className="num pt-2.5 text-accent2">{r2((a.gross_rate / 12) * 0.74)}%<span className="block text-[11px] text-muted">≈ {m(net(yearGross / 12))}/mese</span></p></div>
                  </div>
                  {([["color", "Gradiente · colore alto a sinistra"], ["color2", "Gradiente · colore basso a destra"]] as const).map(([key, label]) => {
                    const cur = key === "color" ? a.color : a.color2 ?? a.color;
                    return (
                      <div key={key}>
                        <span className="lbl">{label}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {ACCOUNT_COLORS.map((c) => (
                            <button key={c} aria-label={`${label} ${c}`} onClick={() => upsert("accounts", { ...a, [key]: c })} className="h-7 w-7 rounded-full" style={{ background: c, outline: cur === c ? "2px solid #fff" : "none", outlineOffset: 2 }} />
                          ))}
                          <input type="color" value={cur} onChange={(e) => upsert("accounts", { ...a, [key]: e.target.value })} className="h-7 w-9 cursor-pointer rounded bg-transparent" aria-label={`${label}: personalizzato`} />
                        </div>
                      </div>
                    );
                  })}
                  <label className="flex items-center gap-2"><input type="checkbox" checked={a.auto_interest} onChange={(e) => upsert("accounts", { ...a, auto_interest: e.target.checked })} /> Interessi e bollo automatici (senza conferma)</label>
                  {a.kind === "bank" && <label className="flex items-center gap-2"><input type="checkbox" checked={a.apply_bollo} onChange={(e) => upsert("accounts", { ...a, apply_bollo: e.target.checked })} /> Bollo 34,20€ (se giacenza &gt; 5.000€)</label>}

                  {a.kind !== "bank" && (
                    <div className="space-y-2">
                      <span className="lbl">Posizioni</span>
                      {hs.map((x) => (
                        <div key={x.id} className="flex items-center justify-between">
                          <span>{x.symbol}</span><button className="text-muted" onClick={() => remove("holdings", x.id)}>rimuovi</button>
                        </div>
                      ))}
                      {h.account_id === a.id ? (
                        <div className="grid grid-cols-3 gap-2">
                          <input className="inp" placeholder="Simbolo" value={h.symbol} onChange={(e) => setH({ ...h, symbol: e.target.value })} />
                          <input className="inp" inputMode="decimal" placeholder="Qtà" value={h.qty} onChange={(e) => setH({ ...h, qty: e.target.value })} />
                          <input className="inp" inputMode="decimal" placeholder="Prezzo" value={h.price} onChange={(e) => setH({ ...h, price: e.target.value })} />
                          <button className="btn col-span-3" onClick={async () => {
                            await upsert("holdings", { id: crypto.randomUUID(), account_id: a.id, symbol: h.symbol.toUpperCase(), kind: h.kind as "stock", qty: parseFloat(h.qty.replace(",", ".")), price: parseFloat(h.price.replace(",", ".")) });
                            setH({ account_id: "", symbol: "", kind: "stock", qty: "", price: "" });
                          }}>Aggiungi posizione</button>
                        </div>
                      ) : <button className="text-accent2" onClick={() => setH({ ...h, account_id: a.id })}>+ posizione</button>}
                    </div>
                  )}
                  <button className="text-bad" onClick={() => confirm("Eliminare il conto e i suoi movimenti?") && remove("accounts", a.id)}>Elimina conto</button>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {list.length === 0 && <p className="text-sm text-muted">Nessun conto. Creane uno con «+ Conto».</p>}
    </section>
  );
}
