"use client";
import { useState } from "react";
import {
  AnalyticsCalloutCard,
  AnalyticsKpiCard,
  AnalyticsPanel,
} from "@/components/analytics/AnalyticsPrimitives";
import { AtlasControlTowerHome } from "@/components/AtlasControlTowerHome";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, StackItem, SurfaceCard, WorkspaceTabs } from "@/components/ui-shell";
import { useSanitizationPendingCount } from "@/hooks/use-sanitization-summary";
import {
  currencyFormatter,
  integerFormatter,
  percentFormatter,
} from "@/lib/brandops/format";

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState<"overview" | "diagnostics" | "atlas">("overview");
  const { 
    activeBrand, 
    activeBrandId,
    brands,
    selectedPeriodLabel, 
    isLoading: isDatasetLoading,
    isMetricsLoading,
    financialReportFiltered,
    session,
  } = useBrandOps();
  const selectedBrandName =
    activeBrand?.name ??
    brands.find((brand) => brand.id === activeBrandId)?.name ??
    "Loja";
  const pendingSanitizationCount = useSanitizationPendingCount(
    activeBrandId,
    session?.access_token,
  );
  const isBrandLoading =
    Boolean(activeBrandId) && (isDatasetLoading || isMetricsLoading || !activeBrand);
  const geminiIntegration =
    activeBrand?.integrations.find((integration) => integration.provider === "gemini") ?? null;
  const canUseAtlasTab =
    (activeBrand?.governance.featureFlags.atlasAi ?? false) &&
    (activeBrand?.governance.featureFlags.atlasCommandCenter ?? false) &&
    geminiIntegration?.mode === "api";
  const effectiveSection =
    !canUseAtlasTab && activeSection === "atlas" ? "overview" : activeSection;

  if (isBrandLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Resumo executivo"
          title={selectedBrandName}
          description="Carregando dados da loja selecionada. Aguarde enquanto consolidamos vendas, mídia, CMV e despesas."
          badge={selectedPeriodLabel}
        />
        <div className="space-y-6 animate-pulse">
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-surface-container rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-surface-container rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-[260px] bg-surface-container rounded-3xl" />
            <div className="h-[260px] bg-surface-container rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!activeBrandId && !activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca em foco"
        description="Selecione uma marca para abrir a leitura operacional."
      />
    );
  }

  if (!activeBrand) {
    return (
      <EmptyState
        title="Dados da loja indisponíveis"
        description="Não foi possível montar o dataset da loja selecionada no momento."
      />
    );
  }

  const metrics = financialReportFiltered?.total;

  if (!metrics || !financialReportFiltered) {
    return (
      <EmptyState
        title="Relatório indisponível"
        description="Não foi possível carregar a leitura financeira canônica desta loja no momento."
      />
    );
  }

  const variableCostShare = financialReportFiltered.analysis.shares.variableCostShare;
  const breakEvenValue =
    metrics.breakEvenDisplay !== null ? currencyFormatter.format(metrics.breakEvenDisplay) : "N/A";
  const breakEvenHelp = metrics.breakEvenReason;
  const mediaIntegration =
    activeBrand.integrations.find((integration) => integration.provider === "meta") ?? null;
  const ga4Integration =
    activeBrand.integrations.find((integration) => integration.provider === "ga4") ?? null;
  const diagnostics: Array<{
    eyebrow: string;
    title: string;
    description: string;
    tone: "default" | "secondary" | "warning" | "info";
    href: string;
  }> = [];

  if (metrics.contributionAfterMedia < 0) {
    diagnostics.push({
      eyebrow: "Margem",
      title: "Contribuição depois de mídia virou negativa",
      description: "Abra a margem histórica e revise campanhas antes de insistir em escala.",
      tone: "warning",
      href: "/dashboard/contribution-margin",
    });
  }

  if (metrics.netResult < 0) {
    diagnostics.push({
      eyebrow: "Resultado",
      title: "Operação fechando no vermelho",
      description: "O DRE consolidado deve ser o próximo corte para localizar a principal pressão.",
      tone: "warning",
      href: "/dre",
    });
  }

  if (pendingSanitizationCount > 0) {
    diagnostics.push({
      eyebrow: "Base",
      title: "Há ruído pendente na leitura",
      description: `${pendingSanitizationCount} pendência(s) ainda podem distorcer comparação e margem deste período.`,
      tone: "warning",
      href: "/sanitization",
    });
  }

  if (mediaIntegration?.lastSyncStatus === "error" || ga4Integration?.lastSyncStatus === "error") {
    diagnostics.push({
      eyebrow: "Fonte",
      title: "Integração com erro recente",
      description: "Antes de decidir, vale validar se o corte atual está completo.",
      tone: "info",
      href: "/integrations",
    });
  }

  if (metrics.grossRoas > 0 && metrics.grossRoas < 2) {
    diagnostics.push({
      eyebrow: "Mídia",
      title: "Retorno ainda curto para escalar",
      description: "Revise verba, campanha e criativo antes de expansão.",
      tone: "info",
      href: "/media",
    });
  }

  if (!diagnostics.length) {
    diagnostics.push(
      {
        eyebrow: "Operação",
        title: "Sem alerta estrutural no corte atual",
        description: "A operação está estável o suficiente para aprofundar ganho de eficiência.",
        tone: "default",
        href: "/dashboard",
      },
      {
        eyebrow: "Catálogo",
        title: "Hora de procurar oportunidade de escala",
        description: "Cruze catálogo, mídia e tráfego para decidir onde empurrar crescimento.",
        tone: "info",
        href: "/product-insights",
      },
    );

    if (canUseAtlasTab) {
      diagnostics.push({
        eyebrow: "Atlas",
        title: "Abra a mesa inteligente só quando precisar",
        description: "A camada Atlas IA fica separada da leitura operacional desta tela.",
        tone: "secondary",
        href: "/dashboard#atlas-ai-home",
      });
    }
  }

  const primaryDiagnostic = diagnostics[0] ?? null;
  const secondaryDiagnostics = diagnostics.slice(1);
  const nextOperationalCut =
    primaryDiagnostic?.href === "/dre"
      ? "Abra o DRE e localize o maior grupo de pressão antes de mudar mídia."
      : primaryDiagnostic?.href === "/dashboard/contribution-margin"
        ? "Cruze margem, mídia e CMV antes de escalar qualquer frente."
        : primaryDiagnostic?.href === "/integrations"
          ? "Valide Meta e GA4 antes de confiar no corte atual."
          : "Use a leitura operacional para confirmar volume, retenção e custo.";
  const baseIntegrityMessage =
    pendingSanitizationCount > 0
      ? `${pendingSanitizationCount} pendência(s) ainda pedem revisão.`
      : "Sem pendência estrutural aberta na base deste corte.";
  const focusThirdItemTitle =
    pendingSanitizationCount > 0 ? "Integridade da base" : "Custo variável";
  const focusThirdItemDescription =
    pendingSanitizationCount > 0
      ? baseIntegrityMessage
      : `CMV + mídia consomem ${percentFormatter.format(variableCostShare)} da RLD.`;
  const focusThirdItemAside =
    pendingSanitizationCount > 0 ? "revisar" : percentFormatter.format(variableCostShare);
  const focusThirdItemTone =
    pendingSanitizationCount > 0 ? "warning" : variableCostShare > 0.7 ? "warning" : "default";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Resumo executivo"
        title={activeBrand.name}
        description="O que importa agora na operação, sem ruído."
        badge={selectedPeriodLabel}
        actions={
          <WorkspaceTabs
            items={[
              {
                key: "dashboard-overview",
                label: "Operação",
                active: effectiveSection === "overview",
                onClick: () => setActiveSection("overview"),
              },
              {
                key: "dashboard-diagnostics",
                label: "Alertas",
                active: effectiveSection === "diagnostics",
                onClick: () => setActiveSection("diagnostics"),
              },
              ...(canUseAtlasTab
                ? [
                    {
                      key: "dashboard-atlas",
                      label: "Atlas IA",
                      active: effectiveSection === "atlas",
                      onClick: () => setActiveSection("atlas"),
                    },
                  ]
                : []),
            ]}
          />
        }
      />

      {effectiveSection === "overview" ? (
        <>
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.24fr)_18rem]">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <AnalyticsKpiCard
                label="Faturado"
                value={currencyFormatter.format(metrics.grossRevenue)}
                description="Receita bruta exportada da INK."
                tone="secondary"
              />
              <AnalyticsKpiCard
                label="Resultado operacional"
                value={currencyFormatter.format(metrics.netResult)}
                description="Resultado após CMV, mídia e despesas."
                tone={metrics.netResult >= 0 ? "positive" : "negative"}
              />
              <AnalyticsKpiCard
                label="Margem de contribuição"
                value={currencyFormatter.format(metrics.contributionAfterMedia)}
                description={percentFormatter.format(metrics.contributionMargin)}
                tone={metrics.contributionAfterMedia >= 0 ? "positive" : "negative"}
                href="/dashboard/contribution-margin"
                actionLabel="Explorar"
              />
            </div>

            <SurfaceCard className="p-4">
              <SectionHeading
                title="Foco do corte"
                description="Uma leitura curta para orientar o próximo clique."
              />
              <div className="mt-4 space-y-2">
                <StackItem
                  title={primaryDiagnostic?.title ?? "Operação estável neste corte"}
                  description={
                    primaryDiagnostic?.description ??
                    "Sem alerta estrutural crítico. Aproveite o recorte para ganhar eficiência."
                  }
                  aside={primaryDiagnostic?.eyebrow ?? "agora"}
                  tone={
                    primaryDiagnostic
                      ? primaryDiagnostic.tone === "secondary"
                        ? "default"
                        : primaryDiagnostic.tone
                      : "positive"
                  }
                />
                <StackItem
                  title="Próximo corte"
                  description={nextOperationalCut}
                  aside="seguir"
                  tone="info"
                />
                <StackItem
                  title={focusThirdItemTitle}
                  description={focusThirdItemDescription}
                  aside={focusThirdItemAside}
                  tone={focusThirdItemTone}
                />
              </div>
            </SurfaceCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <AnalyticsPanel
              eyebrow="Leitura comercial"
              title="Volume e ticket"
              description="Base operacional do comercial no período."
            >
              <AnalyticsKpiCard
                label="Pedidos pagos"
                value={integerFormatter.format(metrics.paidOrderCount)}
                description="Pedidos pagos no período."
                tone="positive"
              />
              <AnalyticsKpiCard
                label="Itens vendidos"
                value={integerFormatter.format(metrics.unitsSold)}
                description="Soma de itens do pedido."
              />
              <AnalyticsKpiCard
                label="Ticket médio"
                value={currencyFormatter.format(metrics.averageTicket)}
                description="Faturado dividido pelos pedidos pagos."
              />
            </AnalyticsPanel>

            <AnalyticsPanel
              eyebrow="Resultado"
              title="Receita e retenção"
              description="Valor que o comercial segurou no período."
            >
              <AnalyticsKpiCard
                label="RLD"
                value={currencyFormatter.format(metrics.rld)}
                description="Receita líquida após descontos."
                tone="info"
              />
              <AnalyticsKpiCard
                label="Descontos"
                value={currencyFormatter.format(metrics.discounts)}
                description={`Cupom identificado: ${currencyFormatter.format(metrics.couponDiscounts)}.`}
                tone="warning"
              />
              <AnalyticsKpiCard
                label="Comissão INK"
                value={currencyFormatter.format(metrics.inkProfit)}
                description="Lucro operacional vindo da INK."
                tone="positive"
              />
            </AnalyticsPanel>

            <AnalyticsPanel
              eyebrow="Pressão"
              title="Custo e equilíbrio"
              description="O que aperta margem e caixa."
            >
              <AnalyticsKpiCard
                label="Investimento mídia"
                value={currencyFormatter.format(metrics.mediaSpend)}
                description={`ROAS bruto ${metrics.grossRoas.toFixed(2)}x.`}
                tone="warning"
              />
              <AnalyticsKpiCard
                label="CMV aplicado"
                value={currencyFormatter.format(metrics.cmvTotal)}
                description="Custo histórico por item vendido."
                tone="warning"
              />
              <AnalyticsKpiCard
                label="Ponto de equilíbrio"
                value={breakEvenValue}
                description={
                  metrics.breakEvenDisplay !== null
                    ? `${breakEvenHelp} Meta mensal de RLD.`
                    : breakEvenHelp
                }
                tone={metrics.breakEvenDisplay !== null ? "secondary" : "warning"}
              />
            </AnalyticsPanel>
          </section>
        </>
      ) : effectiveSection === "diagnostics" ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_18rem]">
          <SurfaceCard className="p-4">
            <SectionHeading
              title="Diagnóstico prioritário"
              description="O primeiro alerta pede atenção imediata. O resto fica em fila curta."
            />
            {primaryDiagnostic ? (
              <div className="mt-4 space-y-3">
                <AnalyticsCalloutCard
                  eyebrow={primaryDiagnostic.eyebrow}
                  title={primaryDiagnostic.title}
                  description={primaryDiagnostic.description}
                  tone={primaryDiagnostic.tone}
                  href={primaryDiagnostic.href}
                />
                {secondaryDiagnostics.length ? (
                  <div className="grid gap-2 lg:grid-cols-2">
                    {secondaryDiagnostics.map((diagnostic) => (
                      <StackItem
                        key={`${diagnostic.eyebrow}-${diagnostic.title}`}
                        title={diagnostic.title}
                        description={diagnostic.description}
                        aside={diagnostic.eyebrow}
                        tone={diagnostic.tone === "secondary" ? "default" : diagnostic.tone}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </SurfaceCard>

          <SurfaceCard className="p-4">
            <SectionHeading
              title="Contexto do corte"
              description="Só os números que ajudam a validar a prioridade."
            />
            <div className="mt-4 space-y-2">
              <StackItem
                title="Recorte ativo"
                description={selectedPeriodLabel}
                aside="período"
                tone="default"
              />
              <StackItem
                title="Resultado operacional"
                description={currencyFormatter.format(metrics.netResult)}
                aside={metrics.netResult >= 0 ? "ok" : "atenção"}
                tone={metrics.netResult >= 0 ? "positive" : "negative"}
              />
              <StackItem
                title="Margem depois da mídia"
                description={currencyFormatter.format(metrics.contributionAfterMedia)}
                aside={percentFormatter.format(metrics.contributionMargin)}
                tone={metrics.contributionAfterMedia >= 0 ? "positive" : "negative"}
              />
            </div>
          </SurfaceCard>
        </section>
      ) : (
        <AtlasControlTowerHome />
      )}
    </div>
  );
}
