import type { State } from "./types";
import { toEur, type Rates } from "./fx";
import { holdingsValue } from "./tax";
import { assetsEur } from "./destinations";

const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

/** Ultimi n mesi: fine di ogni mese, l'ultimo punto è oggi. */
export function monthPoints(n: number, now = new Date()): { date: string; label: string }[] {
  const today = now.toISOString().slice(0, 10);
  return Array.from({ length: n }, (_, k) => {
    const i = n - 1 - k; // mesi fa
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0));
    const date = i === 0 ? today : end.toISOString().slice(0, 10);
    return { date, label: MESI[end.getUTCMonth()] };
  });
}

/**
 * Andamento del saldo (liquidi + titoli al valore attuale, non c'è storico prezzi).
 * I saldi iniziali sono sempre inclusi: un conto aperto di recente non genera un "salto".
 * accountId assente → totale in EUR; altrimenti nella valuta del conto.
 */
export function balanceSeries(state: State, rates: Rates, points: { date: string }[], accountId?: string, withAssets = false): number[] {
  const accs = accountId ? state.accounts.filter((a) => a.id === accountId) : state.accounts;
  const conv = (v: number, cur?: string) => (accountId ? v : toEur(v, cur, rates));
  return points.map(({ date }) =>
    Math.round(
      (accs.reduce((sum, a) => {
        const cash = state.txs
          .filter((t) => t.account_id === a.id && t.status === "confirmed" && (t.kind === "opening" || t.date <= date))
          .reduce((s, t) => s + t.amount, 0);
        return sum + conv(cash + holdingsValue(state.holdings, a.id), a.currency);
      }, 0) + (withAssets ? assetsEur(state, rates, date, accountId) : 0)) * 100
    ) / 100
  );
}
