// Editor voci: tabella modificabile con select inline, duplica, elimina,
// aggiungi riga. Filtri rapidi per direzione e stato.

import { useMemo, useState } from "react";
import { Plus, Copy, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLucidoStore } from "@/lib/store";
import type {
  ConfidenceBand, CostType, Entry, EntryDirection, EntrySource, ValidationStatus,
} from "@/lib/types";
import { formatEur } from "@/lib/format";

const DIRECTIONS: { value: EntryDirection; label: string }[] = [
  { value: "ricavo", label: "Ricavo" },
  { value: "costo", label: "Costo" },
];
const COST_TYPES: { value: CostType; label: string }[] = [
  { value: "variabile", label: "Variabile" },
  { value: "fisso", label: "Fisso" },
  { value: "non_costo", label: "Non-costo" },
];
const SOURCES: { value: EntrySource; label: string }[] = [
  { value: "manuale", label: "Manuale" },
  { value: "fattura", label: "Fattura" },
  { value: "banca", label: "Banca" },
  { value: "excel", label: "Excel" },
];
const CONFIDENCES: { value: ConfidenceBand; label: string }[] = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "bassa", label: "Bassa" },
];
const STATUSES: { value: ValidationStatus; label: string }[] = [
  { value: "validato", label: "Validato" },
  { value: "da_validare", label: "Da validare" },
];

const UNATTRIBUTED = "__none__";

export function EntriesEditor() {
  const entries = useLucidoStore((s) => s.entries);
  const clients = useLucidoStore((s) => s.clients);
  const addEntry = useLucidoStore((s) => s.addEntry);
  const updateEntry = useLucidoStore((s) => s.updateEntry);
  const duplicateEntry = useLucidoStore((s) => s.duplicateEntry);
  const removeEntry = useLucidoStore((s) => s.removeEntry);

  const [query, setQuery] = useState("");
  const [dirFilter, setDirFilter] = useState<"all" | EntryDirection>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ValidationStatus>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (dirFilter !== "all" && e.direction !== dirFilter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (q && !`${e.description} ${e.counterparty}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, query, dirFilter, statusFilter]);

  const handleAdd = () => {
    const today = new Date().toISOString().slice(0, 10);
    addEntry({
      date: today,
      description: "Nuova voce",
      counterparty: "",
      amount: 0,
      direction: "costo",
      costType: "variabile",
      source: "manuale",
      confidence: "alta",
      status: "da_validare",
    });
    toast.success("Voce aggiunta. Compila i campi.");
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Editor voci</h2>
          <p className="text-xs text-muted-foreground">
            Ogni modifica ricalcola la dashboard del titolare in tempo reale.
          </p>
        </div>
        <Button size="sm" onClick={handleAdd}>
          <Plus className="mr-1 h-4 w-4" /> Aggiungi riga
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca descrizione o controparte"
            className="h-8 w-64 pl-7 text-xs"
          />
        </div>
        <Select value={dirFilter} onValueChange={(v) => setDirFilter(v as typeof dirFilter)}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le direzioni</SelectItem>
            <SelectItem value="ricavo">Solo ricavi</SelectItem>
            <SelectItem value="costo">Solo costi</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="validato">Validate</SelectItem>
            <SelectItem value="da_validare">Da validare</SelectItem>
          </SelectContent>
        </Select>
        <p className="ml-auto text-xs text-muted-foreground">
          {filtered.length} di {entries.length} voci
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[1100px] text-xs">
          <thead className="border-b border-border bg-secondary/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <Th>Data</Th>
              <Th>Descrizione</Th>
              <Th>Controparte</Th>
              <Th className="text-right">Importo</Th>
              <Th>Direzione</Th>
              <Th>Tipo costo</Th>
              <Th>Attribuzione</Th>
              <Th>Fonte</Th>
              <Th>Confidenza</Th>
              <Th>Stato</Th>
              <Th className="w-[80px] text-right">Azioni</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nessuna voce trovata.
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <EntryRow
                  key={e.id}
                  entry={e}
                  clients={clients}
                  onUpdate={(patch) => updateEntry(e.id, patch)}
                  onDuplicate={() => { duplicateEntry(e.id); toast.success("Voce duplicata"); }}
                  onRemove={() => { removeEntry(e.id); toast.success("Voce eliminata"); }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-2 py-2 text-left font-medium ${className}`}>{children}</th>;
}

function EntryRow({
  entry, clients, onUpdate, onDuplicate, onRemove,
}: {
  entry: Entry;
  clients: { id: string; name: string }[];
  onUpdate: (patch: Partial<Entry>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const isCost = entry.direction === "costo";

  return (
    <tr className="border-b border-border last:border-b-0 align-top">
      <Td>
        <Input
          type="date"
          value={entry.date}
          onChange={(ev) => onUpdate({ date: ev.target.value })}
          className="h-7 w-36 text-xs"
        />
      </Td>
      <Td>
        <Input
          value={entry.description}
          onChange={(ev) => onUpdate({ description: ev.target.value })}
          className="h-7 w-56 text-xs"
        />
      </Td>
      <Td>
        <Input
          value={entry.counterparty}
          onChange={(ev) => onUpdate({ counterparty: ev.target.value })}
          className="h-7 w-44 text-xs"
        />
      </Td>
      <Td className="text-right">
        <div className="flex flex-col items-end gap-0.5">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={entry.amount}
            onChange={(ev) => onUpdate({ amount: Number(ev.target.value) || 0 })}
            className="h-7 w-28 text-right text-xs tabular"
          />
          <span className={`tabular text-[10px] ${entry.direction === "ricavo" ? "text-positive" : "text-muted-foreground"}`}>
            {entry.direction === "ricavo" ? "+" : "−"}{formatEur(entry.amount)}
          </span>
        </div>
      </Td>
      <Td>
        <Select
          value={entry.direction}
          onValueChange={(v) => {
            const direction = v as EntryDirection;
            onUpdate(direction === "ricavo"
              ? { direction, costType: undefined }
              : { direction, costType: entry.costType ?? "variabile" });
          }}
        >
          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DIRECTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Td>
      <Td>
        {isCost ? (
          <Select
            value={entry.costType ?? "variabile"}
            onValueChange={(v) => onUpdate({ costType: v as CostType })}
          >
            <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COST_TYPES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
      </Td>
      <Td>
        <Select
          value={entry.clientId ?? UNATTRIBUTED}
          onValueChange={(v) => onUpdate({ clientId: v === UNATTRIBUTED ? undefined : v })}
        >
          <SelectTrigger className="h-7 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={UNATTRIBUTED}>— Non attribuita</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Td>
      <Td>
        <Select value={entry.source} onValueChange={(v) => onUpdate({ source: v as EntrySource })}>
          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SOURCES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Td>
      <Td>
        <Select value={entry.confidence} onValueChange={(v) => onUpdate({ confidence: v as ConfidenceBand })}>
          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CONFIDENCES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Td>
      <Td>
        <div className="flex items-center gap-1">
          <Select value={entry.status} onValueChange={(v) => onUpdate({ status: v as ValidationStatus })}>
            <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {entry.status === "da_validare" && (
            <Badge className="bg-warning text-warning-foreground hover:bg-warning text-[9px]">!</Badge>
          )}
        </div>
      </Td>
      <Td className="text-right">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onDuplicate} title="Duplica">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onRemove} title="Elimina">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Td>
    </tr>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-2 ${className}`}>{children}</td>;
}
