import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useLucidoStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
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
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex h-12 items-center gap-2 border-b border-border bg-card px-3">
            <SidebarTrigger aria-label="Apri o chiudi la barra laterale" />
            <span className="text-xs font-medium text-muted-foreground">
              Lucido · Controllo di gestione
            </span>
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
