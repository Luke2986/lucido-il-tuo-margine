// Revisione AI — coda QA dell'operatore.
// Lancia la classificazione AI (edge function "classify") e permette di
// confermare / correggere (override) le proposte prima della pubblicazione.

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLucidoStore } from "@/lib/store";
import type { CostType } from "@/lib/types";
import { formatEur } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/revisione")({
  head: () => ({ meta: [{ title: "Revisione AI — Lucido" }] }),
  component: RevisioneAI,
});

const NO_CLIENT = "__none__";
const bandRank: Record<string, number> = { bassa: 0, media: 1, alta: 2 };

const COST_TYPE_LABEL: Record<CostType, string> = {
  fisso: "Fisso",
  variabile: "Variabile",
  non_costo: "Non-costo",
};

function RevisioneAI() {
  const companyId = useLucidoStore((s) => s.companyId);
  const role = useLucidoStore((s) => s.role);
  const entries = useLucidoStore((s) => s.entries);
  const clients = useLucidoStore((s) => s.clients);
  const updateEntry = useLucidoStore((s) => s.updateEntry);
  const loadAll = useLucidoStore((s) => s.loadAll);

  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Coda: costi non ancora validati, peggio-confidenza + alto-impatto in cima.
  const queue = useMemo(
    () =>
      entries
        .filter((e) => e.direction === "costo" && e.status === "da_validare")
        .sort((a, b) => {
          const r = (bandRank[a.confidence] ?? 0) - (bandRank[b.confidence] ?? 0);
          return r !== 0 ? r : b.amount - a.amount;
        }),
    [entries],
  );

  const runClassify = async () => {
    if (!companyId) {
      toast.error("Nessuna azienda attiva.");
      return;
    }
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("classify", {
        body: { companyId },
      });
      if (error) throw error;
      const d = (data ?? {}) as { classified?: number; skipped?: number; errors?: unknown[] };
      await loadAll();
      toast.success(
        `Classificate ${d.classified ?? 0} voci con l'AI` +
          (d.skipped ? `, ${d.skipped} saltate` : "") + ".",
      );
      if (d.errors && d.errors.length > 0) console.warn("[classify] errori:", d.errors);
    } catch (e) {
      toast.error(`Classificazione fallita: ${(e as Error)?.message ?? "errore"}`);
    } finally {
      setRunning(false);
    }
  };

  const confirm = (id: string) => {
    updateEntry(id, { status: "validato", validatedBy: "Operatore" });
    setSelected((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  };

  const confirmSelected = () => {
    const ids = [...selected].filter((id) => queue.find((q) => q.id === id)?.costType);
    if (ids.length === 0) {
      toast.error("Seleziona voci con il tipo impostato.");
      return;
    }
    ids.forEach((id) => updateEntry(id, { status: "validato", validatedBy: "Operatore" }));
    const skipped = selected.size - ids.length;
    toast.success(`Confermate ${ids.length} voci` + (skipped ? `, ${skipped} senza tipo saltate` : "") + ".");
    setSelected(new Set());
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleAll = () =>
    setSelected((s) => (s.size === queue.length ? new Set() : new Set(queue.map((e) => e.id))));

  if (role === "owner") {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Questa sezione è riservata all'operatore.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Revisione AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            L'AI propone fisso/variabile/non-costo e l'attribuzione al cliente. Conferma o correggi
            prima di pubblicare. Nessun numero va al titolare senza la tua validazione.
          </p>
        </div>
        <Button onClick={runClassify} disabled={running || !companyId}>
          <Sparkles className="mr-1 h-4 w-4" />
          {running ? "Classifico…" : "Classifica con AI"}
        </Button>
      </div>

      {queue.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="text-sm font-medium">Nessuna voce da revisionare.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Importa o aggiungi costi nell'Area dati, poi premi “Classifica con AI”.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {queue.length} voci da validare · {selected.size} selezionate
            </p>
            <Button size="sm" variant="outline" onClick={confirmSelected} disabled={selected.size === 0}>
              <Check className="mr-1 h-4 w-4" /> Conferma selezionate
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full min-w-[1000px] text-xs">
              <thead className="border-b border-border bg-secondary/40 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="w-8 px-2 py-2">
                    <Checkbox
                      checked={selected.size === queue.length && queue.length > 0}
                      onCheckedChange={toggleAll}
                      aria-label="Seleziona tutte"
                    />
                  </th>
                  <th className="px-2 py-2 text-left font-medium">Voce</th>
                  <th className="px-2 py-2 text-right font-medium">Importo</th>
                  <th className="px-2 py-2 text-left font-medium">Confidenza</th>
                  <th className="px-2 py-2 text-left font-medium">Tipo</th>
                  <th className="px-2 py-2 text-left font-medium">Attribuzione</th>
                  <th className="px-2 py-2 text-left font-medium">Motivazione AI</th>
                  <th className="w-24 px-2 py-2"> </th>
                </tr>
              </thead>
              <tbody>
                {queue.map((e) => (
                  <tr key={e.id} className="border-b border-border align-top last:border-b-0">
                    <td className="px-2 py-2">
                      <Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggle(e.id)} />
                    </td>
                    <td className="px-2 py-2">
                      <div className="font-medium text-foreground">{e.description}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {e.counterparty} · {e.date} · fonte {e.source}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatEur(e.amount)}</td>
                    <td className="px-2 py-2">
                      <ConfidenceBadge band={e.confidence} />
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={e.costType ?? ""}
                        onValueChange={(v) => updateEntry(e.id, { costType: v as CostType })}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fisso">Fisso</SelectItem>
                          <SelectItem value="variabile">Variabile</SelectItem>
                          <SelectItem value="non_costo">Non-costo</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={e.clientId ?? NO_CLIENT}
                        onValueChange={(v) =>
                          updateEntry(e.id, { clientId: v === NO_CLIENT ? undefined : v })
                        }
                      >
                        <SelectTrigger className="h-7 w-44 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_CLIENT}>— Non attribuito —</SelectItem>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-2 max-w-[260px]">
                      <span className="text-muted-foreground">{e.rationale || "—"}</span>
                    </td>
                    <td className="px-2 py-2">
                      <Button
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() => confirm(e.id)}
                        disabled={!e.costType}
                        title={!e.costType ? "Imposta il tipo prima di confermare" : undefined}
                      >
                        Conferma
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Confermando, la voce passa a <strong>validata</strong> (validata dall'operatore) ed entra
            nei totali del titolare. {COST_TYPE_LABEL.variabile} attribuito a un cliente incide sul
            primo margine; {COST_TYPE_LABEL.fisso.toLowerCase()} e {COST_TYPE_LABEL.non_costo.toLowerCase()} no.
          </p>
        </>
      )}
    </div>
  );
}

function ConfidenceBadge({ band }: { band: string }) {
  const cls =
    band === "alta"
      ? "border-positive/40 bg-positive/10 text-positive"
      : band === "media"
        ? "border-warning/40 bg-warning/10 text-warning"
        : "border-destructive/40 bg-destructive/10 text-destructive";
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize ${cls}`}>
      {band}
    </span>
  );
}
