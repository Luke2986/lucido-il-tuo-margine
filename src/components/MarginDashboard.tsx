import { useMemo, useState } from "react";
import { ChevronRight, TrendingDown, TrendingUp, ShieldCheck, AlertCircle, FileText, Landmark, Sparkles, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { computeRows, mockReport, type MarginRow, type ConfidenceBand } from "@/lib/mock-margins";
import { formatDate, formatEur, formatPercent } from "@/lib/format";

export function MarginDashboard() {
  const rows = useMemo(() => computeRows(mockReport.clients), []);
  const [selected, setSelected] = useState<MarginRow | null>(null);

  const validated = rows.filter((r) => r.status === "validata");
  const inProgress = rows.filter((r) => r.status === "da_validare");

  const totals = useMemo(() => {
    const revenue = validated.reduce((s, r) => s + r.revenue, 0);
    const variable = validated.reduce((s, r) => s + r.variableCosts, 0);
    const margin = revenue - variable;
    const losing = validated.filter((r) => r.isLoss).length;
    return { revenue, variable, margin, losing };
  }, [validated]);

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-10">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {mockReport.companyName} · {mockReport.periodLabel}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Quali clienti ti fanno guadagnare
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pubblicato il {formatDate(mockReport.publishedAt)} · sola lettura
          </p>
        </header>

        <SummaryStrip
          losing={totals.losing}
          margin={totals.margin}
          revenue={totals.revenue}
          coverage={mockReport.validatedRevenueShare}
        />

        <section aria-labelledby="sec-validati" className="mt-10">
          <SectionHeader
            id="sec-validati"
            title="Margine per cliente"
            hint="Ordinati dal peggiore al migliore. Le righe in rosso sono in perdita."
          />
          <MarginList rows={validated} onSelect={setSelected} />
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Primo margine</strong> = ricavi − costi variabili.
            I costi fissi non sono ripartiti.
          </p>
        </section>

        {inProgress.length > 0 && (
          <section aria-labelledby="sec-lavorazione" className="mt-12">
            <SectionHeader
              id="sec-lavorazione"
              title="In lavorazione"
              hint="Classificazione non ancora confermata: numeri indicativi, esclusi dai totali."
              tone="warning"
            />
            <MarginList rows={inProgress} onSelect={setSelected} muted />
          </section>
        )}
      </div>

      <WhySheet
        row={selected}
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}

// ---------- Riepilogo ----------

function SummaryStrip(props: { losing: number; margin: number; revenue: number; coverage: number }) {
  const { losing, margin, revenue, coverage } = props;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard
        label="Clienti in perdita"
        value={String(losing)}
        accent={losing > 0 ? "destructive" : "positive"}
        icon={losing > 0 ? <AlertCircle className="h-4 w-4" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
        hint={losing > 0 ? "Da affrontare per primi" : "Nessun cliente in perdita"}
      />
      <StatCard
        label="Margine totale del periodo"
        value={formatEur(margin)}
        accent={margin < 0 ? "destructive" : "positive"}
        icon={margin < 0 ? <TrendingDown className="h-4 w-4" aria-hidden /> : <TrendingUp className="h-4 w-4" aria-hidden />}
        hint={`Su ${formatEur(revenue)} di ricavo validato`}
      />
      <StatCard
        label="Copertura validata"
        value={formatPercent(coverage)}
        accent="neutral"
        icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
        hint="Quota di ricavo con classificazione confermata"
      />
    </div>
  );
}

function StatCard(props: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  accent: "destructive" | "positive" | "neutral";
}) {
  const accentClass =
    props.accent === "destructive"
      ? "text-destructive"
      : props.accent === "positive"
      ? "text-positive"
      : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span className={accentClass}>{props.icon}</span>
        {props.label}
      </div>
      <p className={`mt-3 text-3xl font-semibold tabular ${accentClass}`}>{props.value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{props.hint}</p>
    </div>
  );
}

// ---------- Lista margine ----------

function SectionHeader(props: { id: string; title: string; hint: string; tone?: "warning" }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 id={props.id} className="text-lg font-semibold tracking-tight">
        {props.title}
      </h2>
      <p className={`text-xs ${props.tone === "warning" ? "text-warning-foreground" : "text-muted-foreground"}`}>
        {props.hint}
      </p>
    </div>
  );
}

