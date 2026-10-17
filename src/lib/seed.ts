// Dati di esempio: una piccola società di consulenza e servizi digitali, gennaio–settembre 2026.
// Sono inventati ma verosimili. Servono come stato iniziale e per "Ripristina dati di esempio".

import type { Client, CostType, Entry, EntrySource } from "./types";

export const SEED_COMPANY = {
  name: "Studio Marini S.r.l.",
  vatNumber: "01234567890",
  sector: "Consulenza e servizi digitali",
  periodLabel: "Gennaio – Settembre 2026",
  publishedAt: "2026-10-05",
};

export const SEED_THRESHOLDS = {
  high: 0.85,
  medium: 0.6,
};

export const SEED_CLIENTS: Client[] = [
  { id: "c-acme", name: "Acme S.r.l.", kind: "cliente" },
  { id: "c-rossi", name: "Studio Rossi & Partners", kind: "cliente" },
  { id: "c-prato", name: "Comune di Prato — Portale servizi", kind: "commessa" },
  { id: "c-bianchi", name: "Bianchi Eventi", kind: "cliente" },
  { id: "c-technova", name: "TechNova S.r.l.", kind: "cliente" },
  { id: "c-faro", name: "Faro Logistica S.r.l.", kind: "cliente" },
  { id: "c-velasca", name: "Velasca Retail", kind: "cliente" },
  { id: "c-bassi", name: "Ortofrutta Bassi — E-commerce", kind: "commessa" },
];

