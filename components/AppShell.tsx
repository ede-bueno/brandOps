"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  FileUp,
  Images,
  LayoutDashboard,
  Landmark,
  LogOut,
  Menu,
  PlugZap,
  Receipt,
  Settings2,
  ShieldAlert,
  Sparkles,
  Tags,
  TrendingUp,
  X,
} from "lucide-react";
import { useBrandOps } from "./BrandOpsProvider";
import type { PeriodFilter } from "@/lib/brandops/types";
import { BRANDING } from "@/lib/branding";
import { ThemeToggle } from "./ThemeToggle";
import { AtlasOrb } from "./AtlasOrb";

/* -------------------------------------------------------
   Navigation Groups
   ------------------------------------------------------- */

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const operationsNav: NavItem[] = [
  { href: "/dashboard", label: "Control Tower", icon: LayoutDashboard },
  { href: "/dre", label: "DRE Consolidado", icon: Receipt },
  { href: "/cost-center", label: "Lançamentos DRE", icon: Landmark },
  { href: "/cmv", label: "Custos (CMV)", icon: Tags },
  { href: "/sales", label: "Vendas", icon: BarChart3 },
];

const acquisitionNav: NavItem[] = [
  { href: "/media", label: "Performance Mídia", icon: TrendingUp },
  { href: "/traffic", label: "Tráfego Digital", icon: Activity },
  { href: "/product-insights", label: "Insights Categorias", icon: Sparkles },
];

const catalogNav: NavItem[] = [
  { href: "/feed", label: "Catálogo", icon: Images },
  { href: "/import", label: "ETL / Importação", icon: FileUp },
  { href: "/sanitization", label: "Saneamento", icon: ShieldAlert },
];

const adminNavigation: NavItem[] = [
  { href: "/admin/stores", label: "Acessos", icon: Settings2 },
  { href: "/integrations", label: "Integrações", icon: PlugZap },
];

