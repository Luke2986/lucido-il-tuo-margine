// Store Zustand legato a Supabase con autenticazione e ruoli.
// Lavora sull'azienda corrente (presa dalla prima membership dell'utente
// loggato). Mantiene il modello UI `Entry` come vista compatta in memoria
// ma salva sul DB nelle tabelle transactions + classifications.

import { create } from "zustand";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Client, ConfidenceBand, Entry, MarginRow, Validator, ValidationStatus } from "./types";
import { SEED_CLIENTS, SEED_ENTRIES, SEED_COMPANY, SEED_THRESHOLDS } from "./seed";

type TxRow = Database["public"]["Tables"]["transactions"]["Row"];
type TxInsert = Database["public"]["Tables"]["transactions"]["Insert"];
type TxUpdate = Database["public"]["Tables"]["transactions"]["Update"];
type ClsRow = Database["public"]["Tables"]["classifications"]["Row"];
type ClsInsert = Database["public"]["Tables"]["classifications"]["Insert"];
type ClsUpdate = Database["public"]["Tables"]["classifications"]["Update"];
type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];
type CompanyStatus = Database["public"]["Enums"]["company_status"];
type AppRole = Database["public"]["Enums"]["app_role"];

export type { AppRole };

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

interface LucidoState {
  userId: string | null;
  companyId: string | null;
  role: AppRole | null;
  company: Company;
  thresholds: ConfidenceThresholds;
  clients: Client[];
  entries: Entry[];
  loaded: boolean;
  loading: boolean;

  loadAll: () => Promise<void>;
  reset: () => void;

  // Anagrafica / impostazioni
  updateCompany: (patch: Partial<Company>) => void;
  updateThresholds: (patch: Partial<ConfidenceThresholds>) => void;
  setPublished: (published: boolean) => void;
  switchRole: (role: AppRole) => Promise<void>;

