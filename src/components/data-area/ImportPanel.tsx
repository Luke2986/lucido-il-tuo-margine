// Import Excel/CSV con SheetJS. Lettura → mapping colonne → anteprima → creazione voci.
// Tutte le voci create sono modificabili dopo nell'editor.

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useLucidoStore } from "@/lib/store";
import type { Entry, EntryDirection } from "@/lib/types";
import { formatEur } from "@/lib/format";

type Row = Record<string, unknown>;

interface Mapping {
  date: string;
  description: string;
  counterparty: string;
  amount: string;
  direction: string; // colonna o "__fixed__"
  fixedDirection: EntryDirection;
}

const NONE = "__none__";
const FIXED = "__fixed__";

export function ImportPanel() {
  const addEntries = useLucidoStore((s) => s.addEntries);
  const clients = useLucidoStore((s) => s.clients);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Mapping>({
    date: "", description: "", counterparty: "", amount: "",
    direction: FIXED, fixedDirection: "costo",
  });
  const [defaultClient, setDefaultClient] = useState<string>(NONE);

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "", raw: false });
      if (json.length === 0) {
        toast.error("Il file è vuoto.");
        return;
      }
      const cols = Object.keys(json[0]);
      setRows(json);
      setColumns(cols);
      setFileName(file.name);
      // Mapping automatico best-effort sulle intestazioni italiane più comuni.
      setMapping((m) => ({
        ...m,
        date: guess(cols, ["data", "date"]) ?? "",
        description: guess(cols, ["descrizione", "description", "causale"]) ?? "",
        counterparty: guess(cols, ["controparte", "fornitore", "cliente", "counterparty"]) ?? "",
        amount: guess(cols, ["importo", "amount", "totale"]) ?? "",
      }));
      toast.success(`File letto: ${json.length} righe.`);
    } catch (err) {
      console.error(err);
      toast.error("Impossibile leggere il file.");
    }
  };

  const preview = useMemo(() => {
    if (!rows) return [];
    return rows.slice(0, 5).map((r) => buildEntry(r, mapping, defaultClient));
  }, [rows, mapping, defaultClient]);

  const canImport = rows && mapping.date && mapping.description && mapping.amount;

  const handleImport = () => {
    if (!rows) return;
    const built = rows.map((r) => buildEntry(r, mapping, defaultClient));
    const valid = built.filter((e) => e.amount > 0 && e.description);
    addEntries(valid);
    toast.success(`Importate ${valid.length} voci (di ${rows.length} righe).`);
    setRows(null);
    setColumns([]);
    setFileName("");
  };

  const reset = () => { setRows(null); setColumns([]); setFileName(""); };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-tight">Importa da Excel o CSV</h2>
        <p className="text-xs text-muted-foreground">
          Carica un file, mappa le colonne, conferma. Le voci restano modificabili nell'editor.
        </p>
      </div>

      {!rows ? (
        <FileDrop onFile={handleFile} />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-xs">
            <span className="truncate">
              <span className="font-medium text-foreground">{fileName}</span>{" "}
              <span className="text-muted-foreground">· {rows.length} righe · colonne: {columns.join(", ")}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={reset}><X className="h-3.5 w-3.5" /></Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MapField label="Data" cols={columns} value={mapping.date} onChange={(v) => setMapping({ ...mapping, date: v })} />
            <MapField label="Descrizione" cols={columns} value={mapping.description} onChange={(v) => setMapping({ ...mapping, description: v })} />
            <MapField label="Controparte" cols={columns} value={mapping.counterparty} onChange={(v) => setMapping({ ...mapping, counterparty: v })} optional />
            <MapField label="Importo" cols={columns} value={mapping.amount} onChange={(v) => setMapping({ ...mapping, amount: v })} />
            <div className="space-y-1.5">
              <Label className="text-xs">Direzione</Label>
              <Select value={mapping.direction} onValueChange={(v) => setMapping({ ...mapping, direction: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={FIXED}>Stessa per tutte le righe</SelectItem>
                  {columns.map((c) => <SelectItem key={c} value={c}>Da colonna: {c}</SelectItem>)}
                </SelectContent>
              </Select>
              {mapping.direction === FIXED && (
                <Select value={mapping.fixedDirection} onValueChange={(v) => setMapping({ ...mapping, fixedDirection: v as EntryDirection })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="costo">Tutte costi</SelectItem>
                    <SelectItem value="ricavo">Tutte ricavi</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Attribuzione di default</Label>
              <Select value={defaultClient} onValueChange={setDefaultClient}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Non attribuita</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Anteprima (prime 5 righe)
            </h3>
            <div className="overflow-x-auto rounded-md border border-border bg-card">
              <table className="w-full min-w-[700px] text-xs">
                <thead className="border-b border-border bg-secondary/40 text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <Th>Data</Th><Th>Descrizione</Th><Th>Controparte</Th>
                    <Th className="text-right">Importo</Th><Th>Direzione</Th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((e, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0">
                      <Td>{e.date}</Td>
                      <Td className="max-w-[260px] truncate">{e.description}</Td>
                      <Td className="max-w-[180px] truncate">{e.counterparty}</Td>
                      <Td className="text-right tabular">{formatEur(e.amount)}</Td>
                      <Td>{e.direction === "ricavo" ? "Ricavo" : "Costo"}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={reset}>Annulla</Button>
            <Button onClick={handleImport} disabled={!canImport}>
              <Check className="mr-1 h-4 w-4" /> Importa {rows.length} righe
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Le voci importate avranno stato <strong>Da validare</strong>, fonte <strong>Excel</strong>,
            confidenza <strong>Media</strong>. Sono tutte modificabili nell'editor.
          </p>
        </div>
      )}
    </div>
  );
}

function FileDrop({ onFile }: { onFile: (f: File) => void }) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card px-6 py-10 text-center transition-colors hover:bg-secondary/40">
      <Upload className="h-6 w-6 text-muted-foreground" />
      <span className="text-sm font-medium">Trascina o seleziona un file</span>
      <span className="text-xs text-muted-foreground">Formati supportati: .xlsx, .xls, .csv</span>
      <Input
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function MapField({
  label, cols, value, onChange, optional = false,
}: {
  label: string; cols: string[]; value: string; onChange: (v: string) => void; optional?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label} {optional && <span className="text-muted-foreground">(opzionale)</span>}
      </Label>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— Seleziona colonna" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>— Nessuna</SelectItem>
          {cols.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-2 py-2 text-left font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-2 ${className}`}>{children}</td>;
}

// ---------- Helpers ----------

function guess(cols: string[], candidates: string[]): string | null {
  for (const cand of candidates) {
    const hit = cols.find((c) => c.toLowerCase().trim() === cand);
    if (hit) return hit;
  }
  for (const cand of candidates) {
    const hit = cols.find((c) => c.toLowerCase().includes(cand));
    if (hit) return hit;
  }
  return null;
}

function buildEntry(row: Row, m: Mapping, defaultClient: string): Omit<Entry, "id"> {
  const rawDate = row[m.date];
  const date = parseDate(rawDate);
  const description = String(row[m.description] ?? "").trim();
  const counterparty = m.counterparty ? String(row[m.counterparty] ?? "").trim() : "";
  const amount = Math.abs(parseAmount(row[m.amount]));
  const direction: EntryDirection =
    m.direction === FIXED
      ? m.fixedDirection
      : inferDirection(row[m.direction], m.fixedDirection);
  return {
    date,
    description: description || "(senza descrizione)",
    counterparty,
    amount,
    direction,
    costType: direction === "costo" ? "variabile" : undefined,
    clientId: defaultClient === NONE ? undefined : defaultClient,
    source: "excel",
    confidence: "media",
    status: "da_validare",
    validatedBy: "AI",
  };
}

function parseDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v ?? "").trim();
  if (!s) return new Date().toISOString().slice(0, 10);
  // gg/mm/aaaa
  const it = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (it) {
    const [, d, mo, y] = it;
    const yyyy = y.length === 2 ? `20${y}` : y;
    return `${yyyy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function parseAmount(v: unknown): number {
  if (typeof v === "number") return v;
  let s = String(v ?? "").trim();
  if (!s) return 0;
  // formato it: 1.234,56 → 1234.56
  s = s.replace(/[^\d,.\-]/g, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function inferDirection(v: unknown, fallback: EntryDirection): EntryDirection {
  const s = String(v ?? "").toLowerCase().trim();
  if (["ricavo", "ricavi", "entrata", "credito", "incasso", "+"].includes(s)) return "ricavo";
  if (["costo", "costi", "uscita", "debito", "pagamento", "-"].includes(s)) return "costo";
  const n = Number(s);
  if (!isNaN(n)) return n >= 0 ? "ricavo" : "costo";
  return fallback;
}
