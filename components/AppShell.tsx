"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronDown,
  CircleHelp,
  FileUp,
  Images,
  LayoutDashboard,
  Landmark,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PlugZap,
  Receipt,
  Settings2,
  type LucideIcon,
  ShieldAlert,
  Sparkles,
  Tags,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";

import { useBrandOps } from "./BrandOpsProvider";
import { ThemeToggle } from "./ThemeToggle";
import { PeriodCommandMenu } from "./PeriodCommandMenu";
import { BRANDING } from "@/lib/branding";
import { useSanitizationPendingCount } from "@/hooks/use-sanitization-summary";
import { APP_ROUTES, type AppRoute } from "@/lib/brandops/routes";

interface NavItem {
  href: AppRoute;
  label: string;
  icon: LucideIcon;
  children?: NavItem[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

type ShellAlertTone = "negative" | "warning" | "info";

interface ShellAlert {
  href: AppRoute;
  label: string;
  tone: ShellAlertTone;
}

interface ShellContextTelemetry {
  pendingSanitizationCount: number;
  mediaIntegrationError: boolean;
  ga4IntegrationError: boolean;
  contributionAfterMedia: number | null;
  netResult: number | null;
  grossRoas: number | null;
}

const navigationGroups: NavGroup[] = [
  {
    label: "Controle",
    items: [
      { href: APP_ROUTES.dashboard, label: "Torre de Controle", icon: LayoutDashboard },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: APP_ROUTES.dre, label: "DRE Mensal", icon: Receipt },
      { href: APP_ROUTES.sales, label: "Receita e Vendas", icon: BarChart3 },
      { href: APP_ROUTES.costCenter, label: "Livro de Lançamentos", icon: Landmark },
      { href: APP_ROUTES.cmv, label: "Custos e CMV", icon: Tags },
    ],
  },
  {
    label: "Aquisição",
    items: [
      {
        href: APP_ROUTES.media,
        label: "Mídia e Performance",
        icon: TrendingUp,
        children: [
          { href: APP_ROUTES.mediaExecutive, label: "Visão executiva", icon: TrendingUp },
          { href: APP_ROUTES.mediaRadar, label: "Radar", icon: TrendingUp },
          { href: APP_ROUTES.mediaCampaigns, label: "Campanhas", icon: TrendingUp },
          { href: APP_ROUTES.mediaAds, label: "Anúncios", icon: TrendingUp },
        ],
      },
      { href: APP_ROUTES.traffic, label: "Tráfego Digital", icon: Activity },
      {
        href: APP_ROUTES.productInsights,
        label: "Produtos e Insights",
        icon: Sparkles,
        children: [
          { href: APP_ROUTES.productInsightsExecutive, label: "Visão executiva", icon: Sparkles },
          { href: APP_ROUTES.productInsightsRadar, label: "Radar", icon: Sparkles },
          { href: APP_ROUTES.productInsightsDetail, label: "Detalhamento", icon: Sparkles },
        ],
      },
    ],
  },
  {
    label: "Operação",
    items: [
      { href: APP_ROUTES.feed, label: "Catálogo", icon: Images },
      { href: APP_ROUTES.import, label: "ETL e Importação", icon: FileUp },
      { href: APP_ROUTES.sanitization, label: "Saneamento", icon: ShieldAlert },
    ],
  },
  {
    label: "Plataforma",
    items: [
      { href: APP_ROUTES.integrations, label: "Integrações", icon: PlugZap },
      { href: APP_ROUTES.settings, label: "Central Estratégica", icon: Settings2 },
      { href: APP_ROUTES.integrationsTutorials, label: "Tutoriais", icon: BookOpen },
      { href: APP_ROUTES.adminStores, label: "Acessos", icon: UserRound },
      { href: APP_ROUTES.help, label: "Ajuda", icon: CircleHelp },
    ],
  },
];

const mobilePrimaryNav = navigationGroups.map((group) => {
  const firstItem = group.items[0];
  return {
    href: firstItem?.href ?? APP_ROUTES.dashboard,
    label: group.label,
    icon: firstItem?.icon ?? LayoutDashboard,
  };
});

function isRouteActive(pathname: string, href: AppRoute) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function flattenNavItems(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => [item, ...(item.children ?? [])]);
}

