# Lucido — il tuo margine

**Quali clienti ti fanno davvero guadagnare?**

Lucido è un cruscotto di controllo di gestione pensato per micro e piccole SRL italiane di servizi B2B: aziende con qualche decina o centinaia di migliaia di euro di fatturato, senza un controller interno, dove il commercialista si occupa degli adempimenti ma nessuno guarda il **primo margine per cliente**.

Lucido prende i dati che l'azienda produce già (fatture elettroniche FatturaPA, estratti conto, fogli Excel), classifica i costi con l'aiuto di un'AI e mostra, cliente per cliente o commessa per commessa, quanto resta davvero dopo i costi variabili. Ogni numero è spiegato e nessun dato arriva al titolare senza la validazione di un operatore.

> **È un prototipo.** Lucido è nato come esperimento per dare forma a un'idea. È volutamente semplice, non è un prodotto finito e non va usato per decisioni contabili o fiscali senza verificare i numeri. Lo condivido perché chi ne ha bisogno possa usarlo così com'è, studiarlo o adattarlo, nei limiti della [licenza](#licenza).

---

## Indice

- [Cosa fa](#cosa-fa)
- [Come si calcola il primo margine](#come-si-calcola-il-primo-margine)
- [Dati di esempio](#dati-di-esempio)
- [Usare i tuoi dati](#usare-i-tuoi-dati)
- [Dove finiscono i dati](#dove-finiscono-i-dati)
- [Stack tecnico](#stack-tecnico)
- [Struttura del progetto](#struttura-del-progetto)
- [Avvio in locale](#avvio-in-locale)
- [Classificazione AI](#classificazione-ai)
- [Deploy](#deploy)
- [Aggiungere un database](#aggiungere-un-database)
- [Limiti noti](#limiti-noti)
- [Licenza](#licenza)

---

## Cosa fa

| Sezione | Per chi | Cosa trovi |
| --- | --- | --- |
| **Margine clienti** (`/`) | Titolare | Primo margine per cliente/commessa, ordinato dal peggiore. I clienti in perdita sono in cima e ogni riga si apre per vedere ricavi e costi che lo compongono. |
| **Area dati** (`/area-dati`) | Operatore | Anagrafica clienti e commesse, editor delle voci, import da Excel/CSV e da fatture elettroniche FatturaPA (XML). |
| **Revisione AI** (`/revisione`) | Operatore | Coda dei costi da validare, con quelli a confidenza più bassa e importo più alto in cima. Un pulsante lancia la classificazione AI, poi l'operatore conferma o corregge. |
| **Impostazioni** (`/impostazioni`) | Operatore | Dati dell'azienda, soglie di confidenza dell'AI, pubblicazione verso il titolare, cambio di ruolo per provare le due viste, ripristino o cancellazione dei dati. |

### Funzioni principali

- **Import FatturaPA (XML).** Riconosce in automatico se una fattura è attiva o passiva confrontando la P.IVA dell'azienda con cedente e cessionario. Usa l'imponibile (IVA esclusa) e gestisce le note di credito (TD04) come importi negativi.
- **Import Excel/CSV.** Mappatura delle colonne con riconoscimento delle intestazioni italiane più comuni. Legge importi e date in formato italiano (`1.234,56`, `15/01/2026`).
- **Classificazione AI dei costi.** Ogni costo viene classificato come `fisso`, `variabile` o `non_costo` e, se possibile, attribuito a un cliente. Ogni proposta ha una confidenza e una breve motivazione ("perché questo numero").
- **Cancello morbido.** I numeri restano "da validare" finché l'operatore non li conferma. La dashboard mostra quanta parte dei ricavi è stata validata.
- **Due ruoli.** L'**operatore** inserisce, importa, valida e pubblica. Il **titolare** vede la dashboard solo quando l'azienda è pubblicata.

## Come si calcola il primo margine

```
primo margine (cliente) = ricavi attribuiti al cliente − costi VARIABILI attribuiti al cliente
```

- **Variabile**: costo che cresce con il lavoro per quel cliente (freelance di progetto, subappalti, materiali, trasferte di commessa).
- **Fisso**: costo di struttura (affitto, stipendi, software generici, utenze, commercialista). È **escluso** dal primo margine.
- **Non costo**: IVA, imposte, giroconti, rimborsi di finanziamenti. È **escluso**.
- Le **note di credito** hanno la stessa direzione della fattura che rettificano, con importo negativo: riducono il ricavo o il costo originale.

Il calcolo è in `computeMarginRows` (`src/lib/store.ts`).

---

## Dati di esempio

Al primo accesso l'app si apre già piena: **Studio Marini S.r.l.**, una piccola agenzia digitale fittizia, con circa 130 movimenti da gennaio a settembre 2026. Nomi, P.IVA e importi sono inventati, ma l'andamento è quello di un'attività vera:

| Cliente / commessa | Cosa racconta |
| --- | --- |
| Acme S.r.l. | Canone mensile, pochi costi variabili: il cliente che regge l'azienda. |
| Comune di Prato — Portale servizi | Commessa pubblica a SAL, margine sano. |
| TechNova S.r.l. | Consulenze ad alto margine. |
| Velasca Retail, Faro Logistica | Buoni clienti, ma con costi ancora da validare. |
| Studio Rossi & Partners | Fatturato alto, ma i freelance costano più di quanto incassi: **in perdita**. |
| Bianchi Eventi | Eventi con trasferte e service: **in perdita**. |
| Ortofrutta Bassi — E-commerce | Piccola commessa a prezzo fisso, sottostimata: **in perdita**. |

Ci sono anche i costi fissi di struttura (affitto, stipendi, F24, software, utenze, commercialista, assicurazione), le rate del finanziamento e i versamenti IVA (non costi), e qualche addebito bancario ancora senza classificazione, che fa da coda per la **Revisione AI**.

Per provare la vista del titolare: *Impostazioni → Ruolo di test → Titolare*.

## Usare i tuoi dati

1. Vai in **Impostazioni → Gestione dati** e premi **Cancella tutti i dati**: azienda, clienti e voci vengono svuotati.
2. In **Impostazioni** inserisci nome, P.IVA (serve all'import FatturaPA per capire se una fattura è attiva o passiva), settore e periodo.
3. In **Area dati** crea clienti e commesse, poi inserisci le voci a mano oppure importa fatture XML ed estratti conto Excel/CSV.
4. In **Revisione AI** classifica i costi (con l'AI o a mano) e validali.
5. Torna in **Impostazioni** e pubblica: il titolare vede il margine.

Per tornare all'azienda di esempio: **Impostazioni → Gestione dati → Ripristina dati di esempio**.

## Dove finiscono i dati

Lucido **non ha un database**. Tutto quello che inserisci resta nel `localStorage` del tuo browser (chiave `lucido-dati`):

- nessun account, nessun server che conserva i tuoi numeri;
- ogni visitatore della demo pubblica ha la sua copia, che nessun altro vede;
- se cancelli i dati del sito, usi la navigazione privata o cambi browser/dispositivo, riparti dai dati di esempio.

L'unica cosa che lascia il browser è la **classificazione AI**, e solo quando premi il pulsante: descrizione, controparte, data e importo dei costi da classificare, più nome e settore dell'azienda e l'elenco dei clienti, vengono mandati al server dell'app e da lì al provider AI. Nulla viene salvato lato server.

---

## Stack tecnico

| Area | Tecnologia |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, routing a file, server functions) |
| Build | Vite 8 + [Nitro](https://nitro.build) (output per Vercel o server Node) |
| UI | Tailwind CSS 4, shadcn/ui, Radix, lucide-react, recharts |
| Stato e persistenza | Zustand con middleware `persist` su `localStorage` |
| AI | Qualsiasi LLM con API compatibile OpenAI (default: Google Gemini `gemini-2.5-flash`) |
| Import | `xlsx` (SheetJS) per Excel/CSV, `DOMParser` per FatturaPA |
| Package manager | [Bun](https://bun.sh) |

## Struttura del progetto

```
src/
  routes/                      pagine (routing a file di TanStack Router)
    __root.tsx                 shell HTML, meta, error boundary
    _app/                      area dell'app (solo client, nessun login)
      index.tsx                Margine clienti (dashboard titolare)
      area-dati.tsx            clienti, voci, import
      revisione.tsx            coda di revisione AI
      impostazioni.tsx         azienda, soglie, ruolo, pubblicazione, reset dati
  components/
    MarginDashboard.tsx        dashboard del primo margine
    data-area/                 editor voci, import Excel/CSV e FatturaPA
    ui/                        componenti shadcn/ui
  lib/
    store.ts                   store Zustand, persistenza locale, calcolo del margine
    seed.ts                    dati di esempio (Studio Marini)
    classify.functions.ts      server function di classificazione AI
    types.ts                   tipi del dominio (Client, Entry, ...)
    format.ts                  formattazione it-IT di valuta, percentuali, date
  server.ts, start.ts          entry server e middleware
docs/                          PRD e documenti di prodotto (descrivono anche la versione con database)
project-context.md             regole e convenzioni per chi (o cosa) scrive codice qui
```

## Avvio in locale

Requisiti: [Bun](https://bun.sh) ≥ 1.3 (oppure Node ≥ 22 con npm).

```bash
git clone https://github.com/Luke2986/lucido-il-tuo-margine.git
```

```bash
cd lucido-il-tuo-margine && bun install
```

```bash
bun run dev
```

L'app è su <http://localhost:8080> e funziona subito, senza configurare nulla. Solo la classificazione AI richiede una chiave: copia `.env.example` in `.env` e inserisci `AI_API_KEY`.

```bash
cp .env.example .env
```

| Script | Cosa fa |
| --- | --- |
| `bun run dev` | Server di sviluppo su `::`:8080 |
| `bun run build` | Build di produzione (Node in `.output/`, oppure Vercel in `.vercel/output/` se è definita la variabile `VERCEL`) |
| `bun run start` | Avvia la build Node (`node .output/server/index.mjs`, porta da `PORT`, default 3000) |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |

## Classificazione AI

La server function `classifyCosts` (`src/lib/classify.functions.ts`) riceve dal browser i costi da classificare (al massimo 200 per volta), li manda all'LLM in blocchi da 40 e restituisce le proposte. Le risposte del modello vengono controllate: tipo di costo ammesso, cliente esistente, confidenza tra 0 e 1. Il browser applica le proposte solo ai costi ancora da validare: quello che l'operatore ha già confermato non viene toccato.

La chiave resta sul server e non arriva mai al browser. Per limitare gli abusi della demo pubblica c'è un tetto di 10 richieste l'ora per indirizzo IP.

| Variabile | Obbligatoria | Valore |
| --- | --- | --- |
| `AI_API_KEY` | sì, solo per l'AI | chiave [Google AI Studio](https://aistudio.google.com/apikey) (Gemini ha un piano gratuito) |
| `AI_API_URL` | no | default `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` |
| `AI_MODEL` | no | default `gemini-2.5-flash` |

Funziona con qualunque provider che esponga l'endpoint `chat/completions` in formato OpenAI: basta cambiare `AI_API_URL` e `AI_MODEL`. Senza `AI_API_KEY` l'app funziona lo stesso: la Revisione AI mostra un messaggio e i costi si classificano a mano.

## Deploy

### Vercel

1. Importa il repository su [Vercel](https://vercel.com/new) (framework *Other*).
2. *Install Command* `bun install`, *Build Command* `bun run build`. Con la variabile `VERCEL` (che Vercel definisce da solo) Nitro genera l'output nel formato di Vercel, in `.vercel/output`.
3. Facoltativo: in *Settings → Environment Variables* aggiungi `AI_API_KEY` (e se vuoi `AI_API_URL`, `AI_MODEL`) per *Production* e *Preview*, poi rifai il deploy.

### Server Node (qualsiasi hosting)

```bash
bun install && bun run build
```

```bash
PORT=3000 bun run start
```

## Aggiungere un database

Il prototipo è volutamente senza backend: chi vuole usarlo con più utenti o su più dispositivi può aggiungere il database che preferisce (Supabase, Postgres, SQLite, Firebase, ...). Il punto da toccare è uno solo, `src/lib/store.ts`:

- i componenti leggono lo stato e chiamano solo le azioni dello store (`addEntry`, `updateEntry`, `removeClient`, `applyClassifications`, ...);
- oggi ogni azione modifica lo stato in memoria e il middleware `persist` lo salva nel `localStorage`;
- per usare un database, sostituisci `persist` con un caricamento iniziale dal backend e fai in modo che ogni azione scriva anche lì (meglio tramite server function in `src/lib/*.functions.ts`, così le credenziali restano sul server).

Il modello dati da salvare è in `src/lib/types.ts` (`Client`, `Entry`) e in `store.ts` (`Company`, `ConfidenceThresholds`). Ricordati di proteggere i dati per azienda (es. Row Level Security su Postgres) e di aggiungere un login vero.

---

## Limiti noti

È un prototipo: questi limiti sono noti e accettati.

- **Dati solo nel browser**: niente sincronizzazione tra dispositivi né condivisione tra operatore e titolare reali. I due ruoli si provano sullo stesso browser.
- **Spazio limitato**: il `localStorage` tiene qualche MB, abbastanza per migliaia di voci ma non per anni di movimenti.
- **Ruoli non protetti**: il cambio di ruolo è un interruttore di prova, non un controllo di accesso.
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
