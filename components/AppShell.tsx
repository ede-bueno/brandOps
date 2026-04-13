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
  Loader2,
  LogOut,
  Menu,
  PlugZap,
  Receipt,
  Settings2,
  ShieldAlert,
  Sparkles,
  Tags,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";

import { useBrandOps } from "./BrandOpsProvider";
import { ThemeToggle } from "./ThemeToggle";
import { AtlasOrb } from "./AtlasOrb";
import { AtlasMark } from "./AtlasMark";
import { AtlasOrbRadarPanel, type AtlasOrbRadarTelemetry } from "./AtlasOrbRadarPanel";
import { PeriodCommandMenu } from "./PeriodCommandMenu";
import { BRANDING } from "@/lib/branding";
import { useSanitizationPendingCount } from "@/hooks/use-sanitization-summary";
import {
  ATLAS_ORB_SYNC_LOADING_EVENT,
  type AtlasOrbSyncLoadingDetail,
} from "@/lib/brandops/orb-sync-loading";
import { buildControlAlerts, summarizeControlAlert } from "@/lib/brandops/control-alerts";
import { APP_ROUTES, type AppRoute } from "@/lib/brandops/routes";

interface NavItem {
  href: AppRoute;
  label: string;
  icon: React.ElementType;
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

interface AtlasOrbContextTelemetry extends AtlasOrbRadarTelemetry {
  hasMediaData: boolean;
}

const navigationGroups: NavGroup[] = [
  {
    label: "Controle",
    items: [{ href: APP_ROUTES.dashboard, label: "Torre de Controle", icon: LayoutDashboard }],
  },
  {
    label: "Financeiro",
    items: [
      { href: APP_ROUTES.dre, label: "DRE Consolidado", icon: Receipt },
      { href: APP_ROUTES.sales, label: "Receita e Vendas", icon: BarChart3 },
      { href: APP_ROUTES.costCenter, label: "Lançamentos DRE", icon: Landmark },
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
  telemetry: AtlasOrbContextTelemetry,
  activeBrandName: string,
): ShellAlert[] {
  return buildControlAlerts({
    pendingSanitizationCount: telemetry.pendingSanitizationCount,
    mediaIntegrationError: telemetry.mediaIntegrationError,
    ga4IntegrationError: telemetry.ga4IntegrationError,
    contributionAfterMedia: telemetry.contributionAfterMedia,
    netResult: telemetry.netResult,
    variableCostShare: telemetry.variableCostShare,
    grossRoas: telemetry.grossRoas,
  }).map((alert) => ({
    href: alert.href,
    label:
      alert.id === "sanitization"
        ? `${summarizeControlAlert(alert)} em ${activeBrandName}`
        : summarizeControlAlert(alert),
    tone:
      alert.tone === "positive"
        ? "info"
        : alert.tone,
  })).slice(0, 3);
}

function getOrbCopy(pathname: string, brandName: string, periodLabel: string) {
  if (pathname.startsWith(APP_ROUTES.dashboard)) {
      return {
        status: "monitorando a operação",
        description: `Atlas acompanha a ${brandName} no recorte ${periodLabel.toLowerCase()} para puxar atenção só para o que realmente pede ação.`,
        hints: [
        "Comece pelo alerta dominante e só depois aprofunde o restante.",
        "Quando a operação tensiona, Atlas puxa primeiro margem, resultado e base.",
        "Se o recorte estiver estável, avance para produto, mídia e conversão.",
        ],
      };
  }

  if (pathname.startsWith(APP_ROUTES.media)) {
      return {
        status: "observando a mídia",
        description: `Atlas cruza gasto, retorno e sinais de performance da ${brandName} para decidir ajuste, revisão ou escala.`,
        hints: [
        "O foco aqui é decidir verba, criativo e prioridade de campanha.",
        "Confirme a saúde da fonte antes de tomar decisão de escala.",
        "Saia do agregado só quando o sinal já estiver claro.",
        ],
      };
  }

  if (pathname.startsWith(APP_ROUTES.traffic)) {
      return {
        status: "lendo o funil",
        description: `Atlas acompanha intenção, fricção e monetização da ${brandName} no período ativo.`,
        hints: [
        "Procure primeiro onde o funil trava ou perde monetização.",
        "Vá da leitura executiva ao detalhe só quando houver sinal de atrito.",
        "O objetivo não é replicar GA4, e sim traduzir em decisão.",
        ],
      };
  }

  if (pathname.startsWith(APP_ROUTES.integrations) || pathname.startsWith(APP_ROUTES.settings)) {
      return {
        status: "sincronizando a plataforma",
        description: `Atlas organiza integrações, parâmetros e prontidão operacional da ${brandName}.`,
        hints: [
        "Toda configuração precisa deixar claro impacto e próximo passo.",
        "Fonte saudável vem antes de qualquer recomendação.",
        "Corrija o bloqueio operacional antes de voltar para a análise.",
        ],
      };
  }

  return {
    status: "escutando o sistema",
    description: `Atlas acompanha a ${brandName} no recorte ${periodLabel.toLowerCase()} e mantém contexto sobre a área atual.`,
    hints: [
      "Use o Orb para abrir o próximo caminho, não para substituir a tela atual.",
      "Alertas, navegação e período precisam contar a mesma história.",
      "Se o contexto não estiver claro, volte para a Torre de Controle.",
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
          <span className="atlas-user-name">{fullName ?? "Conta Atlas"}</span>
        </span>
        <ChevronDown size={14} className={`atlas-user-chevron ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="atlas-user-menu">
          <div className="atlas-user-menu-head">
            <p className="atlas-user-menu-name">{fullName ?? "Conta Atlas"}</p>
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
}: {
  group: NavGroup;
  pathname: string;
  onNavigate: (href: AppRoute) => void;
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
                  aria-current={itemActive ? "page" : undefined}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </Link>

                {hasChildren ? (
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

              {hasChildren && branchExpanded ? (
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
                        aria-current={childActive ? "page" : undefined}
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
  const showFloatingOrb = false;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1024;
  });
  const [orbSyncLoading, setOrbSyncLoading] = useState<AtlasOrbSyncLoadingDetail>({
    active: false,
  });

  const {
    activeBrand,
    activeBrandId,
    brands,
    customDateRange,
    errorMessage,
    filteredBrand,
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

  const atlasOrbTelemetry = useMemo<AtlasOrbContextTelemetry>(() => {
    const mediaIntegration = activeBrand?.integrations.find((integration) => integration.provider === "meta");
    const ga4Integration = activeBrand?.integrations.find((integration) => integration.provider === "ga4");
    const geminiIntegration = activeBrand?.integrations.find((integration) => integration.provider === "gemini");

    return {
      pendingSanitizationCount,
      hasGa4Data: Boolean(filteredBrand?.ga4DailyPerformance.length),
      hasMediaData: Boolean(filteredBrand?.media.length),
      hasCatalogData: Boolean(activeBrand?.catalog.length),
      mediaIntegrationError: mediaIntegration?.lastSyncStatus === "error",
      ga4IntegrationError: ga4Integration?.lastSyncStatus === "error",
      geminiEnabled: geminiIntegration?.mode === "api",
      contributionAfterMedia: financialReportFiltered?.total.contributionAfterMedia ?? null,
      netResult: financialReportFiltered?.total.netResult ?? null,
      variableCostShare: financialReportFiltered?.analysis.shares.variableCostShare ?? null,
      grossRoas: financialReportFiltered?.total.grossRoas ?? null,
    };
  }, [activeBrand, filteredBrand, financialReportFiltered, pendingSanitizationCount]);

  const shellAlerts = useMemo(
    () => buildShellAlerts(atlasOrbTelemetry, selectedBrandName),
    [atlasOrbTelemetry, selectedBrandName],
  );

  const orbCopy = useMemo(
    () => getOrbCopy(pathname, selectedBrandName, selectedPeriodLabel),
    [pathname, selectedBrandName, selectedPeriodLabel],
  );

  const orbAttentionLevel =
    shellAlerts.some((alert) => alert.tone === "negative" || alert.tone === "warning")
      ? "alert"
      : shellAlerts.some((alert) => alert.tone === "info")
        ? "notice"
        : "idle";

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
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const syncViewport = (event?: MediaQueryListEvent) => {
      setIsMobileViewport(event ? event.matches : mediaQuery.matches);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    function handleOrbSyncLoading(event: Event) {
      const customEvent = event as CustomEvent<AtlasOrbSyncLoadingDetail>;
      setOrbSyncLoading(customEvent.detail ?? { active: false });
    }

    window.addEventListener(
      ATLAS_ORB_SYNC_LOADING_EVENT,
      handleOrbSyncLoading as EventListener,
    );

    return () => {
      window.removeEventListener(
        ATLAS_ORB_SYNC_LOADING_EVENT,
        handleOrbSyncLoading as EventListener,
      );
    };
  }, []);

  if (isLoading && !session) {
    return (
      <div className="atlas-workspace-loading">
        <div className="atlas-workspace-loading-card">
          <AtlasOrb size="lg" />
          <div className="space-y-2 text-center">
            <p className="eyebrow">Workspace</p>
            <h2 className="font-headline text-xl font-semibold tracking-tight text-on-surface">
              Carregando Atlas
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
            O Atlas trabalha por marca ativa. Entre no workspace certo e siga a leitura com o recorte adequado.
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
        <aside className="atlas-sidebar-shell hidden lg:flex">
          <div className="atlas-sidebar-brand">
            <div className="atlas-sidebar-brandmark">
              <AtlasMark />
            </div>
            <div className="min-w-0">
              <p className="atlas-sidebar-brandtitle">{BRANDING.appName}</p>
              <p className="atlas-sidebar-brandmeta">Console operacional</p>
            </div>
          </div>

          <div className="atlas-sidebar-nav">
            {navigationGroups.map((group) => (
              <SidebarGroup
                key={group.label}
                group={group}
                pathname={pathname}
                onNavigate={handleShellNavigate}
              />
            ))}
          </div>

          <div className="atlas-sidebar-footer">
            <div className="atlas-sidebar-footer-card" aria-label="Período ativo">
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
                  <div className="atlas-topbar-mobile-brandmark">
                    <AtlasMark size="sm" />
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
                  <p className="atlas-topbar-description">{orbCopy.description}</p>
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
                <AtlasMark />
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

      {showFloatingOrb ? (
        <AtlasOrb
          key={`atlas-orb-${pathname}`}
          floating
          size={isMobileViewport ? "sm" : "md"}
          title="Atlas"
          status={orbCopy.status}
          description={orbCopy.description}
          panelAlign="left"
          hints={orbCopy.hints}
          storageKey={isMobileViewport ? "atlas.orb.position.mobile" : "atlas.orb.position"}
          attentionLevel={orbAttentionLevel}
          hoverAlert={shellAlerts[0]?.label ?? orbCopy.description}
          hoverActions={
            shellAlerts.length
              ? shellAlerts.map((alert) => ({ label: "Abrir", href: alert.href }))
              : [
                  { label: "Ir para Integrações", href: APP_ROUTES.integrations },
                  { label: "Abrir Configurações", href: APP_ROUTES.settings },
                ]
          }
          panelVariant="custom"
          panelContent={
            <AtlasOrbRadarPanel
              telemetry={atlasOrbTelemetry}
              status={orbCopy.status}
              hoverAlert={shellAlerts[0]?.label ?? orbCopy.description}
            />
          }
        />
      ) : null}

      {orbSyncLoading.active ? (
        <div className="atlas-sync-overlay fixed inset-0 z-[120] flex items-center justify-center">
          <div className="atlas-sync-stage atlas-tech-grid relative w-[min(92vw,30rem)] px-8 py-10 text-center">
            <div className="atlas-sync-grid" />
            <div className="atlas-sync-rings" />
            <div className="atlas-sync-scanline" />
            <div className="mx-auto flex w-full max-w-[15rem] flex-col items-center gap-5">
              <AtlasOrb
                size="lg"
                interactive={false}
                title="Atlas"
                status="sincronizando"
                description="Coordenando a leitura da fonte antes de devolver o workspace."
                attentionLevel="notice"
                className="atlas-sync-orb"
              />
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  Sincronização global
                </p>
                <h3 className="font-headline text-xl font-semibold tracking-tight text-on-surface">
                  {orbSyncLoading.label ?? "Sincronizando dados"}
                </h3>
                <p className="text-sm leading-6 text-on-surface-variant">
                  O Atlas está consolidando a fonte para devolver a tela no estado certo.
                </p>
              </div>
              <div className="atlas-sync-pill inline-flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-on-surface-variant">
                <Loader2 size={14} className="animate-spin text-primary" />
                Processando e reconciliando sinais
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