const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09"];
const MONTH_NAMES = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set"];

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${String(++seq).padStart(3, "0")}`;

type Validation = Pick<Entry, "confidence" | "status" | "validatedBy">;
const VALIDATED: Validation = { confidence: "alta", status: "validato", validatedBy: "Operatore" };
const VALIDATED_AI: Validation = { confidence: "alta", status: "validato", validatedBy: "AI" };

function revenue(
  clientId: string,
  date: string,
  description: string,
  counterparty: string,
  amount: number,
  v: Validation = VALIDATED,
): Entry {
  return { id: nextId("r"), date, description, counterparty, amount, direction: "ricavo", clientId, source: "fattura", ...v };
}

function cost(
  date: string,
  description: string,
  counterparty: string,
  amount: number,
  costType: CostType | undefined,
  clientId: string | undefined,
  source: EntrySource,
  v: Validation = VALIDATED,
  rationale?: string,
): Entry {
  return { id: nextId("c"), date, description, counterparty, amount, direction: "costo", costType, clientId, source, rationale, ...v };
}

// Costi di struttura e movimenti non economici, mese per mese.
function structure(): Entry[] {
  const out: Entry[] = [];
  MONTHS.forEach((m, i) => {
    const label = MONTH_NAMES[i];
    out.push(
      cost(`2026-${m}-05`, `Affitto ufficio (${label})`, "Immobiliare Centro S.r.l.", 2400, "fisso", undefined, "banca"),
      cost(`2026-${m}-27`, `Stipendi personale interno (${label})`, "Cedolini dipendenti", 9800, "fisso", undefined, "banca"),
      cost(`2026-${m}-16`, `Contributi e ritenute F24 (${label})`, "Agenzia delle Entrate", 3100, "fisso", undefined, "banca"),
      cost(`2026-${m}-02`, `Software e cloud (${label})`, "Google Workspace / Notion", 520, "fisso", undefined, "fattura", VALIDATED_AI),
      cost(`2026-${m}-20`, `Energia e connettività (${label})`, "Enel Energia / TIM", 310, "fisso", undefined, "fattura", VALIDATED_AI),
      cost(`2026-${m}-10`, `Rata finanziamento (${label})`, "Banca Intesa", 1200, "non_costo", undefined, "banca"),
    );
  });
  out.push(
    cost("2026-01-15", "Assicurazione RC professionale", "Generali Italia", 1800, "fisso", undefined, "fattura"),
    cost("2026-03-31", "Commercialista (1° trimestre)", "Studio Fabbri Commercialisti", 650, "fisso", undefined, "fattura"),
    cost("2026-06-30", "Commercialista (2° trimestre)", "Studio Fabbri Commercialisti", 650, "fisso", undefined, "fattura"),
    cost("2026-09-30", "Commercialista (3° trimestre)", "Studio Fabbri Commercialisti", 650, "fisso", undefined, "fattura"),
    cost("2026-05-16", "Versamento IVA 1° trimestre", "Agenzia delle Entrate", 6400, "non_costo", undefined, "banca"),
    cost("2026-08-20", "Versamento IVA 2° trimestre", "Agenzia delle Entrate", 5900, "non_costo", undefined, "banca"),
  );
  return out;
}

// Clienti e commesse: ognuno racconta una situazione diversa.
function clients(): Entry[] {
  const out: Entry[] = [];

  // Acme: retainer mensile, cliente più redditizio.
  MONTHS.forEach((m, i) => {
    out.push(revenue("c-acme", `2026-${m}-28`, `Retainer consulenza (${MONTH_NAMES[i]})`, "Acme S.r.l.", 10000));
    out.push(cost(`2026-${m}-28`, `Senior consultant dedicato (${MONTH_NAMES[i]})`, "Marchi Paolo P.IVA", 4200, "variabile", "c-acme", "fattura"));
  });
  out.push(
    revenue("c-acme", "2026-04-12", "Workshop straordinario direzione", "Acme S.r.l.", 14000),
    cost("2026-04-10", "Sala per workshop", "Talent Garden Milano", 3500, "variabile", "c-acme", "fattura", VALIDATED_AI),
    cost("2026-04-12", "Catering workshop", "Bon Bistrot", 1300, "variabile", "c-acme", "banca"),
  );

  // Studio Rossi: progetto a corpo sottostimato, in perdita.
  out.push(
    revenue("c-rossi", "2026-03-31", "Progetto gestionale — SAL 1", "Studio Rossi & Partners", 22000),
    revenue("c-rossi", "2026-06-15", "Progetto gestionale — SAL 2", "Studio Rossi & Partners", 20000),
    cost("2026-03-10", "Sviluppo backend a progetto", "Ferri Luca P.IVA", 16000, "variabile", "c-rossi", "fattura"),
    cost("2026-05-10", "Sviluppo backend — extra non previsti", "Ferri Luca P.IVA", 12000, "variabile", "c-rossi", "fattura"),
    cost("2026-04-22", "Subfornitura UX e grafica", "Studio Vega", 12000, "variabile", "c-rossi", "fattura", VALIDATED_AI),
    cost("2026-04-20", "Trasferte Milano (4 giornate)", "Trenitalia / Hotel Berna", 3800, "variabile", "c-rossi", "banca"),
    cost("2026-05-02", "Licenze software dedicate al progetto", "Atlassian", 4000, "variabile", "c-rossi", "banca"),
  );

  // Comune di Prato: commessa pubblica a stati di avanzamento.
  out.push(
    revenue("c-prato", "2026-03-31", "SAL 1 — analisi e progettazione", "Comune di Prato", 12000),
    revenue("c-prato", "2026-06-30", "SAL 2 — sviluppo", "Comune di Prato", 19000),
    revenue("c-prato", "2026-09-30", "SAL 3 — collaudo e formazione", "Comune di Prato", 15000),
    cost("2026-03-10", "Ricerca utenti e interviste", "Greco Sara P.IVA", 9500, "variabile", "c-prato", "fattura"),
    cost("2026-06-12", "Sviluppo front-end", "Greco Sara P.IVA", 8000, "variabile", "c-prato", "fattura"),
    cost("2026-04-05", "Trasferte per sopralluoghi", "Vari", 1900, "variabile", "c-prato", "banca"),
    cost("2026-09-15", "Materiali per formazione", "Buffetti", 1200, "variabile", "c-prato", "banca", VALIDATED_AI),
  );

  // Bianchi Eventi: tanti costi esterni, margine negativo.
  out.push(
    revenue("c-bianchi", "2026-04-20", "Rebranding evento primaverile", "Bianchi Eventi", 18500),
    revenue("c-bianchi", "2026-07-18", "Allestimento evento estivo", "Bianchi Eventi", 9000),
    cost("2026-04-12", "Design identità visiva", "Conti Elena P.IVA", 14000, "variabile", "c-bianchi", "fattura"),
    cost("2026-04-15", "Stampa cataloghi", "Tipografia Sole", 5200, "variabile", "c-bianchi", "fattura"),
    cost("2026-04-18", "Spedizioni campioni", "BRT", 2000, "variabile", "c-bianchi", "banca", VALIDATED_AI),
    cost("2026-07-10", "Noleggio strutture allestimento", "Eventi Service S.r.l.", 7800, "variabile", "c-bianchi", "fattura"),
  );

  // TechNova: audit e poi canone di manutenzione, margine alto.
  out.push(
    revenue("c-technova", "2026-03-14", "Audit dati e-commerce", "TechNova S.r.l.", 9800),
    cost("2026-03-10", "Analisi dati a progetto", "Neri Marco P.IVA", 3000, "variabile", "c-technova", "fattura"),
  );
  MONTHS.slice(4).forEach((m, i) => {
    out.push(revenue("c-technova", `2026-${m}-30`, `Canone manutenzione (${MONTH_NAMES[i + 4]})`, "TechNova S.r.l.", 1500));
    out.push(cost(`2026-${m}-03`, `Tool di analytics dedicato (${MONTH_NAMES[i + 4]})`, "Hotjar", 150, "variabile", "c-technova", "banca", VALIDATED_AI));
  });

  // Faro Logistica: nuovo cliente, voci ancora da validare.
  out.push(
    revenue("c-faro", "2026-04-02", "Progetto pilota WMS", "Faro Logistica S.r.l.", 12000, { confidence: "alta", status: "da_validare", validatedBy: "AI" }),
    revenue("c-faro", "2026-08-28", "WMS — fase 2", "Faro Logistica S.r.l.", 18000, { confidence: "alta", status: "da_validare", validatedBy: "AI" }),
    cost("2026-04-08", "Integrazione gestionale", "Russo Andrea P.IVA", 9000, "variabile", "c-faro", "fattura",
      { confidence: "media", status: "da_validare", validatedBy: "AI" }, "Fornitore freelance fatturato nello stesso periodo del progetto WMS."),
    cost("2026-04-15", "Server di staging", "Hetzner Online", 1600, "variabile", "c-faro", "banca",
      { confidence: "bassa", status: "da_validare", validatedBy: "AI" }, "Hosting: potrebbe essere infrastruttura comune e non del solo progetto Faro."),
    cost("2026-08-20", "Consulenza processi di magazzino", "Lodi Giulia P.IVA", 6500, "variabile", "c-faro", "fattura",
      { confidence: "media", status: "da_validare", validatedBy: "AI" }, "La descrizione richiama il magazzino, tema del progetto WMS."),
  );

  // Velasca: ricavi da confermare e costi incerti.
  out.push(
    revenue("c-velasca", "2026-05-08", "Consulenza vetrine e visual merchandising", "Velasca Retail", 16400, { confidence: "alta", status: "da_validare", validatedBy: "AI" }),
    revenue("c-velasca", "2026-09-12", "Restyling punto vendita Torino", "Velasca Retail", 8200),
    cost("2026-05-02", "Visual design", "Esposito Marta P.IVA", 7800, "variabile", "c-velasca", "fattura",
      { confidence: "bassa", status: "da_validare", validatedBy: "AI" }, "Fornitore usato anche per Bianchi Eventi: attribuzione da confermare."),
    cost("2026-05-04", "Materiali allestimento", "Vari", 2500, "variabile", "c-velasca", "banca",
      { confidence: "media", status: "da_validare", validatedBy: "AI" }, "Acquisto in contanti vicino alla data della consulenza Velasca."),
    cost("2026-09-06", "Trasferta Torino", "Trenitalia", 640, "variabile", "c-velasca", "banca"),
  );

  // Ortofrutta Bassi: piccolo e-commerce venduto sottocosto.
  out.push(
    revenue("c-bassi", "2026-07-31", "Sito e-commerce chiavi in mano", "Ortofrutta Bassi S.n.c.", 6000),
    cost("2026-07-15", "Sviluppo tema e integrazione pagamenti", "Costa Davide P.IVA", 6800, "variabile", "c-bassi", "fattura"),
  );

  // Costi arrivati dalla banca senza classificazione: materiale per la Revisione AI.
  const pending: Validation = { confidence: "bassa", status: "da_validare", validatedBy: undefined };
  out.push(
    cost("2026-09-03", "Amazon Business — cancelleria e toner", "Amazon EU S.a.r.l.", 340, undefined, undefined, "banca", pending),
    cost("2026-09-09", "Fiverr — illustrazioni per volantino", "Fiverr International", 450, undefined, undefined, "banca", pending),
    cost("2026-09-11", "Aruba — dominio e hosting annuale", "Aruba S.p.A.", 180, undefined, undefined, "banca", pending),
    cost("2026-09-12", "Pranzo di lavoro", "Ristorante Da Gino", 95, undefined, undefined, "banca", pending),
    cost("2026-09-18", "Volo Milano–Torino", "ITA Airways", 210, undefined, undefined, "banca", pending),
  );

  return out;
}

function withInvoiceNumbers(entries: Entry[]): Entry[] {
  const revenues = entries
    .filter((e) => e.direction === "ricavo")
    .sort((a, b) => a.date.localeCompare(b.date));
  const numbers = new Map(revenues.map((e, i) => [e.id, `2026/${String(i + 1).padStart(3, "0")}`]));
  return entries.map((e) => (numbers.has(e.id) ? { ...e, invoiceNumber: numbers.get(e.id) } : e));
}

export const SEED_ENTRIES: Entry[] = withInvoiceNumbers([...structure(), ...clients()]).sort((a, b) =>
  b.date.localeCompare(a.date),
);
