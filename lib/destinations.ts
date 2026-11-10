import type { State, Tx } from "./types";
import { toEur, type Rates } from "./fx";

export type Destination = "consumo" | "esperienza" | "durevole" | "strumentale" | "crescita" | "costo";

export const DESTINATIONS: { id: Destination; label: string; emoji: string; color: string; material: boolean; hint: string }[] = [
  { id: "consumo", label: "Consumo", emoji: "🔥", color: "#ff7a59", material: false, hint: "finisce presto: cena, spesa, bollette" },
  { id: "esperienza", label: "Esperienza", emoji: "✨", color: "#c07cff", material: false, hint: "immateriale: viaggi, eventi" },
  { id: "durevole", label: "Durevole", emoji: "🧰", color: "#3da5ff", material: true, hint: "bene materiale che dura: laptop, divano" },
  { id: "strumentale", label: "Strumentale", emoji: "⚙️", color: "#ffd23d", material: true, hint: "bene che produce reddito" },
  { id: "crescita", label: "Crescita", emoji: "🌱", color: "#2ee59d", material: false, hint: "formazione, libri, corsi" },
  { id: "costo", label: "Costo puro", emoji: "🕳️", color: "#9a9ab5", material: false, hint: "tasse, bollo, commissioni" },
];
export const destOf = (id: string) => DESTINATIONS.find((d) => d.id === id);
export const destColor = (id: string) => destOf(id)?.color ?? "#9a9ab5";

/** Suggerimento di partenza dalla sottocategoria (solo la destinazione: le stelle le decidi sempre tu). */
const BY_SUB: Record<string, Destination> = {
  "Affitto/Mutuo": "consumo", Bollette: "consumo", Manutenzione: "consumo", Arredamento: "durevole",
  Supermercato: "consumo", Mercato: "consumo", "Casa & igiene": "consumo",
  Ristorante: "consumo", Bar: "consumo", Delivery: "consumo",
  Carburante: "consumo", "Mezzi pubblici": "consumo", Auto: "durevole", Taxi: "consumo",
  Farmacia: "consumo", Visite: "consumo", Sport: "consumo",
  Viaggi: "esperienza", "Cinema/Eventi": "esperienza", Abbonamenti: "consumo",
  Bollo: "costo", Imposte: "costo", Commissioni: "costo",
};
export const defaultDestination = (sub: string): Destination | "" => BY_SUB[sub] ?? "";

export const isMaterial = (t: Pick<Tx, "destination">) => !!destOf(t.destination)?.material;

/** Valore stimato di un bene: quello inserito, altrimenti il costo. Nella valuta del conto. */
export const assetValue = (t: Tx) => (isMaterial(t) && t.amount < 0 && t.status === "confirmed" ? t.asset_value ?? Math.abs(t.amount) : 0);

/** Valore dei beni materiali in EUR acquistati entro `date` (senza data = tutti). */
export function assetsEur(state: State, rates: Rates, date?: string, accountId?: string) {
  return state.txs
    .filter((t) => (!date || t.date <= date) && (!accountId || t.account_id === accountId))
    .reduce((s, t) => s + toEur(assetValue(t), state.accounts.find((a) => a.id === t.account_id)?.currency, rates), 0);
}

export const STAR_COLORS = ["#9a9ab5", "#ff7a59", "#ffb03d", "#ffd23d", "#a0e060", "#2ee59d"];
