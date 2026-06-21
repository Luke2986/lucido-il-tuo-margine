import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Gauge, Database, RotateCcw, Trash2, Save, UserCog, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useLucidoStore, type AppRole } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/impostazioni")({
  head: () => ({
    meta: [
      { title: "Impostazioni — Lucido" },
      { name: "description", content: "Anagrafica azienda, soglie di confidenza e gestione dei dati locali." },
    ],
  }),
  component: ImpostazioniPage,
});

function ImpostazioniPage() {
  useEffect(() => {
    const s = useLucidoStore.getState();
    if (!s.loaded && !s.loading) void s.loadAll();
  }, []);

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 lg:py-10">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Operatore
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Impostazioni
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Anagrafica dell'azienda, soglie di confidenza e gestione dei dati locali.
          </p>
        </header>

        <div className="space-y-6">
          <RoleSection />
          <PublishSection />
          <CompanySection />
          <ThresholdsSection />
          <DataSection />
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  icon: Icon, title, description, children,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-start gap-3 border-b border-border px-5 py-4">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function CompanySection() {
  const company = useLucidoStore((s) => s.company);
  const updateCompany = useLucidoStore((s) => s.updateCompany);

  const [name, setName] = useState(company.name);
  const [vatNumber, setVatNumber] = useState(company.vatNumber);
  const [sector, setSector] = useState(company.sector);
  const [periodLabel, setPeriodLabel] = useState(company.periodLabel);

  // Risincronizza i campi quando lo store si idrata dopo il primo render.
  useEffect(() => {
    setName(company.name);
    setVatNumber(company.vatNumber);
    setSector(company.sector);
    setPeriodLabel(company.periodLabel);
  }, [company.name, company.vatNumber, company.sector, company.periodLabel]);

  const dirty =
    name !== company.name ||
    vatNumber !== company.vatNumber ||
    sector !== company.sector ||
    periodLabel !== company.periodLabel;

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("La ragione sociale è obbligatoria");
      return;
    }
    updateCompany({
      name: name.trim(),
      vatNumber: vatNumber.trim(),
      sector: sector.trim(),
      periodLabel: periodLabel.trim(),
    });
    toast.success("Anagrafica aggiornata");
  };

  return (
    <SectionCard
      icon={Building2}
      title="Azienda"
      description="I dati che appaiono nell'intestazione della schermata margine."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="company-name" label="Ragione sociale" className="sm:col-span-2">
          <Input
            id="company-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Studio Marini S.r.l."
          />
        </Field>
        <Field id="company-vat" label="Partita IVA">
          <Input
            id="company-vat"
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
            placeholder="01234567890"
            inputMode="numeric"
          />
        </Field>
        <Field id="company-sector" label="Settore">
          <Input
            id="company-sector"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="Consulenza direzionale"
          />
        </Field>
        <Field
          id="company-period"
          label="Periodo di riferimento"
          hint="Esempio: Gennaio – Maggio 2026"
          className="sm:col-span-2"
        >
          <Input
            id="company-period"
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            placeholder="Gennaio – Maggio 2026"
          />
        </Field>
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={handleSave} disabled={!dirty} size="sm">
          <Save className="mr-2 h-3.5 w-3.5" />
          Salva modifiche
        </Button>
      </div>
    </SectionCard>
  );
}

function ThresholdsSection() {
  const thresholds = useLucidoStore((s) => s.thresholds);
  const updateThresholds = useLucidoStore((s) => s.updateThresholds);

  const [high, setHigh] = useState(thresholds.high.toString());
  const [medium, setMedium] = useState(thresholds.medium.toString());

  useEffect(() => {
    setHigh(thresholds.high.toString());
    setMedium(thresholds.medium.toString());
  }, [thresholds.high, thresholds.medium]);

  const highNum = Number(high);
  const mediumNum = Number(medium);
  const valid =
    Number.isFinite(highNum) && Number.isFinite(mediumNum) &&
    highNum > 0 && highNum <= 1 && mediumNum > 0 && mediumNum <= 1 &&
    highNum > mediumNum;
  const dirty = highNum !== thresholds.high || mediumNum !== thresholds.medium;

  const handleSave = () => {
    if (!valid) {
      toast.error("Le soglie devono essere tra 0 e 1, con Alta > Media");
      return;
    }
    updateThresholds({ high: highNum, medium: mediumNum });
    toast.success("Soglie aggiornate");
  };

  return (
    <SectionCard
      icon={Gauge}
      title="Soglie di confidenza"
      description="Determinano come una voce viene etichettata Alta, Media o Bassa."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="th-high"
          label="Soglia Alta"
          hint="Sopra questo valore: confidenza Alta. Default 0,85."
        >
          <Input
            id="th-high"
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={high}
            onChange={(e) => setHigh(e.target.value)}
            className="tabular-nums"
          />
        </Field>
        <Field
          id="th-medium"
          label="Soglia Media"
          hint="Tra Media e Alta: Media. Sotto: Bassa. Default 0,60."
        >
          <Input
            id="th-medium"
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={medium}
            onChange={(e) => setMedium(e.target.value)}
            className="tabular-nums"
          />
        </Field>
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={handleSave} disabled={!dirty || !valid} size="sm">
          <Save className="mr-2 h-3.5 w-3.5" />
          Salva soglie
        </Button>
      </div>
    </SectionCard>
  );
}

function DataSection() {
  const resetToSeed = useLucidoStore((s) => s.resetToSeed);
  const clearAll = useLucidoStore((s) => s.clearAll);

  return (
    <SectionCard
      icon={Database}
      title="Gestione dati"
      description="Tutti i dati sono salvati localmente sul tuo browser. Nessun backend."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Puoi ripristinare i dati di esempio o ripartire da zero.
        </div>
        <div className="flex flex-wrap gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Ripristina dati di esempio
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ripristinare i dati di esempio?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tutte le voci, i clienti e l'anagrafica modificati verranno sostituiti dai dati
                  di esempio italiani. L'operazione non è reversibile.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => { resetToSeed(); toast.success("Dati di esempio ripristinati"); }}
                >
                  Ripristina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Cancella tutti i dati
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancellare tutti i dati?</AlertDialogTitle>
                <AlertDialogDescription>
                  Verranno rimosse tutte le voci e tutti i clienti, e l'anagrafica verrà svuotata.
                  L'operazione non è reversibile e la schermata margine resterà senza dati finché
                  non ne aggiungerai di nuovi.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => { clearAll(); toast.success("Tutti i dati sono stati cancellati"); }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Cancella tutto
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </SectionCard>
  );
}

function Field({
  id, label, hint, className, children,
}: {
  id: string;
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
