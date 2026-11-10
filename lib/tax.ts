import type { Account, Holding, State, Tx } from "./types";

// Parametri fiscali (modificabili): verificare ogni anno.
export const TAX = {
  interestRate: 0.26, // imposta sostitutiva su interessi
  bolloContoYear: 34.2, // bollo conto corrente persone fisiche
  bolloContoMinAvg: 5000, // esente se giacenza media annua <= soglia
  bolloTitoliRate: 0.002, // 0,2% annuo su dossier titoli
};

export const net = (gross: number) => gross * (1 - TAX.interestRate);
export const r2 = (n: number) => Math.round(n * 100) / 100;

export const cashBalance = (txs: Tx[], accId: string, upTo?: string) =>
  r2(
    txs
      .filter((t) => t.account_id === accId && t.status === "confirmed" && (!upTo || t.date <= upTo))
      .reduce((s, t) => s + t.amount, 0)
  );
export const holdingsValue = (hs: Holding[], accId: string) =>
  r2(hs.filter((h) => h.account_id === accId).reduce((s, h) => s + h.qty * h.price, 0));

const iso = (d: Date) => d.toISOString().slice(0, 10);
const endOfMonth = (y: number, m: number) => iso(new Date(Date.UTC(y, m + 1, 0)));

/** Genera voci mensili (interessi netti) e trimestrali (bollo) mancanti fino a oggi. */
export function generateAuto(state: State, today = new Date()): Tx[] {
  const out: Tx[] = [];
  const have = new Set(state.txs.map((t) => t.ref).filter(Boolean));
  const todayIso = iso(today);
  for (const a of state.accounts) {
    const start = new Date(a.created_at + "T00:00:00Z");
    let y = start.getUTCFullYear();
    let m = start.getUTCMonth() + 1; // salta il mese di creazione (incompleto)
    for (;;) {
      if (m > 11) { m = 0; y++; }
      const end = endOfMonth(y, m);
      if (end >= todayIso) break;
      const ym = `${y}-${String(m + 1).padStart(2, "0")}`;
      const prevEnd = endOfMonth(m === 0 ? y - 1 : y, (m + 11) % 12);
      const ref = `interest:${a.id}:${ym}`;
      const base = cashBalance(state.txs, a.id, prevEnd);
      if (a.gross_rate > 0 && base > 0 && !have.has(ref)) {
        const gross = (base * a.gross_rate) / 100 / 12;
        out.push(mk(a, end, r2(net(gross)), `Interessi ${ym} (lordi ${r2(gross)}€, netto 26%)`, "interest", ref));
      }
      if (m % 3 === 2) {
        const q = `${y}-Q${(m + 1) / 3}`;
        const bref = `bollo:${a.id}:${q}`;
        if (!have.has(bref)) {
          let amt = 0;
          if (a.currency && a.currency !== "EUR") amt = 0; // bollo italiano: solo conti in EUR
          else if (a.kind === "bank" && a.apply_bollo) {
            if (cashBalance(state.txs, a.id, end) > TAX.bolloContoMinAvg) amt = TAX.bolloContoYear / 4;
          } else if (a.kind !== "bank") {
            amt = (holdingsValue(state.holdings, a.id) * TAX.bolloTitoliRate) / 4;
          }
          if (amt > 0) out.push(mk(a, end, -r2(amt), `Bollo ${q}`, "bollo", bref));
        }
      }
      m++;
    }
  }
  return out;
}

function mk(a: Account, date: string, amount: number, description: string, kind: Tx["kind"], ref: string): Tx {
  return {
    id: crypto.randomUUID(), account_id: a.id, date, amount, description,
    category: kind === "interest" ? "Altro" : "Tasse",
    subcategory: kind === "interest" ? "Interessi" : "Bollo",
    tags: ["auto"], project: "", payee: a.name, destination: kind === "bollo" ? "costo" : "", stars: 0, asset_value: null, status: a.auto_interest ? "confirmed" : "pending", kind, transfer_id: null, ref, source: "auto",
  };
}
