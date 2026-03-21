"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  DatabaseZap,
  FileUp,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings2,
  ShieldAlert,
  Tags,
  X,
} from "lucide-react";
import { useBrandOps } from "./BrandOpsProvider";
import type { PeriodFilter } from "@/lib/brandops/types";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Vendas", icon: BarChart3 },
  { href: "/media", label: "Mídia", icon: BarChart3 },
  { href: "/dre", label: "DRE", icon: DatabaseZap },
  { href: "/cost-center", label: "Despesas", icon: Receipt },
  { href: "/import", label: "Importação", icon: FileUp },
  { href: "/sanitization", label: "Saneamento", icon: ShieldAlert },
  { href: "/cmv", label: "CMV", icon: Tags },
];

const adminNavigation = [{ href: "/admin/stores", label: "Lojas e Convites", icon: Settings2 }];

const periodOptions: Array<{ value: PeriodFilter; label: string }> = [
  { value: "7d", label: "7 dias" },
  { value: "15d", label: "15 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Mês atual" },
  { value: "all", label: "Todo período" },
];

function NavSection({
  items,
  pathname,
  collapsed,
  onNavigate,
}: {
  items: typeof navigation;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-1.5">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={`brandops-navlink group flex items-center rounded-2xl border px-3 py-2.5 text-sm transition-all ${
              collapsed ? "justify-center" : "gap-3"
            } ${
              isActive
                ? "border-secondary/25 bg-secondary/12 text-on-surface"
                : "border-transparent text-on-surface-variant hover:border-outline hover:bg-white/4 hover:text-on-surface"
            }`}
          >
            <span
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isActive
                  ? "bg-secondary/14 text-secondary"
                  : "bg-surface-container-high/60 text-on-surface-variant group-hover:text-secondary"
              }`}
            >
              <Icon size={18} />
            </span>
            {!collapsed ? <span className="truncate font-medium">{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
        Carregando workspace...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const allNav = profile?.role === "SUPER_ADMIN" ? [...navigation, ...adminNavigation] : navigation;

  return (
    <div className="brandops-shell min-h-screen bg-background text-on-surface brandops-selection">
      <div className="flex min-h-screen gap-3 p-3 lg:gap-4 lg:p-4">
        <aside
          className={`brandops-panel sticky top-4 hidden h-[calc(100vh-2rem)] shrink-0 flex-col overflow-hidden rounded-[28px] lg:flex ${
            isSidebarCollapsed ? "w-[88px]" : "w-[280px]"
          }`}
        >
          <div className={`flex items-center border-b border-outline/80 p-3 ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}>
            {!isSidebarCollapsed ? (
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-secondary">
                  BrandOps
                </p>
                <p className="mt-2 text-sm font-medium text-on-surface">
                  Operação multi-marca
                </p>
              </div>
            ) : (
              <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-secondary">BO</div>
            )}
            <button
              onClick={() => setIsSidebarCollapsed((current) => !current)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-outline bg-surface-container-high/50 text-on-surface-variant hover:text-on-surface"
              aria-label={isSidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
              {isSidebarCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {!isSidebarCollapsed ? (
              <div className="mb-4 rounded-2xl border border-outline/70 bg-surface-container-high/40 px-4 py-3">
                <p className="text-sm leading-6 text-on-surface-variant">
                  Navegue entre marcas, importe arquivos e revise a operação em um layout mais direto.
                </p>
              </div>
            ) : null}

            <NavSection items={navigation} pathname={pathname} collapsed={isSidebarCollapsed} />

            {profile?.role === "SUPER_ADMIN" ? (
              <div className="mt-5">
                {!isSidebarCollapsed ? (
                  <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.28em] text-on-surface-variant">
                    Administração
                  </p>
                ) : null}
                <NavSection items={adminNavigation} pathname={pathname} collapsed={isSidebarCollapsed} />
              </div>
            ) : null}
          </div>

          <div className="border-t border-outline/80 p-3">
            <div className={`rounded-2xl border border-outline/80 bg-surface-container-high/40 p-3 ${isSidebarCollapsed ? "text-center" : ""}`}>
              <p className="truncate text-sm font-semibold text-on-surface">
                {isSidebarCollapsed
                  ? (profile?.fullName ?? profile?.email ?? "U").slice(0, 1).toUpperCase()
                  : profile?.fullName ?? profile?.email ?? "Usuário autenticado"}
              </p>
              {!isSidebarCollapsed ? (
                <p className="mt-1 text-xs text-on-surface-variant">
                  {profile?.role === "SUPER_ADMIN" ? "Super admin" : "Dono da marca"}
                </p>
              ) : null}
            </div>
            <button
              onClick={() => void signOut()}
              title={isSidebarCollapsed ? "Sair" : undefined}
              className={`mt-3 inline-flex w-full items-center rounded-2xl border border-outline px-3 py-2.5 text-sm text-on-surface-variant hover:text-on-surface ${
                isSidebarCollapsed ? "justify-center" : "gap-2"
              }`}
            >
              <LogOut size={16} />
              {!isSidebarCollapsed ? "Sair" : null}
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="brandops-panel sticky top-3 z-30 rounded-[28px] px-4 py-3 lg:px-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setIsMobileMenuOpen((current) => !current)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-outline bg-surface-container-high/50 text-on-surface lg:hidden"
                  aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                >
                  {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-on-surface-variant">
                    Painel operacional
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-headline text-2xl font-semibold tracking-tight text-on-surface">
                      {activeBrand?.name ?? "Nenhuma marca em foco"}
                    </h2>
                    <span className="rounded-full border border-outline bg-surface-container-high/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                      {selectedPeriodLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_auto_auto] xl:min-w-[760px]">
                <div className="brandops-input flex items-center rounded-2xl px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                      Marca em foco
                    </label>
                    <select
                      value={activeBrandId ?? ""}
                      onChange={(event) => setActiveBrandId(event.target.value)}
                      className="w-full bg-transparent text-sm text-on-surface outline-none"
                      disabled={!brands.length}
                    >
                      {!brands.length && <option value="">Nenhuma marca disponível</option>}
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id} className="text-black">
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="brandops-input rounded-2xl px-3 py-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                    Período
                  </label>
                  <select
                    value={selectedPeriod}
                    onChange={(event) => setSelectedPeriod(event.target.value as PeriodFilter)}
                    className="w-full bg-transparent text-sm text-on-surface outline-none"
                  >
                    {periodOptions.map((option) => (
                      <option key={option.value} value={option.value} className="text-black">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="hidden rounded-2xl border border-outline bg-surface-container-high/40 px-4 py-3 text-sm text-on-surface-variant xl:flex xl:items-center xl:justify-center">
                  {brands.length} marca(s)
                </div>
              </div>
            </div>

            {isMobileMenuOpen ? (
              <div className="mt-3 rounded-2xl border border-outline bg-surface-container-low/90 p-3 lg:hidden">
                <NavSection items={allNav} pathname={pathname} collapsed={false} onNavigate={() => setIsMobileMenuOpen(false)} />
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-3 rounded-2xl border border-tertiary/20 bg-tertiary/10 px-4 py-3 text-sm text-tertiary">
                {errorMessage}
              </div>
            ) : null}
          </header>

          <main className="min-w-0 px-1 py-4 lg:px-0 lg:py-5">
            <div className="space-y-5">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
