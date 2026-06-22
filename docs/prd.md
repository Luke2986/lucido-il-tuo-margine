---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
status: 'complete'
completedDate: '2026-06-22'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-lucaversilia-2026-06-21.md
  - _bmad-output/project-context.md
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 1
workflowType: 'prd'
projectType: 'brownfield'
classification:
  projectType: saas_b2b
  domain: fintech
  domainNote: 'fintech-adjacent / controllo di gestione — read-only analytics, no payment rails'
  complexity: high
  projectContext: brownfield
  inScopeConcerns: ['GDPR/data-privacy', 'accuratezza & fiducia (classificazione AI)', 'art. 2086 / Codice della Crisi', 'open-banking PSD2 + SdI (V2)']
  outOfScopeConcerns: ['PCI-DSS', 'KYC/AML', 'payment fraud', 'custodia/movimentazione denaro']
---

# Product Requirements Document - Lucido — il tuo margine

**Author:** Master Luca
**Date:** 2026-06-22

> **Convenzione di tagging dei requisiti** (vincolo prodotto, vale per tutto il PRD):
> - **[MVP]** — prototipo v0 GIÀ COSTRUITO ("Lucido"). Resta semplice. Etichetta *"già implementato in v0"*.
> - **[V1/paid-MVP]** — ciò che giustifica il prezzo: cassa prospettica 13 settimane, EBITDA/break-even, dashboard di sintesi.
> - **[V2/Visione]** — medio-lungo termine: alert art. 2086, PFN, aging/scaduti, budget vs consuntivo, onboarding self-serve, automazione mappatura, integrazioni SdI/PSD2.
>
> **Classificazione:** `saas_b2b` · dominio `fintech`-adjacent (controllo di gestione, analytics read-only — niente payment rail) · complessità **high** · brownfield.
> **Persona Marco / Laura / Stefano = ipotesi da validare**, non scope deciso.

---

## Executive Summary

**Lucido** è un cruscotto di controllo di gestione — categoria *CFO-as-a-service*, non SaaS di cassa — per micro/piccole SRL italiane di servizi B2B (200k–1M ricavi, 3–15 addetti, owner-managed, senza controller; commercialista solo adempimenti). Trasforma i dati che l'azienda già produce (FatturaPA + banca) in decisioni sul futuro: **primo margine per cliente** in MVP; cassa a 13 settimane e soglie art. 2086 nelle fasi a pagamento.

**Differenziatore.** Classificazione AI dei costi (fisso/variabile/non_costo) + attribuzione a cliente → primo margine, dove Sibill/Agicap sono deboli. Il **cancello morbido** (mostra solo voci validate/alta confidenza + QA umano sulle voci ad alto impatto) trasforma un classificatore probabilistico in un numero su cui il titolare *decide*. Consegna **concierge** come ponte verso il self-serve. Fossato durevole = **dato classificato versionato per cliente + commercialista nel ciclo** (non il numero in sé).

**Modello.** Pagatore = titolare (B2B). Prezzo ancorato al costo di un controller / CFO frazionale (~390€+/mese + setup una tantum; ACV = canone×12 + setup), mai al puro SaaS. Beachhead = servizi B2B project-based data-ready, **da confermare** con la domanda #1 (quale settore servono CFO frazionale + commercialisti del network).

**Stato.** Brownfield: v0 "Lucido" già costruito (TanStack Start + Supabase/Lovable Cloud, edge function di classificazione AI attiva). Fase: pre-MVP, validazione 4 settimane, target ≥2 piloti paganti a prezzo pieno.

---

## Success Criteria

### User Success

- **AHA da fetta sottile** [MVP]: il titolare scopre ≥1 cliente in perdita non sospettato al primo setup, *prima* del setup completo (il valore precede il cancello config).
- **Abitudine / North Star** [MVP→V1]: con config validata cambia ≥1 decisione/mese grazie a un numero; l'apertura settimanale del report è un proxy/contesto, non la North Star.
- **Fiducia** [MVP]: ogni numero mostrato è spiegabile ("perché questo numero") + validato (QA umano sulle voci ad alto impatto); zero numeri contestati irrisolti.
- **"Dorme la notte"** [V1]: il titolare sa se a 13 settimane copre F24 / stipendi / fornitori.

### Business Success

**0–90 giorni — validazione [MVP]:**

- ≥2 piloti paganti a **prezzo pieno** (~390€+/mese + setup una tantum) che **rinnovano** al 1° ciclo.
- ≥60% interviste Mom Test confermano **dolore acuto** sul wedge margine.
- **Ore/report in calo** dopo 3–5 setup (target proposto **≤ 4 ore/report**, da confermare col 1° pilota).
- **Margine lordo al netto delle ore concierge** positivo e crescente (smaschera la "consulenza travestita", rischi R2/R7).

