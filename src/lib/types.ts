// Modello dati Lucido v0 (client-side, persistito su localStorage).

export type ClientKind = "cliente" | "commessa";
export type EntryDirection = "ricavo" | "costo";
export type CostType = "fisso" | "variabile" | "non_costo";
export type EntrySource = "manuale" | "fattura" | "banca" | "excel";
export type ConfidenceBand = "alta" | "media" | "bassa";
export type ValidationStatus = "da_validare" | "validato";
export type Validator = "AI" | "Operatore";

export interface Client {
  id: string;
  name: string;
  kind: ClientKind;
}

export interface Entry {
  id: string;
  date: string; // ISO yyyy-mm-dd
  description: string;
  counterparty: string;
  amount: number; // sempre positivo
  direction: EntryDirection;
  costType?: CostType; // richiesto se direction = "costo"
  clientId?: string; // attribuzione opzionale (nessuna = non attribuito)
  source: EntrySource;
  confidence: ConfidenceBand;
  status: ValidationStatus;
  invoiceNumber?: string;
  validatedBy?: Validator;
}

// Riga aggregata derivata per la dashboard del titolare.
export interface MarginRow {
  clientId: string;
  name: string;
  kind: ClientKind;
  revenue: number;
  variableCosts: number;
  margin: number;
  marginPct: number;
  isLoss: boolean;
  hasUnvalidated: boolean;
  revenues: Entry[];
  costs: Entry[];
}
