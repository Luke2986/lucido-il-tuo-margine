import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Accedi — Lucido" },
      { name: "description", content: "Accedi al cruscotto Lucido." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">("login");

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <span className="text-base font-semibold tracking-tight">L</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Lucido</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cruscotto di controllo di gestione</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Accedi</TabsTrigger>
            <TabsTrigger value="signup">Registrati</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="mt-6">
            <LoginForm />
          </TabsContent>
          <TabsContent value="signup" className="mt-6">
            <SignupForm onDone={() => setTab("login")} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message || "Accesso fallito");
      return;
    }
    toast.success("Accesso effettuato");
    navigate({ to: "/" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="current-password" required value={password}
          onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Accesso in corso…" : "Accedi"}
      </Button>
    </form>
  );
}

function SignupForm({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("La password deve essere lunga almeno 8 caratteri");
      return;
    }
    setBusy(true);
    const redirect = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirect, data: { display_name: name } },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message || "Registrazione fallita");
      return;
    }
    if (data.session) {
      toast.success("Account creato. Bentornato.");
      navigate({ to: "/" });
    } else {
      toast.success("Account creato. Ora accedi.");
      onDone();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div>
        <Label htmlFor="su-name">Nome</Label>
        <Input id="su-name" required value={name} onChange={(e) => setName(e.target.value)}
          className="mt-1.5" placeholder="Mario Rossi" />
      </div>
      <div>
        <Label htmlFor="su-email">Email</Label>
        <Input id="su-email" type="email" autoComplete="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="su-pass">Password</Label>
        <Input id="su-pass" type="password" autoComplete="new-password" required value={password}
          onChange={(e) => setPassword(e.target.value)} className="mt-1.5"
          placeholder="Almeno 8 caratteri" />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Creazione…" : "Crea account"}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Diventerai automaticamente operatore dell'azienda di esempio Studio Marini, così puoi
        provare tutto subito.
      </p>
    </form>
  );
}