**3–12 mesi — post-validazione [V1→V2]:**

- ~50–100k ARR (≈10–20 clienti a ~390€/mese + setup) — *range provvisorio, da rivedere post-validazione*.
- Churn ≈0 al 1° rinnovo · LTV:CAC ≥3 [V2] · NRR>100% via tier advisory [V2].
- **ACV per cliente = canone×12 + setup** (il setup una tantum NON è MRR).

### Technical Success

- **Accuratezza mappatura pesata per impatto ≥90%** sulle voci ad alto impatto (vs ground truth indipendente: commercialista/cliente). [MVP — gate di fiducia; stop-trigger se <90% su voci critiche]
- **Cancello morbido** operativo: l'owner vede la vista titolare SOLO con config validata/pubblicata (`company.status='pubblicata'`, via RLS). [MVP — già implementato in v0]
- **Validazione output AI**: whitelist `cost_type`, `client_id` solo se tra i clienti validi, `confidence` clampata [0,1], gestione 402 (crediti)/429 (rate limit). [MVP — già implementato in v0]
- **Compliance / data protection**: GDPR sui dati finanziari (service-role mai lato client, `.env`/`.dev.vars` gitignorati, RLS per-azienda); art. 2086 = soglie informative [V1/V2]. **Fuori scope: PCI-DSS, KYC/AML, payment fraud** (sistema read-only, nessuna movimentazione denaro).

### Parametri provvisori (proposte iniziali — da confermare col 1° pilota)

> Promossi da TBD a default nominali per rendere misurabili stop-trigger e NFR. Restano da validare; non sono fatti acquisiti.

| Parametro | Proposta | Fonte/Trigger |
|---|---|---|
| Ore/report a regime | **≤ 4 ore/report** dopo 3–5 setup | brief (ore/report calanti) |
| Soglia confidenza "alta" (cancello morbido) | **≥ 0.80** | settings v0 `threshold_high` |
| Banda confidenza "media" | **0.50–0.80** | settings v0 `threshold_medium` |
| Quota ricavi validati per pubblicazione | **≥ 80%** | `computeValidatedRevenueShare` |
| Elaborazione AI per cliente tipico | **< ~30 min** | NFR12 |
| Target ARR 12 mesi | **~50–100k** (≈10–20 clienti) | brief |

### Measurable Outcomes

- **Core 4 (metriche di validazione)**: (1) piloti a prezzo pieno che rinnovano · (2) % piloti con ≥1 decisione cambiata *verificata* · (3) ore/report (trend in calo) · (4) accuratezza pesata per impatto + n° numeri contestati.
- **Bridge metrics**: referral rate / % lead da referral · conversione lead freddi (mini-tool) · % onboarding senza tocco founder · tasso mensile decisioni-cambiate.
- **Stop-trigger (dal premortem)**: <60% dolore acuto → ferma e rivaluta segmento/wedge · 0 firme a prezzo pieno dopo ~10 pitch → rivaluta WTP/pagatore · ore/report non calano dopo 3–5 setup → è consulenza, non SaaS · accuratezza <90% su voci critiche → ferma onboarding · Sibill rilascia marginalità inclusa → rivaluta differenziazione.

## Product Scope

### MVP - Minimum Viable Product — già costruito in v0 ("Lucido") · *già implementato in v0*

