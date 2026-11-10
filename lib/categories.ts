export type Cats = Record<string, string[]>;

/** Predefinite. L'ordine delle chiavi e delle sottocategorie è quello mostrato nei menu. */
export const CATEGORIES: Cats = {
  Casa: ["Affitto/Mutuo", "Bollette", "Manutenzione", "Arredamento"],
  Spesa: ["Supermercato", "Mercato", "Casa & igiene"],
  Ristoranti: ["Ristorante", "Bar", "Delivery"],
  Trasporti: ["Carburante", "Mezzi pubblici", "Auto", "Taxi"],
  Salute: ["Farmacia", "Visite", "Sport"],
  Svago: ["Viaggi", "Cinema/Eventi", "Abbonamenti", "Shopping"],
  Lavoro: ["Stipendio", "Freelance", "Rimborsi"],
  Tasse: ["Bollo", "Imposte", "Commissioni"],
  Altro: ["Varie", "Interessi", "Regali"],
};
