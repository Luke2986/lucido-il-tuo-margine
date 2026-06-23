import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useLucidoStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Sessione automatica anonima: nessun login richiesto in questa versione.
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) console.error("[auth] signInAnonymously fallito", error);
    }
    return {};
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  useEffect(() => {
    const s = useLucidoStore.getState();
    if (!s.loaded && !s.loading) void s.loadAll();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        useLucidoStore.getState().reset();
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        void useLucidoStore.getState().loadAll();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-h-screen flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:h-12">
            <SidebarTrigger
              aria-label="Apri il menù di navigazione"
              className="h-11 w-11 shrink-0 md:h-7 md:w-7"
            />
            <span className="text-sm font-semibold text-foreground md:hidden">Menu</span>
            <span className="hidden text-xs font-medium text-muted-foreground md:inline">
              Lucido · Controllo di gestione
            </span>
            <span className="ml-auto truncate text-xs font-medium text-muted-foreground md:hidden">
              Lucido
            </span>
          </header>
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
