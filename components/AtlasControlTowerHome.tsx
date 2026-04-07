"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Radar, Sparkles } from "lucide-react";
import { useBrandOps } from "./BrandOpsProvider";
import { AtlasAnalystPanel } from "./AtlasAnalystPanel";
import { SectionHeading, StackItem, SurfaceCard, WorkspaceTabs } from "./ui-shell";
import { useSanitizationPendingCount } from "@/hooks/use-sanitization-summary";
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
  const [activeView, setActiveView] = useState<"mesa" | "radar">("mesa");
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

  const primarySignal = signals[0] ?? null;
  return (
    <SurfaceCard id="atlas-ai-home" className="atlas-command-deck p-4 sm:p-5">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <span className="atlas-ai-badge">
              <span className="atlas-ai-badge-orb">
                <Sparkles size={12} />
              </span>
              Atlas IA
            </span>
            <h2 className="mt-1 font-headline text-[1.16rem] font-semibold tracking-tight text-on-surface sm:text-[1.36rem]">
              Mesa do Atlas
            </h2>
            <p className="mt-2 text-[12px] leading-6 text-on-surface-variant">
              IA separada da operação factual. Use a mesa para priorizar, abrir sinais e decidir o próximo clique.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end">
            <WorkspaceTabs
              items={[
                {
                  key: "atlas-mesa",
                  label: "Mesa",
                  active: activeView === "mesa",
                  onClick: () => setActiveView("mesa"),
                },
                {
                  key: "atlas-radar",
                  label: "Radar",
                  active: activeView === "radar",
                  onClick: () => setActiveView("radar"),
                },
              ]}
            />
            <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              <span className="rounded-full border border-primary/20 bg-primary-container px-2.5 py-1 text-on-primary-container">
                {selectedPeriodLabel}
              </span>
              <span className="rounded-full border border-outline px-2.5 py-1">Atlas separado da base factual</span>
            </div>
          </div>
        </div>

        {activeView === "mesa" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]">
            <AtlasAnalystPanel variant="command-center" />

            <div className="space-y-3">
              <SurfaceCard className="atlas-alert-rail p-4">
                <SectionHeading
                  title="Sinal dominante"
                  description="O principal alerta do corte fica à vista."
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
              </SurfaceCard>

              <SurfaceCard className="p-4">
                <SectionHeading
                  title="Ajustes fora da mesa"
                  description="Configuração e ensino ficam fora do cockpit."
                />
                <div className="mt-4 flex flex-wrap gap-2">
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
              </SurfaceCard>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_17rem]">
            <SurfaceCard className="p-4">
              <SectionHeading
                title="Radar do corte"
                description="Um alerta principal e fila curta de sinais relacionados."
              />
              <div className="mt-4 space-y-2">
                {signals.map((signal) => (
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
            </SurfaceCard>

            <SurfaceCard className="p-4">
              <SectionHeading
                title="Próximo movimento"
                description="A IA só entra depois da leitura factual."
              />
              <div className="mt-4 space-y-2">
                <StackItem
                  title="Abrir leitura financeira"
                  description="Confirme margem, mídia e despesas antes de aceitar qualquer hipótese."
                  aside="base"
                  tone="info"
                />
                <StackItem
                  title="Voltar à mesa"
                  description="Depois do corte factual, use a IA para ranquear o próximo movimento."
                  aside="atlas"
                  tone="default"
                />
              </div>
            </SurfaceCard>
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}
