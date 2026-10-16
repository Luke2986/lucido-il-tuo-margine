# Lucido — il tuo margine

**Quali clienti ti fanno davvero guadagnare?**

Lucido è un cruscotto di controllo di gestione pensato per micro e piccole SRL italiane di servizi B2B: aziende con qualche decina o centinaia di migliaia di euro di fatturato, senza un controller interno, dove il commercialista si occupa degli adempimenti ma nessuno guarda il **primo margine per cliente**.

Lucido prende i dati che l'azienda produce già (fatture elettroniche FatturaPA, estratti conto, fogli Excel), classifica i costi con l'aiuto di un'AI e mostra, cliente per cliente o commessa per commessa, quanto resta davvero dopo i costi variabili. Ogni numero è spiegato e nessun dato arriva al titolare senza la validazione di un operatore.

> **È un prototipo.** Lucido è nato come esperimento per dare forma a un'idea. È volutamente semplice, non è un prodotto finito e non va usato per decisioni contabili o fiscali senza verificare i numeri. Lo condivido perché chi ne ha bisogno possa usarlo così com'è, studiarlo o adattarlo, nei limiti della [licenza](#licenza).

---

## Indice

- [Cosa fa](#cosa-fa)
- [Come si calcola il primo margine](#come-si-calcola-il-primo-margine)
- [Prova la demo](#prova-la-demo)
- [Stack tecnico](#stack-tecnico)
- [Struttura del progetto](#struttura-del-progetto)
- [Modello dati](#modello-dati)
- [Avvio in locale](#avvio-in-locale)
- [Configurare Supabase](#configurare-supabase)
- [Classificazione AI](#classificazione-ai)
- [Deploy](#deploy)
- [Variabili d'ambiente](#variabili-dambiente)
- [Limiti noti](#limiti-noti)
- [Licenza](#licenza)

---

## Cosa fa

| Sezione | Per chi | Cosa trovi |
| --- | --- | --- |
| **Margine clienti** (`/`) | Titolare | Primo margine per cliente/commessa, ordinato dal peggiore. I clienti in perdita sono in cima e ogni riga si apre per vedere ricavi e costi che lo compongono. |
| **Area dati** (`/area-dati`) | Operatore | Anagrafica clienti e commesse, editor delle voci, import da Excel/CSV e da fatture elettroniche FatturaPA (XML). |
| **Revisione AI** (`/revisione`) | Operatore | Coda dei costi da validare, con quelli a confidenza più bassa e importo più alto in cima. Un pulsante lancia la classificazione AI, poi l'operatore conferma o corregge. |
| **Impostazioni** (`/impostazioni`) | Operatore | Dati dell'azienda, soglie di confidenza dell'AI, pubblicazione verso il titolare, cambio di ruolo per provare le due viste, ripristino dei dati di esempio. |

### Funzioni principali

- **Import FatturaPA (XML).** Riconosce in automatico se una fattura è attiva o passiva confrontando la P.IVA dell'azienda con cedente e cessionario. Usa l'imponibile (IVA esclusa) e gestisce le note di credito (TD04) come importi negativi.
- **Import Excel/CSV.** Mappatura delle colonne con riconoscimento delle intestazioni italiane più comuni. Legge importi e date in formato italiano (`1.234,56`, `15/01/2026`).
- **Classificazione AI dei costi.** Ogni costo viene classificato come `fisso`, `variabile` o `non_costo` e, se possibile, attribuito a un cliente. Ogni proposta ha una confidenza e una breve motivazione ("perché questo numero").
- **Cancello morbido.** I numeri restano "da validare" finché l'operatore non li conferma. La dashboard mostra quanta parte dei ricavi è stata validata.
- **Due ruoli.** L'**operatore** inserisce, importa, valida e pubblica. Il **titolare** vede solo l'azienda pubblicata, in sola lettura.

## Come si calcola il primo margine

```
primo margine (cliente) = ricavi attribuiti al cliente − costi VARIABILI attribuiti al cliente
```

- **Variabile**: costo che cresce con il lavoro per quel cliente (freelance di progetto, subappalti, materiali, trasferte di commessa).
- **Fisso**: costo di struttura (affitto, stipendi, software generici, utenze, commercialista). È **escluso** dal primo margine.
- **Non costo**: IVA, imposte, giroconti, rimborsi di finanziamenti. È **escluso**.
- Le **note di credito** hanno la stessa direzione della fattura che rettificano, con importo negativo: riducono il ricavo o il costo originale.

Il calcolo avviene sia nel browser (`computeMarginRows` in `src/lib/store.ts`) sia nel database (vista `margin_by_client`). Le due versioni vanno tenute allineate.

## Prova la demo

Non serve registrarsi: all'apertura dell'app viene creata una sessione anonima e **ogni visitatore riceve la propria azienda di esempio** ("Studio Marini S.r.l.", sette clienti, voci da gennaio a maggio 2026). Puoi modificare, importare, cancellare e ripristinare i dati: nessun altro li vede e tu non vedi quelli degli altri.

Per provare la vista del titolare: *Impostazioni → Ruolo di test → Titolare* (la vista titolare mostra i dati solo se l’azienda è pubblicata).

---

## Stack tecnico

| Area | Tecnologia |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, routing a file, SSR) |
| Build | Vite 8 + [Nitro](https://nitro.build) (output per Vercel o server Node) |
| UI | Tailwind CSS 4, shadcn/ui, Radix, lucide-react, recharts |
| Stato | Zustand (un unico store) |
| Backend | [Supabase](https://supabase.com): Postgres con Row Level Security, Auth anonima, Edge Functions (Deno) |
| AI | Qualsiasi LLM con API compatibile OpenAI (default: Google Gemini `gemini-2.5-flash`) |
| Import | `xlsx` (SheetJS) per Excel/CSV, `DOMParser` per FatturaPA |
| Package manager | [Bun](https://bun.sh) |

## Struttura del progetto

```
src/
  routes/                      pagine (routing a file di TanStack Router)
    __root.tsx                 shell HTML, meta, error boundary
    _authenticated/            area dell'app (sessione anonima automatica)
      index.tsx                Margine clienti (dashboard titolare)
      area-dati.tsx            clienti, voci, import
      revisione.tsx            coda di revisione AI
      impostazioni.tsx         azienda, soglie, ruolo, pubblicazione
  components/
    MarginDashboard.tsx        dashboard del primo margine
    data-area/                 editor voci, import Excel/CSV e FatturaPA
    ui/                        componenti shadcn/ui
  lib/
    store.ts                   store Zustand + lettura/scrittura su Supabase + calcolo margine
    seed.ts                    dati di esempio (Studio Marini)
    format.ts                  formattazione it-IT di valuta, percentuali, date
  integrations/supabase/       client Supabase e tipi generati
  server.ts, start.ts          entry SSR e middleware
supabase/
  migrations/                  schema, RLS, trigger (in ordine di timestamp)
  functions/classify/          edge function di classificazione AI
docs/                          PRD e documenti di prodotto
project-context.md             regole e convenzioni per chi (o cosa) scrive codice qui
```

## Modello dati

| Tabella | Contenuto |
| --- | --- |
| `companies` | Anagrafica dell'azienda, stato `bozza`/`pubblicata`, `seeded_at` (dati di esempio già caricati) |
| `memberships` | Utente ↔ azienda con ruolo `operator` / `owner` |
| `profiles` | Nome visualizzato dell'utente |
| `clients` | Clienti e commesse dell'azienda |
| `transactions` | Movimenti grezzi: data, descrizione, controparte, importo, direzione (`ricavo`/`costo`), fonte |
| `classifications` | Una per transazione: tipo di costo, cliente attribuito, confidenza, motivazione, stato di validazione |
| `settings` | Soglie di confidenza (alta/media) per azienda |
| `margin_by_client` (vista) | Primo margine per cliente calcolato lato database |

**Sicurezza.** Tutte le tabelle hanno la Row Level Security attiva: un utente vede solo le aziende di cui è membro e il titolare vede i dati solo se l'azienda è pubblicata. Alla registrazione (anche anonima) il trigger `handle_new_user` crea una nuova azienda e rende l'utente suo operatore. Il ruolo si cambia solo con la funzione `set_my_role`, che non permette di passare ad aziende altrui.

---

## Avvio in locale

Requisiti: [Bun](https://bun.sh) ≥ 1.3 (oppure Node ≥ 22 con npm) e un progetto Supabase configurato come spiegato [qui sotto](#configurare-supabase).

```bash
git clone https://github.com/Luke2986/lucido-il-tuo-margine.git
```

```bash
cd lucido-il-tuo-margine && bun install
```

Crea o aggiorna il file `.env` nella radice del progetto con l'URL e la chiave **pubblica** (anon/publishable) del tuo progetto Supabase. Vedi [Variabili d'ambiente](#variabili-dambiente).

```bash
bun run dev
```

L'app è su <http://localhost:8080>.

| Script | Cosa fa |
| --- | --- |
| `bun run dev` | Server di sviluppo su `::`:8080 |
| `bun run build` | Build di produzione (Node in `.output/`, oppure Vercel in `.vercel/output/` se è definita la variabile `VERCEL`) |
| `bun run start` | Avvia la build Node (`node .output/server/index.mjs`, porta da `PORT`, default 3000) |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |

## Configurare Supabase

Ti servono un progetto Supabase (va bene il piano gratuito) e la [Supabase CLI](https://supabase.com/docs/guides/cli).

1. **Collega il progetto** (il *project ref* è nell'URL della dashboard):
   ```bash
   supabase link --project-ref IL_TUO_PROJECT_REF
   ```
2. **Applica lo schema** (tutte le migrazioni in `supabase/migrations/`):
   ```bash
   supabase db push
   ```
3. **Attiva l'accesso anonimo**: dashboard Supabase → *Authentication* → *Sign In / Providers* → **Allow anonymous sign-ins**. Se pubblichi l'app, valuta di attivare anche il CAPTCHA per limitare gli abusi.
4. **Pubblica l'edge function** e imposta la chiave AI (vedi la sezione successiva):
   ```bash
   supabase functions deploy classify
   ```
   ```bash
   supabase secrets set AI_API_KEY=LA_TUA_CHIAVE
   ```

Le chiavi `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` dentro l'edge function le fornisce Supabase in automatico.

## Classificazione AI

L'edge function `supabase/functions/classify` riceve l'id dell'azienda, verifica che l'utente ne sia operatore, manda all'LLM i costi non ancora validati (in blocchi da 40) e salva le proposte come `ai_proposta`. Le risposte del modello vengono controllate: tipo di costo ammesso, cliente esistente, confidenza tra 0 e 1. Le voci validate dall'operatore mentre l'AI lavora non vengono sovrascritte.

| Secret | Obbligatorio | Default |
| --- | --- | --- |
| `AI_API_KEY` | sì | chiave [Google AI Studio](https://aistudio.google.com/apikey) (Gemini ha un piano gratuito) |
| `AI_API_URL` | no | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` |
| `AI_MODEL` | no | `gemini-2.5-flash` |

Funziona con qualunque provider che esponga l'endpoint `chat/completions` in formato OpenAI: basta cambiare `AI_API_URL` e `AI_MODEL`.

## Deploy

### Vercel

1. Importa il repository su [Vercel](https://vercel.com/new).
2. Lascia i comandi suggeriti oppure imposta *Build Command* `bun run build`: con la variabile `VERCEL` (che Vercel definisce da solo) Nitro genera l'output nel formato di Vercel, in `.vercel/output`.
3. Aggiungi le [variabili d'ambiente](#variabili-dambiente) per *Production* e *Preview*.
4. Deploy. Se usi un dominio tuo, aggiungilo anche in Supabase → *Authentication* → *URL Configuration*.

### Replit o qualsiasi server Node

```bash
bun install && bun run build
```

```bash
PORT=3000 bun run start
```

In sviluppo basta `bun run dev` (porta 8080).

## Variabili d'ambiente

| Variabile | Dove serve | Valore |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | browser | URL del progetto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser | chiave pubblica (anon / publishable) |
| `SUPABASE_URL` | server (SSR) | come sopra |
| `SUPABASE_PUBLISHABLE_KEY` | server (SSR) | come sopra |
| `SUPABASE_SERVICE_ROLE_KEY` | solo server, opzionale | serve solo a eventuali funzioni server con privilegi da amministratore. **Mai** nel browser né in un file committato |

Le variabili `VITE_*` finiscono nel bundle del browser al momento della build: mettici solo chiavi pubbliche. La sicurezza dei dati dipende dalla Row Level Security, non dal tenere segreta la chiave anon.

---

## Limiti noti

È un prototipo: questi limiti sono noti e accettati.

- **Nessun account vero**: la sessione è anonima e vive nel browser. Se cancelli i dati del sito o cambi dispositivo ricevi una nuova azienda vuota di esempio. La pagina `/auth` (email e password) esiste ma non fa parte del flusso.
- **Salvataggi non transazionali**: una voce viene salvata in due scritture (transazione e classificazione). Se la seconda fallisce, nel database può restare una transazione senza classificazione.
- **Import**: i file FatturaPA firmati (`.p7m`) non sono supportati; carica l'XML in chiaro. `xlsx` 0.18.5 da npm ha vulnerabilità note su file malevoli: importa solo file di cui ti fidi.
- **Nessun test automatico**: le verifiche sono `bun run lint`, `bun run build` e prova manuale.
- **Solo primo margine**: cassa prospettica, EBITDA, break-even e alert sulla crisi d'impresa sono descritti in `docs/prd.md` ma non sono implementati.

## Licenza

Lucido è distribuito con la licenza **[PolyForm Noncommercial 1.0.0](LICENSE)**.

In breve, e senza sostituire il testo della licenza:

- ✅ Puoi **usarlo**, **studiarlo**, **modificarlo** e **condividerlo** per scopi **non commerciali**: uso personale, studio, ricerca, hobby, enti non profit, istituzioni pubbliche ed educative.
- ✅ Puoi pubblicare versioni modificate, purché chi le riceve riceva anche i termini della licenza e la riga `Required Notice` all'inizio del file [LICENSE](LICENSE).
- ❌ **Non puoi usarlo per scopi commerciali**: venderlo, offrirlo come servizio a pagamento, integrarlo in un prodotto o in un'attività a scopo di lucro.

Per un uso commerciale contattami tramite [GitHub](https://github.com/Luke2986).