function getNavigationContext(pathname: string) {
  for (const group of navigationGroups) {
    for (const item of flattenNavItems(group.items)) {
      if (isRouteActive(pathname, item.href)) {
        return {
          groupLabel: group.label,
          itemLabel: item.label,
        };
      }
    }
  }

  return {
    groupLabel: "Controle",
    itemLabel: "Torre de Controle",
  };
}

function buildShellAlerts(
  telemetry: ShellContextTelemetry,
  activeBrandName: string,
): ShellAlert[] {
  const alerts: ShellAlert[] = [];

  if (telemetry.pendingSanitizationCount > 0) {
    alerts.push({
      href: APP_ROUTES.sanitization,
      label: `${telemetry.pendingSanitizationCount} pendência(s) de saneamento em ${activeBrandName}`,
      tone: "warning",
    });
  }

  if (telemetry.mediaIntegrationError || telemetry.ga4IntegrationError) {
    alerts.push({
      href: APP_ROUTES.integrations,
      label: "Há integração com erro recente. Revise as fontes antes de confiar no recorte.",
      tone: "warning",
    });
  }

  if (telemetry.netResult !== null && telemetry.netResult < 0) {
    alerts.push({
      href: APP_ROUTES.dre,
      label: "O resultado operacional do período está negativo.",
      tone: "negative",
    });
  }

  if (telemetry.contributionAfterMedia !== null && telemetry.contributionAfterMedia < 0) {
    alerts.push({
      href: APP_ROUTES.dashboardContributionMargin,
      label: "A contribuição depois de mídia virou negativa neste corte.",
      tone: "negative",
    });
  }

  if (telemetry.grossRoas !== null && telemetry.grossRoas > 0 && telemetry.grossRoas < 2) {
    alerts.push({
      href: APP_ROUTES.media,
      label: "O retorno de mídia ainda está curto para escalar com conforto.",
      tone: "info",
    });
  }

  return alerts.slice(0, 3);
}

function getShellCopy(pathname: string, brandName: string, periodLabel: string) {
  if (pathname.startsWith(APP_ROUTES.dashboard)) {
    return {
      status: "monitorando a operação",
      description: `${BRANDING.appName} acompanha a ${brandName} no recorte ${periodLabel.toLowerCase()} para puxar atenção só para o que realmente pede ação.`,
      hints: [
        "Use a Torre de Controle para decidir o próximo corte com base nos sinais do recorte.",
        "Quando a operação tensiona, comece por margem, resultado e mídia.",
        "Se o financeiro apertar, desça para o DRE mensal e para o livro de lançamentos.",
      ],
    };
  }

  if (
    pathname.startsWith(APP_ROUTES.dre) ||
    pathname.startsWith(APP_ROUTES.costCenter) ||
    pathname.startsWith(APP_ROUTES.cmv) ||
    pathname.startsWith(APP_ROUTES.sales)
  ) {
    return {
      status: "lendo o financeiro",
      description: `${BRANDING.appName} acompanha faturamento, custos, despesas e resultado da ${brandName} para manter o DRE consistente no período ativo.`,
      hints: [
        "Abra o DRE mensal para validar competência, margem e resultado.",
        "Use o livro de lançamentos para registrar ou corrigir despesas do mês.",
        "Quando a margem cair, revise CMV, mídia e despesas antes de escalar.",
      ],
    };
  }

  if (pathname.startsWith(APP_ROUTES.media)) {
    return {
      status: "observando a mídia",
      description: `${BRANDING.appName} cruza gasto, retorno e sinais de performance da ${brandName} para decidir ajuste, revisão ou escala.`,
      hints: [
        "O objetivo é decidir verba e criativo com rapidez.",
        "A leitura de mídia só vale quando o recorte estiver confiável.",
        "Abra a visão de anúncios quando precisar agir peça por peça.",
      ],
    };
  }

  if (pathname.startsWith(APP_ROUTES.traffic)) {
    return {
      status: "lendo o funil",
      description: `${BRANDING.appName} acompanha intenção, fricção e monetização da ${brandName} no período ativo.`,
      hints: [
        "A leitura de tráfego precisa apontar atrito e oportunidade.",
        "Use tráfego para encontrar a entrada que merece aprofundamento.",
        "Cruze os sinais com mídia e DRE quando a qualidade do funil mudar.",
      ],
    };
  }

  if (pathname.startsWith(APP_ROUTES.integrations) || pathname.startsWith(APP_ROUTES.settings)) {
    return {
      status: "sincronizando a plataforma",
      description: `${BRANDING.appName} organiza integrações, parâmetros e prontidão operacional da ${brandName}.`,
      hints: [
        "Mostre primeiro o estado da integração e o próximo passo da operação.",
        "Sempre mostre impacto e próximo passo quando algo falhar.",
        "Fontes saudáveis vêm antes de qualquer recomendação bonita.",
      ],
    };
  }

  return {
    status: "escutando o sistema",
    description: `${BRANDING.appName} acompanha a ${brandName} no recorte ${periodLabel.toLowerCase()} e mantém contexto sobre a área atual.`,
    hints: [
      "Abra primeiro a área que responde a dúvida operacional do momento.",
      "Use marca e recorte no header para manter todo o sistema no mesmo contexto.",
      "O sistema deve orientar decisão e execução sem competir com o dado.",
    ],
  };
}

