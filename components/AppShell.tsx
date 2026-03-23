"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  FileUp,
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
import { ThemeToggle } from "./ThemeToggle";
import type { PeriodFilter } from "@/lib/brandops/types";

/* -------------------------------------------------------
   Navigation Groups — logically separated by purpose
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
];

const adminNavigation = [
  { href: "/admin/stores", label: "Lojas e Convites", icon: Settings2 },
];

const periodOptions: Array<{ value: PeriodFilter; label: string }> = [
  { value: "7d", label: "7 dias" },
  { value: "15d", label: "15 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Mês atual" },
  { value: "all", label: "Todo período" },
];

/* -------------------------------------------------------
   NavSection — renders a list of nav items
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
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={`brandops-navlink group flex items-center rounded-2xl border px-2.5 py-2 text-sm transition-all ${
              collapsed ? "justify-center" : "gap-3"
            } ${
              isActive
                ? "border-primary/20 bg-primary/8 font-semibold text-primary"
                : "border-transparent text-on-surface-variant hover:border-outline/60 hover:bg-white/4 hover:text-on-surface"
            }`}
          >
            <span
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                isActive
                  ? "bg-primary/14 text-primary"
                  : "bg-surface-container-high/60 text-on-surface-variant group-hover:bg-surface-container-high group-hover:text-on-surface"
              }`}
            >
              <Icon size={16} />
            </span>
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/* -------------------------------------------------------
   NavGroup Label
   ------------------------------------------------------- */

function NavGroupLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-2 h-px bg-outline/40 mx-2" />;
  return (
    <p className="mb-1.5 mt-5 px-2.5 text-[9px] font-black uppercase tracking-[0.32em] text-ink-muted first:mt-0">
      {label}
    </p>
  );
}

/* -------------------------------------------------------
   Loading Skeleton
   ------------------------------------------------------- */

function SidebarSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton h-10 rounded-2xl" />
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
    errorMessage,
    profile,
    selectedPeriod,
    selectedPeriodLabel,
    session,
    isLoading,
    setActiveBrandId,
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

  /* --- Loading screen --- */
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-2xl border-2 border-primary/20" />
            <div className="absolute inset-0 animate-spin rounded-2xl border-2 border-transparent border-t-primary" />
          </div>
          <p className="text-sm text-on-surface-variant">Carregando workspace...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const isSuperAdmin = profile?.role === "SUPER_ADMIN";
  return (
    <div className="brandops-shell min-h-screen bg-background text-on-surface brandops-selection">
      <div className="flex min-h-screen gap-3 p-3 lg:gap-4 lg:p-4">

        {/* ---- Desktop Sidebar ---- */}
        <aside
          className={`brandops-panel sticky top-4 hidden h-[calc(100vh-2rem)] shrink-0 flex-col overflow-hidden rounded-[28px] lg:flex transition-[width] duration-300 ease-in-out ${
            isSidebarCollapsed ? "w-[72px]" : "w-[256px]"
          }`}
        >
          {/* Sidebar Header */}
          <div
            className={`flex shrink-0 items-center gap-3 border-b border-outline/60 px-3 py-3 ${
              isSidebarCollapsed ? "justify-center" : "justify-between"
            }`}
          >
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.36em] text-primary">
                  BrandOps
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-on-surface-variant">
                  Operação multi-marca
                </p>
              </div>
            )}
            {isSidebarCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">
                BO
              </span>
            )}
            <button
              onClick={() => setIsSidebarCollapsed((c) => !c)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-outline/70 bg-surface-container-high/40 text-on-surface-variant transition-all hover:border-primary/30 hover:text-on-surface"
              aria-label={isSidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
              {isSidebarCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
            </button>
          </div>

          {/* Nav Items */}
          <div className="flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <SidebarSkeleton />
            ) : (
              <>
                <NavGroupLabel label="Análise" collapsed={isSidebarCollapsed} />
                <NavSection
                  items={analyticsNav}
                  pathname={pathname}
                  collapsed={isSidebarCollapsed}
                />

                <NavGroupLabel label="Operação" collapsed={isSidebarCollapsed} />
                <NavSection
                  items={operationsNav}
                  pathname={pathname}
                  collapsed={isSidebarCollapsed}
                />

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

          {/* Sidebar Footer */}
          <div className="shrink-0 border-t border-outline/60 p-3">
            <div
              className={`mb-2 rounded-2xl border border-outline/60 bg-surface-container-high/30 px-3 py-2.5 ${
                isSidebarCollapsed ? "text-center" : ""
              }`}
            >
              <p className="truncate text-xs font-semibold text-on-surface">
                {isSidebarCollapsed
                  ? (profile?.fullName ?? profile?.email ?? "U").slice(0, 1).toUpperCase()
                  : (profile?.fullName ?? profile?.email ?? "Usuário")}
              </p>
              {!isSidebarCollapsed && (
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-on-surface-variant">
                  {isSuperAdmin ? "Super admin" : "Dono da marca"}
                </p>
              )}
            </div>

            <div className={`flex gap-2 ${isSidebarCollapsed ? "flex-col items-center" : "items-center"}`}>
              <ThemeToggle />
              <button
                onClick={() => void signOut()}
                title={isSidebarCollapsed ? "Sair" : undefined}
                className={`brandops-button-ghost flex flex-1 items-center rounded-xl border border-transparent px-3 py-2 text-xs text-on-surface-variant transition-all hover:border-outline/60 hover:bg-surface-container-high/40 hover:text-on-surface ${
                  isSidebarCollapsed ? "w-9 justify-center px-0" : "gap-2"
                }`}
              >
                <LogOut size={14} />
                {!isSidebarCollapsed && "Sair"}
              </button>
            </div>
          </div>
        </aside>

        {/* ---- Main Content ---- */}
        <div className="min-w-0 flex-1">

          {/* Sticky Header */}
          <header className="brandops-panel sticky top-3 z-30 rounded-[28px] px-4 py-3 lg:px-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

              {/* Left: Brand + Period info */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMobileMenuOpen((c) => !c)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-outline bg-surface-container-high/40 text-on-surface lg:hidden"
                  aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                >
                  {isMobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
                </button>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant">
                    Painel operacional
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-headline text-xl font-semibold tracking-tight text-on-surface lg:text-2xl">
                      {activeBrand?.name ?? "Nenhuma marca em foco"}
                    </h2>
                    <span className="status-chip">{selectedPeriodLabel}</span>
                  </div>
                </div>
              </div>

              {/* Right: Controls */}
              <div className="flex gap-2 xl:min-w-[680px]">
                {/* Brand selector */}
                <div className="brandops-input min-w-0 flex-1 rounded-2xl px-3 py-2">
                  <label className="mb-0.5 block text-[9px] font-black uppercase tracking-[0.24em] text-on-surface-variant">
                    Marca em foco
                  </label>
                  <select
                    value={activeBrandId ?? ""}
                    onChange={(e) => setActiveBrandId(e.target.value)}
                    className="w-full bg-transparent text-sm text-on-surface outline-none"
                    disabled={!brands.length}
                  >
                    {!brands.length && <option value="">Nenhuma marca disponível</option>}
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id} className="text-black dark:text-white bg-surface">
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Period selector */}
                <div className="brandops-input w-[140px] shrink-0 rounded-2xl px-3 py-2">
                  <label className="mb-0.5 block text-[9px] font-black uppercase tracking-[0.24em] text-on-surface-variant">
                    Período
                  </label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as PeriodFilter)}
                    className="w-full bg-transparent text-sm text-on-surface outline-none"
                  >
                    {periodOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="text-black dark:text-white bg-surface">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Brand count badge */}
                <div className="hidden shrink-0 items-center justify-center rounded-2xl border border-outline/60 bg-surface-container-high/30 px-4 py-2 text-xs text-on-surface-variant xl:flex">
                  {brands.length} marca{brands.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {/* Mobile Nav Drawer */}
            {isMobileMenuOpen && (
              <div className="mt-3 rounded-2xl border border-outline/70 bg-surface-container-low/90 p-3 lg:hidden">
                <p className="mb-2 px-2 text-[9px] font-black uppercase tracking-[0.32em] text-on-surface-variant">
                  Análise
                </p>
                <NavSection
                  items={analyticsNav}
                  pathname={pathname}
                  collapsed={false}
                  onNavigate={() => setIsMobileMenuOpen(false)}
                />
                <p className="mb-2 mt-4 px-2 text-[9px] font-black uppercase tracking-[0.32em] text-on-surface-variant">
                  Operação
                </p>
                <NavSection
                  items={operationsNav}
                  pathname={pathname}
                  collapsed={false}
                  onNavigate={() => setIsMobileMenuOpen(false)}
                />
                {isSuperAdmin && (
                  <>
                    <p className="mb-2 mt-4 px-2 text-[9px] font-black uppercase tracking-[0.32em] text-on-surface-variant">
                      Admin
                    </p>
                    <NavSection
                      items={adminNavigation}
                      pathname={pathname}
                      collapsed={false}
                      onNavigate={() => setIsMobileMenuOpen(false)}
                    />
                  </>
                )}
              </div>
            )}

            {/* Error banner */}
            {errorMessage && (
              <div className="mt-3 rounded-2xl border border-error/20 bg-error/8 px-4 py-3 text-sm text-error">
                {errorMessage}
              </div>
            )}
          </header>

          {/* Page Content */}
          <main className="min-w-0 px-1 py-5 lg:px-0 lg:py-6">
            <div className="space-y-5">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
