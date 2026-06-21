import { useMemo, useState } from "react";
import { ChevronDown, TrendingDown, TrendingUp, Info, ShieldCheck, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { computeRows, mockReport, type MarginRow } from "@/lib/mock-margins";
import { formatDate, formatEur, formatPercent } from "@/lib/format";

export function MarginDashboard() {
  const rows = useMemo(() => computeRows(mockReport.clients), []);

  const totals = useMemo(() => {
    const revenue = rows.reduce((s, r) => s + r.revenue, 0);
    const variable = rows.reduce((s, r) => s + r.variableCosts, 0);
    const margin = revenue - variable;
    const losing = rows.filter((r) => r.isLoss).length;
    return { revenue, variable, margin, losing };
  }, [rows]);

  const validated = rows.filter((r) => r.status === "validata");
  const inProgress = rows.filter((r) => r.status === "da_validare");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {mockReport.companyName}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                Quali clienti ti fanno guadagnare
              </h1>
            </div>
            <div className="hidden text-right text-xs text-muted-foreground sm:block">
              <p>Periodo</p>
              <p className="mt-0.5 font-medium text-foreground">{mockReport.periodLabel}</p>
              <p className="mt-1">Pubblicato il {formatDate(mockReport.publishedAt)}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
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
          <MarginList rows={validated} />
        </section>

        {inProgress.length > 0 && (
          <section aria-labelledby="sec-lavorazione" className="mt-10">
            <SectionHeader
              id="sec-lavorazione"
              title="In lavorazione"
              hint="Classificazione non ancora confermata: numeri indicativi, non entrano nei totali pubblicati."
              tone="warning"
            />
            <MarginList rows={inProgress} muted />
          </section>
        )}

        <Disclaimer />
      </div>
    </main>
  );
}

// ---------- Sotto-componenti ----------

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
        hint={`Su ${formatEur(revenue)} di ricavo`}
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

function MarginList({ rows, muted = false }: { rows: MarginRow[]; muted?: boolean }) {
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
          <MarginRowItem row={row} />
        </li>
      ))}
    </ul>
  );
}

function MarginRowItem({ row }: { row: MarginRow }) {
  const [open, setOpen] = useState(false);
  const accent = row.isLoss ? "bg-destructive" : "bg-positive";
  const marginColor = row.isLoss ? "text-destructive" : "text-positive";
  const sign = row.isLoss ? "−" : "+";
  const absMargin = Math.abs(row.margin);

  return (
    <div className="relative">
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} aria-hidden />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid w-full grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 px-5 py-4 pl-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]"
      >
        {/* Nome + kind + badge */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
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

        {/* Ricavo */}
        <div className="hidden text-right sm:block">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Ricavo</p>
          <p className="tabular text-sm font-medium text-foreground">{formatEur(row.revenue)}</p>
        </div>

        {/* Costi variabili */}
        <div className="hidden text-right sm:block">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Costi variabili</p>
          <p className="tabular text-sm font-medium text-foreground">{formatEur(row.variableCosts)}</p>
        </div>

        {/* Primo margine */}
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Primo margine</p>
          <p className={`tabular text-lg font-semibold ${marginColor}`}>
            <span aria-hidden>{sign}</span>
            <span className="sr-only">{row.isLoss ? "in perdita" : "in attivo"}</span>
            {formatEur(absMargin)}
            <span className="ml-1 text-xs font-medium">({formatPercent(Math.abs(row.marginPct))})</span>
          </p>
        </div>

        <ChevronDown
          className={`hidden h-4 w-4 text-muted-foreground transition-transform sm:block ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && <WhyPanel row={row} />}
    </div>
  );
}

function WhyPanel({ row }: { row: MarginRow }) {
  const absMargin = Math.abs(row.margin);
  return (
    <div className="border-t border-border bg-secondary/40 px-6 py-5">
      <div className="mb-4 flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p className="text-sm text-foreground">
          Questo cliente ti è costato{" "}
          <strong className="tabular">{formatEur(row.variableCosts)}</strong> di costi variabili a
          fronte di <strong className="tabular">{formatEur(row.revenue)}</strong> di ricavo →{" "}
          margine{" "}
          <strong className={`tabular ${row.isLoss ? "text-destructive" : "text-positive"}`}>
            {row.isLoss ? `−${formatEur(absMargin)}` : `+${formatEur(absMargin)}`}
          </strong>
          .
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <DetailBlock title="Ricavi attribuiti">
          {row.revenues.map((r, i) => (
            <DetailLine
              key={i}
              left={
                <>
                  <p className="font-medium text-foreground">{r.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Fattura {r.invoiceNumber} · {formatDate(r.date)}
                  </p>
                </>
              }
              right={<span className="tabular text-positive">+{formatEur(r.amount, true)}</span>}
            />
          ))}
        </DetailBlock>

        <DetailBlock title="Costi variabili attribuiti">
          {row.costs.map((c, i) => (
            <DetailLine
              key={i}
              left={
                <>
                  <p className="font-medium text-foreground">{c.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.counterparty} · fonte: {c.source}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <ConfidenceBadge band={c.confidence} />
                    <span className="text-[11px] text-muted-foreground">
                      validato da {c.validatedBy}
                    </span>
                  </div>
                </>
              }
              right={<span className="tabular text-foreground">−{formatEur(c.amount, true)}</span>}
            />
          ))}
        </DetailBlock>
      </div>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <ul className="divide-y divide-border rounded-md border border-border bg-card">
        {children}
      </ul>
    </div>
  );
}

function DetailLine({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-4 px-3 py-2.5 text-sm">
      <div className="min-w-0">{left}</div>
      <div className="shrink-0 text-right text-sm font-medium">{right}</div>
    </li>
  );
}

function ConfidenceBadge({ band }: { band: "alta" | "media" | "bassa" }) {
  if (band === "bassa") {
    return <Badge className="bg-warning text-warning-foreground hover:bg-warning">Confidenza bassa</Badge>;
  }
  if (band === "media") {
    return <Badge variant="secondary">Confidenza media</Badge>;
  }
  return <Badge variant="outline">Confidenza alta</Badge>;
}

function Disclaimer() {
  return (
    <>
      <Separator className="my-8" />
      <p className="text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Primo margine</strong> = ricavi − costi variabili. I
        costi fissi (affitto, stipendi, software di struttura) non sono ripartiti sul singolo
        cliente. I costi non attribuibili restano in un secchiello comune. Solo le voci ad alta
        confidenza o validate dall'operatore entrano nei totali pubblicati.
      </p>
      <div className="mt-6 flex justify-end">
        <Button variant="ghost" size="sm" disabled>
          Scarica PDF (prossimamente)
        </Button>
      </div>
    </>
  );
}
