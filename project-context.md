---
project_name: 'Lucido — il tuo margine'
user_name: 'Master Luca'
date: '2026-10-17'
sections_completed:
  ['technology_stack', 'language_rules', 'framework_rules', 'data_model_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
project_type: 'brownfield'
optimized_for_llm: true
repo_path: 'lucido-il-tuo-margine'
---

# Project Context for AI Agents — Lucido

_Regole critiche e pattern che gli agenti AI DEVONO seguire quando scrivono codice in questo progetto. Prototipo v0, indipendente e **senza database**: i dati vivono nel `localStorage` del browser e partono da un dataset di esempio. Deploy su Vercel o server Node. Licenza PolyForm Noncommercial 1.0.0. Codice e commenti in italiano; commit/PR in inglese o italiano ma in stato funzionante._

---

## Technology Stack & Versions

- **Runtime/package manager:** Bun (`bun.lock`, `bunfig.toml`). Script: `bun run dev | build | start | lint | format`.
- **Framework:** TanStack Start `^1.167` + TanStack Router `^1.168` (routing file-based, server functions, Nitro: preset `vercel` o `node-server`).
- **UI:** React `^19.2` + shadcn/ui (style `new-york`, baseColor `slate`) + Radix primitives. Icone `lucide-react`.
- **Styling:** Tailwind CSS **v4** (`@tailwindcss/vite`), CSS variables, entry `src/styles.css`, `tw-animate-css`.
- **Build:** Vite `^8` con plugin espliciti in `vite.config.ts`; Nitro solo in build: preset `vercel` se `VERCEL` è definita, altrimenti `node-server`.
- **State:** Zustand `^5` con middleware `persist` (store unico `src/lib/store.ts`, chiave `lucido-dati`).
- **AI:** server function `classifyCosts` (`src/lib/classify.functions.ts`), LLM via API compatibile OpenAI (default Gemini `gemini-2.5-flash`).
- **Validazione:** Zod `^3`. Form: react-hook-form + `@hookform/resolvers`.
- **Altro:** recharts, date-fns, xlsx (import Excel), sonner (toast).
- **Lingua:** TypeScript `^5.8` strict.

## Critical Implementation Rules

### Language-Specific Rules (TypeScript)

- `strict: true`. MA `noUnusedLocals`/`noUnusedParameters` = **false** e ESLint `@typescript-eslint/no-unused-vars` = **off** → variabili inutilizzate non rompono la build (non rimuoverle a tappeto come "fix lint").
- Alias path **`@/*` → `src/*`** (sia tsconfig sia Vite). Usa sempre `@/...`, mai percorsi relativi lunghi.
- **`no-restricted-imports`: il pacchetto `server-only` è VIETATO.** Per codice solo-server: rinomina il modulo in `*.server.ts` oppure usa import dinamici dentro l'handler della server function.
- Formattazione it-IT centralizzata in `src/lib/format.ts` (`formatEur`, `formatSignedEur`, `formatPercent`, `formatDate`). Non istanziare `Intl.NumberFormat` ad-hoc nei componenti.

### Framework-Specific Rules (TanStack Start / Router)

- **Routing file-based** in `src/routes/`. Convenzioni: `index.tsx`→`/`, `_app/` layout dell'app, `__root.tsx` shell unica. **NIENTE** `src/pages/`, `app/layout.tsx` o convenzioni Next/Remix.
- **`src/routeTree.gen.ts` è auto-generato — NON modificarlo a mano.**
- `__root.tsx`: preserva `<Outlet />`, `RootShell` (`<html lang="it">`), QueryClientProvider e `<Toaster />`.
- `_app/route.tsx`: **`ssr: false`**. Lo stato viene dal `localStorage`, quindi le pagine dell'app si renderizzano solo nel browser (niente mismatch di idratazione).
- **Server functions:** `createServerFn({ method: "POST" }).inputValidator(zodSchema).handler(...)` in file `src/lib/*.functions.ts`. Moduli solo-server (`@tanstack/react-start/server`, segreti, SDK) vanno importati **dinamicamente dentro l'handler**, mai a top-level.
- **`vite.config.ts`:** plugin dichiarati a mano (tailwindcss, tsConfigPaths, tanstackStart, nitro solo in build, viteReact). Non duplicarli. Dev server su `::`:8080.
- shadcn/ui: componenti in `src/components/ui` (NON riscrivere da zero). Aggiungi nuovi componenti con la CLI shadcn.

### Data & Persistence Rules

- **Nessun database.** Lo store Zustand è l'unica fonte di verità; `persist` salva `role`, `company`, `thresholds`, `clients`, `entries` (vedi `partialize`). L'accesso a `localStorage` passa da `safeLocalStorage`, che ingoia le eccezioni (navigazione privata, quota piena): l'app deve funzionare anche senza persistenza.
- **Azioni sincrone.** Tutte le mutazioni sono funzioni sincrone dello store (`addEntry`, `updateEntry`, `removeClient`, `applyClassifications`, `resetToSeed`, `clearAll`, ...). I componenti non scrivono mai direttamente su `localStorage`.
- **Cambi di schema:** se cambi la forma dei dati persistiti, incrementa `version` nel `persist` e aggiungi una `migrate`, altrimenti chi ha già dati salvati si ritrova uno stato incoerente.
- **Dataset di esempio** in `src/lib/seed.ts` (Studio Marini S.r.l., gennaio–settembre 2026). `resetToSeed` lo ricarica, `clearAll` svuota azienda, clienti e voci. Il seed deve restare coerente con la logica del margine (deve mostrare clienti in perdita, voci da validare e costi senza classificazione per la Revisione AI).
- **`Entry`** (`src/lib/types.ts`): `amount` è positivo e il segno è dato da `direction`, **tranne le note di credito (TD04)**: stessa direzione della fattura rettificata, importo negativo. Per i ricavi `costType` è sempre vuoto (`updateEntry` lo azzera).
- **Classificazione AI:** il browser manda solo i costi da classificare; il server chiama l'LLM in batch da 40 (max 200), valida ogni elemento con Zod (whitelist `cost_type`, `client_id` solo tra i clienti inviati, `confidence` clampata [0,1]) e restituisce le proposte. Nessun dato viene salvato sul server. `applyClassifications` le applica **solo ai costi `da_validare`** e marca `validatedBy: "AI"`. Rate limit in memoria: 10 richieste/ora per IP.
- **Per aggiungere un database** (fuori dal perimetro del prototipo): sostituisci `persist` con caricamento iniziale + scritture via server function, mantenendo invariata l'API delle azioni dello store. Vedi la sezione "Aggiungere un database" del `README.md`.

### Domain Rules (controllo di gestione)

- **Primo margine = ricavi − costi variabili attribuiti** a quel cliente/commessa. Entrano nel margine **solo** i costi con `costType='variabile'`; `fisso` e `non_costo` sono ESCLUSI.
- **Classificazione costi:** `variabile` (varia col volume/commessa: freelance, materiali, subappalti, trasferte di progetto), `fisso` (struttura: affitto, stipendi, software, utenze, commercialista), `non_costo` (IVA, imposte, giroconti, rimborsi finanziamenti, movimenti non economici).
- **Flusso di validazione:** i costi nascono `da_validare`; i ricavi sono `validato` di default. La coda "Revisione AI" (`revisione.tsx`) ordina i costi non validati per **banda di confidenza peggiore + importo decrescente**. Le bande derivano dalle soglie (`thresholds.high` / `thresholds.medium`).
- **Cancello morbido (soft gate):** `computeValidatedRevenueShare` misura la quota di ricavi validati; la pubblicazione (`setPublished` → `company.status`) è il gate verso la vista titolare: con ruolo `owner` e azienda non pubblicata `MarginDashboard` mostra solo l'avviso.
- **Ruoli:** `operator` (inserisce, importa, valida, pubblica) vs `owner` (sola lettura, dipende dalla pubblicazione). Il ruolo è un interruttore di prova, **non** un controllo di accesso. `computeMarginRows` mostra solo clienti con almeno una voce, ordinati per margine crescente (perdite in alto).

### Testing Rules

- Il prototipo v0 **non ha framework di test** configurato. Non inventare comandi di test inesistenti.
- Verifica delle modifiche tramite `bun run lint`, `bun run build` e prova manuale con `bun run dev`. Se introduci test, proponi prima lo stack.

### Code Quality & Style Rules

- **Prettier** (`.prettierrc`): `printWidth: 100`, `semi: true`, virgolette doppie, `trailingComma: "all"`. **ESLint** flat config + plugin react-hooks/react-refresh/prettier.
- **Codice, commenti, UI, toast in italiano.** I file auto-generati restano in inglese.
- **Naming:** route in kebab-case italiano (`area-dati`, `impostazioni`, `revisione`); componenti `PascalCase`; util/lib `camelCase`. UI shadcn in `src/components/ui` (kebab-case).
- **Error handling:** errori utente via `toast` (sonner). Errori SSR passano per `errorMiddleware` (`start.ts`) → `renderErrorPage`; gli error boundary di root sono in `__root.tsx`.

### Development Workflow Rules

- **Git:** NON force-push, rebase, amend o squash di history già pushata. `main` va in produzione su Vercel: tienilo **sempre in stato funzionante**.
- **Supply-chain guard** (`bunfig.toml`): `minimumReleaseAge = 86400`. **Chiedi conferma all'utente** prima di aggiungere `minimumReleaseAgeExcludes`.
- **Env vars:** solo `AI_API_KEY` (obbligatoria solo per l'AI), `AI_API_URL`, `AI_MODEL`, tutte lato server. Modello in `.env.example`. `.env` e `*.local` sono gitignorati.

### Critical Don't-Miss Rules (anti-pattern)

- ❌ NON modificare a mano `src/routeTree.gen.ts`.
- ❌ NON importare moduli solo-server a top-level in file che finiscono nel bundle client; NON usare il pacchetto `server-only`.
- ❌ NON esporre `AI_API_KEY` al browser (niente variabili `VITE_*` con segreti).
- ❌ NON includere costi `fisso`/`non_costo` nel calcolo del primo margine.
- ❌ NON fidarsi dell'output dell'AI: valida `cost_type`, `client_id` e clampa `confidence` (già fatto in `classify.functions.ts` — preservalo).
- ❌ NON far sovrascrivere all'AI le voci già validate dall'operatore.
- ❌ NON forzare `amount` positivo: le note di credito sono negative.
- ❌ NON cambiare la forma dei dati persistiti senza bump di `version` + `migrate`.
- ❌ NON riscrivere storia git pushata.

---

## Usage Guidelines

**Per gli agenti AI:** leggi questo file prima di implementare codice, segui le regole e nel dubbio scegli l'opzione più restrittiva. Aggiorna il file quando emergono nuovi pattern.

**Per gli umani:** mantienilo snello. Aggiornalo quando cambia lo stack o quando il prototipo evolve (es. database, login reale, test).

Last Updated: 2026-10-17
