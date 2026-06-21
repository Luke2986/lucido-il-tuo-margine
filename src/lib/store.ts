// Store Zustand con persistenza su Lovable Cloud (Supabase).
// API identica alla versione localStorage: aggiornamento ottimistico locale,
// scrittura in background sul DB, toast in caso di errore.

import { create } from "zustand";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Client, Entry, MarginRow } from "./types";
import { SEED_CLIENTS, SEED_ENTRIES, SEED_COMPANY, SEED_THRESHOLDS } from "./seed";

type EntryInsert = Database["public"]["Tables"]["entries"]["Insert"];
type EntryUpdate = Database["public"]["Tables"]["entries"]["Update"];
type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

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

const SINGLETON = "singleton";

interface LucidoState {
  company: Company;
  thresholds: ConfidenceThresholds;
  clients: Client[];
  entries: Entry[];
  loaded: boolean;
  loading: boolean;

  loadAll: () => Promise<void>;

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

  resetToSeed: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ---------- Mappers DB <-> dominio ----------

type EntryRow = Database["public"]["Tables"]["entries"]["Row"];

function rowToEntry(r: EntryRow): Entry {
  return {
    id: r.id,
    date: r.entry_date,
    description: r.description,
    counterparty: r.counterparty,
    amount: typeof r.amount === "string" ? Number(r.amount) : r.amount,
    direction: r.direction,
    costType: r.cost_type ?? undefined,
    clientId: r.client_id ?? undefined,
    source: r.source,
    confidence: r.confidence,
    status: r.status,
    invoiceNumber: r.invoice_number ?? undefined,
    validatedBy: r.validated_by ?? undefined,
  };
}

function entryToRow(e: Entry): EntryInsert {
  return {
    id: e.id,
    entry_date: e.date,
    description: e.description,
    counterparty: e.counterparty,
    amount: e.amount,
    direction: e.direction,
    cost_type: e.costType ?? null,
    client_id: e.clientId ?? null,
    source: e.source,
    confidence: e.confidence,
    status: e.status,
    invoice_number: e.invoiceNumber ?? null,
    validated_by: e.validatedBy ?? null,
  };
}

function entryPatchToRow(patch: Partial<Entry>): EntryUpdate {
  const out: EntryUpdate = {};
  if (patch.date !== undefined) out.entry_date = patch.date;
  if (patch.description !== undefined) out.description = patch.description;
  if (patch.counterparty !== undefined) out.counterparty = patch.counterparty;
  if (patch.amount !== undefined) out.amount = patch.amount;
  if (patch.direction !== undefined) out.direction = patch.direction;
  if (patch.costType !== undefined) out.cost_type = patch.costType ?? null;
  if (patch.clientId !== undefined) out.client_id = patch.clientId ?? null;
  if (patch.source !== undefined) out.source = patch.source;
  if (patch.confidence !== undefined) out.confidence = patch.confidence;
  if (patch.status !== undefined) out.status = patch.status;
  if (patch.invoiceNumber !== undefined) out.invoice_number = patch.invoiceNumber ?? null;
  if (patch.validatedBy !== undefined) out.validated_by = patch.validatedBy ?? null;
  return out;
}

function reportError(action: string, error: unknown) {
  console.error(`[lucido] ${action} failed`, error);
  toast.error(`Salvataggio fallito: ${action}`);
}

// ---------- Store ----------

export const useLucidoStore = create<LucidoState>()((set, get) => ({
  // Stato iniziale vuoto: viene popolato dal DB a `loadAll()`.
  company: { name: "", vatNumber: "", sector: "", periodLabel: "", publishedAt: "" },
  thresholds: { ...SEED_THRESHOLDS },
  clients: [],
  entries: [],
  loaded: false,
  loading: false,

  loadAll: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const [companyRes, settingsRes, clientsRes, entriesRes] = await Promise.all([
        supabase.from("companies").select("*").eq("id", SINGLETON).maybeSingle(),
        supabase.from("settings").select("*").eq("id", SINGLETON).maybeSingle(),
        supabase.from("clients").select("*").order("name"),
        supabase.from("entries").select("*").order("entry_date", { ascending: false }),
      ]);

      if (companyRes.error) throw companyRes.error;
      if (settingsRes.error) throw settingsRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (entriesRes.error) throw entriesRes.error;

      const c = companyRes.data;
      const s = settingsRes.data;

      set({
        company: c
          ? {
              name: c.name,
              vatNumber: c.vat_number,
              sector: c.sector,
              periodLabel: c.period_label,
              publishedAt: c.published_at ?? "",
            }
          : { name: "", vatNumber: "", sector: "", periodLabel: "", publishedAt: "" },
        thresholds: s
          ? { high: Number(s.threshold_high), medium: Number(s.threshold_medium) }
          : { ...SEED_THRESHOLDS },
        clients: (clientsRes.data ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          kind: r.kind,
        })),
        entries: (entriesRes.data ?? []).map((r) => rowToEntry(r as EntryRow)),
        loaded: true,
        loading: false,
      });
    } catch (error) {
      console.error("[lucido] loadAll failed", error);
      toast.error("Non sono riuscito a caricare i dati dal database");
      set({ loading: false });
    }
  },

  updateCompany: (patch) => {
    const prev = get().company;
    const next = { ...prev, ...patch };
    set({ company: next });
    void supabase
      .from("companies")
      .upsert(
        {
          id: SINGLETON,
          name: next.name,
          vat_number: next.vatNumber,
          sector: next.sector,
          period_label: next.periodLabel,
          published_at: next.publishedAt || null,
        },
        { onConflict: "id" },
      )
      .then(({ error }) => {
        if (error) {
          set({ company: prev });
          reportError("anagrafica azienda", error);
        }
      });
  },

  updateThresholds: (patch) => {
    const prev = get().thresholds;
    const next = { ...prev, ...patch };
    set({ thresholds: next });
    void supabase
      .from("settings")
      .upsert(
        { id: SINGLETON, threshold_high: next.high, threshold_medium: next.medium },
        { onConflict: "id" },
      )
      .then(({ error }) => {
        if (error) {
          set({ thresholds: prev });
          reportError("soglie di confidenza", error);
        }
      });
  },

  addClient: (c) => {
    const created: Client = { ...c, id: newId("c") };
    set((s) => ({ clients: [...s.clients, created] }));
    void supabase
      .from("clients")
      .insert({ id: created.id, name: created.name, kind: created.kind })
      .then(({ error }) => {
        if (error) {
          set((s) => ({ clients: s.clients.filter((x) => x.id !== created.id) }));
          reportError("nuovo cliente", error);
        }
      });
    return created;
  },

  updateClient: (id, patch) => {
    const prev = get().clients;
    set((s) => ({
      clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.kind !== undefined) row.kind = patch.kind;
    void supabase
      .from("clients")
      .update(row)
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          set({ clients: prev });
          reportError("modifica cliente", error);
        }
      });
  },

  removeClient: (id) => {
    const prevClients = get().clients;
    const prevEntries = get().entries;
    set((s) => ({
      clients: s.clients.filter((c) => c.id !== id),
      entries: s.entries.map((e) => (e.clientId === id ? { ...e, clientId: undefined } : e)),
    }));
    void supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          set({ clients: prevClients, entries: prevEntries });
          reportError("eliminazione cliente", error);
        }
      });
  },

  addEntry: (e) => {
    const created: Entry = { ...e, id: newId("e") };
    set((s) => ({ entries: [created, ...s.entries] }));
    void supabase
      .from("entries")
      .insert(entryToRow(created))
      .then(({ error }) => {
        if (error) {
          set((s) => ({ entries: s.entries.filter((x) => x.id !== created.id) }));
          reportError("nuova voce", error);
        }
      });
    return created;
  },

  addEntries: (es) => {
    const created: Entry[] = es.map((e) => ({ ...e, id: newId("e") }));
    set((s) => ({ entries: [...created, ...s.entries] }));
    void supabase
      .from("entries")
      .insert(created.map(entryToRow))
      .then(({ error }) => {
        if (error) {
          const ids = new Set(created.map((c) => c.id));
          set((s) => ({ entries: s.entries.filter((x) => !ids.has(x.id)) }));
          reportError("import voci", error);
        }
      });
  },

  updateEntry: (id, patch) => {
    const prev = get().entries;
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
    void supabase
      .from("entries")
      .update(entryPatchToRow(patch))
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          set({ entries: prev });
          reportError("modifica voce", error);
        }
      });
  },

  duplicateEntry: (id) => {
    const src = get().entries.find((e) => e.id === id);
    if (!src) return;
    const copy: Entry = { ...src, id: newId("e"), description: `${src.description} (copia)` };
    const idx = get().entries.findIndex((e) => e.id === id);
    const next = [...get().entries];
    next.splice(idx + 1, 0, copy);
    set({ entries: next });
    void supabase
      .from("entries")
      .insert(entryToRow(copy))
      .then(({ error }) => {
        if (error) {
          set((s) => ({ entries: s.entries.filter((x) => x.id !== copy.id) }));
          reportError("duplica voce", error);
        }
      });
  },

  removeEntry: (id) => {
    const prev = get().entries;
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
    void supabase
      .from("entries")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          set({ entries: prev });
          reportError("eliminazione voce", error);
        }
      });
  },

  resetToSeed: async () => {
    try {
      // Cancella tutto poi reinserisce i dati seed.
      const del1 = await supabase.from("entries").delete().neq("id", "__nope__");
      if (del1.error) throw del1.error;
      const del2 = await supabase.from("clients").delete().neq("id", "__nope__");
      if (del2.error) throw del2.error;

      const upCompany = await supabase.from("companies").upsert(
        {
          id: SINGLETON,
          name: SEED_COMPANY.name,
          vat_number: SEED_COMPANY.vatNumber,
          sector: SEED_COMPANY.sector,
          period_label: SEED_COMPANY.periodLabel,
          published_at: SEED_COMPANY.publishedAt || null,
        },
        { onConflict: "id" },
      );
      if (upCompany.error) throw upCompany.error;

      const upSettings = await supabase.from("settings").upsert(
        { id: SINGLETON, threshold_high: SEED_THRESHOLDS.high, threshold_medium: SEED_THRESHOLDS.medium },
        { onConflict: "id" },
      );
      if (upSettings.error) throw upSettings.error;

      const insC = await supabase.from("clients").insert(
        SEED_CLIENTS.map((c) => ({ id: c.id, name: c.name, kind: c.kind })),
      );
      if (insC.error) throw insC.error;

      const insE = await supabase.from("entries").insert(SEED_ENTRIES.map(entryToRow));
      if (insE.error) throw insE.error;

      await get().loadAll();
    } catch (error) {
      reportError("ripristino dati di esempio", error);
    }
  },

  clearAll: async () => {
    try {
      const del1 = await supabase.from("entries").delete().neq("id", "__nope__");
      if (del1.error) throw del1.error;
      const del2 = await supabase.from("clients").delete().neq("id", "__nope__");
      if (del2.error) throw del2.error;
      const upCompany = await supabase.from("companies").upsert(
        {
          id: SINGLETON,
          name: "",
          vat_number: "",
          sector: "",
          period_label: "",
          published_at: null,
        },
        { onConflict: "id" },
      );
      if (upCompany.error) throw upCompany.error;
      const upSettings = await supabase.from("settings").upsert(
        { id: SINGLETON, threshold_high: SEED_THRESHOLDS.high, threshold_medium: SEED_THRESHOLDS.medium },
        { onConflict: "id" },
      );
      if (upSettings.error) throw upSettings.error;

      await get().loadAll();
    } catch (error) {
      reportError("cancellazione dati", error);
    }
  },
}));

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
