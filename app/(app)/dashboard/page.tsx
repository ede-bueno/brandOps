"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AnalyticsCalloutCard,
  AnalyticsKpiCard,
} from "@/components/analytics/AnalyticsPrimitives";
import { AtlasControlTowerHome } from "@/components/AtlasControlTowerHome";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, StackItem, SurfaceCard, WorkspaceTabs } from "@/components/ui-shell";
import { useSanitizationPendingCount } from "@/hooks/use-sanitization-summary";
import { buildControlAlerts } from "@/lib/brandops/control-alerts";
import {
  currencyFormatter,
  integerFormatter,
  percentFormatter,
} from "@/lib/brandops/format";

type DashboardSection = "overview" | "diagnostics" | "atlas";

type DiagnosticTone =
  | "default"
  | "secondary"
  | "warning"
  | "info"
  | "negative"
  | "positive";

type DiagnosticItem = {
  eyebrow: string;
  title: string;
  description: string;
  tone: DiagnosticTone;
  href: string;
};

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");
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
  const mediaIntegration =
    activeBrand?.integrations.find((integration) => integration.provider === "meta") ?? null;
  const ga4Integration =
    activeBrand?.integrations.find((integration) => integration.provider === "ga4") ?? null;
  const geminiIntegration =
    activeBrand?.integrations.find((integration) => integration.provider === "gemini") ?? null;
  const canUseAtlasTab =
    (activeBrand?.governance.featureFlags.atlasAi ?? false) &&
    (activeBrand?.governance.featureFlags.atlasCommandCenter ?? false) &&
    geminiIntegration?.mode === "api";
  const effectiveSection =
    !canUseAtlasTab && activeSection === "atlas" ? "overview" : activeSection;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncSectionFromHash = () => {
      if (window.location.hash === "#atlas-ai-home" && canUseAtlasTab) {
        setActiveSection("atlas");
      }
    };

    syncSectionFromHash();
    window.addEventListener("hashchange", syncSectionFromHash);
    return () => window.removeEventListener("hashchange", syncSectionFromHash);
  }, [canUseAtlasTab]);

  if (isBrandLoading) {
    return (
<div className="atlas-component-stack">
        <PageHeader
          eyebrow="Torre de Controle"
          title={selectedBrandName}
          description="Carregando a leitura executiva da operação."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-28 rounded-xl bg-surface-container animate-pulse" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="h-72 rounded-xl bg-surface-container animate-pulse" />
          <div className="h-72 rounded-xl bg-surface-container animate-pulse" />
        </div>
      </div>
    );
  }

  if (!activeBrandId && !activeBrand) {
    return (
        <EmptyState
        title="Nenhuma marca em foco"
        description="Selecione uma marca para abrir a Torre de Controle."
      />
    );
  }

  if (!activeBrand) {
    return (
      <EmptyState
        title="Dados da loja indisponíveis"
        description="Não foi possível montar o dataset da loja selecionada."
      />
    );
  }

  if (!financialReportFiltered?.total) {
    return (
      <EmptyState
        title="Relatório indisponível"
        description="Não foi possível carregar a leitura financeira canônica desta loja."
      />
    );
  }

  const metrics = financialReportFiltered.total;
  const analysis = financialReportFiltered.analysis;
  const expenseBreakdown = financialReportFiltered.expenseBreakdown.slice(0, 4);
  const variableCostShare = analysis.shares.variableCostShare;
  const diagnostics: DiagnosticItem[] = (() => {
    const items = buildControlAlerts(
      {
        pendingSanitizationCount,
        mediaIntegrationError: mediaIntegration?.lastSyncStatus === "error",
        ga4IntegrationError: ga4Integration?.lastSyncStatus === "error",
        contributionAfterMedia: metrics.contributionAfterMedia,
        netResult: metrics.netResult,
        variableCostShare,
        grossRoas: metrics.grossRoas,
      },
      { includeStableFallback: true },
    ).map((alert) => ({
      eyebrow: alert.eyebrow,
      title: alert.title,
      description: alert.description,
      tone:
        alert.tone === "positive"
          ? "positive"
          : alert.tone === "negative"
            ? "negative"
            : alert.tone,
      href: alert.href,
    })) satisfies DiagnosticItem[];

    if (items.length === 1 && items[0]?.tone === "positive") {
      items.push({
        eyebrow: "Próximo passo",
        title: "Cruze produto, mídia e funil antes de escalar",
        description:
          "Com a base estável, o próximo ganho tende a vir do mix entre catálogo, aquisição e conversão.",
        tone: "info",
        href: "/product-insights",
      });
    }

    return items.slice(0, 4);
  })();

  const primaryDiagnostic = diagnostics[0] ?? null;
  const momentumLabel =
    analysis.momentum.hasComparison
      ? `${analysis.momentum.delta >= 0 ? "+" : ""}${analysis.momentum.delta.toFixed(1)} p.p.`
      : "sem comparação";
  const topExpense = analysis.topExpenseCategory;
  const breakEvenValue =
    metrics.breakEvenDisplay !== null ? currencyFormatter.format(metrics.breakEvenDisplay) : "N/A";

  return (
    <div className="atlas-page-stack-compact">
      <PageHeader
        eyebrow="Torre de Controle"
        title="Painel executivo"
        description="Leitura rápida para decidir margem, base e aquisição no recorte ativo."
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
          <section className="atlas-kpi-grid xl:grid-cols-4">
            <AnalyticsKpiCard
              label="Resultado operacional"
              value={currencyFormatter.format(metrics.netResult)}
              description="Resultado final depois de CMV, mídia e despesas."
              tone={metrics.netResult >= 0 ? "positive" : "negative"}
            />
            <AnalyticsKpiCard
              label="Contribuição pós-mídia"
              value={currencyFormatter.format(metrics.contributionAfterMedia)}
              description={percentFormatter.format(metrics.contributionMargin)}
              tone={metrics.contributionAfterMedia >= 0 ? "positive" : "negative"}
              href="/dashboard/contribution-margin"
              actionLabel="Margem"
            />
            <AnalyticsKpiCard
              label="RLD"
              value={currencyFormatter.format(metrics.rld)}
              description="Receita líquida disponível após descontos."
              tone="info"
            />
            <AnalyticsKpiCard
              label="ROAS bruto"
              value={`${metrics.grossRoas.toFixed(2)}x`}
              description="Faturado bruto dividido pelo investimento de mídia."
              tone={metrics.grossRoas >= 2 ? "positive" : "warning"}
            />
            <AnalyticsKpiCard
              label="Pedidos pagos"
              value={integerFormatter.format(metrics.paidOrderCount)}
              description="Pedidos pagos no período ativo."
              tone="default"
            />
            <AnalyticsKpiCard
              label="Itens vendidos"
              value={integerFormatter.format(metrics.unitsSold)}
              description="Volume real de itens usados no DRE."
              tone="default"
            />
            <AnalyticsKpiCard
              label="Ticket médio"
              value={currencyFormatter.format(metrics.averageTicket)}
              description="Faturado bruto dividido por pedidos pagos."
              tone="default"
            />
            <AnalyticsKpiCard
              label="Mídia"
              value={currencyFormatter.format(metrics.mediaSpend)}
              description="Investimento total saneado no período."
              tone="warning"
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.62fr)_18.5rem]">
            <SurfaceCard>
              <SectionHeading
                title="Prioridade do período"
                description="O primeiro bloco decide o próximo clique. O restante confirma se o recorte está saudável."
                aside={<span className="atlas-inline-metric">{selectedBrandName}</span>}
              />
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(17rem,0.48fr)]">
                <div className="atlas-priority-rail">
                  <AnalyticsCalloutCard
                    eyebrow={primaryDiagnostic?.eyebrow ?? "Operação"}
                    title={primaryDiagnostic?.title ?? "Sem alerta crítico no corte"}
                    description={
                      primaryDiagnostic?.description ??
                      "A leitura atual não mostra pressão estrutural imediata, então o próximo passo é perseguir eficiência."
                    }
                    tone={primaryDiagnostic?.tone ?? "default"}
                    href={primaryDiagnostic?.href ?? "/dashboard"}
                    actionLabel="Abrir"
                    footer={selectedPeriodLabel}
                  />

                  <div className="atlas-diagnostic-list">
                    {diagnostics.slice(1, 4).map((diagnostic) => (
                      <Link key={diagnostic.title} href={diagnostic.href} className="atlas-diagnostic-row" data-tone={diagnostic.tone}>
                        <div className="min-w-0 flex-1">
                          <p className="atlas-analytics-eyebrow">{diagnostic.eyebrow}</p>
                          <p className="mt-1 text-[13px] font-semibold text-on-surface">{diagnostic.title}</p>
                          <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">{diagnostic.description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="atlas-compact-stack">
                  <StackItem
                    title="Momento da margem"
                    description={analysis.momentum.description}
                    aside={momentumLabel}
                    tone={analysis.momentum.tone === "positive" ? "positive" : analysis.momentum.tone === "warning" ? "warning" : "default"}
                  />
                  <StackItem
                    title="Ponto de equilíbrio"
                    description={metrics.breakEvenReason}
                    aside={breakEvenValue}
                    tone={metrics.breakEvenDisplay !== null ? "info" : "warning"}
                  />
                  <StackItem
                    title="Custo variável"
                    description="Participação combinada de CMV e mídia sobre a RLD."
                    aside={percentFormatter.format(variableCostShare)}
                    tone={variableCostShare > 0.7 ? "warning" : "default"}
                  />
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                title="Saúde do recorte"
                description="Validação curta antes de aprofundar."
              />
              <div className="mt-4 atlas-compact-stack">
                <StackItem
                  title="Base e saneamento"
                  description={
                    pendingSanitizationCount > 0
                      ? `${pendingSanitizationCount} pendência(s) ainda pedem revisão.`
                      : "Sem pendência estrutural aberta no período."
                  }
                  aside={pendingSanitizationCount > 0 ? "revisar" : "ok"}
                  tone={pendingSanitizationCount > 0 ? "warning" : "positive"}
                />
                <StackItem
                  title="Integrações"
                  description={
                    mediaIntegration?.lastSyncStatus === "error" || ga4Integration?.lastSyncStatus === "error"
                      ? "Há fonte com erro recente. Valide antes de agir."
                      : "Meta e GA4 sem erro recente registrado."
                  }
                  aside={
                    mediaIntegration?.lastSyncStatus === "error" || ga4Integration?.lastSyncStatus === "error"
                      ? "alerta"
                      : "ok"
                  }
                  tone={
                    mediaIntegration?.lastSyncStatus === "error" || ga4Integration?.lastSyncStatus === "error"
                      ? "warning"
                      : "positive"
                  }
                />
                <StackItem
                  title="Maior despesa"
                  description={topExpense ? topExpense.categoryName : "Sem lançamento relevante no período."}
                  aside={topExpense ? currencyFormatter.format(topExpense.total) : "-"}
                  tone="default"
                />
              </div>
            </SurfaceCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <SurfaceCard>
              <SectionHeading
                title="Leitura comercial"
                description="Volume, retenção e densidade do período."
              />
              <div className="mt-4 atlas-compact-stack">
                <StackItem
                  title="Pedidos pagos"
                  description="Base comercial consolidada da INK."
                  aside={integerFormatter.format(metrics.paidOrderCount)}
                  tone="default"
                />
                <StackItem
                  title="Itens vendidos"
                  description="Peças reais usadas no cálculo do CMV."
                  aside={integerFormatter.format(metrics.unitsSold)}
                  tone="default"
                />
                <StackItem
                  title="Ticket médio"
                  description="Faturado bruto por pedido pago."
                  aside={currencyFormatter.format(metrics.averageTicket)}
                  tone="default"
                />
                <StackItem
                  title="Descontos"
                  description={`Cupom identificado: ${currencyFormatter.format(metrics.couponDiscounts)}.`}
                  aside={currencyFormatter.format(metrics.discounts)}
                  tone="warning"
                />
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                title="Economia unitária"
                description="O que sustenta ou corrói a operação por baixo."
              />
              <div className="mt-4 atlas-compact-stack">
                <StackItem
                  title="Comissão INK"
                  description="Resultado operacional originado na INK."
                  aside={currencyFormatter.format(metrics.inkProfit)}
                  tone="positive"
                />
                <StackItem
                  title="CMV aplicado"
                  description="Custo histórico usado nos itens vendidos."
                  aside={currencyFormatter.format(metrics.cmvTotal)}
                  tone="warning"
                />
                <StackItem
                  title="Mídia no período"
                  description="Investimento total saneado."
                  aside={currencyFormatter.format(metrics.mediaSpend)}
                  tone="warning"
                />
                <StackItem
                  title="Resultado após despesas"
                  description="Leitura final da operação no recorte."
                  aside={currencyFormatter.format(metrics.netResult)}
                  tone={metrics.netResult >= 0 ? "positive" : "negative"}
                />
              </div>
            </SurfaceCard>

            <SurfaceCard className="xl:col-span-2">
              <SectionHeading
                title="Livro de despesas"
                description="Categorias que mais pressionaram o resultado no corte."
              />
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {expenseBreakdown.length ? (
                  expenseBreakdown.map((expense) => (
                    <StackItem
                      key={expense.categoryName}
                      title={expense.categoryName}
                      description="Despesa consolidada no recorte ativo."
                      aside={currencyFormatter.format(expense.total)}
                      tone="default"
                    />
                  ))
                ) : (
                  <StackItem
                    title="Sem despesa lançada"
                    description="Ainda não há categorias lançadas para este período."
                    aside="-"
                    tone="info"
                  />
                )}
              </div>
            </SurfaceCard>
          </section>
        </>
      ) : effectiveSection === "diagnostics" ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.38fr)_17.5rem]">
          <SurfaceCard>
            <SectionHeading
              title="Fila de alertas"
              description="O primeiro alerta pede ação. Os demais ajudam a ordenar a investigação."
            />
            <div className="mt-4 atlas-component-stack-tight">
              {diagnostics.map((diagnostic, index) => (
                <Link key={`${diagnostic.eyebrow}-${diagnostic.title}`} href={diagnostic.href} className="block">
                  {index === 0 ? (
                    <AnalyticsCalloutCard
                      eyebrow={diagnostic.eyebrow}
                      title={diagnostic.title}
                      description={diagnostic.description}
                      tone={diagnostic.tone}
                      actionLabel="Abrir"
                    />
                  ) : (
                    <StackItem
                      title={diagnostic.title}
                      description={diagnostic.description}
                      aside={diagnostic.eyebrow}
                      tone={diagnostic.tone === "secondary" ? "default" : diagnostic.tone}
                      className="transition hover:border-primary/20"
                    />
                  )}
                </Link>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              title="Contexto rápido"
              description="Só o que ajuda a validar a fila."
            />
            <div className="mt-4 atlas-compact-stack">
              <StackItem
                title="Período ativo"
                description="Recorte selecionado na shell."
                aside={selectedPeriodLabel}
                tone="default"
              />
              <StackItem
                title="Resultado operacional"
                description="Valor final depois de todas as pressões."
                aside={currencyFormatter.format(metrics.netResult)}
                tone={metrics.netResult >= 0 ? "positive" : "negative"}
              />
              <StackItem
                title="Contribuição pós-mídia"
                description="Margem disponível antes das despesas fixas."
                aside={currencyFormatter.format(metrics.contributionAfterMedia)}
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
