# TODO — Cash Manager (finanze personali)

Stato verificato il 2026-11-10: il codice compila (`tsc --noEmit` pulito). Funzioni presenti: conti, transazioni, report, categorie, cambi (API rates), lettura scontrini e voce tramite IA (`/api/parse`), regole fiscali (interessi, bollo), PWA (manifest), schema Supabase, modalità demo.

## 1. Subito (rischio perdita lavoro)
- [ ] **Commit**: quasi tutto il codice è ancora non tracciato (un solo commit "Initial commit from Create Next App"). Fare commit e push su un repo GitHub.
- [ ] Verificare che `.env.local` e `ANTHROPIC_API_KEY` non finiscano nel commit (c'è `.env.example`).
- [ ] Controllare che la cartella vuota `../cash-manager` sia eliminata (la vera app è `personal-cash-manager`).

## 2. Per renderla presentabile
- [ ] Deploy su Vercel in modalità demo (localStorage) raggiungibile senza login.
- [ ] Il parsing IA di scontrini/voce deve avere un limite di uso o chiave protetta (evitare costi se il link è pubblico).
- [ ] Link pubblico + 2-3 screenshot nel README.
- [ ] Dati demo credibili al primo avvio.
- [ ] Prova su telefono (installazione PWA, aggiunta di una spesa a voce).
- [ ] Una frase chiara per il CV: "finanze personali, saldo e report, con scontrini e voce tramite IA".

## 3. Da decidere (tu)
- [ ] Cosa manca per considerarla "finita"? Elenca 3-5 cose, il resto va in "dopo".
- [x] Broker e cripto tolti (restano solo "Titoli", senza gestione aggiuntiva). Nota: `supabase/schema.sql` ammette ancora `'crypto'` per non rompere database già creati; cambiarlo solo per nuove installazioni.
- [ ] Titoli di Stato e conti esteri (IVAFE) non sono gestiti: dirlo o lasciarli fuori dalla promessa.

## Dopo
- [ ] Test automatici sul calcolo fiscale (`lib/tax.ts`).