function ShellAccountMenu({
  open,
  fullName,
  email,
  onToggle,
  onClose,
  onSignOut,
  renderThemeToggle,
}: {
  open: boolean;
  fullName?: string | null;
  email?: string | null;
  onToggle: () => void;
  onClose: () => void;
  onSignOut: () => void;
  renderThemeToggle?: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  return (
    <div ref={menuRef} className="relative z-40">
      <button
        type="button"
        onClick={onToggle}
        className="atlas-user-trigger"
        aria-expanded={open}
        aria-label="Abrir menu da conta"
      >
        <span className="atlas-user-avatar">
          <UserRound size={14} />
        </span>
        <span className="atlas-user-copy">
          <span className="atlas-user-label">Conta</span>
          <span className="atlas-user-name">{fullName ?? "Conta BrandOps"}</span>
        </span>
        <ChevronDown size={14} className={`atlas-user-chevron ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="atlas-user-menu">
          <div className="atlas-user-menu-head">
            <p className="atlas-user-menu-name">{fullName ?? "Conta BrandOps"}</p>
            <p className="atlas-user-menu-email">{email ?? "Sessão ativa"}</p>
          </div>

          {renderThemeToggle ? (
            <div className="atlas-user-menu-row">
              <span>Aparência</span>
              {renderThemeToggle}
            </div>
          ) : null}

          <button type="button" onClick={onSignOut} className="brandops-button brandops-button-secondary w-full justify-center">
            <LogOut size={14} />
            Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SidebarGroup({
  group,
  pathname,
  onNavigate,
  collapsed = false,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate: (href: AppRoute) => void;
  collapsed?: boolean;
}) {
  const [openBranchHref, setOpenBranchHref] = useState<string | null>(null);
  const activeBranchHref =
    group.items.find((item) =>
      (item.children ?? []).some((child) => isRouteActive(pathname, child.href)),
    )?.href ?? null;

  return (
    <section className="atlas-sidebar-block">
      <p className="atlas-sidebar-heading">{group.label}</p>
      <div className="atlas-sidebar-links">
        {group.items.map((item) => {
          const Icon = item.icon;
          const itemActive = isRouteActive(pathname, item.href);
          const hasChildren = Boolean(item.children?.length);
          const hasActiveChild = (item.children ?? []).some((child) => isRouteActive(pathname, child.href));
          const branchExpanded =
            hasChildren && ((openBranchHref ?? activeBranchHref) === item.href || hasActiveChild);

          return (
            <div key={item.href} className="atlas-sidebar-node">
              <div className="atlas-sidebar-branch-row">
                <Link
                  href={item.href}
                  prefetch={false}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(item.href);
                  }}
                  className="atlas-sidebar-link brandops-navlink"
                  data-active={itemActive ? "true" : "false"}
                  data-context={hasActiveChild ? "true" : "false"}
                  data-collapsed={collapsed ? "true" : "false"}
                  aria-current={itemActive ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </Link>

                {hasChildren && !collapsed ? (
                  <button
                    type="button"
                    className="atlas-sidebar-branch-trigger"
                    aria-expanded={branchExpanded}
                    aria-label={
                      branchExpanded
                        ? `Recolher submenu de ${item.label}`
                        : `Expandir submenu de ${item.label}`
                    }
                    onClick={() =>
                      setOpenBranchHref((current) => (current === item.href ? null : item.href))
                    }
                  >
                    <ChevronDown size={13} />
                  </button>
                ) : null}
              </div>

              {hasChildren && branchExpanded && !collapsed ? (
                <div className="atlas-sidebar-branch-children">
                  {item.children?.map((child) => {
                    const ChildIcon = child.icon;
                    const childActive = isRouteActive(pathname, child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        prefetch={false}
                        onClick={(event) => {
                          event.preventDefault();
                          onNavigate(child.href);
                        }}
                        className="atlas-sidebar-link atlas-sidebar-sublink brandops-navlink"
                        data-active={childActive ? "true" : "false"}
                        data-collapsed={collapsed ? "true" : "false"}
                        aria-current={childActive ? "page" : undefined}
                        title={collapsed ? child.label : undefined}
                      >
                        <ChildIcon size={12} />
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem("brandops.sidebar.collapsed") === "true";
  });
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);

  const {
    activeBrand,
    activeBrandId,
    brands,
    customDateRange,
    errorMessage,
    financialReportFiltered,
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

  const pendingSanitizationCount = useSanitizationPendingCount(
    activeBrandId,
    session?.access_token,
  );

  const navigationContext = useMemo(() => getNavigationContext(pathname), [pathname]);

  const shellTelemetry = useMemo<ShellContextTelemetry>(() => {
    const mediaIntegration = activeBrand?.integrations.find((integration) => integration.provider === "meta");
    const ga4Integration = activeBrand?.integrations.find((integration) => integration.provider === "ga4");

    return {
      pendingSanitizationCount,
      mediaIntegrationError: mediaIntegration?.lastSyncStatus === "error",
      ga4IntegrationError: ga4Integration?.lastSyncStatus === "error",
      contributionAfterMedia: financialReportFiltered?.total.contributionAfterMedia ?? null,
      netResult: financialReportFiltered?.total.netResult ?? null,
      grossRoas: financialReportFiltered?.total.grossRoas ?? null,
    };
  }, [activeBrand, financialReportFiltered, pendingSanitizationCount]);

  const shellAlerts = useMemo(
    () => buildShellAlerts(shellTelemetry, selectedBrandName),
    [selectedBrandName, shellTelemetry],
  );

  const shellCopy = useMemo(
    () => getShellCopy(pathname, selectedBrandName, selectedPeriodLabel),
    [pathname, selectedBrandName, selectedPeriodLabel],
  );

  function handleShellNavigate(href: AppRoute) {
    setIsMobileMenuOpen(false);
    setIsPeriodMenuOpen(false);
    setIsUserMenuOpen(false);
    router.push(href);
  }

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, router, session]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("brandops.sidebar.collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  if (isLoading && !session) {
    return (
      <div className="atlas-workspace-loading">
        <div className="atlas-workspace-loading-card">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-outline bg-surface-container-high text-lg font-semibold text-primary">
            BO
          </div>
          <div className="space-y-2 text-center">
            <p className="eyebrow">Workspace</p>
            <h2 className="font-headline text-xl font-semibold tracking-tight text-on-surface">
              Carregando workspace
            </h2>
            <p className="text-sm leading-6 text-on-surface-variant">
              Preparando dados, permissões e contexto operacional.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isSuperAdmin = profile?.role === "SUPER_ADMIN";

  if (isSuperAdmin && !activeBrandId) {
    return (
      <div className="atlas-brand-picker">
        <div className="atlas-brand-picker-copy">
          <p className="eyebrow">Seleção de contexto</p>
          <h1 className="font-headline text-4xl font-semibold tracking-tight text-on-surface">
            Escolha a operação que deseja abrir
          </h1>
          <p className="text-base leading-7 text-on-surface-variant">
            O BrandOps trabalha por marca ativa. Entre no workspace certo e siga a leitura com o recorte adequado.
          </p>
        </div>

        <div className="atlas-brand-picker-grid">
          {brands.map((brand) => (
            <button
              key={brand.id}
              type="button"
              onClick={() => setActiveBrandId(brand.id)}
              className="brandops-card atlas-brand-picker-card"
            >
              <span className="atlas-brand-picker-mark">{brand.name.slice(0, 2).toUpperCase()}</span>
              <div className="space-y-1">
                <p className="text-base font-semibold text-on-surface">{brand.name}</p>
                <p className="text-sm text-on-surface-variant">Abrir workspace desta marca</p>
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="brandops-button brandops-button-ghost mx-auto"
        >
          <LogOut size={14} />
          Sair desta conta
        </button>
      </div>
    );
  }

  return (
    <div className="brandops-shell min-h-[100svh] bg-background text-on-surface">
      <div className="atlas-shell-layout">
        <aside
          className="atlas-sidebar-shell hidden lg:flex"
          data-collapsed={isSidebarCollapsed ? "true" : "false"}
        >
          <div className="atlas-sidebar-brand">
            <div className="atlas-sidebar-brandmark">
              <span className="flex h-full w-full items-center justify-center text-[11px] font-semibold tracking-[0.2em] text-primary">
                BO
              </span>
            </div>
            <div className="min-w-0">
              <p className="atlas-sidebar-brandtitle">{BRANDING.appName}</p>
              <p className="atlas-sidebar-brandmeta">Console operacional</p>
            </div>
            <button
              type="button"
              className="atlas-sidebar-toggle"
              aria-label={isSidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
              aria-pressed={isSidebarCollapsed}
              onClick={() => setIsSidebarCollapsed((current) => !current)}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            </button>
          </div>

          <div className="atlas-sidebar-nav">
            {navigationGroups.map((group) => (
              <SidebarGroup
                key={group.label}
                group={group}
                pathname={pathname}
                onNavigate={handleShellNavigate}
                collapsed={isSidebarCollapsed}
              />
            ))}
          </div>

          <div className="atlas-sidebar-footer">
            <div
              className="atlas-sidebar-footer-card"
              aria-label="Período ativo"
              title={isSidebarCollapsed ? selectedPeriodLabel : undefined}
            >
              <span className="atlas-sidebar-footer-label">Recorte</span>
              <span className="atlas-sidebar-footer-value">{selectedPeriodLabel}</span>
            </div>
          </div>
        </aside>

        <div className="atlas-main-stage">
          <header className="atlas-topbar">
            <div className="atlas-topbar-main">
              <div className="atlas-topbar-context">
                <div className="atlas-topbar-mobile-nav lg:hidden">
                  <button
                    type="button"
                    className="atlas-topbar-menu"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsPeriodMenuOpen(false);
                      setIsMobileMenuOpen((open) => !open);
                    }}
                    aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                  >
                    {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
                  </button>
                  <div className="atlas-topbar-mobile-brandmark text-[10px] font-semibold tracking-[0.2em] text-primary">
                    BO
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="atlas-topbar-overline">{navigationContext.groupLabel}</p>
                  <div className="atlas-topbar-title-row">
                    <h1 className="atlas-topbar-title">{navigationContext.itemLabel}</h1>
                  </div>
                  <div className="atlas-topbar-meta">
                    <span className="atlas-topbar-meta-chip">{selectedBrandName}</span>
                    <span className="atlas-topbar-meta-divider" />
                    <span className="atlas-topbar-meta-text">{selectedPeriodLabel}</span>
                  </div>
                  {shellCopy.description ? (
                    <p className="atlas-topbar-description">{shellCopy.description}</p>
                  ) : null}
                </div>
              </div>

              <div className="atlas-topbar-tools">
                <div className="atlas-topbar-commandbar">
                  <div className="atlas-shell-select-wrap">
                    <select
                      value={activeBrandId ?? ""}
                      onChange={(event) => {
                        const nextBrandId = event.target.value;
                        if (!nextBrandId) {
                          return;
                        }
                        setActiveBrandId(nextBrandId);
                      }}
                      className="brandops-input atlas-shell-select"
                      disabled={!brands.length}
                      aria-label="Selecionar marca"
                    >
                      {!brands.length && <option value="">Nenhuma marca</option>}
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="atlas-shell-period-wrap">
                    <PeriodCommandMenu
                      open={isPeriodMenuOpen}
                      selectedPeriod={selectedPeriod}
                      selectedPeriodLabel={selectedPeriodLabel}
                      customDateRange={customDateRange}
                      onToggle={() => {
                        setIsUserMenuOpen(false);
                        setIsPeriodMenuOpen((open) => !open);
                      }}
                      onClose={() => setIsPeriodMenuOpen(false)}
                      onSelectPeriod={(period) => setSelectedPeriod(period)}
                      onChangeCustomDateRange={setCustomDateRange}
                    />
                  </div>
                </div>

                <ShellAccountMenu
                  open={isUserMenuOpen}
                  fullName={profile?.fullName}
                  email={profile?.email}
                  onToggle={() => {
                    setIsPeriodMenuOpen(false);
                    setIsUserMenuOpen((open) => !open);
                  }}
                  onClose={() => setIsUserMenuOpen(false)}
                  onSignOut={() => void signOut()}
                  renderThemeToggle={<ThemeToggle variant="panel" size="sm" />}
                />
              </div>
            </div>

            {shellAlerts.length ? (
              <div className="atlas-topbar-alerts">
                {shellAlerts.map((alert) => (
                  <Link
                    key={`${alert.href}-${alert.label}`}
                    href={alert.href}
                    prefetch={false}
                    className="atlas-topbar-alert"
                    data-tone={alert.tone}
                  >
                    {alert.label}
                  </Link>
                ))}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="atlas-topbar-error">
                {errorMessage}
              </div>
            ) : null}
          </header>

          <main className="atlas-content-scroll">
            <div className="atlas-page-stack">{children}</div>
          </main>
        </div>
      </div>

      <nav className="atlas-mobile-tabbar lg:hidden">
        <div className="atlas-mobile-tabbar-grid">
          {mobilePrimaryNav.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={(event) => {
                  event.preventDefault();
                  handleShellNavigate(item.href);
                }}
                className="atlas-mobile-tab"
                data-active={active ? "true" : "false"}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {isMobileMenuOpen ? (
        <div className="atlas-mobile-drawer lg:hidden">
          <button
            type="button"
            className="atlas-mobile-drawer-backdrop"
            aria-label="Fechar menu"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <aside className="atlas-mobile-drawer-panel">
            <div className="atlas-sidebar-brand border-b border-outline/70">
              <div className="atlas-sidebar-brandmark">
                <span className="flex h-full w-full items-center justify-center text-[11px] font-semibold tracking-[0.2em] text-primary">
                  BO
                </span>
              </div>
              <div className="min-w-0">
                <p className="atlas-sidebar-brandtitle">{BRANDING.appName}</p>
                <p className="atlas-sidebar-brandmeta">Console operacional</p>
              </div>
            </div>

            <div className="border-b border-outline/70 px-4 py-4">
              <label className="brandops-field-stack">
                <span className="brandops-field-label">Operação</span>
                <select
                  value={activeBrandId ?? ""}
                  onChange={(event) => {
                    const nextBrandId = event.target.value;
                    if (!nextBrandId) {
                      return;
                    }
                    setActiveBrandId(nextBrandId);
                    setIsMobileMenuOpen(false);
                  }}
                  className="brandops-input atlas-shell-select"
                  disabled={!brands.length}
                >
                  {!brands.length && <option value="">Nenhuma marca</option>}
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="atlas-mobile-drawer-nav">
              {navigationGroups.map((group) => (
                <SidebarGroup
                  key={group.label}
                  group={group}
                  pathname={pathname}
                  onNavigate={handleShellNavigate}
                />
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}




