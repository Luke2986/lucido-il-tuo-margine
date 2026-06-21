// Import FatturaPA XML (multi-file). Parsing namespace-agnostic con DOMParser,
// anteprima editabile, scrittura su Supabase via store.addEntries.

import { useMemo, useRef, useState } from "react";
import { Upload, Check, X, AlertTriangle, FileWarning, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useLucidoStore } from "@/lib/store";
import type { Entry, EntryDirection } from "@/lib/types";
import { formatEur } from "@/lib/format";

interface ParsedRow {
  uid: string;
  fileName: string;
  date: string;
  invoiceNumber: string;
  tipoDocumento: string;
  counterparty: string;
  counterpartyVat: string;
  description: string;
  amount: number; // netto positivo (IVA esclusa)
  direction: EntryDirection | null; // null = da decidere; per TD04 è già invertita
  detectedFromVat: boolean;
  isCreditNote: boolean; // TD04: nota di credito (direzione invertita)
  clientId?: string;
  include: boolean;
}

interface Skipped { fileName: string; reason: string; }

export function FattureXmlImportPanel() {
  const addEntries = useLucidoStore((s) => s.addEntries);
  const addClient = useLucidoStore((s) => s.addClient);
  const clients = useLucidoStore((s) => s.clients);
  const companyVat = useLucidoStore((s) => s.company.vatNumber);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [skipped, setSkipped] = useState<Skipped[]>([]);
  const [overrideDirection, setOverrideDirection] = useState<EntryDirection>("costo");
  const inputRef = useRef<HTMLInputElement>(null);

  const needsOverride = useMemo(
    () => rows.some((r) => !r.detectedFromVat),
    [rows],
  );
  const undecidedCount = rows.filter((r) => r.direction === null).length;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const parsedRows: ParsedRow[] = [];
    const skippedFiles: Skipped[] = [];

    for (const file of Array.from(files)) {
      if (/\.p7m$/i.test(file.name)) {
        skippedFiles.push({
          fileName: file.name,
          reason: "Firma .p7m non supportata: carica l'XML non firmato.",
        });
        continue;
      }
      try {
        const text = await file.text();
        const doc = new DOMParser().parseFromString(text, "application/xml");
        if (doc.getElementsByTagName("parsererror").length > 0) {
          skippedFiles.push({ fileName: file.name, reason: "XML non valido." });
          continue;
        }
        const root = doc.documentElement;
        if (!localNameEquals(root, "FatturaElettronica")) {
          skippedFiles.push({ fileName: file.name, reason: "Non è un file FatturaPA." });
          continue;
        }
        const extracted = parseFatturaPA(doc, file.name, companyVat);
        if (extracted.length === 0) {
          skippedFiles.push({ fileName: file.name, reason: "Nessun corpo fattura trovato." });
          continue;
        }
        parsedRows.push(...extracted);
      } catch (err) {
        console.error(err);
        skippedFiles.push({ fileName: file.name, reason: "Errore di lettura." });
      }
    }

    // Match controparte → cliente esistente (solo ricavi)
    parsedRows.forEach((r) => {
      if (r.direction === "ricavo" && !r.clientId) {
        const match = clients.find(
          (c) => c.name.trim().toLowerCase() === r.counterparty.trim().toLowerCase(),
        );
        if (match) r.clientId = match.id;
      }
    });

    setRows(parsedRows);
    setSkipped(skippedFiles);

    if (parsedRows.length > 0) {
      toast.success(`Lette ${parsedRows.length} fatture da ${files.length} file.`);
    } else if (skippedFiles.length > 0) {
      toast.error("Nessuna fattura valida trovata.");
    }
  };

  const reset = () => {
    setRows([]);
    setSkipped([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const updateRow = (uid: string, patch: Partial<ParsedRow>) => {
    setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  };

  const removeRow = (uid: string) => {
    setRows((rs) => rs.filter((r) => r.uid !== uid));
  };

  const handleCreateClient = (uid: string) => {
    const row = rows.find((r) => r.uid === uid);
    if (!row || !row.counterparty) return;
    const created = addClient({ name: row.counterparty, kind: "cliente" });
    updateRow(uid, { clientId: created.id });
    toast.success(`Cliente "${created.name}" creato.`);
  };

  const handleImport = () => {
    const toImport = rows.filter((r) => r.include);
    if (toImport.length === 0) {
      toast.error("Nessuna voce selezionata.");
      return;
    }
    // Applica direzione di override se mancante
    const built: Omit<Entry, "id">[] = toImport.map((r) => {
      const direction: EntryDirection = r.direction ?? overrideDirection;
      return {
        date: r.date,
        description: r.description || `Fattura n. ${r.invoiceNumber}`,
        counterparty: r.counterparty,
        amount: Math.abs(r.amount),
        // TD04 (nota di credito): la direzione è già invertita in fase di parsing,
        // l'importo resta positivo (es. nota di credito su un costo → conta come ricavo).
        direction,
        costType: undefined,
        clientId: r.clientId,
        source: "fattura",
        confidence: "bassa",
        status: "da_validare",
        invoiceNumber: r.invoiceNumber || undefined,
        validatedBy: "AI",
      };
    });
    addEntries(built);
    toast.success(`Importate ${built.length} voci da fattura.`);
    reset();
  };

  const includedCount = rows.filter((r) => r.include).length;
  const canImport = includedCount > 0 && (!needsOverride || undecidedCount === 0 || overrideDirection);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-tight">Importa fatture elettroniche (FatturaPA XML)</h2>
        <p className="text-xs text-muted-foreground">
          Carica uno o più file .xml. Direzione (ricavo/costo) rilevata automaticamente dalla P.IVA azienda.
          Le voci restano modificabili nell'editor.
        </p>
      </div>

      {rows.length === 0 && skipped.length === 0 ? (
        <FileDrop inputRef={inputRef} onFiles={handleFiles} />
      ) : (
        <div className="space-y-5">
          {skipped.length > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-xs">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
                <FileWarning className="h-3.5 w-3.5" /> File saltati ({skipped.length})
              </div>
              <ul className="space-y-0.5 text-muted-foreground">
                {skipped.map((s, i) => (
                  <li key={i}><span className="font-medium text-foreground">{s.fileName}</span> — {s.reason}</li>
                ))}
              </ul>
            </div>
          )}

          {rows.length > 0 && (
            <>
              {!companyVat && (
                <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-xs">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-warning" />
                  <span>
                    P.IVA azienda non impostata in Impostazioni. Imposta direzione e controparte a mano qui sotto.
                  </span>
                </div>
              )}

              {needsOverride && undecidedCount > 0 && (
                <div className="rounded-md border border-border bg-card px-3 py-2.5">
                  <div className="mb-1.5 text-xs font-medium">
                    {undecidedCount} fatture senza direzione rilevata — scegli:
                  </div>
                  <Select value={overrideDirection} onValueChange={(v) => setOverrideDirection(v as EntryDirection)}>
                    <SelectTrigger className="h-8 w-64 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ricavo">Attive (ricavi)</SelectItem>
                      <SelectItem value="costo">Passive (costi)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="overflow-x-auto rounded-md border border-border bg-card">
                <table className="w-full min-w-[900px] text-xs">
                  <thead className="border-b border-border bg-secondary/40 text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <Th className="w-8"> </Th>
                      <Th>Data</Th>
                      <Th>Controparte</Th>
                      <Th>Descrizione</Th>
                      <Th className="text-right">Importo (netto)</Th>
                      <Th>Direzione</Th>
                      <Th>Cliente</Th>
                      <Th className="w-8"> </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const dir = r.direction ?? overrideDirection;
                      return (
                        <tr key={r.uid} className="border-b border-border last:border-b-0">
                          <Td>
                            <Checkbox
                              checked={r.include}
                              onCheckedChange={(v) => updateRow(r.uid, { include: !!v })}
                            />
                          </Td>
                          <Td>
                            <Input
                              type="date"
                              value={r.date}
                              onChange={(e) => updateRow(r.uid, { date: e.target.value })}
                              className="h-7 w-32 text-xs"
                            />
                          </Td>
                          <Td>
                            <Input
                              value={r.counterparty}
                              onChange={(e) => updateRow(r.uid, { counterparty: e.target.value })}
                              className="h-7 w-44 text-xs"
                            />
                          </Td>
                          <Td>
                            <Input
                              value={r.description}
                              onChange={(e) => updateRow(r.uid, { description: e.target.value })}
                              className="h-7 w-56 text-xs"
                            />
                          </Td>
                          <Td className="text-right tabular">
                            <Input
                              type="number"
                              step="0.01"
                              value={r.amount}
                              onChange={(e) => updateRow(r.uid, { amount: Number(e.target.value) || 0 })}
                              className="h-7 w-28 text-right text-xs"
                            />
                            <div className="text-[10px] text-muted-foreground">{formatEur(Math.abs(r.amount))}</div>
                          </Td>
                          <Td>
                            <Select
                              value={dir}
                              onValueChange={(v) => updateRow(r.uid, { direction: v as EntryDirection })}
                            >
                              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ricavo">Ricavo</SelectItem>
                                <SelectItem value="costo">Costo</SelectItem>
                              </SelectContent>
                            </Select>
                            {!r.detectedFromVat && (
                              <div className="text-[10px] text-warning">manuale</div>
                            )}
                            {r.isCreditNote && (
                              <div className="text-[10px] text-warning">nota credito (segno invertito)</div>
                            )}
                          </Td>
                          <Td>
                            {dir === "ricavo" ? (
                              r.clientId ? (
                                <Select
                                  value={r.clientId}
                                  onValueChange={(v) => updateRow(r.uid, { clientId: v })}
                                >
                                  <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {clients.map((c) => (
                                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[11px]"
                                  onClick={() => handleCreateClient(r.uid)}
                                  disabled={!r.counterparty}
                                >
                                  Crea cliente
                                </Button>
                              )
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </Td>
                          <Td>
                            <Button variant="ghost" size="sm" onClick={() => removeRow(r.uid)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {includedCount} di {rows.length} fatture selezionate.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={reset}>Annulla</Button>
                  <Button onClick={handleImport} disabled={!canImport}>
                    <Check className="mr-1 h-4 w-4" /> Conferma import ({includedCount})
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Le voci avranno fonte <strong>Fattura</strong>, stato <strong>Da validare</strong>,
                confidenza <strong>Bassa</strong>. La classificazione fisso/variabile va fatta nell'editor.
              </p>
            </>
          )}

          {rows.length === 0 && skipped.length > 0 && (
            <Button variant="outline" onClick={reset}>Riprova</Button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- UI helpers ----------

function FileDrop({
  inputRef, onFiles,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | null) => void;
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card px-6 py-10 text-center transition-colors hover:bg-secondary/40">
      <Upload className="h-6 w-6 text-muted-foreground" />
      <span className="text-sm font-medium">Trascina o seleziona uno o più file XML</span>
      <span className="text-xs text-muted-foreground">
        Formato: FatturaPA .xml (firmati .xml.p7m non supportati)
      </span>
      <Input
        ref={inputRef}
        type="file"
        accept=".xml,application/xml,text/xml"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
    </label>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-2 py-2 text-left font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-2 align-middle ${className}`}>{children}</td>;
}

// ---------- Parsing FatturaPA ----------

function localNameEquals(el: Element, name: string): boolean {
  return el.localName === name || el.nodeName.split(":").pop() === name;
}

function findAll(root: Element | Document, name: string): Element[] {
  // namespace-agnostic
  const list = (root as Element).getElementsByTagNameNS
    ? (root as Element).getElementsByTagNameNS("*", name)
    : (root as Document).getElementsByTagName(name);
  return Array.from(list as unknown as HTMLCollectionOf<Element>);
}

function findFirst(root: Element | Document, name: string): Element | null {
  const all = findAll(root, name);
  return all[0] ?? null;
}

function textOf(root: Element | Document | null, name: string): string {
  if (!root) return "";
  const el = findFirst(root, name);
  return el?.textContent?.trim() ?? "";
}

function normalizeVat(v: string): string {
  return v.replace(/^IT/i, "").replace(/\s+/g, "").trim();
}

function getCounterpartyName(party: Element | null): string {
  if (!party) return "";
  const anagrafica = findFirst(party, "Anagrafica");
  if (!anagrafica) return "";
  const denom = textOf(anagrafica, "Denominazione");
  if (denom) return denom;
  const nome = textOf(anagrafica, "Nome");
  const cognome = textOf(anagrafica, "Cognome");
  return [nome, cognome].filter(Boolean).join(" ").trim();
}

function getPartyVat(party: Element | null): string {
  if (!party) return "";
  const idFiscale = findFirst(party, "IdFiscaleIVA");
  if (!idFiscale) return "";
  return normalizeVat(textOf(idFiscale, "IdCodice"));
}

function parseFatturaPA(doc: Document, fileName: string, companyVat: string): ParsedRow[] {
  const companyVatNorm = normalizeVat(companyVat || "");

  const cedente = findFirst(doc, "CedentePrestatore");
  const cessionario = findFirst(doc, "CessionarioCommittente");
  const cedenteVat = getPartyVat(cedente);
  const cessionarioVat = getPartyVat(cessionario);
  const cedenteName = getCounterpartyName(cedente);
  const cessionarioName = getCounterpartyName(cessionario);

  let direction: EntryDirection | null = null;
  let counterparty = "";
  let counterpartyVat = "";
  let detectedFromVat = false;
  if (companyVatNorm) {
    if (cedenteVat && companyVatNorm === cedenteVat) {
      direction = "ricavo";
      counterparty = cessionarioName;
      counterpartyVat = cessionarioVat;
      detectedFromVat = true;
    } else if (cessionarioVat && companyVatNorm === cessionarioVat) {
      direction = "costo";
      counterparty = cedenteName;
      counterpartyVat = cedenteVat;
      detectedFromVat = true;
    }
  }
  if (!detectedFromVat) {
    // Senza match: assumiamo che l'altra parte sia il cedente (costi di solito).
    counterparty = cedenteName || cessionarioName;
    counterpartyVat = cedenteVat || cessionarioVat;
  }

  const bodies = findAll(doc, "FatturaElettronicaBody");
  const out: ParsedRow[] = [];
  for (const body of bodies) {
    const datiGen = findFirst(body, "DatiGeneraliDocumento");
    if (!datiGen) continue;
    const date = textOf(datiGen, "Data");
    const invoiceNumber = textOf(datiGen, "Numero");
    const tipoDocumento = textOf(datiGen, "TipoDocumento");
    const isCreditNote = tipoDocumento === "TD04";

    // Imponibile = somma di ImponibileImporto in DatiRiepilogo (sempre positivo, IVA esclusa)
    const riepiloghi = findAll(body, "DatiRiepilogo");
    let imponibile = 0;
    for (const r of riepiloghi) {
      const v = textOf(r, "ImponibileImporto");
      const n = Number(v.replace(",", "."));
      if (!isNaN(n)) imponibile += n;
    }
    // Fallback: ImportoTotaleDocumento (se nessun riepilogo)
    if (imponibile === 0) {
      const tot = Number(textOf(datiGen, "ImportoTotaleDocumento").replace(",", ".")) || 0;
      imponibile = tot;
    }
    imponibile = Math.abs(imponibile);

    // Nota di credito (TD04): non si nega l'importo, si INVERTE la direzione economica.
    // Es. nota di credito su una fattura passiva (costo) → riduce i costi → conta come ricavo.
    const effectiveDirection: EntryDirection | null =
      isCreditNote && direction ? (direction === "costo" ? "ricavo" : "costo") : direction;

    const firstDesc = textOf(body, "Descrizione");
    const description = `${isCreditNote ? "Nota di credito" : "Fattura"} n. ${invoiceNumber}${firstDesc ? ` — ${firstDesc}` : ""}`;

    out.push({
      uid: `${fileName}-${invoiceNumber}-${out.length}`,
      fileName,
      date: date || new Date().toISOString().slice(0, 10),
      invoiceNumber,
      tipoDocumento,
      counterparty,
      counterpartyVat,
      description,
      amount: imponibile,
      direction: effectiveDirection,
      detectedFromVat,
      isCreditNote,
      include: true,
    });
  }
  return out;
}
