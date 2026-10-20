// Store Zustand unico. Nessun database: i dati vivono nel browser (localStorage)
// e al primo accesso partono dal dataset di esempio. Per aggiungere un backend
// basta sostituire la persistenza di questo file: i componenti usano solo le azioni qui sotto.

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type { Client, ConfidenceBand, CostType, Entry, MarginRow } from "./types";
import { SEED_CLIENTS, SEED_ENTRIES, SEED_COMPANY, SEED_THRESHOLDS } from "./seed";

export type AppRole = "operator" | "owner";
export type CompanyStatus = "bozza" | "pubblicata";

export interface Company {
  name: string;
  vatNumber: string;
  sector: string;
  periodLabel: string;
  publishedAt: string;
  status: CompanyStatus;
}

export interface ConfidenceThresholds {
  high: number;
  medium: number;
}

export interface AiClassification {
  id: string;
  costType: CostType;
  clientId: string | null;
  confidence: number;
  rationale: string;
}

interface LucidoData {
  role: AppRole;
  company: Company;
  thresholds: ConfidenceThresholds;
  clients: Client[];
  entries: Entry[];
}

interface LucidoState extends LucidoData {
  updateCompany: (patch: Partial<Company>) => void;
  updateThresholds: (patch: Partial<ConfidenceThresholds>) => void;
  setPublished: (published: boolean) => void;
  switchRole: (role: AppRole) => void;

  addClient: (c: Omit<Client, "id">) => Client;
  updateClient: (id: string, patch: Partial<Omit<Client, "id">>) => void;
  removeClient: (id: string) => void;

  addEntry: (e: Omit<Entry, "id">) => Entry;
  addEntries: (es: Omit<Entry, "id">[]) => void;
  updateEntry: (id: string, patch: Partial<Omit<Entry, "id">>) => void;
  duplicateEntry: (id: string) => void;
  removeEntry: (id: string) => void;
  applyClassifications: (items: AiClassification[]) => number;

  resetToSeed: () => void;
  clearAll: () => void;
}

const EMPTY_COMPANY: Company = {
  name: "",
  vatNumber: "",
  sector: "",
  periodLabel: "",
  publishedAt: "",
  status: "bozza",
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function bandFromConfidence(c: number, t: ConfidenceThresholds): ConfidenceBand {
  if (c >= t.high) return "alta";
  if (c >= t.medium) return "media";
  return "bassa";
}

function seedData(): LucidoData {
  return {
    role: "operator",
    company: { ...SEED_COMPANY, status: "pubblicata" },
    thresholds: { ...SEED_THRESHOLDS },
    clients: SEED_CLIENTS.map((c) => ({ ...c })),
    entries: SEED_ENTRIES.map((e) => ({ ...e })),
  };
}

// localStorage può mancare o lanciare eccezioni (navigazione privata, dati del sito bloccati):
// in quel caso l'app funziona lo stesso, solo senza ricordare le modifiche.
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // quota piena o storage bloccato
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // storage bloccato
    }
  },
};

export const useLucidoStore = create<LucidoState>()(
  persist(
    (set, get) => ({
      ...seedData(),

      updateCompany: (patch) => set((s) => ({ company: { ...s.company, ...patch } })),

      setPublished: (published) =>
        set((s) => ({
          company: {
            ...s.company,
            status: published ? "pubblicata" : "bozza",
            publishedAt: published
              ? s.company.publishedAt || new Date().toISOString().slice(0, 10)
              : "",
          },
        })),

      switchRole: (role) => set({ role }),

      updateThresholds: (patch) => set((s) => ({ thresholds: { ...s.thresholds, ...patch } })),

      addClient: (c) => {
        const created: Client = { ...c, id: newId() };
        set((s) => ({ clients: [...s.clients, created] }));
        return created;
      },

      updateClient: (id, patch) =>
        set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

      removeClient: (id) =>
        set((s) => ({
          clients: s.clients.filter((c) => c.id !== id),
          entries: s.entries.map((e) => (e.clientId === id ? { ...e, clientId: undefined } : e)),
        })),

      addEntry: (e) => {
        const created: Entry = { ...e, id: newId() };
        set((s) => ({ entries: [created, ...s.entries] }));
        return created;
      },

      addEntries: (es) => {
        const created: Entry[] = es.map((e) => ({ ...e, id: newId() }));
        set((s) => ({ entries: [...created, ...s.entries] }));
      },

      updateEntry: (id, patch) =>
        set((s) => ({
          entries: s.entries.map((e) => {
            if (e.id !== id) return e;
            const next = { ...e, ...patch };
            return next.direction === "ricavo" ? { ...next, costType: undefined } : next;
          }),
        })),

      duplicateEntry: (id) => {
        const entries = get().entries;
        const idx = entries.findIndex((e) => e.id === id);
        if (idx < 0) return;
        const copy: Entry = {
          ...entries[idx],
          id: newId(),
          description: `${entries[idx].description} (copia)`,
        };
        set({ entries: [...entries.slice(0, idx + 1), copy, ...entries.slice(idx + 1)] });
      },

      removeEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

      // Applica le proposte AI solo ai costi ancora da validare (non tocca ciò che l'operatore ha confermato).
      applyClassifications: (items) => {
        const { thresholds, clients } = get();
        const byId = new Map(items.map((i) => [i.id, i]));
        const clientIds = new Set(clients.map((c) => c.id));
        let applied = 0;
        set((s) => ({
          entries: s.entries.map((e) => {
            const it = byId.get(e.id);
            if (!it || e.direction !== "costo" || e.status !== "da_validare") return e;
            applied++;
            return {
              ...e,
              costType: it.costType,
              clientId: it.clientId && clientIds.has(it.clientId) ? it.clientId : undefined,
              confidence: bandFromConfidence(it.confidence, thresholds),
              rationale: it.rationale,
              validatedBy: "AI",
            };
          }),
        }));
        return applied;
      },

      resetToSeed: () => set(seedData()),

      clearAll: () =>
        set({ company: { ...EMPTY_COMPANY }, clients: [], entries: [], role: "operator" }),
    }),
    {
      name: "lucido-dati",
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s): LucidoData => ({
        role: s.role,
        company: s.company,
        thresholds: s.thresholds,
        clients: s.clients,
        entries: s.entries,
      }),
    },
  ),
);

// ---------- Selettori ----------

export function computeMarginRows(clients: Client[], entries: Entry[]): MarginRow[] {
  const rows: MarginRow[] = clients.map((c) => {
    const mine = entries.filter((e) => e.clientId === c.id);
    const revenues = mine.filter((e) => e.direction === "ricavo");
    const variableCosts = mine.filter((e) => e.direction === "costo" && e.costType === "variabile");
    const revenue = revenues.reduce((s, e) => s + e.amount, 0);
    const variable = variableCosts.reduce((s, e) => s + e.amount, 0);
    const margin = revenue - variable;
    const marginPct = revenue > 0 ? margin / revenue : 0;
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
  return rows
    .filter((r) => r.revenues.length + r.costs.length > 0)
    .sort((a, b) => a.margin - b.margin);
}

export function computeValidatedRevenueShare(entries: Entry[]): number {
  const revenues = entries.filter((e) => e.direction === "ricavo");
  const total = revenues.reduce((s, e) => s + e.amount, 0);
  if (total === 0) return 0;
  const validated = revenues
    .filter((e) => e.status === "validato")
    .reduce((s, e) => s + e.amount, 0);
  return validated / total;
}
