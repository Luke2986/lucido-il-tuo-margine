// Mock data per la dashboard margine (vista titolare).
// In v0 il calcolo è: primo margine = ricavo - costi variabili attribuiti.

export type ConfidenceBand = "alta" | "media" | "bassa";
export type ValidationStatus = "validata" | "da_validare";

export interface CostLine {
  description: string;
  counterparty: string;
  source: "fattura" | "banca";
  amount: number;
  confidence: ConfidenceBand;
  validatedBy: "AI" | "Operatore";
}

export interface RevenueLine {
  description: string;
  invoiceNumber: string;
  date: string; // ISO
  amount: number;
}

export interface ClientMargin {
  id: string;
  name: string;
  kind: "cliente" | "commessa";
  revenue: number;
  variableCosts: number;
  status: ValidationStatus;
  revenues: RevenueLine[];
  costs: CostLine[];
}

export interface CompanyReport {
  companyName: string;
  periodLabel: string;
  publishedAt: string;
  clients: ClientMargin[];
  // copertura: quota di ricavo coperta da voci validate/alta confidenza
  validatedRevenueShare: number;
}

export const mockReport: CompanyReport = {
  companyName: "Studio Marini S.r.l.",
  periodLabel: "Gennaio – Maggio 2026",
  publishedAt: "2026-06-18",
  validatedRevenueShare: 0.87,
  clients: [
    {
      id: "c-rossi",
      name: "Rossi Industriale",
      kind: "cliente",
      revenue: 42000,
      variableCosts: 51800,
      status: "validata",
      revenues: [
        { description: "Consulenza Q1", invoiceNumber: "2026/014", date: "2026-03-31", amount: 22000 },
        { description: "Consulenza Q2 parziale", invoiceNumber: "2026/041", date: "2026-05-15", amount: 20000 },
      ],
      costs: [
        { description: "Freelance sviluppo - Bianchi", counterparty: "Bianchi P.IVA", source: "fattura", amount: 28000, confidence: "alta", validatedBy: "Operatore" },
        { description: "Trasferte Milano (4)", counterparty: "Trenitalia / Hotel", source: "banca", amount: 3800, confidence: "alta", validatedBy: "Operatore" },
        { description: "Subfornitura grafica", counterparty: "Studio Vega", source: "fattura", amount: 12000, confidence: "alta", validatedBy: "AI" },
        { description: "Licenze software dedicate", counterparty: "Atlassian", source: "banca", amount: 8000, confidence: "alta", validatedBy: "Operatore" },
      ],
    },
    {
      id: "c-meridiana",
      name: "Meridiana Group",
      kind: "cliente",
      revenue: 18500,
      variableCosts: 21200,
      status: "da_validare",
      revenues: [
        { description: "Progetto rebranding", invoiceNumber: "2026/028", date: "2026-04-20", amount: 18500 },
      ],
      costs: [
        { description: "Freelance design - Conti", counterparty: "Conti P.IVA", source: "fattura", amount: 14000, confidence: "media", validatedBy: "AI" },
        { description: "Stampa cataloghi", counterparty: "Tipografia Sole", source: "fattura", amount: 5200, confidence: "alta", validatedBy: "Operatore" },
        { description: "Spedizioni campioni", counterparty: "BRT", source: "banca", amount: 2000, confidence: "bassa", validatedBy: "AI" },
      ],
    },
    {
      id: "c-aurora",
      name: "Commessa Aurora – Comune di Pisa",
      kind: "commessa",
      revenue: 31000,
      variableCosts: 14500,
      status: "validata",
      revenues: [
        { description: "SAL 1 – analisi", invoiceNumber: "2026/009", date: "2026-02-28", amount: 12000 },
        { description: "SAL 2 – esecuzione", invoiceNumber: "2026/033", date: "2026-04-30", amount: 19000 },
      ],
      costs: [
        { description: "Freelance ricerca - Greco", counterparty: "Greco P.IVA", source: "fattura", amount: 9500, confidence: "alta", validatedBy: "Operatore" },
        { description: "Materiali e cancelleria", counterparty: "Buffetti", source: "banca", amount: 1200, confidence: "alta", validatedBy: "AI" },
        { description: "Trasferte sopralluogo", counterparty: "Vari", source: "banca", amount: 3800, confidence: "alta", validatedBy: "Operatore" },
      ],
    },
    {
      id: "c-orsa",
      name: "Orsa Maggiore S.p.A.",
      kind: "cliente",
      revenue: 64000,
      variableCosts: 28000,
      status: "validata",
      revenues: [
        { description: "Retainer mensile (5 mesi)", invoiceNumber: "2026/002→/045", date: "2026-05-31", amount: 50000 },
        { description: "Extra workshop", invoiceNumber: "2026/036", date: "2026-04-12", amount: 14000 },
      ],
      costs: [
        { description: "Senior consultant - Marchi", counterparty: "Marchi P.IVA", source: "fattura", amount: 22000, confidence: "alta", validatedBy: "Operatore" },
        { description: "Sala workshop", counterparty: "Talent Garden", source: "fattura", amount: 3500, confidence: "alta", validatedBy: "AI" },
        { description: "Catering workshop", counterparty: "Vari", source: "banca", amount: 2500, confidence: "alta", validatedBy: "Operatore" },
      ],
    },
    {
      id: "c-velasca",
      name: "Velasca Retail",
      kind: "cliente",
      revenue: 9800,
      variableCosts: 4200,
      status: "validata",
      revenues: [
        { description: "Audit dati e-commerce", invoiceNumber: "2026/019", date: "2026-03-14", amount: 9800 },
      ],
      costs: [
        { description: "Tool analytics dedicato", counterparty: "Hotjar", source: "banca", amount: 1200, confidence: "alta", validatedBy: "AI" },
        { description: "Freelance data - Neri", counterparty: "Neri P.IVA", source: "fattura", amount: 3000, confidence: "alta", validatedBy: "Operatore" },
      ],
    },
    {
      id: "c-faro",
      name: "Faro Logistica",
      kind: "cliente",
      revenue: 12000,
      variableCosts: 12600,
      status: "da_validare",
      revenues: [
        { description: "Progetto pilota WMS", invoiceNumber: "2026/022", date: "2026-04-02", amount: 12000 },
      ],
      costs: [
        { description: "Freelance integrazione - Russo", counterparty: "Russo P.IVA", source: "fattura", amount: 9000, confidence: "media", validatedBy: "AI" },
        { description: "Server staging", counterparty: "Hetzner", source: "banca", amount: 1600, confidence: "bassa", validatedBy: "AI" },
        { description: "Trasferte Bologna", counterparty: "Trenitalia", source: "banca", amount: 2000, confidence: "alta", validatedBy: "Operatore" },
      ],
    },
  ],
};

export interface MarginRow extends ClientMargin {
  margin: number;
  marginPct: number; // ratio 0-1; può essere negativo
  isLoss: boolean;
}

export const computeRows = (clients: ClientMargin[]): MarginRow[] =>
  clients
    .map((c) => {
      const margin = c.revenue - c.variableCosts;
      const marginPct = c.revenue > 0 ? margin / c.revenue : 0;
      return { ...c, margin, marginPct, isLoss: margin < 0 };
    })
    // peggiori in cima (default richiesto dalla spec)
    .sort((a, b) => a.margin - b.margin);
