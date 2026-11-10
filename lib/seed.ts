import type { State, Tx } from "./types";

const d = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const u = () => crypto.randomUUID();

export function demoState(): State {
  const a1 = u(), a2 = u(), a3 = u(), a4 = u();
  const tr = u();
  const t = (account_id: string, date: string, amount: number, description: string, category: string, subcategory: string, extra: Partial<Tx> = {}): Tx => ({
    id: u(), account_id, date, amount, description, category, subcategory,
    tags: [], project: "", payee: "", destination: "", stars: 0, asset_value: null, status: "confirmed", kind: "normal", transfer_id: null, ref: null, source: "manual", ...extra,
  });
  return {
    accounts: [
      { id: a1, name: "Conto Principale", kind: "bank", gross_rate: 2, apply_bollo: true, auto_interest: false, color: "#7c5cff", currency: "EUR", created_at: d(150) },
      { id: a2, name: "Conto Deposito", kind: "bank", gross_rate: 3.5, apply_bollo: true, auto_interest: false, color: "#00d4aa", currency: "EUR", created_at: d(150) },
      { id: a3, name: "Titoli", kind: "broker", gross_rate: 0, apply_bollo: false, auto_interest: false, color: "#ff8a3d", currency: "EUR", created_at: d(150) },
      { id: a4, name: "Conto USD", kind: "bank", gross_rate: 0, apply_bollo: false, auto_interest: false, color: "#3da5ff", currency: "USD", created_at: d(60) },
    ],
    holdings: [
      { id: u(), account_id: a3, symbol: "VWCE", kind: "stock", qty: 40, price: 128.4 },
    ],
    txs: [
      t(a1, d(150), 4000, "Saldo iniziale", "Altro", "", { kind: "opening" }),
      t(a2, d(150), 12000, "Saldo iniziale", "Altro", "", { kind: "opening" }),
      t(a3, d(150), 1500, "Saldo iniziale", "Altro", "", { kind: "opening" }),
      t(a4, d(60), 0, "Saldo iniziale", "Altro", "", { kind: "opening" }),
      ...[120, 90, 60, 30].map((n) => t(a1, d(n), 2100, "Stipendio", "Lavoro", "Stipendio", { project: "Famiglia" })),
      ...[110, 80, 50, 20].map((n) => t(a1, d(n), -850, "Affitto", "Casa", "Affitto/Mutuo", { project: "Famiglia" })),
      t(a1, d(15), -86.4, "Esselunga", "Spesa", "Supermercato", { tags: ["weekly"], payee: "Esselunga" }),
      t(a1, d(9), -42, "Pizzeria da Gigi", "Ristoranti", "Ristorante", { tags: ["amici"] }),
      t(a1, d(5), -65, "Benzina", "Trasporti", "Carburante", { project: "Auto" }),
      t(a1, d(3), -14.99, "Netflix", "Svago", "Abbonamenti", { tags: ["abbonamento"] }),
      t(a1, d(30), -500, "Giroconto → Conto USD", "Trasferimento", "", { kind: "transfer", transfer_id: tr }),
      t(a4, d(30), 540, "Giroconto da Conto Principale", "Trasferimento", "", { kind: "transfer", transfer_id: tr }),
      t(a4, d(12), -38.5, "Amazon.com", "Svago", "Shopping", { payee: "Amazon" }),
      t(a1, d(40), -420, "Volo Lisbona", "Svago", "Viaggi", { project: "Vacanze 2026", tags: ["viaggio"], destination: "esperienza", stars: 5 }),
      t(a1, d(38), -310, "Hotel Lisbona", "Svago", "Viaggi", { project: "Vacanze 2026", tags: ["viaggio"], destination: "esperienza", stars: 4 }),
      t(a1, d(25), -1500, "MacBook", "Svago", "Shopping", { payee: "Apple", destination: "strumentale", stars: 5, asset_value: 1200 }),
      t(a1, d(20), -64, "Integratori", "Salute", "Farmacia", { destination: "consumo", stars: 5 }),
      t(a1, d(8), -3.2, "Pane bianco", "Spesa", "Supermercato", { destination: "consumo", stars: 1 }),
    ],
  };
}
