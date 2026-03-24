"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  FileUp,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings2,
  ShieldAlert,
  Tags,
  TrendingUp,
  X,
} from "lucide-react";
import { useBrandOps } from "./BrandOpsProvider";
import type { PeriodFilter } from "@/lib/brandops/types";

/* -------------------------------------------------------
   Navigation Groups
   ------------------------------------------------------- */

const analyticsNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Vendas", icon: BarChart3 },
  { href: "/media", label: "Mídia", icon: TrendingUp },
  { href: "/dre", label: "DRE", icon: BarChart3 },
];

const operationsNav = [
  { href: "/cost-center", label: "Despesas", icon: Receipt },
  { href: "/cmv", label: "CMV", icon: Tags },
  { href: "/import", label: "Importação", icon: FileUp },
  { href: "/sanitization", label: "Saneamento", icon: ShieldAlert },
  { href: "/help", label: "Ajuda", icon: HelpCircle },
];

const adminNavigation = [
  { href: "/admin/stores", label: "Lojas e Pessoas", icon: Settings2 },
];

const periodOptions: Array<{ value: PeriodFilter; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "14d", label: "14 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Mês atual" },
  { value: "all", label: "Todo período" },
  { value: "custom", label: "Período livre" },
];

/* -------------------------------------------------------
   NavSection
   ------------------------------------------------------- */

