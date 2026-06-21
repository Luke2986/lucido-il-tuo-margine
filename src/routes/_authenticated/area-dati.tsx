import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ClientsManager } from "@/components/data-area/ClientsManager";
import { EntriesEditor } from "@/components/data-area/EntriesEditor";
import { ImportPanel } from "@/components/data-area/ImportPanel";
import { useLucidoStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/area-dati")({
  head: () => ({
    meta: [
      { title: "Area dati — Lucido" },
      { name: "description", content: "Gestione clienti, editor voci e import file. Vista operatore." },
    ],
  }),
  component: AreaDatiPage,
});

function AreaDatiPage() {
  const [tab, setTab] = useState("voci");
  const reset = useLucidoStore((s) => s.resetToSeed);

  // Carica i dati dal DB al mount
  useEffect(() => {
    const s = useLucidoStore.getState();
    if (!s.loaded && !s.loading) void s.loadAll();
  }, []);



  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:py-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Operatore
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Area dati
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Inserisci, modifica e importa le voci. Tutto è salvato nel database della tua azienda.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <RotateCcw className="mr-2 h-3.5 w-3.5" /> Ripristina dati di esempio
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ripristinare i dati di esempio?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tutte le voci e i clienti inseriti o modificati verranno sostituiti dai dati di
                  esempio italiani. L'operazione non è reversibile.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={() => { reset(); toast.success("Dati di esempio ripristinati"); }}>
                  Ripristina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </header>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="voci">Editor voci</TabsTrigger>
            <TabsTrigger value="clienti">Clienti e commesse</TabsTrigger>
            <TabsTrigger value="import">Import file</TabsTrigger>
          </TabsList>
          <TabsContent value="voci" className="mt-6"><EntriesEditor /></TabsContent>
          <TabsContent value="clienti" className="mt-6"><ClientsManager /></TabsContent>
          <TabsContent value="import" className="mt-6"><ImportPanel /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
