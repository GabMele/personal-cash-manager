export const eur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
export const dshort = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
