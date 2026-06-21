// Gestione clienti / commesse: lista + dialog di creazione/modifica + eliminazione.

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLucidoStore } from "@/lib/store";
import type { Client, ClientKind } from "@/lib/types";

export function ClientsManager() {
  const clients = useLucidoStore((s) => s.clients);
  const entries = useLucidoStore((s) => s.entries);
  const addClient = useLucidoStore((s) => s.addClient);
  const updateClient = useLucidoStore((s) => s.updateClient);
  const removeClient = useLucidoStore((s) => s.removeClient);

  const [editing, setEditing] = useState<Client | null>(null);
  const [open, setOpen] = useState(false);

  const counts = (id: string) => entries.filter((e) => e.clientId === id).length;

  const handleSave = (data: { name: string; kind: ClientKind }) => {
    if (editing) {
      updateClient(editing.id, data);
      toast.success("Cliente aggiornato");
    } else {
      addClient(data);
      toast.success("Cliente aggiunto");
    }
    setEditing(null);
    setOpen(false);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Clienti e commesse</h2>
          <p className="text-xs text-muted-foreground">
            Le voci attribuite a un cliente eliminato diventano non attribuite.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditing(null)}>
              <Plus className="mr-1 h-4 w-4" /> Nuovo
            </Button>
          </DialogTrigger>
          <ClientFormDialog initial={editing} onSubmit={handleSave} />
        </Dialog>
      </div>

      {clients.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          Nessun cliente. Aggiungine uno per iniziare.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border bg-card divide-y divide-border">
          {clients.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {c.kind}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {counts(c.id)} {counts(c.id) === 1 ? "voce" : "voci"} attribuite
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(c); setOpen(true); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminare "{c.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Le {counts(c.id)} voci attribuite non verranno cancellate, ma diventeranno
                        non attribuite. Puoi riattribuirle in qualsiasi momento dall'editor voci.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => { removeClient(c.id); toast.success("Cliente eliminato"); }}
                      >
                        Elimina
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClientFormDialog({
  initial,
  onSubmit,
}: {
  initial: Client | null;
  onSubmit: (d: { name: string; kind: ClientKind }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<ClientKind>(initial?.kind ?? "cliente");

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{initial ? "Modifica" : "Nuovo cliente / commessa"}</DialogTitle>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onSubmit({ name: name.trim(), kind });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="cl-name">Nome</Label>
          <Input id="cl-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cl-kind">Tipo</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as ClientKind)}>
            <SelectTrigger id="cl-kind"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cliente">Cliente</SelectItem>
              <SelectItem value="commessa">Commessa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="submit">{initial ? "Salva" : "Aggiungi"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