- Import **FatturaPA XML + estratto conto CSV/Excel + inserimento manuale**.
- **Motore di classificazione AI** fisso/variabile/non_costo + attribuzione costi variabili a cliente + **revisione operatore** (coda "Revisione AI" ordinata per banda di confidenza peggiore + importo decrescente).
- **Schermata primo margine per cliente** (ricavi − costi variabili attribuiti; perdenti in alto/rosso) + **AHA**.
- **Cancello morbido** (mostra l'insight solo per clienti ad alta confidenza + QA umano sulle voci ad alto impatto) + **spiegabilità minima** non opzionale.
- **Auth + ruoli Supabase** (`operator` CRUD pieno / `owner` sola lettura post-pubblicazione, RLS, multi-tenant `companies`/`memberships`).
- Consegna **concierge**; misura ore/setup e ore/report da subito.

### Growth Features (Post-MVP) — V1 / paid-MVP

- **Cassa prospettica 13 settimane** (reale vs banca) + alert push — *strato di retention*.
- **EBITDA + break-even**.
- **Dashboard di sintesi** (margine %, giorni di cassa, DSO, DPO) — *[ipotesi WTP: inclusa solo se un pilota la chiede/paga; default resta il più sottile = solo margine]*.
- 2–3 **soglie art. 2086** + alert.

### Vision (Future) — V2 / Visione

- Alert art. 2086 completi · PFN · aging/scaduti per fasce · budget vs consuntivo con scostamento · lista completa indici art. 2086.
- **Margine pieno per commessa** (sforamento ore vs preventivo) · **traduzione-in-azione automatica** (rinegozia/molla/alza).
- **Onboarding self-serve** · automazione mappatura matura · QA batch del commercialista · drill-down completo.
- Integrazioni **SdI / open-banking PSD2 / gestionali** · **tier advisory** con rosa CFO · segmento manifatturiero / dati sporchi.
- Il **dato classificato versionato per cliente** diventa il fossato difendibile.

---

## User Journeys

### Journey 1 — Marco (titolare / `owner`) · happy path AHA [MVP]

**Scena.** Marco, titolare di un'agenzia servizi B2B, ~600k ricavi, 8 addetti. Niente controller; commercialista solo adempimenti. "Lavoro tanto, guadagno poco." Saldo banca che mente, margine a bilancio chiuso.
**Salita.** Arriva caldo da referral / CFO frazionale. Il concierge (operator) importa FatturaPA + estratto conto di **un** cliente. L'AI classifica fisso/variabile/non_costo; l'operator valida le voci ad alto impatto.
**Climax.** Marco apre la **schermata margine**: "Rossi Spa", che fattura tanto, è in **rosso** — freelance + trasferte se lo mangiano. AHA *prima* del setup completo.
**Risoluzione.** Rinegozia o molla. Apre il report ogni settimana, "dorme la notte" → cambia ≥1 decisione (North Star).
**Rivela:** vista margine read-only owner · spiegabilità "perché questo numero" · cancello morbido/pubblicazione · auth+ruoli. [MVP — già implementato in v0]

### Journey 2 — Marco · edge case: cancello morbido [MVP]

**Scena.** Setup non ancora validato; alcune voci a **bassa confidenza**.
**Conflitto.** Marco NON vede i numeri sui clienti incerti: il soft gate mostra solo i clienti ad **alta confidenza** + "altri in lavorazione". Niente numero sbagliato esposto (protegge fiducia, R3).
**Recovery.** L'operator completa il QA sulle voci ad alto impatto → `setPublished` → sblocco vista titolare.
**Rivela:** soft gate · banding confidenza (`threshold_high/medium`) · `company.status='pubblicata'` + RLS owner · `computeValidatedRevenueShare`. [MVP — già implementato in v0]

### Journey 3 — L'operativo / concierge (`operator`) · admin/ops [MVP]

**Scena.** In MVP = founder o commercialista che fa il setup (concierge).
**Azione.** Importa file → lancia `classify` → lavora la coda **"Revisione AI"** (ordinata per banda di confidenza peggiore + importo decrescente) → corregge costo↔ricavo (sincronizza `classifications`) → attribuisce costi variabili a cliente → **pubblica**.
**Edge.** 402 crediti AI / 429 rate limit gestiti; mutazioni ottimistiche con rollback + `reportError`/toast.
**Rivela:** pipeline import · edge `classify` (validazione output) · coda revisione · CRUD completo · pubblicazione · error handling. **Misura ore/setup e ore/report.** [MVP — già implementato in v0]

### Journey 4 — Laura (commercialista) + Stefano (CFO frazionale) · canale + QA

**Laura.** Doppio ruolo: **canale** (decine di clienti/studio) + **QA** della classificazione (valida fisso/variabile, firma la fiducia). MVP: valida a mano sui 2 piloti (concierge). Vincolo: con 80 clienti serve QA **batch** a responsabilità delimitata → **[V2]**. Vista multi-azienda → **[V2]**.
**Stefano.** Porta clienti (distribuzione calda) + eroga **tier advisory** → **[V2]** (richiede rosa CFO, non solo lui).
**Rivela:** multi-tenant multi-azienda [V2] · QA batch [V2] · tier advisory [V2] · ruoli/permission. ⚠️ Persona = **ipotesi da validare** (domanda #1: il CFO frazionale serve i servizi o il manifatturiero?).

### Journey 5 — Marco · cassa prospettica 13 settimane [V1]

**Scena.** Fine mese. Marco deve decidere se anticipare un acquisto o trattenere cassa per F24 + stipendi di giugno.
**Salita.** Apre la **vista cassa 13 settimane**: incassi attesi (da fatture) vs uscite previste (fornitori, F24, stipendi), confrontati col saldo banca reale. La curva scende sotto zero alla settimana 8.
**Climax.** Alert push: *"alla settimana 8 ti mancano ~14k — muoviti adesso."*
**Risoluzione.** Rinegozia un termine di pagamento / sposta un acquisto → la curva torna positiva. "Dorme la notte."
**Rivela:** proiezione cassa reale vs banca · alert push · soglia di allerta cassa. [V1] → FR28, FR33.

### Journey 6 — Marco · allerta art. 2086 [V1→V2]

**Scena.** Il titolare ha l'obbligo (art. 2086 c.c.) di rilevare per tempo i segnali di crisi, ma non sa quali guardare.
**Salita.** Il sistema monitora 2–3 soglie collegate al Codice della Crisi (es. cassa negativa prospettica, DSO oltre soglia).
**Climax.** Una soglia viene superata → alert push + spiegazione ("perché è scattata") + **disclaimer**: strumento informativo, non certifica gli assetti né sostituisce amministratore/revisore.
**Risoluzione.** Marco agisce in anticipo e ne parla col commercialista. [V1: 2–3 soglie → V2: set completo indici].
**Rivela:** soglie art. 2086 · alert push · spiegabilità · disclaimer di responsabilità. [V1/V2] → FR32, FR33, FR34.

### Journey Requirements Summary

| Capacità rivelata | Journey | Fase |
|---|---|---|
| Import FatturaPA/CSV/Excel + manuale | 1,3 | MVP (v0) |
| Classificazione AI + validazione output | 1,3 | MVP (v0) |
| Coda revisione operatore (confidenza+importo) | 3 | MVP (v0) |
| Schermata primo margine per cliente + spiegabilità | 1 | MVP (v0) |
| Cancello morbido + pubblicazione + RLS owner/operator | 2 | MVP (v0) |
| Auth + ruoli Supabase | 1,2,3 | MVP (v0) |
| Gestione errori (402/429, rollback ottimistico) | 3 | MVP (v0) |
| Cassa 13 settimane (reale vs banca) + soglia allerta | 5 | V1 |
| Alert push (cassa + soglie) | 5,6 | V1 |
| Soglie art. 2086 + disclaimer responsabilità | 6 | V1→V2 |
| Vista multi-azienda commercialista · QA batch | 4 | V2 |
| Tier advisory (rosa CFO) | 4 | V2 |

---

## Domain-Specific Requirements

### Compliance & Regulatory

- **GDPR** [MVP]: i dati finanziari sono dati personali dell'azienda cliente. Service-role mai lato client, RLS per-azienda, `.env`/`.dev.vars` gitignorati. Minimizzazione + base giuridica (contratto). DPA col cliente; sub-processor (Supabase/Lovable, gateway AI) mappati.
- **FatturaPA / SdI** [MVP import passivo · V2 integrazione attiva]: formato XML FatturaPA come input. Nessuna trasmissione a SdI in MVP (solo lettura di file già emessi).
- **Art. 2086 c.c. / Codice della Crisi** [V1 soglie informative → V2 completo]: rilevazione tempestiva dei segnali di crisi. **Disclaimer esplicito**: Lucido è strumento informativo/di supporto, NON certifica l'adeguatezza degli assetti né sostituisce l'organo amministrativo o il revisore.
- **PSD2 / open banking** [V2]: se si attiva l'aggregazione conti serve un AISP/agent licenziato (provider terzo), non in casa.
- **Fuori scope** [tutte le fasi]: PCI-DSS, KYC/AML, money transmission — sistema read-only, nessuna movimentazione/custodia di denaro.

### Technical Constraints

- **Security**: RLS con funzioni `SECURITY DEFINER` (`SET search_path=public`, `REVOKE…PUBLIC`, `GRANT…authenticated`); tre client Supabase distinti (browser anon / service-role server / per-utente JWT); `verify_jwt=true` sull'edge `classify`. [MVP — già in v0]
- **Accuratezza & spiegabilità** (concern core del dominio): output AI validato (whitelist `cost_type`, `client_id` valido, `confidence` clampata); soglia ≥90% pesata per impatto; ogni numero spiegabile. [MVP]
- **Data retention / audit**: storico classificazioni versionato per cliente (è il fossato); tracciare chi valida/pubblica. Audit trail leggero [MVP] → completo [V2].
- **Disponibilità/perf**: batch `classify` da 40; gestione 402/429; non real-time (analisi periodica accettabile).

### Integration Requirements

- **MVP**: import file FatturaPA XML + estratto conto CSV/Excel (`xlsx`); gateway **Lovable AI** (`LOVABLE_API_KEY` auto-provisionata, modello `google/gemini-2.5-flash`, nessuna chiave esterna).
- **V2**: SdI (fatture in automatico) · open-banking PSD2 (estratti conto in automatico) · gestionali → riduce l'onboarding concierge.

### Risk Mitigations (dal premortem)

- **R1 — il margine è la porta, non il fossato**: il fossato è il dato classificato versionato + commercialista nel ciclo. *Mitiga: misura accuratezza pesata + accumula storico.*
- **R2/R7 — done-with-you = collo di bottiglia / "consulenza travestita"**: *Mitiga: soglia esplicita ore/report, traccia margine lordo al netto ore.*
- **R3 — classificazione errata distrugge la fiducia**: *Mitiga: cancello morbido + QA umano voci ad alto impatto + spiegabilità + validazione output AI.*
- **AI hallucination / drift**: *Mitiga: whitelist + clamp confidence + revisione operatore; mai fidarsi ciecamente dell'edge.*
- **Consenso & responsabilità**: consenso del cliente al trattamento dei dati di fatturato; responsabilità del commercialista che valida delimitata ("valida, non certifica"); conservazione sostitutiva delle fatture resta in capo ai sistemi esistenti del cliente (fuori scope Lucido).

---

## Innovation & Novel Patterns

### Detected Innovation Areas

1. **Riclassificazione costi AI per *destinazione* (non per natura)** — core irriducibile + fossato [MVP]. La contabilità registra i costi per natura; nessuno li riclassifica fisso/variabile/non_costo e li attribuisce a cliente/commessa perché finora costava troppo lavoro esperto. L'AI lo rende economico → abilita il primo margine. È l'innovazione, il fossato e il rischio R3 nello stesso punto.
2. **Cancello morbido + human-in-the-loop QA come trust layer su output AI** [MVP] — pattern non banale in dominio finanziario: mostra l'insight solo per voci ad alta confidenza, QA umano sulle voci ad alto impatto, spiegabilità obbligatoria. Trasforma un classificatore probabilistico in un numero su cui un titolare *decide*.
3. **Dato classificato versionato per cliente = fossato accumulativo** [MVP→Visione] — non si ricrea a freddo; abilita la traiettoria self-serve.

### Market Context & Competitive Landscape

- **Sibill / Agicap** (39–129€): forti sulla cassa, **deboli su margine/profittabilità**; Agicap parte sopra 1M. Wedge Lucido = margine, dove sono scoperti.
- **ERP TeamSystem / Zucchetti**: troppo pesanti/cari per la micro.
- **Commercialista / Excel**: guardano indietro, statici.
- **Gap 200k–1M poco presidiato.** Lucido = strato della *decisione* (classificazione AI + traduzione numero→azione + concierge) sopra il dato.

### Validation Approach

- **Accuratezza mappatura ≥90% pesata per impatto** vs ground truth indipendente (commercialista/cliente). [gate]
- **Ore/report in calo dopo 3–5 setup**: prova che l'AI *scala* (se non cala → è consulenza, non innovazione di prodotto).
- **Piloti paganti a prezzo pieno + ≥1 decisione cambiata verificata**: prova che il numero è credibile e azionabile.

### Risk Mitigation

- **MVP wizard-of-oz / concierge-assistito**: l'AI propone, l'umano valida — l'innovazione è de-rischiata da una stampella umana misurata (ore/report).
- **Fallback se accuratezza <90% su voci critiche**: ferma l'onboarding (stop-trigger), aumenta il concierge, riduci l'automazione finché il modello non regge.
- **Difesa anti-commodity**: se Sibill rilascia la marginalità inclusa → il fossato resta il dato versionato + commercialista nel ciclo, non il numero in sé.

---

## SaaS B2B — Specific Requirements

### Project-Type Overview

SaaS B2B multi-tenant, owner-managed. Pagatore = titolare. Consegna **concierge** in MVP (no self-serve). Mobile-first e CLI = **non rilevanti** (skip).

### Technical Architecture Considerations

**Tenant model** [MVP — già implementato in v0]

- Multi-tenant via `companies` + `memberships`. Company corrente = prima `membership` (ordinata per `created_at`). Trigger `handle_new_user` aggancia ogni nuovo utente come `operator` alla prima azienda esistente (seed: Studio Marini S.r.l.).
- MVP: di fatto **una azienda per utente** (concierge). **V2**: vera multi-azienda per il commercialista (vista cross-cliente).

**RBAC matrix** [MVP base in v0 · modello B = V1]

| Azione | `operator` | `owner` |
|---|---|---|
| Import / inserimento | ✅ sempre | ✅ **opzionale (modello B)** |
| Classifica / valida / corregge | ✅ | ❌ |
| Pubblica (`setPublished`) | ✅ | ❌ |
| Vede vista titolare (margine) | ✅ | ✅ **solo se `status='pubblicata'`** |

- **Modello A** [MVP — default v0]: import solo `operator`. Concierge puro, QA forte.
- **Modello B** [opzione configurabile, da validare col pilota; prerequisito **login reale V1**]: l'`owner` può importare/inserire, ma **non** classifica/valida/pubblica e **non** vede margine fino al gate → fiducia protetta.
- Selettore per-azienda (es. flag `owner_can_import`): l'azienda parte in A; passa a B se il titolare è hands-on. Entrambi i percorsi convergono su **classificazione AI → cancello morbido → pubblicazione**. B allarga solo l'ingresso dati, non bypassa il QA.
- RLS con `SECURITY DEFINER` (`is_member`, `has_role_in_company`, `is_company_published`).
- Auth in v0 = **anonima** (`signInAnonymously` in `_authenticated`); esiste `auth.tsx` email/password **non usato**. → **V1**: login reale + inviti per separare `owner`/`operator` su utenti distinti (prerequisito del modello B).

**Subscription tiers** [billing in-app = fuori scope MVP]

- MVP: nessuna fatturazione in-app. Canone ~390€+/mese + setup una tantum, **fatturato fuori prodotto** (concierge). ACV = canone×12 + setup.
- **V1**: pacchetto paid-MVP (margine + cassa 13w + soglie 2086). **V2**: tier **advisory** (CFO-as-a-service, rosa CFO) + eventuale billing self-serve.

**Integration list**

- **MVP** [già implementato in v0]: import FatturaPA XML + estratto conto CSV/Excel (`xlsx`); gateway **Lovable AI** (`google/gemini-2.5-flash`).
- **V2**: SdI · open-banking PSD2 · gestionali.

**Compliance reqs** → vedi *Domain-Specific Requirements* (GDPR, art. 2086/Codice Crisi, RLS/service-role). Fuori scope: PCI/KYC/AML.

### Implementation Considerations

- Store unico Zustand (`useLucidoStore`); mutazioni **ottimistiche con rollback** + `reportError`/toast — replicare per ogni nuova azione.
- Modello UI `Entry` = fusione `transactions` + `classifications` (1:1, solo per `direction='costo'`) via helper in `store.ts`. `amount` sempre positivo; segno in `direction`.
- Vista `margin_by_client` (`security_invoker=true`) allineata a `computeMarginRows`.

---

## Project Scoping & Phased Development

> Complementa *Product Scope* (cosa entra in ogni fase) con la **strategia** di fasaggio, le risorse e i rischi.

### MVP Strategy & Philosophy

- **Approccio MVP**: *problem-solving + revenue MVP* combinati — validare dolore-margine + WTP a basso costo con piloti paganti. **Thin nell'UI, NON nel data layer** (ingestione + classificazione = dove si gioca tutto: fossato + R3).
- **Filosofia**: "il valore prima del cancello" — AHA da fetta sottile *prima* del setup completo.
- **Risorse**: founder + 1 commercialista/CFO nel ciclo (concierge). Stack v0 già a terra (Lovable/Supabase). Niente team grande.

### MVP Feature Set (Phase 1) — già implementato in v0

- **Journeys supportati**: J1 (margine AHA) · J2 (cancello morbido) · J3 (operator/concierge).
- **Must-have**: import FatturaPA/CSV/Excel + manuale · classificazione AI fisso/variabile/non_costo + attribuzione cliente · coda revisione operatore · schermata primo margine + spiegabilità · cancello morbido + QA umano · auth+ruoli · gestione errori (402/429, rollback).
- **Manuale dove serve**: pre-pulizia file (concierge); QA voci ad alto impatto (umano). Misura ore/setup, ore/report.

### Post-MVP Features

- **Phase 2 — V1 / paid-MVP**: cassa prospettica 13 settimane + alert push · EBITDA + break-even · dashboard di sintesi *(condizionale WTP)* · 2–3 soglie art. 2086 · **login reale + modello B (owner-import)**.
- **Phase 3 — V2 / Visione**: art. 2086 completo, PFN, aging/scaduti, budget vs consuntivo · margine per commessa + traduzione-in-azione · self-serve + automazione mappatura + QA batch commercialista · integrazioni SdI/PSD2/gestionali · tier advisory (rosa CFO) · segmento manifatturiero.

### Risk Mitigation Strategy

- **Technical**: rischio = accuratezza classificazione (R3). *Mitiga*: wizard-of-oz/concierge-assistito · soglia ≥90% pesata · validazione output AI · stop-trigger onboarding.
- **Market**: rischio = dolore-margine *latente* (non acuto) nei servizi + canale CFO che potrebbe servire il manifatturiero (domanda #1). *Mitiga*: gate ≥60% Mom Test · valida segmento prima di scalare.
- **Resource**: rischio = done-with-you collo di bottiglia / "consulenza travestita" (R2/R7). *Mitiga*: soglia esplicita ore/report · traccia margine lordo al netto ore; se non scala → ridisegna o ferma. Minimo operativo: founder + 1 nel ciclo.

---

## Functional Requirements

> **Contratto di capacità vincolante.** Ogni feature a valle (UX, architettura, epiche) deve tracciare a un FR. Ciò che non è elencato qui non esisterà finché non viene aggiunto esplicitamente.

### Ingestione & Dati

- **FR1**: L'operator può importare fatture in formato **FatturaPA XML**. [MVP — già in v0]
- **FR2**: L'operator può importare estratti conto in **CSV/Excel**. [MVP — già in v0]
- **FR3**: L'operator può inserire e modificare manualmente le voci. [MVP — già in v0]
- **FR4**: L'owner può importare/inserire voci quando l'azienda abilita il **modello B**. [V1]
- **FR5**: Il sistema rappresenta ogni voce con importo positivo + direzione (ricavo/costo). [MVP — già in v0]

### Classificazione & Attribuzione

- **FR6**: Il sistema classifica automaticamente ogni costo in **fisso/variabile/non_costo** via AI. [MVP — già in v0]
- **FR7**: Il sistema attribuisce i costi variabili a un **cliente**. [MVP — già in v0]
- **FR8**: Il sistema assegna a ogni classificazione un livello di **confidenza**. [MVP — già in v0]
- **FR9**: L'operator rivede, corregge e **valida** le classificazioni in una coda ordinata per confidenza peggiore + importo. [MVP — già in v0]
- **FR10**: Il sistema ri-classifica solo i costi non ancora validati (non sovrascrive le validazioni umane). [MVP — già in v0]
- **FR11**: Il sistema rifiuta output AI non validi (tipo fuori whitelist, cliente inesistente, confidenza fuori range). [MVP — già in v0]
- **FR12**: Il sistema attribuisce i costi a una **commessa**. [V2]

### Cancello Morbido & Fiducia

- **FR13**: Il sistema mostra l'insight di margine solo per i clienti sopra una **soglia di voci validate/alta confidenza**. [MVP — già in v0]
- **FR14**: L'operator effettua **QA umano** sulle voci ad alto impatto prima della pubblicazione. [MVP — già in v0]
- **FR15**: Il sistema fornisce una **spiegazione minima** per ogni numero ("perché questo numero"). [MVP — già in v0]
- **FR16**: L'operator **pubblica** l'azienda per sbloccare la vista titolare. [MVP — già in v0]
- **FR17**: Il sistema impedisce all'owner di vedere dati non pubblicati. [MVP — già in v0]

### Vista Margine & Decisione

- **FR18**: L'owner vede il **primo margine per cliente** (ricavi − costi variabili attribuiti). [MVP — già in v0]
- **FR19**: Il sistema evidenzia i **clienti in perdita** (ordinati per margine crescente). [MVP — già in v0]
- **FR20**: L'owner vede solo i clienti con almeno una voce. [MVP — già in v0]
- **FR21**: L'owner vede il margine pieno per **commessa** (sforamento ore vs preventivo). [V2]
- **FR22**: Il sistema propone un'**azione** collegata al numero (rinegozia/molla/alza). [V2]

### Identità & Ruoli

- **FR23**: Un utente si autentica e opera nel contesto della propria azienda. [MVP — anonima in v0]
- **FR24**: Il sistema distingue i ruoli **operator** (CRUD) e **owner** (lettura post-pubblicazione). [MVP — già in v0]
- **FR25**: Il sistema isola i dati per azienda (multi-tenant). [MVP — già in v0]
- **FR26**: Un utente si autentica con credenziali reali (email/password) e invita altri utenti. [V1]
- **FR27**: Un commercialista accede a **più aziende** da un'unica vista. [V2]

### Cassa & Salute Finanziaria

- **FR28**: L'owner vede la **proiezione di cassa a 13 settimane** (reale vs saldo banca). [V1]
- **FR29**: L'owner vede **EBITDA** e **break-even**. [V1]
- **FR30**: L'owner vede una **dashboard di KPI** (margine %, giorni di cassa, DSO, DPO). [V1 — condizionale WTP]
- **FR31**: L'owner vede **PFN, aging/scaduti per fasce, budget vs consuntivo** con scostamento. [V2]

### Allerta & Compliance

- **FR32**: Il sistema segnala il superamento di **2–3 soglie art. 2086**. [V1]
- **FR33**: L'owner riceve **alert push** su eventi rilevanti (cassa, soglie). [V1]
- **FR34**: Il sistema calcola la lista **completa** degli indici art. 2086. [V2]
- **FR35**: Il sistema registra un **audit trail** di chi valida/pubblica. [V1→V2]

### Misurazione & Consegna

- **FR36**: Il sistema traccia **ore/setup e ore/report** per azienda. [MVP]
- **FR37**: Il commercialista valida in **batch** le classificazioni multi-cliente. [V2]

### Integrazioni & Espansione

- **FR38**: Il sistema importa fatture automaticamente via **SdI**. [V2]
- **FR39**: Il sistema importa movimenti bancari via **open-banking PSD2**. [V2]
- **FR40**: Il sistema guida un **onboarding self-serve** con mappatura automatica. [V2]
- **FR41**: Un CFO eroga un **tier advisory** ai propri clienti. [V2]

---

## Non-Functional Requirements

> Solo le categorie che contano per Lucido. L'attributo di qualità #1 è l'accuratezza/affidabilità del dato — il prodotto vive o muore su quella.
>
> **Nota di handoff:** ogni NFR esprime *capacità + metrica*. I riferimenti tra parentesi `(v0: …)` indicano il **meccanismo attuale** del prototipo e vanno formalizzati nel documento di architettura, non sono vincoli di prodotto.

### Accuratezza & Affidabilità del dato *(attributo di qualità #1)*

- **NFR1**: Accuratezza classificazione **≥90% pesata per impatto** sulle voci ad alto impatto (vs ground truth indipendente). [MVP — gate]
- **NFR2**: Ogni numero mostrato all'owner è **spiegabile** (origine + voci che lo compongono). [MVP]
- **NFR3**: Nessun insight mostrato sotto la soglia di confidenza/validazione (cancello morbido). [MVP]
- **NFR4**: Output AI sempre validato a dominio (whitelist tipo, cliente valido, confidenza ∈ [0,1]); **0 voci fuori vincolo** persistite. [MVP]
- **NFR5**: Le validazioni umane non vengono **mai sovrascritte** da ri-classificazioni automatiche. [MVP]
- **NFR6**: Integrità: `amount` sempre ≥0; `classifications` coerenti con `direction` (esiste sse costo). [MVP]

### Security & Privacy

- **NFR7**: Un membro accede **solo** ai dati della propria azienda; l'isolamento è enforced a livello dati, non solo applicativo. *(v0: RLS Supabase)* [MVP]
- **NFR8**: Le credenziali con privilegi elevati non sono **mai** raggiungibili dal client; i segreti non finiscono nel repo. *(v0: service-role key server-only, `.env` gitignorati)* [MVP]
- **NFR9**: Dati finanziari trattati secondo **GDPR** (base giuridica, minimizzazione, DPA, sub-processor mappati). [MVP→V1]
- **NFR10**: Le funzioni server di classificazione accettano solo richieste autenticate e verificano l'appartenenza all'azienda. *(v0: edge `verify_jwt=true` + verifica membership)* [MVP]
- **NFR11**: Audit trail di validazioni/pubblicazioni conservato. [V1]

### Performance

- **NFR12**: Il setup di un cliente tipico completa l'elaborazione AI in **< ~30 min** *(proposta, da confermare)*. *(v0: classificazione in batch ≥40 voci/chiamata)* [MVP]
- **NFR13**: La vista margine si carica in **<3s** su dataset di un cliente tipico (centinaia di voci). [MVP]
- **NFR14**: Sistema **non real-time** per design (analisi periodica accettabile); nessun SLA sub-secondo. [MVP]
- **NFR15**: Degradazione gestita sui limiti AI (402 crediti / 429 rate limit) con feedback all'utente, **senza perdita dati**. [MVP]

### Integration

- **NFR16**: Import **tollerante**: file malformati segnalati, non bloccano l'intero batch; pre-pulizia concierge per i casi non standard. [MVP]
- **NFR17**: La dipendenza dal provider AI è isolata in **un solo punto**; il cambio di modello/provider non tocca il resto del sistema. *(v0: gateway Lovable AI, nessuna chiave esterna)* [MVP]
- **NFR18**: Integrazioni V2 (SdI/PSD2/gestionali) via provider terzi licenziati, isolate dietro adapter. [V2]

### Operatività & Vincoli di sviluppo

- **NFR19**: Branch sempre in **stato funzionante** (sync Lovable); niente force-push/rebase/amend di history pushata. [MVP]
- **NFR20**: **Supply-chain guard**: pacchetti pubblicati <24h saltati salvo eccezione approvata. [MVP]
- **NFR21**: UI/messaggi in **italiano**; formattazione numerica/data **it-IT centralizzata** (un solo punto, non ad-hoc nei componenti). *(v0: `format.ts`)* [MVP]

### Non rilevanti in MVP/V1 *(annotate, non specificate)*

- **Scalabilità di massa**: no — concierge, ~10–20 clienti in V1; rivedere a self-serve (V2).
- **Accessibilità WCAG formale**: nessun obbligo legale (B2B nicchia); leggibilità di base sì.
