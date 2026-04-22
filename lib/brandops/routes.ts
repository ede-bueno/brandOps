export const APP_ROUTES = {
  dashboard: "/dashboard",
  dashboardContributionMargin: "/dashboard/contribution-margin",
  finance: "/finance",
  acquisition: "/acquisition",
  offer: "/offer",
  operations: "/operations",
  platform: "/platform",
  dre: "/dre",
  sales: "/sales",
  productInsights: "/product-insights",
  productInsightsExecutive: "/product-insights/visao-executiva",
  productInsightsRadar: "/product-insights/radar",
  productInsightsDetail: "/product-insights/detalhamento",
  media: "/media",
  mediaExecutive: "/media/visao-executiva",
  mediaRadar: "/media/radar",
  mediaCampaigns: "/media/campanhas",
  traffic: "/traffic",
  costCenter: "/cost-center",
  cmv: "/cmv",
  feed: "/feed",
  import: "/import",
  sanitization: "/sanitization",
  settings: "/settings",
  settingsGovernance: "/settings#platform-governance",
  settingsAutomation: "/settings#integration-automation",
  settingsAtlasAi: "/settings#atlas-ai-settings",
  settingsAtlasLearning: "/settings#atlas-learning",
  settingsAtlasContext: "/settings#atlas-context",
  integrations: "/integrations",
  integrationsTutorials: "/integrations/tutorials",
  integrationsTutorialMeta: "/integrations/tutorials/meta",
  integrationsTutorialGa4: "/integrations/tutorials/ga4",
  integrationsTutorialGemini: "/integrations/tutorials/gemini",
  adminStores: "/admin/stores",
  help: "/help",
  helpTower: "/help#dashboard",
  helpDre: "/help#dre",
  helpSanitization: "/help#sanitization",
  helpCmv: "/help#cmv",
  helpIntegrations: "/help#integrations",
  helpSettings: "/help#settings",
  helpSecurity: "/help#security",
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];
export type WorkspaceSurfaceKind = "command" | "hub" | "source" | "operation" | "platform";

const COMMAND_ROUTES: AppRoute[] = [
  APP_ROUTES.dashboardContributionMargin,
  APP_ROUTES.dashboard,
];

const HUB_ROUTES: AppRoute[] = [
  APP_ROUTES.finance,
  APP_ROUTES.acquisition,
  APP_ROUTES.offer,
];

const SOURCE_ROUTES: AppRoute[] = [
  APP_ROUTES.dre,
  APP_ROUTES.sales,
  APP_ROUTES.mediaExecutive,
  APP_ROUTES.mediaRadar,
  APP_ROUTES.mediaCampaigns,
  APP_ROUTES.media,
  APP_ROUTES.traffic,
  APP_ROUTES.productInsightsExecutive,
  APP_ROUTES.productInsightsRadar,
  APP_ROUTES.productInsightsDetail,
  APP_ROUTES.productInsights,
  APP_ROUTES.feed,
];

const PLATFORM_ROUTES: AppRoute[] = [
  APP_ROUTES.integrationsTutorialMeta,
  APP_ROUTES.integrationsTutorialGa4,
  APP_ROUTES.integrationsTutorialGemini,
  APP_ROUTES.integrationsTutorials,
  APP_ROUTES.adminStores,
  APP_ROUTES.help,
  APP_ROUTES.settings,
  APP_ROUTES.platform,
];

const OPERATION_ROUTES: AppRoute[] = [
  APP_ROUTES.costCenter,
  APP_ROUTES.cmv,
  APP_ROUTES.import,
  APP_ROUTES.sanitization,
  APP_ROUTES.integrations,
  APP_ROUTES.operations,
];

function matchRoute(pathname: string, href: AppRoute) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function normalizePathname(pathname: string) {
  return pathname.split("#")[0]?.split("?")[0] ?? pathname;
}

export function getWorkspaceSurfaceKind(pathname: string): WorkspaceSurfaceKind {
  const normalizedPathname = normalizePathname(pathname);

  if (COMMAND_ROUTES.some((href) => matchRoute(normalizedPathname, href))) {
    return "command";
  }

  if (HUB_ROUTES.some((href) => matchRoute(normalizedPathname, href))) {
    return "hub";
  }

  if (SOURCE_ROUTES.some((href) => matchRoute(normalizedPathname, href))) {
    return "source";
  }

  if (PLATFORM_ROUTES.some((href) => matchRoute(normalizedPathname, href))) {
    return "platform";
  }

  if (OPERATION_ROUTES.some((href) => matchRoute(normalizedPathname, href))) {
    return "operation";
  }

  return "platform";
}
