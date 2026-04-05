"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, BrainCircuit, Radar, SlidersHorizontal } from "lucide-react";
import { useBrandOps } from "./BrandOpsProvider";
import { AtlasAnalystPanel } from "./AtlasAnalystPanel";
import { InfoHint, SectionHeading, StackItem, SurfaceCard } from "./ui-shell";
import { currencyFormatter, percentFormatter } from "@/lib/brandops/format";

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
      description: "A mídia já está consumindo mais do que a operação consegue sustentar no recorte atual.",
      href: "/dashboard/contribution-margin",
      aside: currencyFormatter.format(contributionAfterMedia),
      tone: "negative",
    });
  }

  if (netResult !== null && netResult < 0) {
    signals.push({
      id: "net-result",
      title: "Resultado operacional no vermelho",
      description: "O período fechou negativo. A leitura financeira precisa virar prioridade agora.",
      href: "/dre",
      aside: currencyFormatter.format(netResult),
      tone: "negative",
    });
  }

  if (pendingSanitizationCount > 0) {
    signals.push({
      id: "sanitization",
      title: "Base ainda pede saneamento",
      description: "Existem pendências que podem distorcer a leitura até serem revisadas.",
      href: "/sanitization",
      aside: `${pendingSanitizationCount} pendência(s)`,
      tone: "warning",
    });
  }

  if (mediaIntegrationError || ga4IntegrationError) {
    signals.push({
      id: "integrations",
      title: "Fonte com erro recente",
      description: "Meta ou GA4 reportou falha. O ideal é validar a saúde da fonte antes de decidir em cima do dado.",
      href: "/integrations",
      aside: "Revisar",
      tone: "warning",
    });
  }

  if (variableCostShare !== null && variableCostShare > 0.7) {
    signals.push({
      id: "variable-cost",
      title: "Custo variável em pressão alta",
      description: "CMV somado à mídia está comprimindo a receita líquida disponível.",
      href: "/dre",
      aside: percentFormatter.format(variableCostShare),
      tone: "warning",
    });
  }

  if (grossRoas !== null && grossRoas > 0 && grossRoas < 2) {
    signals.push({
      id: "roas",
      title: "Retorno de mídia curto para escalar",
      description: "Vale revisar campanha e criativo antes de aumentar orçamento.",
      href: "/media",
      aside: `${grossRoas.toFixed(2)}x`,
      tone: "info",
    });
  }

  if (!signals.length) {
    signals.push({
      id: "stable",
      title: "Sem alertas críticos no corte atual",
      description: "A operação segue estável o suficiente para aprofundar diagnóstico sem pressão imediata.",
      href: "/dashboard",
      aside: "Estável",
      tone: "positive",
    });
  }

  return signals.slice(0, 4);
}

export function AtlasControlTowerHome() {
  const { activeBrand, filteredBrand, financialReportFiltered, selectedPeriodLabel } = useBrandOps();

  const geminiIntegration =
    activeBrand?.integrations.find((integration) => integration.provider === "gemini") ?? null;
  const mediaIntegration =
    activeBrand?.integrations.find((integration) => integration.provider === "meta") ?? null;
  const ga4Integration =
    activeBrand?.integrations.find((integration) => integration.provider === "ga4") ?? null;
  const isAtlasAiEnabled = geminiIntegration?.mode === "api";
  const canUseAtlasCommandCenter =
    activeBrand?.governance.featureFlags.atlasCommandCenter ?? false;

  const pendingSanitizationCount =
    (filteredBrand?.media.filter((row) => row.sanitizationStatus === "PENDING").length ?? 0) +
    (filteredBrand?.paidOrders.filter((order) => order.sanitizationStatus === "PENDING").length ?? 0);

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

  const modelLabel = geminiIntegration?.settings.model ?? "gemini-2.5-flash";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_23.5rem]">
      <SurfaceCard id="atlas-ai-home" className="p-4 sm:p-5">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="eyebrow">Atlas IA</p>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="font-headline text-[1.2rem] font-semibold tracking-tight text-on-surface sm:text-[1.45rem]">
                  Diagnóstico e decisão
                </h2>
                <InfoHint label="Como ler esta área">
                  O Atlas lê apenas dados internos do sistema. Configurações, credenciais e memória operacional
                  ficam em Configurações para que esta tela continue focada em resultado.
                </InfoHint>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              <span className="rounded-full border border-primary/20 bg-primary-container px-2.5 py-1 text-on-primary-container">
                {selectedPeriodLabel}
              </span>
              <span className="rounded-full border border-outline px-2.5 py-1">{modelLabel}</span>
              <span className="rounded-full border border-outline px-2.5 py-1">
                {signals.length} foco(s) ativos
              </span>
            </div>
          </div>

          <AtlasAnalystPanel variant="command-center" />
        </div>
      </SurfaceCard>

      <div className="space-y-4">
        <SurfaceCard className="p-4">
          <SectionHeading
            title={
              <span className="flex items-center gap-2">
                Radar do período
                <InfoHint label="O que entra no radar">
                  O radar prioriza ruído na base, pressão de margem, erro de integração e sinais que pedem ação
                  antes do resto da leitura.
                </InfoHint>
              </span>
            }
            description="O que merece atenção primeiro."
            aside={<Radar size={14} className="text-primary" />}
          />

          <div className="mt-4 space-y-2">
            {signals.map((signal) => (
              <Link key={signal.id} href={signal.href} className="block">
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

          <div className="atlas-soft-section mt-4 px-3 py-3">
            <div className="flex items-start gap-2">
              <BrainCircuit size={15} className="mt-0.5 text-primary" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Torre focada em resultado
                </p>
                <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                  O Atlas aprende fora daqui para esta mesa continuar mostrando pressão, prioridade e decisão.
                </p>
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4">
          <SectionHeading
            title={
              <span className="flex items-center gap-2">
                Ajustes do Atlas
                <InfoHint label="Por que esta coluna é curta">
                  A Torre ficou dedicada a diagnóstico e prioridade. Tudo que ensina ou parametriza o Atlas
                  agora fica em Configurações.
                </InfoHint>
              </span>
            }
            description="Parâmetros, aprendizado e integrações saíram da mesa de decisão."
            aside={<SlidersHorizontal size={14} className="text-primary" />}
          />

          <div className="mt-4 space-y-2">
            <Link href="/settings#atlas-ai-settings" className="block">
              <StackItem
                title="Parâmetros do Atlas"
                description="Janela padrão, skill base e guia operacional da marca."
                aside={
                  <span className="inline-flex items-center gap-1.5">
                    Ajustar
                    <ArrowUpRight size={12} />
                  </span>
                }
                tone="info"
                className="transition hover:border-secondary/30"
              />
            </Link>

            <Link href="/settings#atlas-context" className="block">
              <StackItem
                title="Memória e aprendizado"
                description="Campanhas, promoções, lançamentos e fatos curados que o Atlas deve lembrar."
                aside={
                  <span className="inline-flex items-center gap-1.5">
                    Ensinar
                    <ArrowUpRight size={12} />
                  </span>
                }
                tone="default"
                className="transition hover:border-secondary/30"
              />
            </Link>

            <Link href="/integrations" className="block">
              <StackItem
                title="Integrações da marca"
                description="Meta, GA4 e Gemini com a credencial própria desta loja."
                aside={
                  <span className="inline-flex items-center gap-1.5">
                    Revisar
                    <ArrowUpRight size={12} />
                  </span>
                }
                tone="default"
                className="transition hover:border-secondary/30"
              />
            </Link>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
