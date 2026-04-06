"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, Radar } from "lucide-react";
import { useBrandOps } from "./BrandOpsProvider";
import { AtlasAnalystPanel } from "./AtlasAnalystPanel";
import { SectionHeading, StackItem, SurfaceCard } from "./ui-shell";
import { useSanitizationPendingCount } from "@/hooks/use-sanitization-summary";
import { ATLAS_GEMINI_DEFAULT_MODEL } from "@/lib/brandops/ai/model-policy";
import { currencyFormatter, percentFormatter } from "@/lib/brandops/format";
import { APP_ROUTES } from "@/lib/brandops/routes";

type TowerSignal = {
  id: string;
  title: string;
  description: string;
  href: string;
  aside?: string;
  tone: "default" | "positive" | "warning" | "negative" | "info";
};

function buildTowerSignals({
  pendingSanitizationCount,
  mediaIntegrationError,
  ga4IntegrationError,
  contributionAfterMedia,
  netResult,
  variableCostShare,
  grossRoas,
}: {
  pendingSanitizationCount: number;
  mediaIntegrationError: boolean;
  ga4IntegrationError: boolean;
  contributionAfterMedia: number | null;
  netResult: number | null;
  variableCostShare: number | null;
  grossRoas: number | null;
}) {
  const signals: TowerSignal[] = [];

  if (contributionAfterMedia !== null && contributionAfterMedia < 0) {
    signals.push({
      id: "contribution",
      title: "Margem depois de mídia negativa",
      description: "A mídia já consome mais do que a operação sustenta neste corte.",
      href: APP_ROUTES.dashboardContributionMargin,
      aside: currencyFormatter.format(contributionAfterMedia),
      tone: "negative",
    });
  }

  if (netResult !== null && netResult < 0) {
    signals.push({
      id: "net-result",
      title: "Resultado operacional no vermelho",
      description: "A leitura financeira virou prioridade imediata no período.",
      href: APP_ROUTES.dre,
      aside: currencyFormatter.format(netResult),
      tone: "negative",
    });
  }

  if (pendingSanitizationCount > 0) {
    signals.push({
      id: "sanitization",
      title: "Base ainda pede saneamento",
      description: "Há ruído em aberto que ainda pode distorcer a leitura.",
      href: APP_ROUTES.sanitization,
      aside: `${pendingSanitizationCount} pendência(s)`,
      tone: "warning",
    });
  }

  if (mediaIntegrationError || ga4IntegrationError) {
    signals.push({
      id: "integrations",
      title: "Fonte com erro recente",
      description: "Meta ou GA4 falhou. Valide a fonte antes de decidir em cima do dado.",
      href: APP_ROUTES.integrations,
      aside: "Revisar",
      tone: "warning",
    });
  }

  if (variableCostShare !== null && variableCostShare > 0.7) {
    signals.push({
      id: "variable-cost",
      title: "Custo variável em pressão alta",
      description: "CMV e mídia estão comprimindo a receita líquida disponível.",
      href: APP_ROUTES.dre,
      aside: percentFormatter.format(variableCostShare),
      tone: "warning",
    });
  }

  if (grossRoas !== null && grossRoas > 0 && grossRoas < 2) {
    signals.push({
      id: "roas",
      title: "Retorno de mídia curto para escalar",
      description: "Revise campanha e criativo antes de aumentar orçamento.",
      href: APP_ROUTES.media,
      aside: `${grossRoas.toFixed(2)}x`,
      tone: "info",
    });
  }

  if (!signals.length) {
    signals.push({
      id: "stable",
      title: "Sem alertas críticos no corte atual",
      description: "A operação está estável o suficiente para aprofundar sem pressão imediata.",
      href: APP_ROUTES.dashboard,
      aside: "Estável",
      tone: "positive",
    });
  }

  return signals.slice(0, 3);
}

