export const BASE = "EUR";
export const MAIN_CURRENCIES = ["EUR", "USD"];
export const OTHER_CURRENCIES = ["AUD", "CAD", "CHF", "CNY", "CZK", "DKK", "GBP", "HKD", "HUF", "JPY", "NOK", "PLN", "SEK", "SGD"]; // ordine alfabetico
export const CURRENCIES = [...MAIN_CURRENCIES, ...OTHER_CURRENCIES];
/** 1 EUR = rates[CUR] unità di CUR (formato BCE). */
export type Rates = Record<string, number>;

export const FALLBACK: Rates = { USD: 1.08, GBP: 0.84, CHF: 0.93, JPY: 165, CAD: 1.47, AUD: 1.65 };

export const cur = (c?: string) => c || BASE;
export const toEur = (amt: number, c: string | undefined, rates: Rates) => {
  const k = cur(c);
  return k === BASE ? amt : rates[k] ? amt / rates[k] : amt;
};
/** Converte da una valuta a un'altra passando da EUR. */
export const convert = (amt: number, from: string | undefined, to: string | undefined, rates: Rates) => {
  const e = toEur(amt, from, rates);
  const t = cur(to);
  return t === BASE ? e : e * (rates[t] ?? 1);
};
export const money = (n: number, c?: string) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: cur(c) }).format(n);
