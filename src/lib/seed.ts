// Dati seed iniziali in italiano: clienti realistici + voci ricavo/costo.
// Servono come stato di partenza e come "Ripristina dati di esempio".

import type { Client, Entry } from "./types";

export const SEED_COMPANY = {
  name: "Studio Marini S.r.l.",
  periodLabel: "Gennaio – Maggio 2026",
  publishedAt: "2026-06-18",
};

export const SEED_CLIENTS: Client[] = [
  { id: "c-rossi", name: "Studio Rossi & Partners", kind: "cliente" },
  { id: "c-bianchi", name: "Bianchi Eventi", kind: "cliente" },
  { id: "c-prato", name: "Comune di Prato", kind: "commessa" },
  { id: "c-acme", name: "Acme S.r.l.", kind: "cliente" },
  { id: "c-technova", name: "TechNova S.r.l.", kind: "cliente" },
  { id: "c-faro", name: "Faro Logistica S.r.l.", kind: "cliente" },
  { id: "c-velasca", name: "Velasca Retail", kind: "cliente" },
];

// Costi fissi non ripartiti (struttura): non attribuiti a clienti.
const FIXED_COSTS: Entry[] = [
  { id: "fx-1", date: "2026-01-05", description: "Affitto studio (gen-mag)", counterparty: "Immobiliare Centro", amount: 12500, direction: "costo", costType: "fisso", source: "banca", confidence: "alta", status: "validato", validatedBy: "Operatore" },
  { id: "fx-2", date: "2026-01-15", description: "Stipendi staff interno", counterparty: "Cedolini interni", amount: 48000, direction: "costo", costType: "fisso", source: "banca", confidence: "alta", status: "validato", validatedBy: "Operatore" },
  { id: "fx-3", date: "2026-02-10", description: "Software gestionale annuale", counterparty: "Notion / GSuite", amount: 3200, direction: "costo", costType: "fisso", source: "fattura", confidence: "alta", status: "validato", validatedBy: "Operatore" },
];

