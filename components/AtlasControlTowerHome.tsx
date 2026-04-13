"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Radar } from "lucide-react";
import { useBrandOps } from "./BrandOpsProvider";
import { AtlasMark } from "./AtlasMark";
import { AtlasAnalystPanel } from "./AtlasAnalystPanel";
import { SectionHeading, StackItem, SurfaceCard, WorkspaceTabs } from "./ui-shell";
import { useSanitizationPendingCount } from "@/hooks/use-sanitization-summary";
import { buildControlAlerts } from "@/lib/brandops/control-alerts";
import { APP_ROUTES } from "@/lib/brandops/routes";

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

  const signals = buildControlAlerts(
    {
      pendingSanitizationCount,
      mediaIntegrationError: mediaIntegration?.lastSyncStatus === "error",
      ga4IntegrationError: ga4Integration?.lastSyncStatus === "error",
      contributionAfterMedia: financialReportFiltered?.total.contributionAfterMedia ?? null,
      netResult: financialReportFiltered?.total.netResult ?? null,
      variableCostShare: financialReportFiltered?.analysis.shares.variableCostShare ?? null,
      grossRoas: financialReportFiltered?.total.grossRoas ?? null,
    },
    { includeStableFallback: true },
  );

  if (!activeBrand || !isAtlasAiEnabled || !canUseAtlasCommandCenter) {
    return null;
  }

  const primarySignal = signals[0] ?? null;
  const switchToMesa = () => setActiveView("mesa");
  const switchToRadar = () => setActiveView("radar");
  return (
    <SurfaceCard id="atlas-ai-home" className="atlas-command-deck">
      <div className="atlas-component-stack">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <span className="atlas-ai-badge">
              <span className="atlas-ai-badge-orb">
                <AtlasMark size="sm" />
              </span>
              Atlas IA
            </span>
            <h2 className="mt-1 font-headline text-[1.16rem] font-semibold tracking-tight text-on-surface sm:text-[1.36rem]">
              Mesa do Atlas
            </h2>
            <p className="mt-2 text-[12px] leading-6 text-on-surface-variant">
              Leitura assistida para priorizar sinais e decidir o próximo passo sem perder a base factual.
            </p>
          </div>

          <div className="relative z-10 flex flex-col items-start gap-2 lg:items-end">
            <WorkspaceTabs
              className="relative z-10"
              items={[
                {
                  key: "atlas-mesa",
                  label: "Mesa",
                  active: activeView === "mesa",
                  onClick: switchToMesa,
                },
                {
                  key: "atlas-radar",
                  label: "Radar",
                  active: activeView === "radar",
                  onClick: switchToRadar,
                },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              <span className="atlas-inline-metric">{selectedPeriodLabel}</span>
              <span className="atlas-inline-metric">IA em apoio à decisão</span>
            </div>
          </div>
        </div>

        {activeView === "mesa" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]">
            <AtlasAnalystPanel variant="command-center" />

            <div className="atlas-component-stack-tight">
              <SurfaceCard className="atlas-alert-rail">
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
                            {primarySignal.badge}
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

              <SurfaceCard>
                <SectionHeading
                  title="Ajustes fora da mesa"
                  description="Configuração, contexto e fontes ficam fora da mesa de decisão."
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={APP_ROUTES.settingsAtlasAi} prefetch={false} className="brandops-button brandops-button-ghost">
                    Ajustar Atlas
                  </Link>
                  <Link href={APP_ROUTES.settingsAtlasContext} prefetch={false} className="brandops-button brandops-button-ghost">
                    Ensinar Atlas
                  </Link>
                  <Link href={APP_ROUTES.integrations} prefetch={false} className="brandops-button brandops-button-ghost">
                    Revisar fontes
                  </Link>
                </div>
              </SurfaceCard>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_17rem]">
            <SurfaceCard>
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
                          {signal.badge}
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

            <SurfaceCard>
              <SectionHeading
                title="Próximo movimento"
                description="A IA só entra depois da leitura factual."
              />
              <div className="mt-4 atlas-component-stack-tight">
                <Link href={APP_ROUTES.dre} prefetch={false} className="relative z-10 block">
                  <StackItem
                    title="Abrir leitura financeira"
                    description="Confirme margem, mídia e despesas antes de aceitar qualquer hipótese."
                    aside={
                      <span className="inline-flex items-center gap-1.5">
                        base
                        <ArrowUpRight size={12} />
                      </span>
                    }
                    tone="info"
                    className="transition hover:border-secondary/30"
                  />
                </Link>

                <button
                  type="button"
                  onClick={switchToMesa}
                  className="block w-full text-left"
                >
                  <StackItem
                    title="Voltar à mesa"
                    description="Depois do corte factual, volte para a mesa do Atlas e escolha o próximo movimento."
                    aside="atlas"
                    tone="default"
                    className="transition hover:border-secondary/30"
                  />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={switchToMesa}
                  className="brandops-button brandops-button-secondary"
                >
                  Voltar para Mesa
                </button>
                <Link
                  href={primarySignal?.href ?? APP_ROUTES.dre}
                  prefetch={false}
                  className="brandops-button brandops-button-ghost"
                >
                  Abrir sinal dominante
                </Link>
              </div>
            </SurfaceCard>
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}