export function AtlasControlTowerHome() {
  const {
    activeBrand,
    activeBrandId,
    financialReportFiltered,
    selectedPeriodLabel,
    session,
  } = useBrandOps();

  const geminiIntegration =
    activeBrand?.integrations.find((integration) => integration.provider === "gemini") ?? null;
  const mediaIntegration =
    activeBrand?.integrations.find((integration) => integration.provider === "meta") ?? null;
  const ga4Integration =
    activeBrand?.integrations.find((integration) => integration.provider === "ga4") ?? null;
  const isAtlasAiEnabled = geminiIntegration?.mode === "api";
  const canUseAtlasCommandCenter =
    activeBrand?.governance.featureFlags.atlasCommandCenter ?? false;
  const pendingSanitizationCount = useSanitizationPendingCount(
    activeBrandId,
    session?.access_token,
  );

  const signals = useMemo(
    () =>
      buildTowerSignals({
        pendingSanitizationCount,
        mediaIntegrationError: mediaIntegration?.lastSyncStatus === "error",
        ga4IntegrationError: ga4Integration?.lastSyncStatus === "error",
        contributionAfterMedia: financialReportFiltered?.total.contributionAfterMedia ?? null,
        netResult: financialReportFiltered?.total.netResult ?? null,
        variableCostShare: financialReportFiltered?.analysis.shares.variableCostShare ?? null,
        grossRoas: financialReportFiltered?.total.grossRoas ?? null,
      }),
    [
      pendingSanitizationCount,
      mediaIntegration?.lastSyncStatus,
      ga4Integration?.lastSyncStatus,
      financialReportFiltered?.total.contributionAfterMedia,
      financialReportFiltered?.total.netResult,
      financialReportFiltered?.analysis.shares.variableCostShare,
      financialReportFiltered?.total.grossRoas,
    ],
  );

  if (!activeBrand || !isAtlasAiEnabled || !canUseAtlasCommandCenter) {
    return null;
  }

  const modelLabel = geminiIntegration?.settings.model ?? ATLAS_GEMINI_DEFAULT_MODEL;
  const primarySignal = signals[0] ?? null;
  const secondarySignals = signals.slice(1);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.68fr)_21.5rem]">
      <SurfaceCard id="atlas-ai-home" className="atlas-command-deck p-4 sm:p-5">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="eyebrow">Atlas IA</p>
              <h2 className="mt-1 font-headline text-[1.2rem] font-semibold tracking-tight text-on-surface sm:text-[1.45rem]">
                Mesa do Atlas
              </h2>
              <p className="mt-2 text-[12px] leading-6 text-on-surface-variant">
                Pressão dominante, decisão agora e próximo clique.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              <span className="rounded-full border border-primary/20 bg-primary-container px-2.5 py-1 text-on-primary-container">
                {selectedPeriodLabel}
              </span>
              <span className="rounded-full border border-outline px-2.5 py-1">{modelLabel}</span>
            </div>
          </div>

          {primarySignal ? (
            <Link
              href={primarySignal.href}
              prefetch={false}
              className="atlas-command-priority-strip block rounded-[18px] px-3 py-3 transition hover:border-primary/20"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    Pressão dominante
                  </p>
                  <p className="mt-1 text-[12px] font-semibold leading-5 text-on-surface">
                    {primarySignal.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                    {primarySignal.description}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-on-surface">
                  {primarySignal.aside}
                  <ArrowUpRight size={12} />
                </span>
              </div>
            </Link>
          ) : null}

          <AtlasAnalystPanel variant="command-center" />
        </div>
      </SurfaceCard>

      <SurfaceCard className="atlas-alert-rail p-4">
        <SectionHeading
          title="Radar do corte"
          description="Um alerta principal e o resto por clique."
          aside={<Radar size={14} className="text-primary" />}
        />

        <div className="mt-4 space-y-2">
          {primarySignal ? (
            <Link href={primarySignal.href} prefetch={false} className="relative z-10 block">
              <StackItem
                title={primarySignal.title}
                description={primarySignal.description}
                aside={
                  <span className="inline-flex items-center gap-1.5">
                    {primarySignal.aside}
                    <ArrowUpRight size={12} />
                  </span>
                }
                tone={primarySignal.tone}
                className="transition hover:border-secondary/30"
              />
            </Link>
          ) : null}
        </div>

        {secondarySignals.length ? (
          <details className="atlas-disclosure mt-3">
            <summary className="atlas-disclosure-summary">
              <span>Ver outros alertas</span>
              <span className="atlas-disclosure-chevron">{secondarySignals.length}</span>
            </summary>
            <div className="atlas-disclosure-body">
              {secondarySignals.map((signal) => (
                <Link key={signal.id} href={signal.href} prefetch={false} className="relative z-10 block">
                  <StackItem
                    title={signal.title}
                    description={signal.description}
                    aside={
                      <span className="inline-flex items-center gap-1.5">
                        {signal.aside}
                        <ArrowUpRight size={12} />
                      </span>
                    }
                    tone={signal.tone}
                    className="transition hover:border-secondary/30"
                  />
                </Link>
              ))}
            </div>
          </details>
        ) : null}

        <details className="atlas-disclosure mt-3">
          <summary className="atlas-disclosure-summary">
            <span>Ajustes fora da mesa</span>
            <span className="atlas-disclosure-chevron">abrir</span>
          </summary>
          <div className="atlas-disclosure-body">
            <Link href={APP_ROUTES.settingsAtlasAi} prefetch={false} className="atlas-soft-pill" data-interactive="true">
              Ajustar Atlas
            </Link>
            <Link href={APP_ROUTES.settingsAtlasContext} prefetch={false} className="atlas-soft-pill" data-interactive="true">
              Ensinar Atlas
            </Link>
            <Link href={APP_ROUTES.integrations} prefetch={false} className="atlas-soft-pill" data-interactive="true">
              Revisar fontes
            </Link>
          </div>
        </details>
      </SurfaceCard>
    </div>
  );
}