  // Clienti
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

const EMPTY_COMPANY: Company = {
  name: "", vatNumber: "", sector: "", periodLabel: "", publishedAt: "", status: "bozza",
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// Confidenza numerica indicativa a partire dalla banda (per inserimenti manuali).
function confidenceFromBand(band: ConfidenceBand): number {
  if (band === "alta") return 0.95;
  if (band === "media") return 0.7;
  return 0.3;
}
function bandFromConfidence(c: number, t: ConfidenceThresholds): ConfidenceBand {
  if (c >= t.high) return "alta";
  if (c >= t.medium) return "media";
  return "bassa";
}

function reportError(action: string, error: unknown) {
  console.error(`[lucido] ${action} failed`, error);
  toast.error(`Salvataggio fallito: ${action}`);
}

// ---------- Composizione Entry da DB ----------

function composeEntry(tx: TxRow, cls: ClsRow | null, thresholds: ConfidenceThresholds): Entry {
  const isCost = tx.direction === "costo";
  const status: ValidationStatus =
    cls && (cls.status === "validata" || cls.status === "override") ? "validato" : isCost ? "da_validare" : "validato";
  const validatedBy: Validator | undefined = cls?.validated_by ?? (isCost ? undefined : "Operatore");
  const band: ConfidenceBand = cls ? cls.confidence_band : "alta";
  return {
    id: tx.id,
    date: tx.entry_date,
    description: tx.description,
    counterparty: tx.counterparty,
    amount: typeof tx.amount === "string" ? Number(tx.amount) : tx.amount,
    direction: tx.direction,
    costType: cls?.cost_type ?? undefined,
    clientId: (cls?.client_id ?? tx.client_id) ?? undefined,
    source: tx.source,
    confidence: isCost ? band : "alta",
    status,
    invoiceNumber: tx.invoice_number ?? undefined,
    validatedBy,
  };
}

// ---------- Store ----------

export const useLucidoStore = create<LucidoState>()((set, get) => ({
  userId: null,
  companyId: null,
  role: null,
  company: { ...EMPTY_COMPANY },
  thresholds: { ...SEED_THRESHOLDS },
  clients: [],
  entries: [],
  loaded: false,
  loading: false,

  reset: () =>
    set({
      userId: null,
      companyId: null,
      role: null,
      company: { ...EMPTY_COMPANY },
      thresholds: { ...SEED_THRESHOLDS },
      clients: [],
      entries: [],
      loaded: false,
      loading: false,
    }),

  loadAll: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userData.user;
      if (!user) {
        set({ loading: false, loaded: false });
        return;
      }

      // Prima membership
      const memRes = await supabase
        .from("memberships")
        .select("company_id, role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (memRes.error) throw memRes.error;

      if (!memRes.data) {
        set({
          userId: user.id, companyId: null, role: null,
          company: { ...EMPTY_COMPANY }, thresholds: { ...SEED_THRESHOLDS },
          clients: [], entries: [], loaded: true, loading: false,
        });
        return;
      }

      const companyId = memRes.data.company_id;
      const role = memRes.data.role as AppRole;

      const [companyRes, settingsRes, clientsRes, txRes, clsRes] = await Promise.all([
        supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
        supabase.from("settings").select("*").eq("company_id", companyId).maybeSingle(),
        supabase.from("clients").select("*").eq("company_id", companyId).order("name"),
        supabase.from("transactions").select("*").eq("company_id", companyId).order("entry_date", { ascending: false }),
        supabase.from("classifications").select("*"),
      ]);
      if (companyRes.error) throw companyRes.error;
      if (settingsRes.error) throw settingsRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (txRes.error) throw txRes.error;
      if (clsRes.error) throw clsRes.error;

      const c = companyRes.data;
      const s = settingsRes.data;
      const thresholds = s
        ? { high: Number(s.threshold_high), medium: Number(s.threshold_medium) }
        : { ...SEED_THRESHOLDS };

      const clsByTx = new Map<string, ClsRow>();
      for (const row of clsRes.data ?? []) clsByTx.set(row.transaction_id, row as ClsRow);

      set({
        userId: user.id,
        companyId,
        role,
        company: c
          ? {
              name: c.name,
              vatNumber: c.vat_number,
              sector: c.sector,
              periodLabel: c.period_label,
              publishedAt: c.published_at ?? "",
              status: c.status,
            }
          : { ...EMPTY_COMPANY },
        thresholds,
        clients: (clientsRes.data ?? []).map((r) => ({
          id: r.id, name: r.name, kind: r.kind,
        })),
        entries: (txRes.data ?? []).map((r) => composeEntry(r as TxRow, clsByTx.get(r.id) ?? null, thresholds)),
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
    const { companyId, company } = get();
    if (!companyId) return;
    const prev = company;
    const next = { ...prev, ...patch };
    set({ company: next });
    void supabase
      .from("companies")
      .update({
        name: next.name,
        vat_number: next.vatNumber,
        sector: next.sector,
        period_label: next.periodLabel,
        published_at: next.publishedAt || null,
        status: next.status,
      })
      .eq("id", companyId)
      .then(({ error }) => {
        if (error) { set({ company: prev }); reportError("anagrafica azienda", error); }
      });
  },

  setPublished: (published) => {
    const status: CompanyStatus = published ? "pubblicata" : "bozza";
    const publishedAt = published
      ? (get().company.publishedAt || new Date().toISOString().slice(0, 10))
      : "";
    get().updateCompany({ status, publishedAt });
  },

  switchRole: async (role) => {
    const { userId, companyId } = get();
    if (!userId || !companyId) return;
    const prev = get().role;
    set({ role });
    const { error } = await supabase
      .from("memberships")
      .update({ role })
      .eq("user_id", userId)
      .eq("company_id", companyId);
    if (error) {
      set({ role: prev });
      reportError("cambio ruolo", error);
      return;
    }
    // Ricarica per applicare RLS (owner non vede tutto)
    await get().loadAll();
  },

  updateThresholds: (patch) => {
    const { companyId, thresholds } = get();
    if (!companyId) return;
    const prev = thresholds;
    const next = { ...prev, ...patch };
    set({ thresholds: next });
    void supabase
      .from("settings")
      .upsert(
        { company_id: companyId, threshold_high: next.high, threshold_medium: next.medium },
        { onConflict: "company_id" },
      )
      .then(({ error }) => {
        if (error) { set({ thresholds: prev }); reportError("soglie di confidenza", error); }
      });
  },

  addClient: (c) => {
    const { companyId } = get();
    const created: Client = { ...c, id: newId() };
    set((s) => ({ clients: [...s.clients, created] }));
    if (!companyId) return created;
    void supabase
      .from("clients")
      .insert({ id: created.id, company_id: companyId, name: created.name, kind: created.kind })
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
    set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
    const row: ClientUpdate = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.kind !== undefined) row.kind = patch.kind;
    void supabase
      .from("clients").update(row).eq("id", id)
      .then(({ error }) => {
        if (error) { set({ clients: prev }); reportError("modifica cliente", error); }
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
      .from("clients").delete().eq("id", id)
      .then(({ error }) => {
        if (error) { set({ clients: prevClients, entries: prevEntries }); reportError("eliminazione cliente", error); }
      });
  },

  addEntry: (e) => {
    const { companyId, thresholds } = get();
    const created: Entry = { ...e, id: newId() };
    set((s) => ({ entries: [created, ...s.entries] }));
    if (!companyId) return created;
    void persistEntry(companyId, created, thresholds).catch((error) => {
      set((s) => ({ entries: s.entries.filter((x) => x.id !== created.id) }));
      reportError("nuova voce", error);
    });
    return created;
  },

  addEntries: (es) => {
    const { companyId, thresholds } = get();
    const created: Entry[] = es.map((e) => ({ ...e, id: newId() }));
    set((s) => ({ entries: [...created, ...s.entries] }));
    if (!companyId) return;
    void (async () => {
      try {
        const txRows: TxInsert[] = created.map((c) => entryToTxInsert(companyId, c));
        const { error: txErr } = await supabase.from("transactions").insert(txRows);
        if (txErr) throw txErr;
        const clsRows: ClsInsert[] = created
          .filter((c) => c.direction === "costo")
          .map((c) => entryToClsInsert(c, thresholds));
        if (clsRows.length > 0) {
          const { error: clsErr } = await supabase.from("classifications").insert(clsRows);
          if (clsErr) throw clsErr;
        }
      } catch (error) {
        const ids = new Set(created.map((c) => c.id));
        set((s) => ({ entries: s.entries.filter((x) => !ids.has(x.id)) }));
        reportError("import voci", error);
      }
    })();
  },

  updateEntry: (id, patch) => {
    const { companyId, thresholds } = get();
    const prev = get().entries;
    const target = prev.find((e) => e.id === id);
    if (!target) return;
    const next: Entry = { ...target, ...patch };
    set((s) => ({ entries: s.entries.map((e) => (e.id === id ? next : e)) }));
    if (!companyId) return;
    void (async () => {
      try {
        const txPatch = entryToTxUpdate(patch);
        if (Object.keys(txPatch).length > 0) {
          const { error } = await supabase.from("transactions").update(txPatch).eq("id", id);
          if (error) throw error;
        }
        // Aggiorna/crea classification se è (o diventa) costo
        const becameCost = next.direction === "costo";
        if (becameCost) {
          const clsRow = entryToClsInsert(next, thresholds);
          const { error } = await supabase
            .from("classifications")
            .upsert(clsRow, { onConflict: "transaction_id" });
          if (error) throw error;
        } else if (target.direction === "costo" && next.direction === "ricavo") {
          // Cambio costo→ricavo: elimina classification
          await supabase.from("classifications").delete().eq("transaction_id", id);
        }
      } catch (error) {
        set({ entries: prev });
        reportError("modifica voce", error);
      }
    })();
  },

  duplicateEntry: (id) => {
    const src = get().entries.find((e) => e.id === id);
    if (!src) return;
    const copy: Entry = { ...src, id: newId(), description: `${src.description} (copia)` };
    const idx = get().entries.findIndex((e) => e.id === id);
    const next = [...get().entries];
    next.splice(idx + 1, 0, copy);
    set({ entries: next });
    const { companyId, thresholds } = get();
    if (!companyId) return;
    void persistEntry(companyId, copy, thresholds).catch((error) => {
      set((s) => ({ entries: s.entries.filter((x) => x.id !== copy.id) }));
      reportError("duplica voce", error);
    });
  },

  removeEntry: (id) => {
    const prev = get().entries;
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
    void supabase.from("transactions").delete().eq("id", id)
      .then(({ error }) => {
        if (error) { set({ entries: prev }); reportError("eliminazione voce", error); }
      });
  },

  resetToSeed: async () => {
    const { companyId, thresholds } = get();
    if (!companyId) return;
    try {
      // Cancella tutto della company corrente
      const delTx = await supabase.from("transactions").delete().eq("company_id", companyId);
      if (delTx.error) throw delTx.error;
      const delC = await supabase.from("clients").delete().eq("company_id", companyId);
      if (delC.error) throw delC.error;

      // Aggiorna anagrafica
      const upC = await supabase.from("companies").update({
        name: SEED_COMPANY.name,
        vat_number: SEED_COMPANY.vatNumber,
        sector: SEED_COMPANY.sector,
        period_label: SEED_COMPANY.periodLabel,
        published_at: SEED_COMPANY.publishedAt || null,
        status: "pubblicata",
      }).eq("id", companyId);
      if (upC.error) throw upC.error;

      const upS = await supabase.from("settings").upsert(
        { company_id: companyId, threshold_high: SEED_THRESHOLDS.high, threshold_medium: SEED_THRESHOLDS.medium },
        { onConflict: "company_id" },
      );
      if (upS.error) throw upS.error;

      // Mapping id legacy → uuid
      const idMap = new Map<string, string>();
      const clientRows: ClientInsert[] = SEED_CLIENTS.map((c) => {
        const uid = newId();
        idMap.set(c.id, uid);
        return { id: uid, company_id: companyId, name: c.name, kind: c.kind };
      });
      const insC = await supabase.from("clients").insert(clientRows);
      if (insC.error) throw insC.error;

      // Entries → tx + cls
      const entries: Entry[] = SEED_ENTRIES.map((e) => ({
        ...e,
        id: newId(),
        clientId: e.clientId ? idMap.get(e.clientId) : undefined,
      }));
      const txRows = entries.map((e) => entryToTxInsert(companyId, e));
      const insT = await supabase.from("transactions").insert(txRows);
      if (insT.error) throw insT.error;
      const clsRows = entries
        .filter((e) => e.direction === "costo")
        .map((e) => entryToClsInsert(e, thresholds));
      if (clsRows.length > 0) {
        const insCls = await supabase.from("classifications").insert(clsRows);
        if (insCls.error) throw insCls.error;
      }

      await get().loadAll();
    } catch (error) {
      reportError("ripristino dati di esempio", error);
    }
  },

  clearAll: async () => {
    const { companyId } = get();
    if (!companyId) return;
    try {
      const d1 = await supabase.from("transactions").delete().eq("company_id", companyId);
      if (d1.error) throw d1.error;
      const d2 = await supabase.from("clients").delete().eq("company_id", companyId);
      if (d2.error) throw d2.error;
      const u = await supabase.from("companies").update({
        name: "", vat_number: "", sector: "", period_label: "", published_at: null, status: "bozza",
      }).eq("id", companyId);
      if (u.error) throw u.error;
      await get().loadAll();
    } catch (error) {
      reportError("cancellazione dati", error);
    }
  },
}));

// ---------- Helpers di persistenza ----------

function entryToTxInsert(companyId: string, e: Entry): TxInsert {
  return {
    id: e.id,
    company_id: companyId,
    direction: e.direction,
    entry_date: e.date,
    description: e.description,
    counterparty: e.counterparty,
    amount: e.amount,
    client_id: e.clientId ?? null,
    source: e.source,
    invoice_number: e.invoiceNumber ?? null,
  };
}

function entryToTxUpdate(patch: Partial<Entry>): TxUpdate {
  const out: TxUpdate = {};
  if (patch.date !== undefined) out.entry_date = patch.date;
  if (patch.description !== undefined) out.description = patch.description;
  if (patch.counterparty !== undefined) out.counterparty = patch.counterparty;
  if (patch.amount !== undefined) out.amount = patch.amount;
  if (patch.direction !== undefined) out.direction = patch.direction;
  if (patch.clientId !== undefined) out.client_id = patch.clientId ?? null;
  if (patch.source !== undefined) out.source = patch.source;
  if (patch.invoiceNumber !== undefined) out.invoice_number = patch.invoiceNumber ?? null;
  return out;
}

function entryToClsInsert(e: Entry, t: ConfidenceThresholds): ClsInsert {
  const conf = confidenceFromBand(e.confidence);
  const band = bandFromConfidence(conf, t);
  const status = e.status === "validato" ? "validata" : "ai_proposta";
  return {
    transaction_id: e.id,
    cost_type: e.costType ?? null,
    client_id: e.clientId ?? null,
    confidence: conf,
    confidence_band: band,
    method: e.validatedBy === "AI" ? "ai" : "manuale",
    rationale: "",
    status,
    validated_by: e.validatedBy ?? null,
    validated_at: e.status === "validato" ? new Date().toISOString() : null,
  };
}

async function persistEntry(companyId: string, e: Entry, thresholds: ConfidenceThresholds) {
  const { error: txErr } = await supabase.from("transactions").insert(entryToTxInsert(companyId, e));
  if (txErr) throw txErr;
  if (e.direction === "costo") {
    const { error: clsErr } = await supabase.from("classifications").insert(entryToClsInsert(e, thresholds));
    if (clsErr) throw clsErr;
  }
}

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
      clientId: c.id, name: c.name, kind: c.kind,
      revenue, variableCosts: variable, margin, marginPct,
      isLoss: margin < 0, hasUnvalidated, revenues, costs: variableCosts,
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
  const validated = revenues.filter((e) => e.status === "validato").reduce((s, e) => s + e.amount, 0);
  return validated / total;
}
