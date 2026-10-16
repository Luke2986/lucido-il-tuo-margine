---
project_name: 'Lucido — il tuo margine'
user_name: 'Master Luca'
date: '2026-06-22'
sections_completed:
  ['technology_stack', 'language_rules', 'framework_rules', 'data_model_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
project_type: 'brownfield'
optimized_for_llm: true
repo_path: 'lucido-il-tuo-margine'
supabase_project_ref: 'xzsjnzibyszhsjqvchee'
---

# Project Context for AI Agents — Lucido

_Regole critiche e pattern che gli agenti AI DEVONO seguire quando scrivono codice in questo progetto. Focus su dettagli non ovvi. Prototipo v0 brownfield nato su Lovable, ora indipendente (Vercel/Replit + Supabase proprio). Licenza PolyForm Noncommercial 1.0.0. Codice e commenti in italiano; commit/PR in inglese o italiano ma in stato funzionante._

---

## Technology Stack & Versions

- **Runtime/package manager:** Bun (`bun.lock`, `bunfig.toml`). Script: `bun run dev | build | lint | format`.
- **Framework:** TanStack Start `^1.167` + TanStack Router `^1.168` (routing file-based, SSR via Nitro, target build default Cloudflare).
- **UI:** React `^19.2` + shadcn/ui (style `new-york`, baseColor `slate`) + Radix primitives. Icone `lucide-react`.
- **Styling:** Tailwind CSS **v4** (`@tailwindcss/vite`), CSS variables, entry `src/styles.css`, `tw-animate-css`.
- **Build:** Vite `^8` con plugin espliciti in `vite.config.ts`; Nitro (beta) in build: preset `vercel` se `VERCEL` è definita, altrimenti `node-server` (`bun run start`).
- **State:** Zustand `^5` (store unico `src/lib/store.ts`). Data fetching: TanStack Query `^5`.
- **Backend:** Supabase (`@supabase/supabase-js ^2.108`); edge functions Deno. Setup completo nel `README.md`.
- **Validazione:** Zod `^3`. Form: react-hook-form + `@hookform/resolvers`.
- **Altro:** recharts (grafici), date-fns, xlsx (import Excel/fatture), sonner (toast).
- **Lingua:** TypeScript `^5.8` strict.

## Critical Implementation Rules

### Language-Specific Rules (TypeScript)

- `strict: true`. MA `noUnusedLocals`/`noUnusedParameters` = **false** e ESLint `@typescript-eslint/no-unused-vars` = **off** → variabili inutilizzate non rompono la build (non rimuoverle a tappeto come "fix lint").
- `noFallthroughCasesInSwitch: true`, `noUncheckedSideEffectImports: true`. `moduleResolution: Bundler`, `allowImportingTsExtensions: true`.
- Alias path **`@/*` → `src/*`** (sia tsconfig sia Vite). Usa sempre `@/...`, mai percorsi relativi lunghi.
- **`no-restricted-imports`: il pacchetto `server-only` è VIETATO.** Per codice solo-server: rinomina il modulo in `*.server.ts` oppure usa `@tanstack/react-start/server-only`.
- Formattazione it-IT centralizzata in `src/lib/format.ts` (`formatEur`, `formatPercent`, `formatDate`). Non istanziare `Intl.NumberFormat` ad-hoc nei componenti.

### Framework-Specific Rules (TanStack Start / Router)

- **Routing file-based** in `src/routes/`. Convenzioni: `index.tsx`→`/`, `$id` dinamico (bare `$`), `_authenticated/` gruppo protetto, `__root.tsx` shell unica. **NIENTE** `src/pages/`, `app/layout.tsx` o convenzioni Next/Remix (vedi `src/routes/README.md`).
- **`src/routeTree.gen.ts` è auto-generato — NON modificarlo a mano.**
- `__root.tsx`: preserva `<Outlet />`, `RootShell` (`<html lang="it">`), QueryClientProvider e `<Toaster />`. Meta/SEO già definiti lì.
- `_authenticated/route.tsx`: `ssr: false`; `beforeLoad` fa **`supabase.auth.signInAnonymously()`** (questa versione non richiede login). Reagisce a `supabase.auth.onAuthStateChange` (SIGNED_OUT→`reset()`, SIGNED_IN/USER_UPDATED→`loadAll()`). Esiste anche `auth.tsx` (email/password) non usato dal flusso anonimo.
- **Server function middleware:** `attachSupabaseAuth` (client) DEVE restare registrato in `src/start.ts` `functionMiddleware`, altrimenti il browser non allega il bearer token alle serverFn RPC. `requireSupabaseAuth` (server) valida il JWT e popola `context.{supabase,userId,claims}`.
- **`vite.config.ts`:** plugin dichiarati a mano (tailwindcss, tsConfigPaths, tanstackStart, nitro solo in build, viteReact). Non duplicarli. Dev server su `::`:8080.
- shadcn/ui: componenti in `src/components/ui` (NON riscrivere da zero), alias da `components.json`. Aggiungi nuovi componenti con la CLI shadcn.
- **State (Zustand):** store unico `useLucidoStore`. Nei componenti usa `useHydratedStore`/`useIsHydrated` (`src/lib/use-store.ts`) per garantire che `loadAll()` sia stato eseguito prima di leggere. Tutte le mutazioni sono **ottimistiche con rollback** sull'errore + `reportError()`/`toast.error` — replica questo pattern per nuove azioni.

### Data Model & Supabase Rules

- **Tre client Supabase distinti, tutti auto-generati ("Do not edit directly"):**
  - `client.ts` → browser, **anon/publishable key**, Proxy lazy. Import: `import { supabase } from "@/integrations/supabase/client"`.
  - `client.server.ts` → **service role, bypassa RLS**. Solo operazioni server fidate. **Mai** import top-level in file di route o `*.functions.ts` (finiscono nel bundle browser): usa `const { supabaseAdmin } = await import("@/integrations/supabase/client.server")` dentro l'handler.
  - `auth-middleware.ts` (`requireSupabaseAuth`) → query per-utente con RLS dal JWT. `auth-attacher.ts` (`attachSupabaseAuth`) → allega il token.
- **Modello UI `Entry` ≠ schema DB.** Un `Entry` è la fusione di `transactions` (dati grezzi) + `classifications` (classificazione costo, 1:1). Conversioni SOLO via gli helper in `store.ts`: `composeEntry`, `entryToTxInsert`, `entryToTxUpdate`, `entryToClsInsert`.
  - `classifications` esiste per **ogni** voce, costi e ricavi (`onConflict: transaction_id`): per i ricavi `cost_type` è `null` e serve a salvare lo stato di validazione. Voci senza classification (righe vecchie): costo → da validare, ricavo → validato.
  - `amount` è positivo e il segno è dato da `direction`, **tranne le note di credito (TD04)**: stessa direzione della fattura rettificata, importo negativo.
- **Company corrente** = prima `membership` dell'utente loggato (ordinata per `created_at`). `companyId`/`role` derivano da lì. Trigger `handle_new_user` crea **un'azienda nuova per ogni utente** (anche anonimo) con membership `operator`; al primo `loadAll` lo store la popola con il dataset di esempio (`seedCompany`, segna `companies.seeded_at`). Il cambio ruolo demo passa dalla RPC `set_my_role` (le membership non sono aggiornabili direttamente).
- **RLS con funzioni `SECURITY DEFINER`** (`is_member`, `has_role_in_company`, `is_company_published`) per evitare ricorsione nelle policy. Regole per nuove funzioni: `LANGUAGE sql STABLE SECURITY DEFINER`, sempre **`SET search_path = public`**, poi `REVOKE EXECUTE ... FROM PUBLIC` e `GRANT EXECUTE ... TO authenticated`.
- **Migrazioni canoniche:** `supabase/migrations/*` (timestamp).
- **Vista `margin_by_client`** (`security_invoker = true`): calcola il primo margine lato DB; eredita RLS dalle tabelle. Mantienila allineata a `computeMarginRows` in `store.ts`.
- **Edge function `supabase/functions/classify`:** `verify_jwt = true`; verifica membership via service client; solo ruolo `operator`; LLM via API compatibile OpenAI: secret `AI_API_KEY` (default Gemini `gemini-2.5-flash`, override con `AI_API_URL`/`AI_MODEL`; fallback temporaneo `LOVABLE_API_KEY` finché gira su Lovable Cloud), batch da 40. Non sovrascrive voci validate durante l'elaborazione. Riclassifica solo costi senza classification o in stato `ai_proposta`. Valida output AI: whitelist `cost_type`, `client_id` solo se tra i clienti validi, `confidence` clampata [0,1]. Gestisce 402 (crediti esauriti) / 429 (rate limit). Invocata via `supabase.functions.invoke("classify", { body: { companyId } })`.

### Domain Rules (controllo di gestione)

- **Primo margine = ricavi − costi variabili attribuiti** a quel cliente/commessa. Entrano nel margine **solo** i costi con `cost_type='variabile'`; `fisso` e `non_costo` sono ESCLUSI.
- **Classificazione costi:** `variabile` (varia col volume/commessa: freelance, materiali, subappalti, trasferte di progetto), `fisso` (struttura: affitto, stipendi, software, utenze, commercialista), `non_costo` (IVA, imposte, giroconti, rimborsi finanziamenti, movimenti non economici).
- **Flusso di validazione:** i costi nascono `da_validare`; i ricavi sono `validato` di default. La coda "Revisione AI" (`revisione.tsx`) ordina i costi non validati per **banda di confidenza peggiore + importo decrescente**. Le bande derivano dalle soglie in `settings` (`threshold_high`/`threshold_medium`).
- **Cancello morbido (soft gate):** `computeValidatedRevenueShare` misura la quota di ricavi validati; la pubblicazione (`setPublished` → `company.status`) è il gate verso la vista titolare. Via RLS, **l'owner vede azienda/clienti/transazioni SOLO se `status='pubblicata'`**; l'operatore vede e modifica sempre.
- **Ruoli:** `operator` (inserisce, importa, valida, pubblica — CRUD completo) vs `owner` (sola lettura, dipende dalla pubblicazione). `computeMarginRows` mostra solo clienti con almeno una voce, ordinati per margine crescente (perdite in alto).

### Testing Rules

- Il prototipo v0 **non ha framework di test** configurato (nessun vitest/jest/playwright in `package.json`). Non inventare comandi di test inesistenti.
- Verifica delle modifiche tramite `bun run lint`, `bun run build` e prova manuale con `bun run dev`. Se introduci test, proponi prima lo stack e non assumere convenzioni preesistenti.

### Code Quality & Style Rules

- **Prettier** (`.prettierrc`): `printWidth: 100`, `semi: true`, `singleQuote: false` (virgolette doppie), `trailingComma: "all"`. **ESLint** flat config + plugin react-hooks/react-refresh/prettier. Lancia `bun run format` e `bun run lint` prima di consegnare.
- **Codice, commenti, UI, toast in italiano.** I file auto-generati restano in inglese.
- **Naming:** route in kebab-case italiano (`area-dati`, `impostazioni`, `revisione`); componenti `PascalCase` (`MarginDashboard.tsx`); util/lib `camelCase`. UI shadcn in `src/components/ui` (kebab-case).
- **Error handling:** centralizza con `reportError(action, error)` + `toast` (sonner). Errori SSR passano per `errorMiddleware` (`start.ts`) → `renderErrorPage`; gli error boundary di root sono in `__root.tsx`.

### Development Workflow Rules

- **Git:** NON force-push, rebase, amend o squash di history già pushata. `main` alimenta Replit e Vercel: tienilo **sempre in stato funzionante**, lavora su branch per modifiche grandi.
- **Compatibilità temporanea:** `isNotMigrated()` in `store.ts` e il fallback `LOVABLE_API_KEY` in `classify` servono solo finché esiste un DB senza la migrazione `20261016120000`. Rimuovili quando tutti gli ambienti puntano al Supabase migrato.
- **Supply-chain guard** (`bunfig.toml`): `minimumReleaseAge = 86400` (salta versioni pubblicate da <24h). Nessuna eccezione: **chiedi conferma all'utente** prima di aggiungere `minimumReleaseAgeExcludes`.
- **Env vars:** `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (+ varianti `VITE_*` per il client). `SUPABASE_SERVICE_ROLE_KEY` solo server/edge. `.env`, `.dev.vars`, `*.local` sono gitignorati — non committarli e non esporre la service role al client.

### Critical Don't-Miss Rules (anti-pattern)

- ❌ NON modificare file auto-generati: `src/routeTree.gen.ts` e `src/integrations/supabase/{client.ts, client.server.ts, types.ts, auth-middleware.ts, auth-attacher.ts}`.
- ❌ NON importare `*.server.ts` a top-level in file che finiscono nel bundle client; NON usare il pacchetto `server-only`.
- ❌ NON usare la service role key lato client né bypassare la RLS dal browser.
- ❌ NON includere costi `fisso`/`non_costo` nel calcolo del primo margine.
- ❌ NON dimenticare di salvare la `classification` insieme a ogni voce (costo o ricavo).
- ❌ NON fidarsi ciecamente dell'output dell'edge AI: valida `cost_type`, `client_id` e clampa `confidence` (già fatto in `classify/index.ts` — preservalo).
- ❌ NON forzare `amount` positivo: le note di credito sono negative (il segno economico è `direction` × segno di `amount`).
- ❌ NON riscrivere storia git pushata.

---

## Usage Guidelines

**Per gli agenti AI:**

- Leggi questo file prima di implementare qualsiasi codice.
- Segui TUTTE le regole esattamente; nel dubbio scegli l'opzione più restrittiva.
- Aggiorna questo file quando emergono nuovi pattern.

**Per gli umani:**

- Mantienilo snello e focalizzato sui bisogni degli agenti.
- Aggiorna quando cambia lo stack o quando il prototipo evolve oltre il v0 (es. login reale, multi-azienda, framework di test).
- Rivedi periodicamente e rimuovi regole diventate ovvie.

Last Updated: 2026-06-22