function NavSection({
  items,
  pathname,
  collapsed,
  onNavigate,
}: {
  items: typeof analyticsNav;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={`brandops-navlink flex items-center rounded-md px-2 py-1.5 text-[13px] transition-all border border-transparent ${
              collapsed ? "justify-center" : "gap-3"
            } ${
              isActive
                ? "bg-surface-container-highest text-primary font-medium"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <span
              className={`inline-flex items-center justify-center ${
                isActive ? "text-primary" : "text-on-surface-variant"
              }`}
            >
              <Icon size={14} />
            </span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function NavGroupLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-1.5 h-px bg-outline mx-2" />;
  return (
    <p className="mb-1 mt-4 px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-ink-muted first:mt-0">
      {label}
    </p>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-1.5 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton h-7 w-full rounded-md" />
      ))}
    </div>
  );
}

/* -------------------------------------------------------
   AppShell
   ------------------------------------------------------- */

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("brandops.sidebar.collapsed") === "1";
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const {
    activeBrand,
    activeBrandId,
    brands,
    customDateRange,
    errorMessage,
    profile,
    selectedPeriod,
    selectedPeriodLabel,
    session,
    isLoading,
    setActiveBrandId,
    setCustomDateRange,
    setSelectedPeriod,
    signOut,
  } = useBrandOps();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, router, session]);

  useEffect(() => {
    window.localStorage.setItem("brandops.sidebar.collapsed", isSidebarCollapsed ? "1" : "0");
  }, [isSidebarCollapsed]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-outline bg-surface px-7 py-6 shadow-sm">
          <div className="brandops-loader" aria-hidden="true" />
          <div className="text-center">
            <p className="text-sm font-semibold text-on-surface">Carregando workspace</p>
            <p className="mt-1 text-xs text-on-surface-variant">Preparando dados da marca e permissões de acesso.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const isSuperAdmin = profile?.role === "SUPER_ADMIN";

  if (isSuperAdmin && !activeBrandId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-4xl space-y-10">
          <div className="text-center space-y-3">
             <p className="eyebrow text-secondary uppercase tracking-[0.3em]">Seleção de Contexto</p>
             <h1 className="font-headline text-4xl font-semibold tracking-tight text-on-surface lg:text-5xl">
                Em qual operação deseja entrar hoje?
             </h1>
             <p className="text-on-surface-variant max-w-2xl mx-auto">
                Como Superadmin, você tem acesso a todas as marcas do grupo. 
                Selecione uma marca para abrir o dashboard e os fluxos de operação específicos.
             </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => setActiveBrandId(brand.id)}
                className="brandops-card group flex flex-col items-start p-6 text-left transition-all hover:-translate-y-1 hover:border-secondary/40 hover:bg-secondary/5"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 font-headline text-xl font-bold text-secondary transition-colors group-hover:bg-secondary group-hover:text-on-secondary">
                  {brand.name.substring(0, 2).toUpperCase()}
                </div>
                <h3 className="text-lg font-bold text-on-surface">{brand.name}</h3>
                <p className="mt-1 text-xs text-on-surface-variant font-medium opacity-60">ID: {brand.id.split("-")[0]}</p>
                <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary opacity-0 transition-opacity group-hover:opacity-100">
                  Acessar Painel
                  <ChevronsRight size={14} />
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-center border-t border-outline pt-8">
            <button
              onClick={() => void signOut()}
              className="brandops-button brandops-button-ghost text-xs uppercase tracking-widest"
            >
              <LogOut size={14} />
              Sair desta conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="brandops-shell min-h-screen bg-background text-on-surface brandops-selection">
      <div className="flex min-h-screen gap-2 p-2 lg:gap-3 lg:p-3">

        {/* ---- Desktop Sidebar ---- */}
        <aside
          className={`brandops-panel sticky top-3 hidden h-[calc(100vh-1.5rem)] shrink-0 flex-col overflow-hidden lg:flex transition-[width] duration-300 ease-in-out ${
            isSidebarCollapsed ? "w-[48px]" : "w-[210px]"
          }`}
        >
          {/* Header */}
          <div
            className={`flex shrink-0 items-center gap-2 border-b border-outline px-2 py-2.5 ${
              isSidebarCollapsed ? "justify-center" : "justify-between"
            }`}
          >
            {!isSidebarCollapsed && (
              <div className="min-w-0 pl-1">
                <p className="eyebrow text-primary">BrandOps</p>
                <p className="truncate text-[11px] font-medium text-on-surface-variant">
                  Op. Multi-marca
                </p>
              </div>
            )}
            {isSidebarCollapsed && (
              <span className="eyebrow text-primary text-center">BO</span>
            )}
            <button
              onClick={() => setIsSidebarCollapsed((c) => !c)}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            >
              {isSidebarCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
            </button>
          </div>

          {/* Nav */}
          <div className="flex-1 overflow-y-auto px-1.5 py-2">
            {isLoading ? (
              <SidebarSkeleton />
            ) : (
              <>
                <NavGroupLabel label="Análise" collapsed={isSidebarCollapsed} />
                <NavSection items={analyticsNav} pathname={pathname} collapsed={isSidebarCollapsed} />

                <NavGroupLabel label="Operação" collapsed={isSidebarCollapsed} />
                <NavSection items={operationsNav} pathname={pathname} collapsed={isSidebarCollapsed} />

                {isSuperAdmin && (
                  <>
                    <NavGroupLabel label="Admin" collapsed={isSidebarCollapsed} />
                    <NavSection
                      items={adminNavigation}
                      pathname={pathname}
                      collapsed={isSidebarCollapsed}
                    />
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-outline p-2">
            {!isSidebarCollapsed && (
              <div className="mb-2 rounded-md bg-surface-container px-2 py-1.5">
                <p className="truncate text-[11px] font-medium text-on-surface">
                  {profile?.fullName ?? profile?.email ?? "Usuário"}
                </p>
              </div>
            )}
            <div className={`flex gap-1 ${isSidebarCollapsed ? "flex-col items-center" : "items-center"}`}>
              <button
                onClick={() => void signOut()}
                className={`brandops-button-ghost flex flex-1 items-center justify-center rounded-md px-2 py-1.5 text-xs ${
                  isSidebarCollapsed ? "w-8 p-0 h-8" : "gap-2"
                }`}
              >
                <LogOut size={13} />
                {!isSidebarCollapsed && "Sair"}
              </button>
            </div>
          </div>
        </aside>

        {/* ---- Main Content ---- */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <header className="brandops-panel py-2 px-3 sticky top-3 z-30 lg:px-4">
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMobileMenuOpen((c) => !c)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-outline bg-surface-container text-on-surface lg:hidden"
                >
                  {isMobileMenuOpen ? <X size={15} /> : <Menu size={15} />}
                </button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-headline text-lg font-semibold tracking-tight text-on-surface">
                      {activeBrand?.name ?? "Nenhuma marca"}
                    </h2>
                    <span className="status-chip">{selectedPeriodLabel}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="brandops-input flex-1 min-w-[140px]">
                  <select
                    value={activeBrandId ?? ""}
                    onChange={(e) => {
                      const newId = e.target.value;
                      if (!newId) return;
                      if (activeBrandId && newId !== activeBrandId) {
                        if (window.confirm("Deseja trocar de marca? Os dados da tela atual serão atualizados.")) {
                          setActiveBrandId(newId);
                        }
                      } else {
                        setActiveBrandId(newId);
                      }
                    }}
                    className="w-full bg-transparent text-xs p-1.5 outline-none font-bold"
                    disabled={!brands.length}
                  >
                    {!brands.length && <option value="">Nenhuma marca...</option>}
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id} className="bg-surface text-on-surface">
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="brandops-input w-[110px] shrink-0">
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as PeriodFilter)}
                    className="w-full bg-transparent text-xs p-1.5 outline-none"
                  >
                    {periodOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-surface text-on-surface">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {selectedPeriod === "custom" && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:max-w-[360px] xl:ml-auto">
                <label className="brandops-input flex items-center gap-2 px-2 py-1.5 text-xs">
                  <span className="whitespace-nowrap font-semibold text-on-surface-variant">De</span>
                  <input
                    type="date"
                    value={customDateRange.from}
                    onChange={(event) =>
                      setCustomDateRange({
                        ...customDateRange,
                        from: event.target.value,
                      })
                    }
                    className="w-full bg-transparent outline-none"
                  />
                </label>
                <label className="brandops-input flex items-center gap-2 px-2 py-1.5 text-xs">
                  <span className="whitespace-nowrap font-semibold text-on-surface-variant">Até</span>
                  <input
                    type="date"
                    value={customDateRange.to}
                    onChange={(event) =>
                      setCustomDateRange({
                        ...customDateRange,
                        to: event.target.value,
                      })
                    }
                    className="w-full bg-transparent outline-none"
                  />
                </label>
              </div>
            )}

            {/* Mobile Nav */}
            {isMobileMenuOpen && (
              <div className="mt-2 rounded-lg border border-outline bg-surface-container-low p-2 lg:hidden">
                <NavGroupLabel label="Análise" collapsed={false} />
                <NavSection items={analyticsNav} pathname={pathname} collapsed={false} onNavigate={() => setIsMobileMenuOpen(false)} />
                <NavGroupLabel label="Operação" collapsed={false} />
                <NavSection items={operationsNav} pathname={pathname} collapsed={false} onNavigate={() => setIsMobileMenuOpen(false)} />
                {isSuperAdmin && (
                  <>
                    <NavGroupLabel label="Admin" collapsed={false} />
                    <NavSection items={adminNavigation} pathname={pathname} collapsed={false} onNavigate={() => setIsMobileMenuOpen(false)} />
                  </>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="mt-2 rounded-md border border-error/20 bg-error/10 px-3 py-2 text-xs text-error">
                {errorMessage}
              </div>
            )}
          </header>

          {/* Children Space */}
          <main className="min-w-0 px-0.5 py-4 lg:py-5">
            <div className="space-y-4">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
