# Smart Rent Car Autonoleggio Catania

Piattaforma di noleggio auto mobile-first con prenotazione online trasparente, motore di disponibilità anti-sovrapposizione e back-office gestionale completo per **Smart Rent Car Catania** (`37.5158, 15.0781`).

## Funzionalità implementate

- **Sito pubblico in italiano (`it-IT`)**: Home con ricerca immediata, catalogo filtrabile (`/auto`), scheda modello (`/auto/[slug]`), guida trasparente (`/come-funziona`), offerte (`/offerte`), noleggio lungo termine (`/noleggio-lungo-termine`), FAQ (`/faq`), mappa e istruzioni ritiro (`/dove-siamo`), contatti (`/contatti`), area clienti (`/area-clienti`) e pagine legali (`/privacy`, `/cookie`, `/condizioni-di-noleggio`).
- **Motore disponibilità e prezzi**: Calcolo server-side per fasce di durata (`1-2`, `3-6`, `7-29`, `30+` giorni), stagionalità, extra giornalieri o una tantum, copertura assicurativa comparata, codici promo, supplemento giovane conducente e buffer ore tra noleggi. Tutti gli importi sono gestiti in centesimi (`EUR`, IVA inclusa).
- **Flusso prenotazione in 5 step (`/prenota`)**: Selezione date/luoghi, scelta auto disponibile, extra e assicurazione, dati conducente + caricamento documenti patente/ID, riepilogo completo senza costi nascosti e conferma con codice univoco e file calendario `.ics` (`/prenota/conferma/[codice]`).
- **Anti-doppia prenotazione**: Verifica transazionale su SQLite (`server.ts`) in locale/AI Studio e vincolo `EXCLUDE USING GIST` su PostgreSQL (`/supabase/migrations/0001_initial_schema.sql`).
- **Pannello Admin (`/admin`)**: KPI giornalieri, gestione prenotazioni con cambio stato, assegnazione targa, prenotazione manuale telefonica/walk-in, check-in e check-out con foto e chilometraggio, calendario Gantt per targa con blocco rapido date, CRUD modelli/veicoli/tariffe/extra/promo/FAQ/recensioni/social/impostazioni ed esportazione CSV.

## Nota sui dati di esempio

I dati operativi non verificati pubblicamente (indirizzo stradale esatto, telefono, WhatsApp, email, P.IVA, orari, targhe e tariffe di esempio) sono contrassegnati come `[DA CONFERMARE]` e modificabili in autonomia dal pannello `/admin` nella scheda **Impostazioni**.

## Avvio in sviluppo

```bash
npm install
npm run dev
```

L'app viene avviata su `http://localhost:3000`.

## Deploy su Vercel + Supabase

1. Crea un progetto Supabase in regione EU (es. Francoforte) ed esegui in ordine `/supabase/migrations/0001_initial_schema.sql` e `/supabase/seed.sql`.
2. Configura i bucket Storage: `vehicle-images` (pubblico) e `customer-documents`, `inspections` (privati).
3. Imposta le variabili d'ambiente elencate in `.env.example` sul progetto Vercel (Stripe, Resend, Cloudflare Turnstile, Supabase).
4. Esegui `npm run build` e distribuisci su Vercel.
