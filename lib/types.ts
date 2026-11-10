export type AccountKind = "bank" | "wallet" | "broker";
export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  gross_rate: number; // % annuo lordo
  apply_bollo: boolean; // bollo conto corrente 34,20€/anno (trimestrale)
  auto_interest: boolean; // true = interessi/bolli confermati in automatico
  color: string; // gradiente: colore alto a sinistra
  color2?: string; // gradiente: colore basso a destra (default = color)
  currency: string; // ISO 4217, default EUR
  created_at: string; // YYYY-MM-DD
  featured?: boolean; // in evidenza in home (default true se assente); gli altri finiscono in «Altri»
  external?: boolean; // conto «Esterno»: nascosto salvo toggle «Visualizza»
}
export interface Holding {
  id: string;
  account_id: string;
  symbol: string;
  kind: "stock";
  qty: number;
  price: number;
}
export interface Tx {
  id: string;
  account_id: string;
  date: string; // YYYY-MM-DD
  amount: number; // con segno
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  project: string;
  payee: string; // destinatario / pagatore
  destination: "" | "consumo" | "esperienza" | "durevole" | "strumentale" | "crescita" | "costo"; // cosa è diventata la spesa
  stars: number; // valore deciso da te: 0 = non valutato, 1–5
  asset_value: number | null; // valore stimato del bene materiale (entra nel patrimonio, non cambia la spesa)
  status: "confirmed" | "pending";
  kind: "normal" | "interest" | "bollo" | "transfer" | "opening";
  transfer_id: string | null; // collega le due gambe di un giroconto
  ref: string | null; // chiave di deduplica per voci automatiche
  source: "manual" | "receipt" | "voice" | "auto";
}
export interface State {
  accounts: Account[];
  holdings: Holding[];
  txs: Tx[];
}
export type Table = "accounts" | "holdings" | "txs";
