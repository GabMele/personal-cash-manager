# Cash Manager

PWA mobile-first per finanze personali: conti, wallet, titoli, interessi netti, bollo, report.

## Avvio
```bash
npm install
npm run dev
```
Senza variabili d'ambiente parte in **modalità demo** (dati in localStorage).

## Cloud (Supabase + Vercel)
1. Crea un progetto su supabase.com, esegui `supabase/schema.sql` nello SQL editor.
2. Authentication → abilita Email (magic link); aggiungi l'URL dell'app ai Redirect URLs.
3. Copia `.env.example` in `.env.local` e compila URL + anon key (+ `ANTHROPIC_API_KEY` per scontrini/voce).
4. Deploy su Vercel con le stesse variabili.

## Regole fiscali (lib/tax.ts)
- Interessi: lordo × (1 − 26%), generati ogni mese, **in attesa di conferma** (o automatici se attivi sul conto).
- Bollo conto corrente: 34,20 €/anno (8,55 €/trimestre), solo se giacenza > 5.000 € (verifica con la tua banca).
- Bollo dossier titoli: 0,2% annuo (trimestrale), sul controvalore.
- Titoli di Stato (12,5%) e conti esteri (IVAFE) non sono ancora gestiti.

## Scontrini e voce
`/api/parse` usa Claude (vision) per gli scontrini; la voce usa il riconoscimento del browser (it-IT) e poi Claude per estrarre importo/categoria.
