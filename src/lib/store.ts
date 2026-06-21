// Store Zustand con persistenza localStorage. Niente backend in v0.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Client, Entry, MarginRow } from "./types";
import { SEED_CLIENTS, SEED_ENTRIES, SEED_COMPANY, SEED_THRESHOLDS } from "./seed";

export interface Company {
  name: string;
  vatNumber: string;
  sector: string;
  periodLabel: string;
  publishedAt: string;
}

export interface ConfidenceThresholds {
  high: number;
  medium: number;
}

interface LucidoState {
  company: Company;
  thresholds: ConfidenceThresholds;
  clients: Client[];
  entries: Entry[];

  // Azienda / soglie
  updateCompany: (patch: Partial<Company>) => void;
  updateThresholds: (patch: Partial<ConfidenceThresholds>) => void;

  // Clienti / commesse
  addClient: (c: Omit<Client, "id">) => Client;
  updateClient: (id: string, patch: Partial<Omit<Client, "id">>) => void;
  removeClient: (id: string) => void;

  // Voci
  addEntry: (e: Omit<Entry, "id">) => Entry;
  addEntries: (es: Omit<Entry, "id">[]) => void;
  updateEntry: (id: string, patch: Partial<Omit<Entry, "id">>) => void;
  duplicateEntry: (id: string) => void;
  removeEntry: (id: string) => void;

  resetToSeed: () => void;
  clearAll: () => void;
}

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const useLucidoStore = create<LucidoState>()(
  persist(
    (set) => ({
      company: SEED_COMPANY,
      thresholds: SEED_THRESHOLDS,
      clients: SEED_CLIENTS,
      entries: SEED_ENTRIES,

      updateCompany: (patch) => set((s) => ({ company: { ...s.company, ...patch } })),
      updateThresholds: (patch) =>
        set((s) => ({ thresholds: { ...s.thresholds, ...patch } })),

      addClient: (c) => {
        const created: Client = { ...c, id: newId("c") };
        set((s) => ({ clients: [...s.clients, created] }));
        return created;
      },
      updateClient: (id, patch) =>
        set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeClient: (id) =>
        set((s) => ({
          clients: s.clients.filter((c) => c.id !== id),
          // le voci attribuite diventano non attribuite (non si cancellano)
          entries: s.entries.map((e) => (e.clientId === id ? { ...e, clientId: undefined } : e)),
        })),

      addEntry: (e) => {
        const created: Entry = { ...e, id: newId("e") };
        set((s) => ({ entries: [created, ...s.entries] }));
        return created;
      },
      addEntries: (es) =>
        set((s) => ({
          entries: [...es.map((e) => ({ ...e, id: newId("e") })), ...s.entries],
        })),
      updateEntry: (id, patch) =>
        set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      duplicateEntry: (id) =>
        set((s) => {
          const src = s.entries.find((e) => e.id === id);
          if (!src) return s;
          const copy: Entry = { ...src, id: newId("e"), description: `${src.description} (copia)` };
          const idx = s.entries.findIndex((e) => e.id === id);
          const next = [...s.entries];
          next.splice(idx + 1, 0, copy);
          return { entries: next };
        }),
      removeEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

      resetToSeed: () =>
        set({
          company: SEED_COMPANY,
          thresholds: SEED_THRESHOLDS,
          clients: SEED_CLIENTS,
          entries: SEED_ENTRIES,
        }),
      clearAll: () =>
        set({
          company: { ...SEED_COMPANY, name: "", vatNumber: "", sector: "", periodLabel: "" },
          thresholds: SEED_THRESHOLDS,
          clients: [],
          entries: [],
        }),
    }),
    {
      name: "lucido-v0",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // SSR-safe: skipHydration durante il render server, idratazione al mount
      skipHydration: true,
      migrate: (persisted: unknown, version) => {
        const state = (persisted ?? {}) as Partial<LucidoState>;
        if (version < 2) {
          return {
            ...state,
            company: { ...SEED_COMPANY, ...(state.company ?? {}) },
            thresholds: { ...SEED_THRESHOLDS, ...(state.thresholds ?? {}) },
          } as LucidoState;
        }
        return state as LucidoState;
      },
    },
  ),
);

// Calcola le righe della dashboard a partire da voci + clienti.
export function computeMarginRows(clients: Client[], entries: Entry[]): MarginRow[] {
  const rows: MarginRow[] = clients.map((c) => {
    const mine = entries.filter((e) => e.clientId === c.id);
    const revenues = mine.filter((e) => e.direction === "ricavo");
    const variableCosts = mine.filter(
      (e) => e.direction === "costo" && e.costType === "variabile",
    );
    const revenue = revenues.reduce((s, e) => s + e.amount, 0);
    const variable = variableCosts.reduce((s, e) => s + e.amount, 0);
    const margin = revenue - variable;
    const marginPct = revenue > 0 ? margin / revenue : 0;
    // Le voci rilevanti per il margine sono ricavi + costi variabili.
    const relevant = [...revenues, ...variableCosts];
    const hasUnvalidated = relevant.some((e) => e.status === "da_validare");
    return {
      clientId: c.id,
      name: c.name,
      kind: c.kind,
      revenue,
      variableCosts: variable,
      margin,
      marginPct,
      isLoss: margin < 0,
      hasUnvalidated,
      revenues,
      costs: variableCosts,
    };
  });
  // peggiori in cima, esclusi quelli senza alcuna voce rilevante
  return rows
    .filter((r) => r.revenues.length + r.costs.length > 0)
    .sort((a, b) => a.margin - b.margin);
}

// Quota di ricavo coperta da voci validate (solo ricavi).
export function computeValidatedRevenueShare(entries: Entry[]): number {
  const revenues = entries.filter((e) => e.direction === "ricavo");
  const total = revenues.reduce((s, e) => s + e.amount, 0);
  if (total === 0) return 0;
  const validated = revenues
    .filter((e) => e.status === "validato")
    .reduce((s, e) => s + e.amount, 0);
  return validated / total;
}
