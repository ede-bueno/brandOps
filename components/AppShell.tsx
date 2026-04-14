"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronsRight,
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
  ShieldAlert,
  Sparkles,
  Tags,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { useBrandOps } from "./BrandOpsProvider";
import type { PeriodFilter } from "@/lib/brandops/types";
import { BRANDING } from "@/lib/branding";
import { ThemeToggle } from "./ThemeToggle";
import { AtlasOrb } from "./AtlasOrb";
import { AtlasAnalystPanel } from "./AtlasAnalystPanel";

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

interface AtlasOrbTelemetry {
  hasFinancialReport: boolean;
  pendingSanitizationCount: number;
  hasGa4Data: boolean;
  hasMediaData: boolean;
  hasCatalogData: boolean;
  mediaIntegrationError: boolean;
  ga4IntegrationError: boolean;
  geminiEnabled: boolean;
  contributionAfterMedia: number | null;
  netResult: number | null;
  variableCostShare: number | null;
  grossRoas: number | null;
}

function getAtlasOrbContext(
  pathname: string,
  brandName: string,
  periodLabel: string,
  telemetry: AtlasOrbTelemetry,
) {
  const contexts = [
    {
      match: (value: string) => value.startsWith("/dashboard/contribution-margin"),
      status: "foco em margem",
      description: `Atlas está acompanhando a curva histórica de contribuição da ${brandName} para localizar compressão, ganho de eficiência e risco operacional no recorte ${periodLabel.toLowerCase()}.`,
      hints: [
        "Cruze contribuição, resultado e despesas para separar ruído de tendência estrutural.",
        "Quando a margem vira antes do resultado, o Atlas tende a sinalizar a mudança primeiro aqui.",
        "Use esta leitura para entender se a operação está respirando ou só adiando pressão.",
      ],
    },
    {
      match: (value: string) => value.startsWith("/dashboard"),
      status: "centro de comando",
      description: `Atlas está em casa na Torre de Controle da ${brandName}, acompanhando os sinais executivos para destacar desvios, prioridades e oportunidades com clareza operacional.`,
      hints: [
        "A base nativa do Atlas IA mora nesta tela; o Orb aqui funciona como atalho e contexto rápido.",
        "Priorize onde há compressão de margem, mídia acima do retorno e despesas dominando o período.",
        "Os próximos blocos devem apontar primeiro o que pede ação, não só o que mudou.",
      ],
    },
    {
      match: (value: string) => value.startsWith("/dre"),
      status: "leitura financeira",
      description: `Atlas está cruzando faturado, RLD, CMV, mídia e despesas da ${brandName} para mostrar o que realmente sustenta ou corrói resultado.`,
      hints: [
        "A leitura financeira precisa falar de pressão e alívio, não só listar blocos contábeis.",
        "Use os drivers para entender onde a operação pede ajuste estrutural.",
        "O ponto de equilíbrio só aparece quando a contribuição permite meta calculável com confiança.",
      ],
    },
    {
      match: (value: string) => value.startsWith("/media"),
      status: "mapeando mídia",
      description: `Atlas está lendo investimento, retorno atribuído e campanhas da ${brandName} para decidir onde escalar, revisar criativo ou proteger verba.`,
      hints: [
        "Campanhas com gasto relevante e retorno fraco devem aparecer como prioridade de revisão.",
        "A recomendação certa aqui é mover orçamento, não admirar o dashboard.",
        "No futuro, o Atlas vai narrar risco, oportunidade e próxima ação por campanha.",
      ],
    },
    {
      match: (value: string) => value.startsWith("/traffic"),
      status: "lendo tráfego",
      description: `Atlas está acompanhando a jornada de tráfego da ${brandName} para localizar onde o funil ganha força, perde intenção ou monetiza melhor.`,
      hints: [
        "A camada inteligente de tráfego deve mostrar atrito e monetização por entrada.",
        "Source, campanha e landing page precisam competir por atenção com clareza.",
        "O objetivo aqui é decidir distribuição de tráfego, não espelhar o GA4.",
      ],
    },
    {
      match: (value: string) => value.startsWith("/product-insights"),
      status: "vigiando estampas",
      description: `Atlas está cruzando intenção, venda real e momentum da ${brandName} para dizer o que merece escala, mais tráfego ou revisão de vitrine.`,
      hints: [
        "A estampa em foco deve responder o que fazer agora, não só descrever métricas.",
        "Use esta camada para transformar comportamento em decisão comercial.",
        "No futuro, o Atlas vai ligar estampas, catálogo e criativos em uma mesma trilha de ação.",
      ],
    },
    {
      match: (value: string) => value.startsWith("/feed"),
      status: "lendo catálogo",
      description: `Atlas está organizando o catálogo da ${brandName} para mostrar cobertura visual, oportunidade de escala e lacunas entre Meta e feed manual.`,
      hints: [
        "Catálogo bom não é só bonito; ele precisa abrir espaço para mídia e criativo.",
        "Produtos sem galeria ou sem tração devem entrar rápido em revisão visual.",
        "A convivência Meta Catalog + feed manual precisa parecer uma fonte única para o operador.",
      ],
    },
    {
      match: (value: string) => value.startsWith("/sanitization"),
      status: "auditando anomalias",
      description: `Atlas está protegendo a leitura da ${brandName} contra extremos e ruído operacional, preservando histórico e confiança nos números.`,
      hints: [
        "Pendências pedem decisão rápida; histórico pede rastreabilidade limpa.",
        "Tudo que for ignorado ou mantido precisa continuar auditável depois da reimportação.",
        "Saneamento é defesa de confiança, não um anexo do sistema.",
      ],
    },
    {
      match: (value: string) => value.startsWith("/cost-center"),
      status: "cuidando despesas",
      description: `Atlas está estruturando os lançamentos de despesas da ${brandName} para que o DRE reflita a operação de verdade, sem improviso nem ruído de competência.`,
      hints: [
        "A operação precisa lançar rápido e localizar fácil o que já entrou.",
        "Categorias e livro de lançamentos devem trabalhar como uma mesa financeira, não como formulário solto.",
        "A próxima camada aqui é reduzir atrito entre lançamento, auditoria e efeito no DRE.",
      ],
    },
    {
      match: (value: string) => value.startsWith("/sales"),
      status: "lendo vendas",
      description: `Atlas está consolidando a operação comercial da ${brandName} para traduzir pedido, item, ticket e desconto em leitura acionável.`,
      hints: [
        "Vendas precisa apontar onde a receita ganhou corpo e onde a densidade de pedido caiu.",
        "A leitura aqui deve dialogar com margem, catálogo e tráfego sem repetir blocos.",
        "O melhor uso desta tela é decidir o próximo ajuste comercial com rapidez.",
      ],
    },
    {
      match: (value: string) => value.startsWith("/integrations"),
      status: "sincronizando sinais",
      description: `Atlas está observando a malha de integrações da ${brandName} para manter Meta, GA4 e importações operando como uma única base confiável.`,
      hints: [
        "Integração não deve parecer configuração técnica; deve parecer prontidão operacional.",
        "Quando algo falhar, a mensagem precisa dizer impacto e próximo passo.",
        "Esta área vai virar o centro de saúde das fontes do sistema.",
      ],
    },
    {
      match: () => true,
      status: "escutando",
      description: `Atlas acompanha a ${brandName} de ponta a ponta e vai começar a antecipar risco, pressão e oportunidade conforme você navega pelo console.`,
      hints: [
        "Arraste o orbe para o canto que fizer mais sentido e deixe a entidade acompanhar sua navegação.",
        "A camada proativa vai cruzar mídia, catálogo e operação para decidir o próximo passo.",
        "O Atlas deve falar pouco, mas puxar sua atenção para o dado que realmente pede ação.",
      ],
    },
  ];

  const matchedContext = contexts.find((context) => context.match(pathname))!;
  const isDashboard = pathname.startsWith("/dashboard");
  const isSanitization = pathname.startsWith("/sanitization");
  const isMedia = pathname.startsWith("/media");
  const isTraffic = pathname.startsWith("/traffic");
  const isDre = pathname.startsWith("/dre");
  const isFeed = pathname.startsWith("/feed");
  const isIntegrations = pathname.startsWith("/integrations");

  let attentionLevel: "idle" | "notice" | "alert" = "idle";

  if (
    telemetry.pendingSanitizationCount > 0 ||
    telemetry.mediaIntegrationError ||
    telemetry.ga4IntegrationError ||
    (telemetry.netResult !== null && telemetry.netResult < 0) ||
    (telemetry.contributionAfterMedia !== null && telemetry.contributionAfterMedia < 0)
  ) {
    attentionLevel = "alert";
  } else if (
    (telemetry.variableCostShare !== null && telemetry.variableCostShare > 0.7) ||
    (telemetry.grossRoas !== null && telemetry.grossRoas > 0 && telemetry.grossRoas < 2) ||
    isDashboard ||
    isTraffic ||
    isDre
  ) {
    attentionLevel = "notice";
  }

  let hoverAlert = `Atlas detectou contexto relacionado a ${matchedContext.status} na ${brandName}. Abra só se quiser aprofundar a leitura desta tela.`;

  if (telemetry.pendingSanitizationCount > 0) {
    hoverAlert = `${telemetry.pendingSanitizationCount} pendência(s) de saneamento ainda podem distorcer a leitura deste período.`;
  } else if (telemetry.mediaIntegrationError && isMedia) {
    hoverAlert = "A integração de mídia reportou erro recente. Vale revisar a saúde da fonte antes de confiar na leitura.";
  } else if (telemetry.ga4IntegrationError && isTraffic) {
    hoverAlert = "A integração do GA4 reportou erro recente. O tráfego pode estar incompleto neste recorte.";
  } else if (telemetry.netResult !== null && telemetry.netResult < 0 && (isDashboard || isDre)) {
    hoverAlert = "O resultado operacional do período está negativo. Há pressão real sobre a operação agora.";
  } else if (
    telemetry.contributionAfterMedia !== null &&
    telemetry.contributionAfterMedia < 0 &&
    (isDashboard || isMedia || isDre)
  ) {
    hoverAlert = "A contribuição depois de mídia ficou negativa neste recorte. O Atlas está chamando atenção para isso.";
  } else if (
    telemetry.variableCostShare !== null &&
    telemetry.variableCostShare > 0.7 &&
    (isDashboard || isDre)
  ) {
    hoverAlert = "Os custos variáveis estão consumindo uma fatia alta da receita líquida disponível.";
  } else if (!telemetry.hasGa4Data && isTraffic) {
    hoverAlert = "Ainda não há dados suficientes de GA4 neste recorte para uma leitura confiável de tráfego.";
  } else if (!telemetry.hasCatalogData && isFeed) {
    hoverAlert = "O catálogo ainda não tem massa suficiente para o Atlas chamar atenção sobre cobertura e escala.";
  } else if (isDashboard) {
    hoverAlert = telemetry.geminiEnabled
      ? `A casa nativa do Atlas fica na Torre de Controle da ${brandName}. O Orb aqui só sinaliza foco e atalhos.`
      : `Esta marca está usando a Torre de Controle sem IA ativa. O Orb segue discreto, só chamando atenção para contexto e próximos focos.`;
  } else if (isIntegrations) {
    hoverAlert = "O Atlas está acompanhando a saúde das fontes para não deixar o sistema operar em cima de dado quebrado.";
  }

  const hoverActions = [];

  if (isDashboard) {
    if (telemetry.geminiEnabled) {
      hoverActions.push(
        { label: "Ir para a casa do Atlas", action: "scroll" as const, targetId: "atlas-ai-home" },
        { label: "Abrir Atlas Analyst", action: "open-panel" as const },
      );
    } else {
      hoverActions.push(
        { label: "Ver status desta tela", action: "open-panel" as const },
        { label: "Como ativar a IA", href: "/integrations" },
      );
    }

    if (telemetry.pendingSanitizationCount > 0) {
      hoverActions.push({ label: "Revisar saneamento", href: "/sanitization" });
    } else {
      hoverActions.push({ label: `Ler sinais de ${periodLabel}`, action: "open-panel" as const });
    }
  } else {
    if (telemetry.pendingSanitizationCount > 0 && !isSanitization) {
      hoverActions.push({ label: "Revisar saneamento", href: "/sanitization" });
    }

    if ((telemetry.mediaIntegrationError || telemetry.ga4IntegrationError) && !isIntegrations) {
      hoverActions.push({ label: "Ver integrações", href: "/integrations" });
    }

    hoverActions.push(
      { label: "Ver alerta desta tela", action: "open-panel" as const },
      { label: telemetry.geminiEnabled ? "Abrir Atlas Analyst" : "Ver leitura contextual", action: "open-panel" as const },
    );
  }

  return {
    ...matchedContext,
    attentionLevel,
    hoverAlert,
    hoverActions: hoverActions.slice(0, 3),
  };
}

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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
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
  const atlasOrbTelemetry = useMemo<AtlasOrbTelemetry>(() => {
    const mediaIntegration = activeBrand?.integrations.find((integration) => integration.provider === "meta");
    const ga4Integration = activeBrand?.integrations.find((integration) => integration.provider === "ga4");
    const geminiIntegration = activeBrand?.integrations.find((integration) => integration.provider === "gemini");
    const pendingSanitizationCount =
      (filteredBrand?.media.filter((row) => row.sanitizationStatus === "PENDING").length ?? 0) +
      (filteredBrand?.paidOrders.filter((order) => order.sanitizationStatus === "PENDING").length ?? 0);

    return {
      hasFinancialReport: Boolean(financialReportFiltered?.total),
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
  }, [activeBrand?.catalog.length, activeBrand?.integrations, filteredBrand?.ga4DailyPerformance, filteredBrand?.media, filteredBrand?.paidOrders, financialReportFiltered]);
  const atlasOrbContext = useMemo(
    () => getAtlasOrbContext(pathname, selectedBrandName, selectedPeriodLabel, atlasOrbTelemetry),
    [atlasOrbTelemetry, pathname, selectedBrandName, selectedPeriodLabel],
  );

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
      <div className="flex h-full gap-0 p-0 sm:gap-4 sm:p-0 lg:gap-5 lg:p-0 xl:gap-6">

        {/* ---- Desktop Sidebar ---- */}
          <aside
          className={`atlas-tech-grid atlas-sidebar hidden my-3 shrink-0 self-stretch flex-col overflow-hidden lg:flex transition-[width] duration-300 ease-in-out ${
            isSidebarCollapsed ? "w-[86px]" : "w-[264px]"
          }`}
        >
          {/* Header */}
          <div
            className={`atlas-sidebar-header flex shrink-0 items-center gap-2 border-b border-outline/50 px-3 py-3.5 ${
              isSidebarCollapsed ? "flex-col justify-center" : "justify-between"
            }`}
          >
            <div className={`flex min-w-0 items-center gap-2 ${isSidebarCollapsed ? "flex-col" : ""}`}>
              <div className="atlas-sidebar-brandmark flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary-container/70 text-primary">
                <Sparkles size={17} />
              </div>
              {!isSidebarCollapsed && (
                <p className="truncate font-headline text-[1rem] font-semibold tracking-tight text-on-surface">
                  {BRANDING.appName}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                setIsSidebarCollapsed((c) => !c);
              }}
              className="atlas-sidebar-toggle inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border text-on-surface-variant hover:text-on-surface"
              aria-label={isSidebarCollapsed ? "Expandir navegação" : "Recolher navegação"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={12} strokeWidth={1.8} /> : <PanelLeftClose size={12} strokeWidth={1.8} />}
            </button>
          </div>

          {/* Nav */} 
          <div className="atlas-sidebar-nav min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {isLoading ? (
              <SidebarSkeleton />
            ) : (
              <>
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
          <div className="atlas-sidebar-footer relative shrink-0 border-t border-outline/50 p-2">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((open) => !open)}
              className={`atlas-user-trigger flex w-full items-center rounded-xl border border-transparent bg-transparent px-2 py-2 text-left transition hover:border-outline/60 hover:bg-surface-container-low ${
                isSidebarCollapsed ? "justify-center" : "gap-2.5"
              }`}
              aria-expanded={isUserMenuOpen}
              aria-label="Abrir menu do usuário"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline/60 bg-surface-container text-on-surface-variant">
                <UserRound size={14} />
              </span>
              {!isSidebarCollapsed ? (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-on-surface">
                      {profile?.fullName ?? "Conta Atlas"}
                    </span>
                    <span className="block truncate text-[11px] text-on-surface-variant">
                      {profile?.email ?? "Sessão ativa"}
                    </span>
                  </span>
                  <ChevronDown
                    size={14}
                    className={`shrink-0 text-on-surface-variant transition ${isUserMenuOpen ? "rotate-180" : ""}`}
                  />
                </>
              ) : null}
            </button>

            {isUserMenuOpen ? (
              <div
                className={`atlas-user-menu brandops-panel-soft absolute bottom-full z-40 mb-2 p-2 ${
                  isSidebarCollapsed ? "left-1/2 w-56 -translate-x-1/2" : "left-2 right-2"
                }`}
              >
                <div className="rounded-xl bg-surface-container-low px-3 py-2.5">
                  <p className="truncate text-[12px] font-semibold text-on-surface">
                    {profile?.fullName ?? "Conta Atlas"}
                  </p>
                  <p className="truncate text-[11px] text-on-surface-variant">
                    {profile?.email ?? "Sessão ativa"}
                  </p>
                </div>
                <div className="mt-2 grid gap-2">
                  <div className="flex items-center justify-between rounded-xl border border-outline/50 bg-surface px-3 py-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                        Aparência
                      </p>
                      <p className="text-[12px] text-on-surface">Modo claro / escuro</p>
                    </div>
                    <ThemeToggle />
                  </div>
                  <button
                    onClick={() => void signOut()}
                    className="brandops-button brandops-button-ghost w-full justify-center"
                  >
                    <LogOut size={14} />
                    Sair
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        {/* ---- Main Content ---- */}
        <div className="atlas-main-stage">
          {/* Header */}
          <header className="atlas-command-strip z-30 shrink-0 border-b border-outline/50 px-3 py-3 sm:mt-3 sm:rounded-2xl sm:border sm:border-outline/50 sm:px-4 lg:mt-4 lg:px-5">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsMobileMenuOpen((c) => !c);
                  }}
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
                  </div>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted sm:text-[11px] sm:tracking-[0.16em]">
                    Operação, aquisição, catálogo e margem em um único workspace
                  </p>
                </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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

            <div className="flex flex-col gap-3 border-t border-outline/50 pt-3">
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
          <main className="atlas-content-scroll min-w-0 flex-1 py-3 sm:py-4 lg:py-5">
            <div className="atlas-page-stack">{children}</div>
          </main>
        </div>
      </div>

      <AtlasOrb
        floating
        size="md"
        title="Atlas"
        status={atlasOrbContext.status}
        description={atlasOrbContext.description}
        panelAlign="left"
        hints={atlasOrbContext.hints}
        attentionLevel={atlasOrbContext.attentionLevel}
        hoverAlert={atlasOrbContext.hoverAlert}
        hoverActions={atlasOrbContext.hoverActions}
        panelContent={<AtlasAnalystPanel variant={pathname.startsWith("/dashboard") ? "dashboard-orb" : "orb"} />}
      />

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="Fechar menu"
            onClick={() => {
              setIsUserMenuOpen(false);
              setIsMobileMenuOpen(false);
            }}
          />
          <aside className="atlas-sidebar atlas-tech-grid absolute inset-y-2 left-2 flex w-[min(86vw,320px)] flex-col overflow-hidden rounded-2xl">
            <div className="atlas-sidebar-header flex items-center justify-between gap-2 border-b border-outline/50 px-3 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="atlas-sidebar-brandmark flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary-container/70 text-primary">
                  <Sparkles size={17} />
                </div>
                <p className="truncate font-headline text-[1rem] font-semibold tracking-tight text-on-surface">
                  {BRANDING.appName}
                </p>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline bg-surface-container text-on-surface-variant"
              >
                <X size={16} />
              </button>
            </div>

            <div className="atlas-sidebar-nav min-h-0 flex-1 overflow-y-auto px-2 py-1">
              <NavGroupLabel label="Operação" collapsed={false} />
              <NavSection
                items={operationsNav}
                pathname={pathname}
                collapsed={false}
                onNavigate={() => {
                  setIsUserMenuOpen(false);
                  setIsMobileMenuOpen(false);
                }}
              />
              <NavGroupLabel label="Aquisição" collapsed={false} />
              <NavSection
                items={acquisitionNav}
                pathname={pathname}
                collapsed={false}
                onNavigate={() => {
                  setIsUserMenuOpen(false);
                  setIsMobileMenuOpen(false);
                }}
              />
              <NavGroupLabel label="Catálogo" collapsed={false} />
              <NavSection
                items={catalogNav}
                pathname={pathname}
                collapsed={false}
                onNavigate={() => {
                  setIsUserMenuOpen(false);
                  setIsMobileMenuOpen(false);
                }}
              />
              <NavGroupLabel label="Admin" collapsed={false} />
              <NavSection
                items={adminNavigation}
                pathname={pathname}
                collapsed={false}
                onNavigate={() => {
                  setIsUserMenuOpen(false);
                  setIsMobileMenuOpen(false);
                }}
              />
            </div>

            <div className="atlas-sidebar-footer relative border-t border-outline/50 p-3">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((open) => !open)}
                className="atlas-user-trigger flex w-full items-center gap-2.5 rounded-xl border border-transparent bg-transparent px-2 py-2 text-left transition hover:border-outline/60 hover:bg-surface-container-low"
                aria-expanded={isUserMenuOpen}
                aria-label="Abrir menu do usuário"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline/60 bg-surface-container text-on-surface-variant">
                  <UserRound size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold text-on-surface">
                    {profile?.fullName ?? "Conta Atlas"}
                  </span>
                  <span className="block truncate text-[11px] text-on-surface-variant">
                    {profile?.email ?? "Sessão ativa"}
                  </span>
                </span>
                <ChevronDown size={14} className={`shrink-0 text-on-surface-variant transition ${isUserMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isUserMenuOpen ? (
                <div className="atlas-user-menu brandops-panel-soft absolute bottom-full left-3 right-3 z-40 mb-2 p-2">
                  <div className="flex items-center justify-between rounded-xl border border-outline/50 bg-surface px-3 py-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                        Aparência
                      </p>
                      <p className="text-[12px] text-on-surface">Modo claro / escuro</p>
                    </div>
                    <ThemeToggle />
                  </div>
                  <button
                    onClick={() => void signOut()}
                    className="brandops-button brandops-button-ghost mt-2 w-full justify-center"
                  >
                    <LogOut size={14} />
                    Sair
                  </button>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