export const SEED_ENTRIES: Entry[] = [
  // --- Studio Rossi & Partners (in perdita) ---
  { id: "e-rossi-r1", date: "2026-03-31", description: "Consulenza Q1", counterparty: "Studio Rossi & Partners", amount: 22000, direction: "ricavo", clientId: "c-rossi", source: "fattura", confidence: "alta", status: "validato", invoiceNumber: "2026/014", validatedBy: "Operatore" },
  { id: "e-rossi-r2", date: "2026-05-15", description: "Consulenza Q2 parziale", counterparty: "Studio Rossi & Partners", amount: 20000, direction: "ricavo", clientId: "c-rossi", source: "fattura", confidence: "alta", status: "validato", invoiceNumber: "2026/041", validatedBy: "Operatore" },
  { id: "e-rossi-c1", date: "2026-04-10", description: "Freelance sviluppo - Bianchi", counterparty: "Bianchi P.IVA", amount: 28000, direction: "costo", costType: "variabile", clientId: "c-rossi", source: "fattura", confidence: "alta", status: "validato", validatedBy: "Operatore" },
  { id: "e-rossi-c2", date: "2026-04-20", description: "Trasferte Milano (4)", counterparty: "Trenitalia / Hotel", amount: 3800, direction: "costo", costType: "variabile", clientId: "c-rossi", source: "banca", confidence: "alta", status: "validato", validatedBy: "Operatore" },
  { id: "e-rossi-c3", date: "2026-04-22", description: "Subfornitura grafica", counterparty: "Studio Vega", amount: 12000, direction: "costo", costType: "variabile", clientId: "c-rossi", source: "fattura", confidence: "alta", status: "validato", validatedBy: "AI" },
  { id: "e-rossi-c4", date: "2026-05-02", description: "Licenze software dedicate", counterparty: "Atlassian", amount: 8000, direction: "costo", costType: "variabile", clientId: "c-rossi", source: "banca", confidence: "alta", status: "validato", validatedBy: "Operatore" },

  // --- Bianchi Eventi (in perdita) ---
  { id: "e-bianchi-r1", date: "2026-04-20", description: "Progetto rebranding evento", counterparty: "Bianchi Eventi", amount: 18500, direction: "ricavo", clientId: "c-bianchi", source: "fattura", confidence: "alta", status: "validato", invoiceNumber: "2026/028", validatedBy: "Operatore" },
  { id: "e-bianchi-c1", date: "2026-04-12", description: "Freelance design - Conti", counterparty: "Conti P.IVA", amount: 14000, direction: "costo", costType: "variabile", clientId: "c-bianchi", source: "fattura", confidence: "alta", status: "validato", validatedBy: "Operatore" },
  { id: "e-bianchi-c2", date: "2026-04-15", description: "Stampa cataloghi", counterparty: "Tipografia Sole", amount: 5200, direction: "costo", costType: "variabile", clientId: "c-bianchi", source: "fattura", confidence: "alta", status: "validato", validatedBy: "Operatore" },
  { id: "e-bianchi-c3", date: "2026-04-18", description: "Spedizioni campioni", counterparty: "BRT", amount: 2000, direction: "costo", costType: "variabile", clientId: "c-bianchi", source: "banca", confidence: "media", status: "validato", validatedBy: "AI" },

  // --- Comune di Prato (attivo) ---
  { id: "e-prato-r1", date: "2026-02-28", description: "SAL 1 – analisi", counterparty: "Comune di Prato", amount: 12000, direction: "ricavo", clientId: "c-prato", source: "fattura", confidence: "alta", status: "validato", invoiceNumber: "2026/009", validatedBy: "Operatore" },
  { id: "e-prato-r2", date: "2026-04-30", description: "SAL 2 – esecuzione", counterparty: "Comune di Prato", amount: 19000, direction: "ricavo", clientId: "c-prato", source: "fattura", confidence: "alta", status: "validato", invoiceNumber: "2026/033", validatedBy: "Operatore" },
  { id: "e-prato-c1", date: "2026-03-10", description: "Freelance ricerca - Greco", counterparty: "Greco P.IVA", amount: 9500, direction: "costo", costType: "variabile", clientId: "c-prato", source: "fattura", confidence: "alta", status: "validato", validatedBy: "Operatore" },
  { id: "e-prato-c2", date: "2026-03-20", description: "Materiali e cancelleria", counterparty: "Buffetti", amount: 1200, direction: "costo", costType: "variabile", clientId: "c-prato", source: "banca", confidence: "alta", status: "validato", validatedBy: "AI" },
  { id: "e-prato-c3", date: "2026-04-05", description: "Trasferte sopralluogo", counterparty: "Vari", amount: 3800, direction: "costo", costType: "variabile", clientId: "c-prato", source: "banca", confidence: "alta", status: "validato", validatedBy: "Operatore" },

  // --- Acme S.r.l. (attivo forte) ---
  { id: "e-acme-r1", date: "2026-05-31", description: "Retainer mensile (5 mesi)", counterparty: "Acme S.r.l.", amount: 50000, direction: "ricavo", clientId: "c-acme", source: "fattura", confidence: "alta", status: "validato", invoiceNumber: "2026/002→/045", validatedBy: "Operatore" },
  { id: "e-acme-r2", date: "2026-04-12", description: "Workshop straordinario", counterparty: "Acme S.r.l.", amount: 14000, direction: "ricavo", clientId: "c-acme", source: "fattura", confidence: "alta", status: "validato", invoiceNumber: "2026/036", validatedBy: "Operatore" },
  { id: "e-acme-c1", date: "2026-03-15", description: "Senior consultant - Marchi", counterparty: "Marchi P.IVA", amount: 22000, direction: "costo", costType: "variabile", clientId: "c-acme", source: "fattura", confidence: "alta", status: "validato", validatedBy: "Operatore" },
  { id: "e-acme-c2", date: "2026-04-10", description: "Sala workshop", counterparty: "Talent Garden", amount: 3500, direction: "costo", costType: "variabile", clientId: "c-acme", source: "fattura", confidence: "alta", status: "validato", validatedBy: "AI" },
  { id: "e-acme-c3", date: "2026-04-12", description: "Catering workshop", counterparty: "Vari", amount: 2500, direction: "costo", costType: "variabile", clientId: "c-acme", source: "banca", confidence: "alta", status: "validato", validatedBy: "Operatore" },

  // --- TechNova (attivo piccolo) ---
  { id: "e-tn-r1", date: "2026-03-14", description: "Audit dati e-commerce", counterparty: "TechNova S.r.l.", amount: 9800, direction: "ricavo", clientId: "c-technova", source: "fattura", confidence: "alta", status: "validato", invoiceNumber: "2026/019", validatedBy: "Operatore" },
  { id: "e-tn-c1", date: "2026-03-01", description: "Tool analytics dedicato", counterparty: "Hotjar", amount: 1200, direction: "costo", costType: "variabile", clientId: "c-technova", source: "banca", confidence: "alta", status: "validato", validatedBy: "AI" },
  { id: "e-tn-c2", date: "2026-03-10", description: "Freelance data - Neri", counterparty: "Neri P.IVA", amount: 3000, direction: "costo", costType: "variabile", clientId: "c-technova", source: "fattura", confidence: "alta", status: "validato", validatedBy: "Operatore" },

  // --- Faro Logistica (da validare) ---
  { id: "e-faro-r1", date: "2026-04-02", description: "Progetto pilota WMS", counterparty: "Faro Logistica S.r.l.", amount: 12000, direction: "ricavo", clientId: "c-faro", source: "fattura", confidence: "alta", status: "da_validare", invoiceNumber: "2026/022", validatedBy: "AI" },
  { id: "e-faro-c1", date: "2026-04-08", description: "Freelance integrazione - Russo", counterparty: "Russo P.IVA", amount: 9000, direction: "costo", costType: "variabile", clientId: "c-faro", source: "fattura", confidence: "media", status: "da_validare", validatedBy: "AI" },
  { id: "e-faro-c2", date: "2026-04-15", description: "Server staging", counterparty: "Hetzner", amount: 1600, direction: "costo", costType: "variabile", clientId: "c-faro", source: "banca", confidence: "bassa", status: "da_validare", validatedBy: "AI" },
  { id: "e-faro-c3", date: "2026-04-20", description: "Trasferte Bologna", counterparty: "Trenitalia", amount: 2000, direction: "costo", costType: "variabile", clientId: "c-faro", source: "banca", confidence: "alta", status: "validato", validatedBy: "Operatore" },

  // --- Velasca Retail (da validare) ---
  { id: "e-vel-r1", date: "2026-05-08", description: "Consulenza vetrine Q2", counterparty: "Velasca Retail", amount: 16400, direction: "ricavo", clientId: "c-velasca", source: "fattura", confidence: "alta", status: "da_validare", invoiceNumber: "2026/038", validatedBy: "AI" },
  { id: "e-vel-c1", date: "2026-05-02", description: "Freelance visual - Esposito", counterparty: "Esposito P.IVA", amount: 7800, direction: "costo", costType: "variabile", clientId: "c-velasca", source: "fattura", confidence: "bassa", status: "da_validare", validatedBy: "AI" },
  { id: "e-vel-c2", date: "2026-05-04", description: "Materiali allestimento", counterparty: "Vari", amount: 2500, direction: "costo", costType: "variabile", clientId: "c-velasca", source: "banca", confidence: "media", status: "da_validare", validatedBy: "AI" },
  { id: "e-vel-c3", date: "2026-05-06", description: "Trasferte Milano (2)", counterparty: "Trenitalia", amount: 1500, direction: "costo", costType: "variabile", clientId: "c-velasca", source: "banca", confidence: "alta", status: "validato", validatedBy: "Operatore" },

  ...FIXED_COSTS,
];
