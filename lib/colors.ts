// Colori semantici: ogni categoria ha un colore stabile; tag e progetti derivano da un hash.
const CAT: Record<string, string> = {
  Casa: "#3da5ff",
  Spesa: "#a0e060",
  Ristoranti: "#ff8a3d",
  Trasporti: "#ffd23d",
  Salute: "#ff5d9e",
  Svago: "#c07cff",
  Lavoro: "#00d4aa",
  Entrate: "#2ee59d",
  Tasse: "#ff5d73",
  Altro: "#9a9ab5",
};
const PAL = ["#7c5cff", "#00d4aa", "#ff8a3d", "#ff5d9e", "#3da5ff", "#ffd23d", "#a0e060", "#c07cff", "#2ee59d", "#ff7a59"];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export const catColor = (c: string) => CAT[c] ?? PAL[hash(c) % PAL.length];
export const tagColor = (t: string) => PAL[hash("t:" + t) % PAL.length];
export const projectColor = (p: string) => PAL[hash("p:" + p) % PAL.length];
export const ACCOUNT_COLORS = ["#7c5cff", "#00d4aa", "#ff8a3d", "#ff5d9e", "#3da5ff", "#ffd23d", "#a0e060", "#c07cff"];
