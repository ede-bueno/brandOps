import { currencyFormatter, percentFormatter } from "./format";
import { APP_ROUTES, type AppRoute } from "./routes";

export type ControlAlertTone = "negative" | "warning" | "info" | "positive";

export interface ControlAlertTelemetry {
  pendingSanitizationCount: number;
  mediaIntegrationError: boolean;
  ga4IntegrationError: boolean;
  contributionAfterMedia: number | null;
  netResult: number | null;
  variableCostShare: number | null;
  grossRoas: number | null;
}

export interface ControlAlert {
  id:
    | "contribution"
    | "net-result"
    | "sanitization"
    | "integrations"
    | "variable-cost"
    | "roas"
    | "stable";
  eyebrow: string;
  title: string;
  description: string;
  href: AppRoute;
  tone: ControlAlertTone;
  badge?: string;
}

export function buildControlAlerts(
  telemetry: ControlAlertTelemetry,
  options?: { includeStableFallback?: boolean },
) {
  const alerts: ControlAlert[] = [];

  if (
    telemetry.contributionAfterMedia !== null &&
    telemetry.contributionAfterMedia < 0
  ) {
    alerts.push({
      id: "contribution",
      eyebrow: "Margem",
      title: "Contribuição pós-mídia negativa",
      description:
        "A operação já perde sustentação depois do investimento em mídia neste recorte.",
      href: APP_ROUTES.dashboardContributionMargin,
      tone: "negative",
      badge: currencyFormatter.format(telemetry.contributionAfterMedia),
    });
  }

  if (telemetry.netResult !== null && telemetry.netResult < 0) {
    alerts.push({
      id: "net-result",
      eyebrow: "Resultado",
      title: "Resultado operacional no vermelho",
      description:
        "O DRE do período virou prioridade para localizar a principal pressão estrutural.",
      href: APP_ROUTES.finance,
      tone: "negative",
      badge: currencyFormatter.format(telemetry.netResult),
    });
  }

  if (telemetry.pendingSanitizationCount > 0) {
    alerts.push({
      id: "sanitization",
      eyebrow: "Base",
      title: "Base ainda pede saneamento",
      description: `${telemetry.pendingSanitizationCount} pendência(s) ainda podem distorcer comparação, margem e ranking.`,
      href: APP_ROUTES.operations,
      tone: "warning",
      badge: `${telemetry.pendingSanitizationCount} pendência(s)`,
    });
  }

  if (telemetry.mediaIntegrationError || telemetry.ga4IntegrationError) {
    alerts.push({
      id: "integrations",
      eyebrow: "Fonte",
      title: "Há integração com erro recente",
      description:
        "Meta ou GA4 falhou recentemente. Valide a fonte antes de agir em cima do dado.",
      href: APP_ROUTES.platform,
      tone: "warning",
      badge: "revisar",
    });
  }

  if (telemetry.variableCostShare !== null && telemetry.variableCostShare > 0.7) {
    alerts.push({
      id: "variable-cost",
      eyebrow: "Estrutura",
      title: "Custo variável pressionando a receita",
      description:
        "CMV e mídia estão consumindo uma fatia alta da RLD disponível no período.",
      href: APP_ROUTES.finance,
      tone: "warning",
      badge: percentFormatter.format(telemetry.variableCostShare),
    });
  }

  if (
    telemetry.grossRoas !== null &&
    telemetry.grossRoas > 0 &&
    telemetry.grossRoas < 2
  ) {
    alerts.push({
      id: "roas",
      eyebrow: "Mídia",
      title: "Retorno de mídia curto para escalar",
      description:
        "A aquisição ainda pede revisão de verba, criativo ou segmentação antes de ganhar escala.",
      href: APP_ROUTES.acquisition,
      tone: "info",
      badge: `${telemetry.grossRoas.toFixed(2)}x`,
    });
  }

  if (!alerts.length && options?.includeStableFallback) {
    alerts.push({
      id: "stable",
      eyebrow: "Operação",
      title: "Sem alerta estrutural crítico no corte",
      description:
        "A operação está estável o suficiente para buscar eficiência e oportunidades de escala com mais calma.",
      href: APP_ROUTES.dashboard,
      tone: "positive",
      badge: "estável",
    });
  }

  return alerts.slice(0, 4);
}

export function summarizeControlAlert(alert: ControlAlert) {
  return alert.badge ? `${alert.title} (${alert.badge})` : alert.title;
}
