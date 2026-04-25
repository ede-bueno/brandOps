import {
  Command,
  LineChart,
  PackageSearch,
  ReceiptText,
  Settings2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type {
  AcquisitionHubReport,
  AnnualDreReport,
  BrandDataset,
  ExecutiveActionItem,
  FinanceHubReport,
  ManagementSnapshotV2,
  OfferHubReport,
} from "@/lib/brandops/types";
import {
  currencyFormatter,
  integerFormatter,
  percentFormatter,
} from "@/lib/brandops/format";

export type StudioModule = "command" | "finance" | "growth" | "offer" | "ops";
export type FinanceStudioSurface = "overview" | "dre" | "operations" | "sales" | "evidence";
export type GrowthStudioSurface = "overview" | "media" | "traffic" | "evidence";
export type OfferStudioSurface = "overview" | "products" | "sales" | "catalog" | "evidence";
export type OpsStudioSurface = "overview" | "integrations" | "imports" | "governance" | "support";

export interface StudioModuleContext {
  surface: string;
  tab?: string | null;
  mode?: string | null;
  focus?: string | null;
  provider?: string | null;
}

export interface StudioNavItem {
  key: StudioModule;
  label: string;
  shortLabel: string;
  description: string;
  href: string;
  accent: string;
  icon: LucideIcon;
}

export interface StudioModuleSubnavItem {
  label: string;
  href: string;
}

export interface StudioWorkspaceTabItem {
  key: string;
  label: string;
  href: string;
}

export interface StudioMetric {
  label: string;
  value: string;
  detail: string;
  tone?: "good" | "warn" | "bad" | "info";
}

export interface StudioFocusItem {
  label: string;
  title: string;
  detail: string;
  href?: string;
  tone?: "good" | "warn" | "bad" | "info";
}

export const studioNavItems: StudioNavItem[] = [
  {
    key: "command",
    label: "Comando",
    shortLabel: "Comando",
    description: "Centro decisório da marca",
    href: "/studio",
    accent: "blue",
    icon: Command,
  },
  {
    key: "finance",
    label: "Finanças",
    shortLabel: "Finanças",
    description: "DRE, caixa e margem",
    href: "/studio/finance",
    accent: "teal",
    icon: ReceiptText,
  },
  {
    key: "growth",
    label: "Crescimento",
    shortLabel: "Crescer",
    description: "Mídia, tráfego e funil",
    href: "/studio/growth",
    accent: "amber",
    icon: LineChart,
  },
  {
    key: "offer",
    label: "Oferta",
    shortLabel: "Oferta",
    description: "Portfólio e demanda real",
    href: "/studio/offer",
    accent: "coral",
    icon: PackageSearch,
  },
  {
    key: "ops",
    label: "Operação",
    shortLabel: "Operar",
    description: "Integrações e manutenção",
    href: "/studio/ops",
    accent: "slate",
    icon: Settings2,
  },
];

export const studioCommandItems = [
  ...studioNavItems.map((item) => ({
    label: item.label,
    description: `Abrir ${item.label.toLowerCase()} no BrandOps`,
    href: item.href,
    icon: item.icon,
  })),
  {
    label: "Atlas",
    description: "Abrir o inspector contextual da inteligência",
    href: "#atlas",
    icon: Sparkles,
  },
];

export const studioModuleSubnav: Record<StudioModule, StudioModuleSubnavItem[]> = {
  command: [
    { label: "Visão geral", href: "/studio" },
    { label: "Margem", href: "/studio/margin" },
    { label: "Financeiro", href: "/studio/finance" },
    { label: "Crescimento", href: "/studio/growth" },
    { label: "Oferta", href: "/studio/offer" },
  ],
  finance: [
    { label: "Visão geral", href: "/studio/finance" },
    { label: "DRE", href: buildStudioHref("finance", { surface: "dre" }) },
    { label: "Lançamentos", href: buildStudioHref("finance", { surface: "operations" }) },
    { label: "CMV", href: buildStudioHref("finance", { surface: "operations", focus: "cmv" }) },
    { label: "Vendas", href: buildStudioHref("finance", { surface: "sales" }) },
    { label: "Evidências", href: buildStudioHref("finance", { surface: "evidence" }) },
  ],
  growth: [
    { label: "Visão geral", href: "/studio/growth" },
    { label: "Mídia", href: buildStudioHref("growth", { surface: "media" }) },
    { label: "Campanhas", href: buildStudioHref("growth", { surface: "media", mode: "campaigns" }) },
    { label: "Radar", href: buildStudioHref("growth", { surface: "media", mode: "radar" }) },
    { label: "Tráfego", href: buildStudioHref("growth", { surface: "traffic" }) },
    { label: "Evidências", href: buildStudioHref("growth", { surface: "evidence" }) },
  ],
  offer: [
    { label: "Visão geral", href: "/studio/offer" },
    { label: "Produtos", href: buildStudioHref("offer", { surface: "products" }) },
    { label: "Executiva", href: buildStudioHref("offer", { surface: "products", mode: "executive" }) },
    { label: "Radar", href: buildStudioHref("offer", { surface: "products", mode: "radar" }) },
    { label: "Vendas", href: buildStudioHref("offer", { surface: "sales" }) },
    { label: "Catálogo", href: buildStudioHref("offer", { surface: "catalog" }) },
    { label: "Evidências", href: buildStudioHref("offer", { surface: "evidence" }) },
  ],
  ops: [
    { label: "Visão geral", href: "/studio/ops" },
    { label: "Importação", href: buildStudioHref("ops", { surface: "imports" }) },
    { label: "Saneamento", href: buildStudioHref("ops", { surface: "governance", focus: "sanitization" }) },
    { label: "Integrações", href: buildStudioHref("ops", { surface: "integrations" }) },
    { label: "Ajuda", href: buildStudioHref("ops", { surface: "support" }) },
    { label: "Configurações", href: buildStudioHref("ops", { surface: "governance" }) },
  ],
};

export function getStudioModule(pathname: string): StudioModule {
  if (pathname.startsWith("/studio/finance")) return "finance";
  if (pathname.startsWith("/studio/growth")) return "growth";
  if (pathname.startsWith("/studio/offer")) return "offer";
  if (pathname.startsWith("/studio/ops")) return "ops";
  return "command";
}

export function getStudioNavItem(module: StudioModule) {
  return studioNavItems.find((item) => item.key === module) ?? studioNavItems[0];
}

export function buildStudioHref(
  module: Exclude<StudioModule, "command">,
  context: Partial<StudioModuleContext> = {},
) {
  const basePath =
    module === "finance"
      ? "/studio/finance"
      : module === "growth"
        ? "/studio/growth"
        : module === "offer"
          ? "/studio/offer"
          : "/studio/ops";
  const params = new URLSearchParams();

  if (context.surface) params.set("surface", context.surface);
  if (context.mode) params.set("mode", context.mode);
  if (context.focus) params.set("focus", context.focus);
  if (context.provider) params.set("provider", context.provider);

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function buildCommandHref(context: Partial<StudioModuleContext> = {}) {
  const params = new URLSearchParams();

  if (context.tab) params.set("tab", context.tab);

  const query = params.toString();
  return query ? `/studio?${query}` : "/studio";
}

export function getStudioWorkspaceTabs(
  module: StudioModule,
  context: Partial<StudioModuleContext> = {},
): StudioWorkspaceTabItem[] {
  if (module === "command") {
    return [
      { key: "decisions", label: "Decisões", href: buildCommandHref({ tab: "decisions" }) },
      { key: "drivers", label: "Drivers", href: buildCommandHref({ tab: "drivers" }) },
      { key: "sources", label: "Fontes", href: buildCommandHref({ tab: "sources" }) },
    ];
  }

  if (module === "finance") {
    return [
      { key: "dre", label: "DRE", href: buildStudioHref("finance", { surface: "dre" }) },
      {
        key: "operations",
        label: "Operação",
        href: buildStudioHref("finance", {
          surface: "operations",
          focus: context.focus === "cmv" ? "cmv" : undefined,
        }),
      },
      { key: "sales", label: "Vendas", href: buildStudioHref("finance", { surface: "sales" }) },
      {
        key: "evidence",
        label: "Evidências",
        href: buildStudioHref("finance", { surface: "evidence" }),
      },
    ];
  }

  if (module === "growth") {
    return [
      {
        key: "media",
        label: "Mídia",
        href: buildStudioHref("growth", {
          surface: "media",
          mode:
            context.mode === "campaigns" ||
            context.mode === "radar" ||
            context.mode === "executive"
              ? context.mode
              : undefined,
        }),
      },
      { key: "traffic", label: "Tráfego", href: buildStudioHref("growth", { surface: "traffic" }) },
      {
        key: "evidence",
        label: "Evidências",
        href: buildStudioHref("growth", { surface: "evidence" }),
      },
    ];
  }

  if (module === "offer") {
    return [
      {
        key: "products",
        label: "Produtos",
        href: buildStudioHref("offer", {
          surface: "products",
          mode:
            context.mode === "executive" ||
            context.mode === "radar" ||
            context.mode === "detail"
              ? context.mode
              : undefined,
        }),
      },
      { key: "sales", label: "Vendas", href: buildStudioHref("offer", { surface: "sales" }) },
      { key: "catalog", label: "Catálogo", href: buildStudioHref("offer", { surface: "catalog" }) },
      {
        key: "evidence",
        label: "Evidências",
        href: buildStudioHref("offer", { surface: "evidence" }),
      },
    ];
  }

  return [
    {
      key: "integrations",
      label: "Integrações",
      href: buildStudioHref("ops", {
        surface: "integrations",
        provider: context.provider ?? undefined,
      }),
    },
    { key: "imports", label: "Imports", href: buildStudioHref("ops", { surface: "imports" }) },
    {
      key: "governance",
      label: "Governança",
      href: buildStudioHref("ops", {
        surface: "governance",
        focus:
          context.focus === "sanitization" || context.focus === "stores"
            ? context.focus
            : undefined,
      }),
    },
    {
      key: "support",
      label: "Suporte",
      href: buildStudioHref("ops", {
        surface: "support",
        provider: context.provider ?? undefined,
      }),
    },
  ];
}

export function normalizeStudioHref(href: string | null | undefined) {
  if (!href) return "/studio";
  if (!href.startsWith("/")) return href;

  const [withoutHash, hash = ""] = href.split("#");
  const [pathname, query = ""] = withoutHash.split("?");
  const currentParams = new URLSearchParams(query);
  const withHash = (nextHref: string) => (hash ? `${nextHref}#${hash}` : nextHref);
  const appendQueryAndHash = (base: string) => {
    const normalizedQuery = currentParams.toString();
    return withHash(normalizedQuery ? `${base}?${normalizedQuery}` : base);
  };
  const merge = (
    destination: Exclude<StudioModule, "command">,
    defaults: Partial<StudioModuleContext>,
  ) => {
    const params = new URLSearchParams(currentParams);
    for (const [key, value] of Object.entries(defaults)) {
      if (value) params.set(key, value);
    }
    const normalizedQuery = params.toString();
    const base = buildStudioHref(destination);
    return withHash(normalizedQuery ? `${base}?${normalizedQuery}` : base);
  };

  switch (pathname) {
    case "/dashboard":
      return appendQueryAndHash("/studio");
    case "/dashboard/contribution-margin":
      return appendQueryAndHash("/studio/margin");
    case "/finance":
      return appendQueryAndHash("/studio/finance");
    case "/acquisition":
      return appendQueryAndHash("/studio/growth");
    case "/offer":
      return appendQueryAndHash("/studio/offer");
    case "/operations":
    case "/platform":
      return appendQueryAndHash("/studio/ops");
    case "/dre":
      return merge("finance", { surface: "dre" });
    case "/cost-center":
      return merge("finance", { surface: "operations" });
    case "/cmv":
      return merge("finance", { surface: "operations", focus: "cmv" });
    case "/sales":
      return merge("offer", { surface: "sales" });
    case "/media":
      return merge("growth", { surface: "media" });
    case "/media/visao-executiva":
      return merge("growth", { surface: "media", mode: "executive" });
    case "/media/radar":
      return merge("growth", { surface: "media", mode: "radar" });
    case "/media/campanhas":
      return merge("growth", { surface: "media", mode: "campaigns" });
    case "/traffic":
      return merge("growth", { surface: "traffic" });
    case "/product-insights":
      return merge("offer", { surface: "products" });
    case "/product-insights/visao-executiva":
      return merge("offer", { surface: "products", mode: "executive" });
    case "/product-insights/radar":
      return merge("offer", { surface: "products", mode: "radar" });
    case "/product-insights/detalhamento":
      return merge("offer", { surface: "products", mode: "detail" });
    case "/feed":
      return merge("offer", { surface: "catalog" });
    case "/import":
      return merge("ops", { surface: "imports" });
    case "/sanitization":
      return merge("ops", { surface: "governance", focus: "sanitization" });
    case "/integrations":
      return merge("ops", { surface: "integrations" });
    case "/integrations/tutorials":
      return merge("ops", { surface: "support" });
    case "/help":
      return merge("ops", { surface: "support" });
    case "/settings":
      return merge("ops", { surface: "governance" });
    case "/admin/stores":
      return merge("ops", { surface: "governance", focus: "stores" });
    default:
      if (pathname.startsWith("/integrations/tutorials/")) {
        return merge("ops", {
          surface: "support",
          provider: pathname.split("/").filter(Boolean).at(-1),
        });
      }
      return href;
    }
  }

export function getStudioModuleContext(
  module: StudioModule,
  searchParams: Pick<URLSearchParams, "get"> | null,
): StudioModuleContext {
  const requestedSurface = searchParams?.get("surface") ?? null;
  const requestedTab = searchParams?.get("tab") ?? null;
  const entry = searchParams?.get("entry") ?? null;
  const mode =
    searchParams?.get("mode") ?? searchParams?.get("view") ?? searchParams?.get("subview") ?? null;
  const requestedFocus = searchParams?.get("focus") ?? null;
  const provider = searchParams?.get("provider") ?? null;

  const surface =
    module === "finance"
      ? resolveFinanceSurface(requestedSurface, requestedTab)
      : module === "growth"
        ? resolveGrowthSurface(requestedSurface, requestedTab)
        : module === "offer"
          ? resolveOfferSurface(requestedSurface, requestedTab, entry)
          : module === "ops"
            ? resolveOpsSurface(requestedSurface, requestedTab, entry)
            : "overview";

  const focus =
    requestedFocus ??
    (module === "finance" && requestedSurface === "cmv"
      ? "cmv"
      : module === "ops" && entry === "sanitization"
        ? "sanitization"
        : module === "ops" && entry === "admin-stores"
          ? "stores"
          : null);

  return { surface, tab: requestedTab, mode, focus, provider };
}

function resolveFinanceSurface(
  requestedSurface: string | null,
  requestedTab: string | null,
): FinanceStudioSurface {
  if (requestedSurface === "cmv" || requestedSurface === "cost-center") {
    return "operations";
  }

  return normalizeSurface<FinanceStudioSurface>(requestedSurface ?? requestedTab, [
    "overview",
    "dre",
    "operations",
    "sales",
    "evidence",
  ]);
}

function resolveGrowthSurface(
  requestedSurface: string | null,
  requestedTab: string | null,
): GrowthStudioSurface {
  return normalizeSurface<GrowthStudioSurface>(requestedSurface ?? requestedTab, [
    "overview",
    "media",
    "traffic",
    "evidence",
  ]);
}

function resolveOfferSurface(
  requestedSurface: string | null,
  requestedTab: string | null,
  entry: string | null,
): OfferStudioSurface {
  if (entry === "sales") return "sales";
  if (entry === "feed") return "catalog";
  if (entry === "product-insights" || requestedTab === "decisions") return "products";

  return normalizeSurface<OfferStudioSurface>(requestedSurface ?? requestedTab, [
    "overview",
    "products",
    "sales",
    "catalog",
    "evidence",
  ]);
}

function resolveOpsSurface(
  requestedSurface: string | null,
  requestedTab: string | null,
  entry: string | null,
): OpsStudioSurface {
  if (entry === "help" || entry === "tutorials") return "support";
  if (entry === "import") return "imports";
  if (entry === "sanitization" || entry === "settings" || entry === "admin-stores") {
    return "governance";
  }

  return normalizeSurface<OpsStudioSurface>(requestedSurface ?? requestedTab, [
    "overview",
    "integrations",
    "imports",
    "governance",
    "support",
  ]);
}

function normalizeSurface<TSurface extends string>(
  value: string | null | undefined,
  allowed: readonly TSurface[],
): TSurface {
  const fallback = allowed[0];
  return allowed.includes((value ?? fallback) as TSurface)
    ? ((value ?? fallback) as TSurface)
    : fallback;
}

export function toneFromNumber(value: number, positiveIsGood = true): StudioMetric["tone"] {
  if (value === 0) return "info";
  const isGood = positiveIsGood ? value > 0 : value < 0;
  return isGood ? "good" : "bad";
}

export function formatPercentValue(value: number) {
  if (!Number.isFinite(value)) return "0,0%";
  return percentFormatter.format(value);
}

export function buildCommandMetrics(snapshot: ManagementSnapshotV2): StudioMetric[] {
  return snapshot.kpiDock.slice(0, 4).map((item) => ({
    label: item.label,
    value: item.value,
    detail: item.description,
    tone:
      item.tone === "positive"
        ? "good"
        : item.tone === "negative"
          ? "bad"
          : item.tone === "warning"
            ? "warn"
            : "info",
  }));
}

export function buildFinanceMetrics(report: FinanceHubReport): StudioMetric[] {
  const total = report.financial.total;
  return [
    {
      label: "Resultado",
      value: currencyFormatter.format(total.netResult),
      detail: "Resultado operacional consolidado no recorte.",
      tone: toneFromNumber(total.netResult),
    },
    {
      label: "RLD",
      value: currencyFormatter.format(total.rld),
      detail: "Receita líquida disponível após descontos.",
      tone: "info",
    },
    {
      label: "Margem",
      value: formatPercentValue(total.contributionMargin),
      detail: "RLD menos CMV e mídia.",
      tone: toneFromNumber(total.contributionMargin),
    },
    {
      label: "CMV",
      value: currencyFormatter.format(total.cmvTotal),
      detail: "Custo aplicado aos itens usados no DRE.",
      tone: "warn",
    },
  ];
}

export function buildGrowthMetrics(report: AcquisitionHubReport): StudioMetric[] {
  return [
    {
      label: "Investimento",
      value: currencyFormatter.format(report.media.summary.spend),
      detail: "Mídia saneada no recorte.",
      tone: "info",
    },
    {
      label: "ROAS Meta",
      value: `${report.media.summary.attributedRoas.toFixed(2)}x`,
      detail: "Receita atribuída dividida por mídia.",
      tone: toneFromNumber(report.media.summary.attributedRoas - 1, true),
    },
    {
      label: "Sessões",
      value: integerFormatter.format(report.traffic.summary.sessions),
      detail: "Tráfego GA4 consolidado.",
      tone: "info",
    },
    {
      label: "Compra",
      value: formatPercentValue(report.traffic.summary.purchaseRate),
      detail: "Taxa de compra por sessão.",
      tone: toneFromNumber(report.traffic.summary.purchaseRate),
    },
  ];
}

export function buildOfferMetrics(report: OfferHubReport): StudioMetric[] {
  return [
    {
      label: "Receita real",
      value: currencyFormatter.format(report.sales.highlights.topProduct?.grossRevenue ?? 0),
      detail: "Produto com maior receita no recorte.",
      tone: "good",
    },
    {
      label: "Itens no catálogo",
      value: integerFormatter.format(report.catalog.summary.totalProducts),
      detail: "Produtos disponíveis no feed.",
      tone: "info",
    },
    {
      label: "Cobertura visual",
      value: `${report.catalog.summary.productsWithGallery}/${report.catalog.summary.totalProducts}`,
      detail: "Produtos com galeria/imagem adicional.",
      tone: report.catalog.summary.productsWithGallery > 0 ? "good" : "warn",
    },
    {
      label: "Sinais GA4",
      value: integerFormatter.format(report.productInsights.overview.totalRows),
      detail: "Agrupamentos de produto analisados.",
      tone: "info",
    },
  ];
}

export function buildOpsMetrics(brand: BrandDataset | null): StudioMetric[] {
  const files = brand?.files ?? {};
  const importedFileCount = Object.keys(files).length;
  const apiIntegrations = brand?.integrations.filter((item) => item.mode === "api").length ?? 0;
  const pendingReviews =
    brand?.sanitizationReviews.filter((review) => review.action === "PENDING").length ?? 0;

  return [
    {
      label: "Imports",
      value: integerFormatter.format(importedFileCount),
      detail: "Fontes manuais com histórico de carga.",
      tone: importedFileCount > 0 ? "good" : "warn",
    },
    {
      label: "APIs",
      value: integerFormatter.format(apiIntegrations),
      detail: "Integrações conectadas por API.",
      tone: apiIntegrations > 0 ? "good" : "info",
    },
    {
      label: "Revisões",
      value: integerFormatter.format(pendingReviews),
      detail: "Itens aguardando saneamento.",
      tone: pendingReviews > 0 ? "warn" : "good",
    },
    {
      label: "Catálogo",
      value: integerFormatter.format(brand?.catalog.length ?? 0),
      detail: "Produtos carregados na operação.",
      tone: (brand?.catalog.length ?? 0) > 0 ? "good" : "warn",
    },
  ];
}

export function buildFinanceLedgerRows(report: AnnualDreReport) {
  const rows = [
    { label: "Faturado", getValue: (index: number) => report.months[index]?.metrics.grossRevenue ?? 0 },
    { label: "RLD", getValue: (index: number) => report.months[index]?.metrics.rld ?? 0 },
    { label: "CMV", getValue: (index: number) => report.months[index]?.metrics.cmvTotal ?? 0 },
    { label: "Mídia", getValue: (index: number) => report.months[index]?.metrics.mediaSpend ?? 0 },
    {
      label: "Despesas",
      getValue: (index: number) => report.months[index]?.metrics.fixedExpensesTotal ?? 0,
    },
    { label: "Resultado", getValue: (index: number) => report.months[index]?.metrics.netResult ?? 0 },
  ];

  return rows.map((row) => ({
    label: row.label,
    values: report.months.map((_, index) => row.getValue(index)),
  }));
}

export function mapActionsToFocus(actions: ExecutiveActionItem[]): StudioFocusItem[] {
  return actions.slice(0, 4).map((action) => ({
    label: action.domain,
    title: action.title,
    detail: action.summary,
    href: action.drilldownHref,
    tone:
      action.priority === "critical"
        ? "bad"
        : action.priority === "high"
          ? "warn"
          : "info",
  }));
}

export function buildOpsFocusItems(brand: BrandDataset | null): StudioFocusItem[] {
  const integrations = brand?.integrations ?? [];
  const files = Object.values(brand?.files ?? {});
  const latestFile = files
    .filter(Boolean)
    .sort((a, b) => b.lastImportedAt.localeCompare(a.lastImportedAt))[0];
  const erroredIntegration = integrations.find((item) => item.lastSyncStatus === "error");

  return [
    {
      label: "Sincronização",
      title: erroredIntegration
        ? `${erroredIntegration.provider.toUpperCase()} exige revisão`
        : "Fontes sem erro crítico detectado",
      detail: erroredIntegration?.lastSyncError ?? "Use este console para manter imports e APIs previsíveis.",
      tone: erroredIntegration ? "bad" : "good",
    },
    {
      label: "Última carga",
      title: latestFile
        ? latestFile.runs[0]?.fileName ?? latestFile.kind.toUpperCase()
        : "Nenhum arquivo recente",
      detail: latestFile
        ? `${integerFormatter.format(latestFile.totalInserted)} linhas inseridas no histórico.`
        : "Importe INK, Meta ou feed para iniciar a operação da marca.",
      tone: latestFile ? "info" : "warn",
    },
    {
      label: "Base ativa",
      title: `${integerFormatter.format(brand?.paidOrders.length ?? 0)} pedidos pagos`,
      detail: `${integerFormatter.format(brand?.media.length ?? 0)} linhas de mídia e ${integerFormatter.format(brand?.catalog.length ?? 0)} produtos carregados.`,
      tone: "info",
    },
  ];
}

export function makeModuleFallback(module: StudioModule): StudioFocusItem[] {
  const labels: Record<StudioModule, string> = {
    command: "Conectar fontes",
    finance: "Carregar financeiro",
    growth: "Carregar aquisição",
    offer: "Carregar oferta",
    ops: "Preparar operação",
  };

  return [
    {
      label: "Próximo passo",
      title: labels[module],
      detail: "Quando houver dados suficientes, este módulo assume leitura operacional real.",
      tone: "info",
    },
  ];
}