const periodOptions: Array<{ value: PeriodFilter; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "14d", label: "14 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Mês atual" },
  { value: "lastMonth", label: "Mês passado" },
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
  items: NavItem[];
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
            data-active={isActive ? "true" : "false"}
            className={`brandops-navlink flex items-center border text-[13px] transition-all ${
              collapsed ? "justify-center rounded-xl px-0 py-0 h-11 w-11 mx-auto" : "gap-3 rounded-xl px-2.5 py-2"
            } ${
              isActive
                ? "atlas-navlink-active bg-surface-container-highest text-primary font-semibold"
                : "border-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <span
              className={`inline-flex items-center justify-center ${
                isActive ? "text-primary" : "text-on-surface-variant"
              }`}
            >
              <Icon size={collapsed ? 17 : 16} />
            </span>
            {!collapsed && <span className="truncate text-[13.5px] font-medium">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function NavGroupLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="mx-3 my-2 h-px bg-outline/70" />;
  return (
    <p className="mb-1.5 mt-4 px-2.5 text-[9px] font-bold uppercase tracking-[0.2em] text-ink-muted first:mt-0">
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
  const pathname = usePathname() ?? "/";
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
  const selectedBrandName =
    activeBrand?.name ??
    brands.find((brand) => brand.id === activeBrandId)?.name ??
    "Nenhuma marca";

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, router, session]);

  useEffect(() => {
    window.localStorage.setItem("brandops.sidebar.collapsed", isSidebarCollapsed ? "1" : "0");
  }, [isSidebarCollapsed]);

  const shouldBlockShell = isLoading && !session;

  if (shouldBlockShell) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
        {/* Decorative blur elements for modern premium feel */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[80px]" />
        
        <div className="relative z-10 flex flex-col items-center gap-6 rounded-3xl border border-outline/50 bg-surface/60 px-10 py-12 shadow-2xl backdrop-blur-xl">
          <AtlasOrb size="lg" />
          
          <div className="text-center space-y-2">
            <h3 className="font-headline text-lg font-semibold tracking-tight text-on-surface">
              Carregando Workspace
            </h3>
            <p className="text-[13px] font-medium text-ink-muted max-w-[240px] leading-relaxed">
              Preparando seus dados financeiros, permissões e cache analítico.
            </p>
          </div>

          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
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
                Qual operação POD deseja abrir agora?
             </h1>
             <p className="text-on-surface-variant max-w-2xl mx-auto">
                Como Superadmin, você tem acesso a todas as marcas do grupo. 
                Selecione uma marca para abrir a torre de controle, catálogo, mídia e operação específicos.
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
    <div className="brandops-shell brandops-selection h-[100dvh] overflow-hidden bg-background text-on-surface">
      <div className="flex h-full gap-0 p-0 sm:gap-2 sm:p-2 lg:gap-3 lg:p-3">

        {/* ---- Desktop Sidebar ---- */}
        <aside
          className={`brandops-panel atlas-tech-grid atlas-sidebar hidden h-full shrink-0 flex-col overflow-hidden lg:flex transition-[width] duration-300 ease-in-out ${
            isSidebarCollapsed ? "w-[82px]" : "w-[252px]"
          }`}
        >
          {/* Header */}
          <div
            className={`flex shrink-0 items-center gap-2 border-b border-outline px-3 py-3 ${
              isSidebarCollapsed ? "flex-col justify-center" : "justify-between"
            }`}
          >
            <div className={`flex min-w-0 items-center gap-2 ${isSidebarCollapsed ? "flex-col" : ""}`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary-container text-primary shadow-sm">
                <Sparkles size={17} />
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <p className="eyebrow text-primary">{BRANDING.shortName}</p>
                  <p className="truncate font-headline text-[15px] font-semibold tracking-tight text-on-surface">
                    {BRANDING.appName}
                  </p>
                  <p className="truncate text-[11px] font-medium text-on-surface-variant">
                    Núcleo operacional do ecossistema
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsSidebarCollapsed((c) => !c)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            >
              {isSidebarCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
            </button>
          </div>

          {/* Nav */} 
          <div className="atlas-sidebar-nav min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {isLoading ? (
              <SidebarSkeleton />
            ) : (
              <>
                {!isSidebarCollapsed && (
                  <div className="atlas-brand-shell mb-3 rounded-xl border bg-surface-container-low px-2.5 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                      Console ativo
                    </p>
                    <p className="mt-1 truncate font-headline text-sm font-semibold text-on-surface">
                      {selectedBrandName}
                    </p>
                  </div>
                )}
                <NavGroupLabel label="Operação" collapsed={isSidebarCollapsed} />
                <NavSection items={operationsNav} pathname={pathname} collapsed={isSidebarCollapsed} />

                <NavGroupLabel label="Aquisição" collapsed={isSidebarCollapsed} />
                <NavSection items={acquisitionNav} pathname={pathname} collapsed={isSidebarCollapsed} />

                <NavGroupLabel label="Catálogo" collapsed={isSidebarCollapsed} />
                <NavSection items={catalogNav} pathname={pathname} collapsed={isSidebarCollapsed} />

                <NavGroupLabel label="Admin" collapsed={isSidebarCollapsed} />
                <NavSection
                  items={adminNavigation}
                  pathname={pathname}
                  collapsed={isSidebarCollapsed}
                />
              </>
            )}
          </div>

          {/* Footer */}
          <div className="atlas-sidebar-footer shrink-0 border-t border-outline p-2">
            {!isSidebarCollapsed && (
              <div className="mb-2 rounded-lg bg-surface-container px-2.5 py-2">
                <p className="truncate text-[11px] font-medium text-on-surface">
                  {profile?.fullName ?? profile?.email ?? "Usuário"}
                </p>
              </div>
            )}
            <div className={`flex gap-1 ${isSidebarCollapsed ? "flex-col items-center" : "items-center"}`}>
              <ThemeToggle />
              <button
                onClick={() => void signOut()}
                className={`brandops-button-ghost flex flex-1 items-center justify-center rounded-lg px-2 py-1.5 text-xs ${
                  isSidebarCollapsed ? "h-9 w-9 p-0" : "gap-2"
                }`}
              >
                <LogOut size={13} />
                {!isSidebarCollapsed && "Sair"}
              </button>
            </div>
          </div>
        </aside>

        {/* ---- Main Content ---- */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="brandops-panel atlas-command-strip z-30 shrink-0 rounded-none border-x-0 border-t-0 px-3 py-3 sm:rounded-2xl sm:border-x sm:border-t lg:px-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                <button
                  onClick={() => setIsMobileMenuOpen((c) => !c)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline bg-surface-container text-on-surface lg:hidden"
                >
                  {isMobileMenuOpen ? <X size={15} /> : <Menu size={15} />}
                </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-headline text-[1.05rem] font-semibold tracking-tight text-on-surface sm:text-lg">
                      {selectedBrandName}
                    </h2>
                    <span className="status-chip">{selectedPeriodLabel}</span>
                    {!isSidebarCollapsed && (
                      <span className="status-chip atlas-command-chip">
                        <AtlasOrb
                          size="sm"
                          title="Atlas Command"
                          status="escutando"
                          hints={[
                            "Atlas vai antecipar pressão de margem e sugerir correções por frente.",
                            "A camada proativa vai cruzar mídia, catálogo e operação para decidir o próximo passo.",
                            "Interaja com o orbe para abrir a entidade que acompanhará o sistema.",
                          ]}
                        />
                        Atlas Command
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted sm:text-[11px] sm:tracking-[0.16em]">
                    Operação, aquisição, catálogo e margem em um único workspace
                  </p>
                </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex lg:hidden">
                  <ThemeToggle />
                </div>
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
                  className="brandops-input min-w-[172px] font-semibold"
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
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-outline pt-3">
              <div className="brandops-filterbar">
                {periodOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    data-active={selectedPeriod === opt.value}
                    className="brandops-filter-pill"
                    onClick={() => setSelectedPeriod(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {selectedPeriod === "custom" && (
                <div className="brandops-toolbar-panel xl:max-w-[460px]">
                  <div className="grid gap-2 sm:grid-cols-2">
                  <label className="brandops-field-stack">
                    <span className="brandops-field-label">De</span>
                    <input
                      type="date"
                      value={customDateRange.from}
                      onChange={(event) =>
                        setCustomDateRange({
                          ...customDateRange,
                          from: event.target.value,
                        })
                      }
                      className="brandops-input"
                    />
                  </label>
                  <label className="brandops-field-stack">
                    <span className="brandops-field-label">Até</span>
                    <input
                      type="date"
                      value={customDateRange.to}
                      onChange={(event) =>
                        setCustomDateRange({
                          ...customDateRange,
                          to: event.target.value,
                        })
                      }
                      className="brandops-input"
                    />
                  </label>
                  </div>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="mt-2 rounded-md border border-error/20 bg-error/10 px-3 py-2 text-xs text-error">
                {errorMessage}
              </div>
            )}
          </header>

          {/* Children Space */}
          <main className="atlas-content-scroll min-w-0 flex-1 px-2 py-3 sm:px-0.5 sm:py-4 lg:py-5">
            <div className="atlas-page-stack">{children}</div>
          </main>
        </div>
      </div>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="Fechar menu"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="brandops-panel atlas-sidebar atlas-tech-grid absolute inset-y-2 left-2 flex w-[min(86vw,320px)] flex-col overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-outline px-3 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary-container text-primary shadow-sm">
                  <Sparkles size={17} />
                </div>
                <div className="min-w-0">
                  <p className="eyebrow text-primary">{BRANDING.shortName}</p>
                  <p className="truncate font-headline text-[15px] font-semibold tracking-tight text-on-surface">
                    {BRANDING.appName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline bg-surface-container text-on-surface-variant"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-3 py-3">
              <div className="atlas-brand-shell rounded-xl border bg-surface-container-low px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                  Console ativo
                </p>
                <p className="mt-1 truncate font-headline text-sm font-semibold text-on-surface">
                  {selectedBrandName}
                </p>
              </div>
            </div>

            <div className="atlas-sidebar-nav min-h-0 flex-1 overflow-y-auto px-2 py-1">
              <NavGroupLabel label="Operação" collapsed={false} />
              <NavSection items={operationsNav} pathname={pathname} collapsed={false} onNavigate={() => setIsMobileMenuOpen(false)} />
              <NavGroupLabel label="Aquisição" collapsed={false} />
              <NavSection items={acquisitionNav} pathname={pathname} collapsed={false} onNavigate={() => setIsMobileMenuOpen(false)} />
              <NavGroupLabel label="Catálogo" collapsed={false} />
              <NavSection items={catalogNav} pathname={pathname} collapsed={false} onNavigate={() => setIsMobileMenuOpen(false)} />
              <NavGroupLabel label="Admin" collapsed={false} />
              <NavSection items={adminNavigation} pathname={pathname} collapsed={false} onNavigate={() => setIsMobileMenuOpen(false)} />
            </div>

            <div className="atlas-sidebar-footer border-t border-outline p-3">
              <div className="mb-2 rounded-lg bg-surface-container px-2.5 py-2">
                <p className="truncate text-[11px] font-medium text-on-surface">
                  {profile?.fullName ?? profile?.email ?? "Usuário"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  onClick={() => void signOut()}
                  className="brandops-button brandops-button-ghost flex-1"
                >
                  <LogOut size={14} />
                  Sair
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
