import { Link, useRouterState } from "@tanstack/react-router";
import { LineChart, Database, ShieldCheck, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLucidoStore } from "@/lib/store";

type NavItem = {
  title: string;
  url: "/" | "/area-dati" | "/impostazioni" | "/revisione";
  icon: typeof LineChart;
  enabled: boolean;
  group: "Titolare" | "Operatore";
};

const allItems: NavItem[] = [
  { title: "Margine clienti", url: "/", icon: LineChart, enabled: true, group: "Titolare" },
  { title: "Area dati", url: "/area-dati", icon: Database, enabled: true, group: "Operatore" },
  { title: "Revisione AI", url: "/revisione", icon: ShieldCheck, enabled: true, group: "Operatore" },
  { title: "Impostazioni", url: "/impostazioni", icon: Settings, enabled: true, group: "Operatore" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const role = useLucidoStore((s) => s.role);
  const company = useLucidoStore((s) => s.company);

  // Il titolare vede solo la schermata margine.
  const items = role === "owner"
    ? allItems.filter((i) => i.group === "Titolare")
    : allItems;
  const groups = role === "owner" ? ["Titolare"] : ["Titolare", "Operatore"];

  const roleLabel = role === "owner" ? "Titolare" : role === "operator" ? "Operatore" : "—";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <BrandMark />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">Lucido</p>
              <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                Controllo di gestione
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g}>
            {!collapsed && <SidebarGroupLabel>{g}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {items.filter((i) => i.group === g).map((item) => {
                  const isActive = currentPath === item.url;
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild={item.enabled}
                        isActive={isActive}
                        disabled={!item.enabled}
                        tooltip={item.title}
                        className={item.enabled ? "" : "opacity-50 cursor-not-allowed"}
                      >
                        {item.enabled ? (
                          <Link to={item.url} className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {!collapsed && <span>{item.title}</span>}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {!collapsed && (
                              <span className="flex-1">
                                {item.title}
                                <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                                  presto
                                </span>
                              </span>
                            )}
                          </div>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border">
        {!collapsed ? (
          <div className="px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Accesso come</p>
            <p className="mt-0.5 truncate text-xs font-medium text-foreground">{roleLabel}</p>
            <p className="truncate text-xs text-muted-foreground">
              {company.name || "Nessuna azienda"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-semibold">
              {roleLabel.slice(0, 2).toUpperCase()}
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

function BrandMark() {
  return (
    <div
      aria-hidden
      className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"
    >
      <span className="text-sm font-semibold tracking-tight">L</span>
    </div>
  );
}
