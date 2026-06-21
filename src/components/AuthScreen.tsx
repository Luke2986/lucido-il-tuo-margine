import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Mode = "signin" | "signup";

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const fn = mode === "signin" ? signIn : signUp;
      const { error } = await fn(email.trim(), password);
      if (error) {
        toast.error(mode === "signin" ? "Accesso non riuscito" : "Registrazione non riuscita", {
          description: error,
        });
        return;
      }
      if (mode === "signup") {
        toast.success("Registrazione completata", {
          description: "Controlla la posta per confermare l'indirizzo, poi accedi.",
        });
        setMode("signin");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <span className="text-base font-semibold tracking-tight">L</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Lucido</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            La verità in avanti sui tuoi numeri.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@azienda.it"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Almeno 6 caratteri"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Attendere…" : mode === "signin" ? "Accedi" : "Registrati"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {mode === "signin" ? (
              <>
                Non hai un account?{" "}
                <button type="button" className="font-medium text-primary hover:underline" onClick={() => setMode("signup")}>
                  Registrati
                </button>
              </>
            ) : (
              <>
                Hai già un account?{" "}
                <button type="button" className="font-medium text-primary hover:underline" onClick={() => setMode("signin")}>
                  Accedi
                </button>
              </>
            )}
          </p>
        </form>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Dati protetti. Solo tu vedi i tuoi numeri.
        </p>
      </div>
    </div>
  );
}