function MarginList({
  rows,
  onSelect,
  muted = false,
}: {
  rows: MarginRow[];
  onSelect: (row: MarginRow) => void;
  muted?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        Nessun cliente in questa sezione.
      </p>
    );
  }
  return (
    <ul className={`overflow-hidden rounded-lg border border-border bg-card shadow-sm ${muted ? "opacity-90" : ""}`}>
      {rows.map((row, i) => (
        <li key={row.id} className={i > 0 ? "border-t border-border" : ""}>
          <MarginRowItem row={row} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
}

function MarginRowItem({ row, onSelect }: { row: MarginRow; onSelect: (r: MarginRow) => void }) {
  const accent = row.isLoss ? "bg-destructive" : "bg-positive";
  const marginColor = row.isLoss ? "text-destructive" : "text-positive";
  const sign = row.isLoss ? "−" : "+";
  const absMargin = Math.abs(row.margin);

  return (
    <div className="relative">
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} aria-hidden />
      <button
        type="button"
        onClick={() => onSelect(row)}
        className="grid w-full grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 px-5 py-4 pl-6 text-left transition-colors hover:bg-secondary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground sm:text-base">{row.name}</p>
            {row.kind === "commessa" && (
              <Badge variant="outline" className="text-[10px] font-medium uppercase">commessa</Badge>
            )}
            {row.status === "da_validare" && (
              <Badge className="bg-warning text-warning-foreground hover:bg-warning">Da validare</Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {row.isLoss
              ? `In perdita di ${formatEur(absMargin)}`
              : `Margine ${formatEur(row.margin)} (${formatPercent(row.marginPct)})`}
          </p>
        </div>

        <div className="hidden text-right sm:block">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Ricavo</p>
          <p className="tabular text-sm font-medium text-foreground">{formatEur(row.revenue)}</p>
        </div>

        <div className="hidden text-right sm:block">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Costi variabili</p>
          <p className="tabular text-sm font-medium text-foreground">{formatEur(row.variableCosts)}</p>
        </div>

        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Primo margine</p>
          <p className={`tabular text-lg font-semibold ${marginColor}`}>
            <span aria-hidden>{sign}</span>
            <span className="sr-only">{row.isLoss ? "in perdita" : "in attivo"}</span>
            {formatEur(absMargin)}
            <span className="ml-1 text-xs font-medium">({formatPercent(Math.abs(row.marginPct))})</span>
          </p>
        </div>

        <ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden />
      </button>
    </div>
  );
}

// ---------- Sheet "Perché questo numero" ----------

function WhySheet({
  row,
  open,
  onOpenChange,
}: {
  row: MarginRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        {row && <WhyContent row={row} />}
      </SheetContent>
    </Sheet>
  );
}

function WhyContent({ row }: { row: MarginRow }) {
  const absMargin = Math.abs(row.margin);
  const marginColor = row.isLoss ? "text-destructive" : "text-positive";

  return (
    <>
      <SheetHeader className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Perché questo numero
        </p>
        <SheetTitle className="text-xl font-semibold tracking-tight">{row.name}</SheetTitle>
        <SheetDescription className="text-sm leading-relaxed text-foreground">
          Questo cliente ti è costato{" "}
          <strong className="tabular">{formatEur(row.variableCosts)}</strong> di costi variabili a
          fronte di <strong className="tabular">{formatEur(row.revenue)}</strong> di ricavo → primo
          margine{" "}
          <strong className={`tabular ${marginColor}`}>
            {row.isLoss ? `−${formatEur(absMargin)}` : `+${formatEur(absMargin)}`}{" "}
            ({formatPercent(Math.abs(row.marginPct))})
          </strong>
          .
        </SheetDescription>
      </SheetHeader>

      <Separator className="my-5" />

      <DetailBlock title={`Ricavi attribuiti · ${formatEur(row.revenue)}`}>
        {row.revenues.map((r, i) => (
          <li key={i} className="px-3 py-2.5">
            <div className="flex items-start justify-between gap-4 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{r.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <SourceBadge source="fattura" />
                  <span>n. {r.invoiceNumber}</span>
                  <span>·</span>
                  <span>{formatDate(r.date)}</span>
                </div>
              </div>
              <span className="tabular shrink-0 text-positive">+{formatEur(r.amount, true)}</span>
            </div>
          </li>
        ))}
      </DetailBlock>

      <div className="h-5" />

      <DetailBlock title={`Costi variabili attribuiti · ${formatEur(row.variableCosts)}`}>
        {row.costs.map((c, i) => (
          <li key={i} className="px-3 py-2.5">
            <div className="flex items-start justify-between gap-4 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{c.description}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.counterparty}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <SourceBadge source={c.source} />
                  <ConfidenceBadge band={c.confidence} />
                  <ValidatorBadge by={c.validatedBy} />
                </div>
              </div>
              <span className="tabular shrink-0 text-foreground">−{formatEur(c.amount, true)}</span>
            </div>
          </li>
        ))}
      </DetailBlock>

      <p className="mt-6 rounded-md border border-border bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
        I costi fissi (struttura, stipendi, software comuni) non sono ripartiti sul singolo
        cliente. Solo le voci ad alta confidenza o validate dall'operatore entrano nei totali
        pubblicati.
      </p>
    </>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <ul className="divide-y divide-border rounded-md border border-border bg-card">{children}</ul>
    </div>
  );
}

function SourceBadge({ source }: { source: "fattura" | "banca" }) {
  const Icon = source === "fattura" ? FileText : Landmark;
  return (
    <Badge variant="outline" className="gap-1 text-[10px] font-medium uppercase tracking-wider">
      <Icon className="h-3 w-3" aria-hidden />
      {source === "fattura" ? "Fattura" : "Banca"}
    </Badge>
  );
}

function ConfidenceBadge({ band }: { band: ConfidenceBand }) {
  if (band === "bassa") {
    return <Badge className="bg-warning text-warning-foreground hover:bg-warning text-[10px] uppercase tracking-wider">Confidenza bassa</Badge>;
  }
  if (band === "media") {
    return <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">Confidenza media</Badge>;
  }
  return <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Confidenza alta</Badge>;
}

function ValidatorBadge({ by }: { by: "AI" | "Operatore" }) {
  const Icon = by === "AI" ? Sparkles : User;
  return (
    <Badge variant="outline" className="gap-1 text-[10px] font-medium uppercase tracking-wider">
      <Icon className="h-3 w-3" aria-hidden />
      {by === "AI" ? "Validato AI" : "Validato operatore"}
    </Badge>
  );
}
