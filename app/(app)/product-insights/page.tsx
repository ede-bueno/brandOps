"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  AnalyticsCalloutCard,
  AnalyticsKpiCard,
} from "@/components/analytics/AnalyticsPrimitives";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  EntityChip,
  InlineNotice,
  ModeEntryCard,
  PageHeader,
  SectionHeading,
  StackItem,
  SurfaceCard,
  TaskWorkspaceIntro,
  WorkspaceTabs,
} from "@/components/ui-shell";
import { fetchProductInsightsReport } from "@/lib/brandops/database";
import { currencyFormatter, formatCompactDate, integerFormatter, percentFormatter } from "@/lib/brandops/format";
import { APP_ROUTES } from "@/lib/brandops/routes";
import type {
  ProductDecisionAction,
  ProductInsightClassification,
  ProductInsightRow,
  ProductInsightSort,
  ProductInsightsReport,
} from "@/lib/brandops/types";

type ProductView = "home" | "executive" | "radar" | "detail";

const EMPTY_REPORT: ProductInsightsReport = {
  rows: [],
  trendByKey: {},
  overview: {
    totalRows: 0,
    totalViews: 0,
    totalAddToCarts: 0,
    totalRevenue: 0,
    totalRealUnitsSold: 0,
    totalRealGrossRevenue: 0,
    averageAddToCartRate: 0,
    averageCheckoutRate: 0,
    averagePurchaseRate: 0,
  },
  featured: [],
  watchlist: [],
  decisions: [],
  classifications: [],
  momentum: { gaining: [], losing: [] },
  scatter: [],
  scatterSeries: [],
  hero: { row: null, title: "", description: "", bullets: [] },
  playbook: [],
  analysis: {
    narrativeTitle: "",
    narrativeBody: "",
    nextActions: [],
    topOpportunity: null,
    topRisk: null,
  },
  filters: {
    decision: "all",
    classification: "all",
    productType: "all",
    sort: "priority",
    availableTypes: [],
    availableSorts: [],
  },
  meta: { generatedAt: "", from: null, to: null, hasData: false, heroKey: null },
};

const DECISION_COLORS: Record<ProductDecisionAction, string> = {
  scale_now: "var(--color-primary)",
  boost_traffic: "var(--color-secondary)",
  review_listing: "var(--color-tertiary)",
  watch: "var(--color-outline)",
};

function classificationLabel(value: ProductInsightClassification) {
  if (value === "validated") return "Validados";
  if (value === "opportunity") return "Oportunidades";
  if (value === "low_traffic") return "Pouco tráfego";
  return "Revisar";
}

function DetailTable({ rows }: { rows: ProductInsightRow[] }) {
  return (
    <div className="brandops-table-container atlas-table-shell">
      <table className="brandops-table-compact min-w-[1120px] w-full">
        <thead>
          <tr>
            <th>Estampa</th>
            <th>Tipo</th>
            <th className="text-right">Views</th>
            <th className="text-right">Tx. carrinho</th>
            <th className="text-right">Tx. compra</th>
            <th className="text-right">Unidades reais</th>
            <th className="text-right">Receita real</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="max-w-[280px]">
                <div className="atlas-component-stack-compact">
                  <p className="truncate font-semibold text-on-surface">{row.stampName}</p>
                  <p className="truncate text-[11px] leading-5 text-on-surface-variant">{row.decisionSummary}</p>
                </div>
              </td>
              <td>{row.productType}</td>
              <td className="text-right">{integerFormatter.format(row.views)}</td>
              <td className="text-right">{percentFormatter.format(row.addToCartRate)}</td>
              <td className="text-right">{percentFormatter.format(row.purchaseRate)}</td>
              <td className="text-right">{integerFormatter.format(row.realUnitsSold)}</td>
              <td className="text-right">{currencyFormatter.format(row.realGrossRevenue)}</td>
              <td>
                <EntityChip text={row.decisionTitle} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProductInsightsWorkspace({
  forcedMode,
}: {
  forcedMode?: ProductView;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeMode = searchParams?.get("mode") ?? null;
  const pageMode: ProductView =
    forcedMode ??
    (routeMode === "executive" || routeMode === "radar" || routeMode === "detail"
      ? routeMode
      : "home");
  const view = pageMode === "home" ? null : pageMode;
  const [decision, setDecision] = useState<ProductDecisionAction | "all">("all");
  const [classification, setClassification] = useState<ProductInsightClassification | "all">("all");
  const [productType, setProductType] = useState<string | "all">("all");
  const [sort, setSort] = useState<ProductInsightSort>("priority");
  const [report, setReport] = useState<ProductInsightsReport>(EMPTY_REPORT);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const { activeBrand, activeBrandId, brands, periodRange, selectedPeriodLabel, isLoading } =
    useBrandOps();

  const selectedBrandName =
    activeBrand?.name ?? brands.find((brand) => brand.id === activeBrandId)?.name ?? "Loja";

  useEffect(() => {
    if (!activeBrandId) {
      setReport(EMPTY_REPORT);
      return;
    }

    let cancelled = false;
    const currentBrandId = activeBrandId;

    async function loadReport() {
      setIsReportLoading(true);
      setReportError(null);
      try {
        const nextReport = await fetchProductInsightsReport(currentBrandId, {
          from: periodRange?.start ?? null,
          to: periodRange?.end ?? null,
          decision,
          classification,
          productType,
          sort,
        });
        if (!cancelled) {
          setReport(nextReport);
        }
      } catch (error) {
        if (!cancelled) {
          setReport(EMPTY_REPORT);
          setReportError(
            error instanceof Error
              ? error.message
              : "Não foi possível consolidar os insights de categorias.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsReportLoading(false);
        }
      }
    }

    void loadReport();
    return () => {
      cancelled = true;
    };
  }, [activeBrandId, classification, decision, periodRange?.end, periodRange?.start, productType, sort]);

  useEffect(() => {
    if (!report.rows.length) {
      setSelectedKey(null);
      return;
    }
    if (selectedKey && report.rows.some((row) => row.key === selectedKey)) {
      return;
    }
    setSelectedKey(report.meta.heroKey ?? report.featured[0]?.key ?? report.rows[0]?.key ?? null);
  }, [report.featured, report.meta.heroKey, report.rows, selectedKey]);

  const selectedRow = useMemo(
    () => report.rows.find((row) => row.key === selectedKey) ?? report.featured[0] ?? report.rows[0] ?? null,
    [report.featured, report.rows, selectedKey],
  );
  const heroRow = report.hero.row ?? selectedRow;
  const trendSeries = selectedRow ? report.trendByKey[selectedRow.key] ?? [] : [];
  const primaryAction = report.analysis.nextActions[0] ?? null;
  const pageTitle =
    pageMode === "home"
      ? "Insights e categorias"
      : pageMode === "executive"
        ? "Produtos · Visão executiva"
        : pageMode === "radar"
          ? "Produtos · Radar"
          : "Produtos · Detalhamento";
  const pageDescription =
    pageMode === "home"
      ? "Escolha entre executivo, radar ou detalhamento."
      : pageMode === "executive"
        ? "Leitura curta para decidir o próximo movimento."
        : pageMode === "radar"
          ? "Distribuição visual para localizar escala, teste e revisão."
          : "Auditoria e tabela operacional por estampa.";

  const isBrandLoading = Boolean(activeBrandId) && (isLoading || isReportLoading || !activeBrand);

  if (isBrandLoading) {
    return (
      <div className="atlas-page-stack">
        <PageHeader
          eyebrow="Inteligência de produto"
          title="Insights Categorias"
          description={`Carregando os sinais de produto da loja ${selectedBrandName}.`}
        />
        <div className="atlas-page-stack animate-pulse">
          <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-surface-container" />)}</div>
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]"><div className="h-[340px] rounded-2xl bg-surface-container" /><div className="h-[340px] rounded-2xl bg-surface-container" /></div>
        </div>
      </div>
    );
  }

  if (!activeBrand && !activeBrandId) {
    return <EmptyState title="Nenhuma marca selecionada" description="Escolha uma marca para carregar os sinais de estampa e produto." />;
  }

  if (!activeBrand) {
    return <EmptyState title={reportError ? "Insights indisponíveis" : "Dados da loja indisponíveis"} description={reportError ?? "Não foi possível montar os insights de produto da loja selecionada."} />;
  }

  if (!report.rows.length) {
    return <EmptyState title="Ainda não há sinais de produto" description="Sincronize o GA4 de itens para que o Atlas consiga cruzar intenção, compra e venda real." />;
  }

  return (
    <div className="atlas-page-stack-compact">
      <PageHeader
        eyebrow={pageMode === "home" ? "Inteligência de produto" : "Produtos"}
        title={pageMode === "home" ? "Console de produto" : pageTitle}
        description={
          pageMode === "home"
            ? "Estampas, intenção e venda real no recorte atual."
            : pageDescription
        }
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <WorkspaceTabs
              items={[
                {
                  key: "product-home",
                  label: "Home",
                  href: APP_ROUTES.productInsights,
                  active: pageMode === "home",
                },
                {
                  key: "product-executive",
                  label: "Executivo",
                  href: APP_ROUTES.productInsightsExecutive,
                  active: pageMode === "executive",
                },
                {
                  key: "product-radar",
                  label: "Radar",
                  href: APP_ROUTES.productInsightsRadar,
                  active: pageMode === "radar",
                },
                {
                  key: "product-detail",
                  label: "Detalhe",
                  href: APP_ROUTES.productInsightsDetail,
                  active: pageMode === "detail",
                },
              ]}
            />
            <span className="atlas-inline-metric">{selectedBrandName}</span>
            <span className="atlas-inline-metric">{selectedPeriodLabel}</span>
          </div>
        }
      />

      {pageMode === "home" ? (
        <>
          <TaskWorkspaceIntro
            title="Encontrar a estampa ou categoria que pede ação agora."
            description="Use as trilhas para decidir se a próxima leitura deve focar decisão comercial, mapa do portfólio ou auditoria item a item."
            primaryAction={primaryAction ?? report.analysis.narrativeTitle ?? "Revisar o portfólio do recorte"}
            primaryDescription="Abra a trilha que melhor responde a sua próxima pergunta sobre foco, escala, teste ou revisão."
            supportItems={[
              {
                label: "Maior oportunidade",
                value: report.analysis.topOpportunity ?? "Sem destaque dominante",
                description:
                  heroRow?.recommendedAction ??
                  "O Atlas ainda não consolidou um movimento dominante de escala.",
                tone: "positive",
              },
              {
                label: "Maior risco",
                value: report.analysis.topRisk ?? "Sem risco dominante",
                description:
                  heroRow?.decisionSummary ??
                  "Sem risco crítico consolidado para o recorte atual.",
                tone: "warning",
              },
              {
                label: "Estampa em foco",
                value: heroRow?.stampName ?? "Sem foco dominante",
                description:
                  heroRow?.decisionSummary ??
                  "Abra o detalhamento para localizar o item que está puxando a leitura.",
                tone: "default",
              },
            ]}
          />

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.34fr)_minmax(19rem,0.66fr)]">
            <SurfaceCard>
              <SectionHeading
                title="Leitura prioritária"
                description="O que o portfólio pede primeiro antes de abrir radar ou tabela."
                aside={<span className="atlas-inline-metric">{report.rows.length} estampas</span>}
              />
              <div className="mt-5 grid gap-4">
                <AnalyticsCalloutCard
                  eyebrow={report.analysis.narrativeTitle || "Leitura do recorte"}
                  title={report.analysis.topOpportunity ?? "O portfólio pede uma decisão comercial curta"}
                  description={report.analysis.narrativeBody || "Sem leitura dominante para o período."}
                  footer={primaryAction ?? undefined}
                />
                <div className="grid gap-4 lg:grid-cols-2">
                  <StackItem
                    tone="positive"
                    title={report.analysis.topOpportunity ?? "Sem destaque dominante"}
                    description={
                      heroRow?.recommendedAction ??
                      "O Atlas ainda não consolidou um movimento dominante de escala."
                    }
                    aside={heroRow?.stampName ?? "Sem item dominante"}
                  />
                  <StackItem
                    tone="warning"
                    title={report.analysis.topRisk ?? "Sem risco dominante"}
                    description={
                      heroRow?.decisionSummary ??
                      "Sem risco crítico consolidado para o recorte atual."
                    }
                    aside={heroRow?.stampName ?? "Sem item dominante"}
                  />
                </div>
              </div>
            </SurfaceCard>
            <SurfaceCard>
              <SectionHeading
                title="Trilhas de análise"
                description="Cada trilha aprofunda uma pergunta operacional diferente."
              />
              <div className="mt-5 grid gap-3">
                <ModeEntryCard
                  eyebrow="Visão executiva"
                  title="Foco e decisão"
                  description="Momentum, estampa em foco e próxima ação comercial."
                  href={APP_ROUTES.productInsightsExecutive}
                />
                <ModeEntryCard
                  eyebrow="Radar"
                  title="Mapa do portfólio"
                  description="Distribuição visual para localizar escala, teste e revisão."
                  href={APP_ROUTES.productInsightsRadar}
                />
                <ModeEntryCard
                  eyebrow="Detalhamento"
                  title="Tabela operacional"
                  description="Auditoria por estampa, filtros e leitura item a item."
                  href={APP_ROUTES.productInsightsDetail}
                />
              </div>
            </SurfaceCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
            <AnalyticsCalloutCard
              eyebrow="Estampa em foco"
              title={heroRow?.stampName ?? "Sem foco dominante"}
              description={
                heroRow?.decisionSummary ??
                "Abra o detalhamento para localizar o item que está puxando a leitura."
              }
              footer={primaryAction ?? heroRow?.recommendedAction ?? undefined}
            />
            <SurfaceCard>
              <SectionHeading
                title="Risco e direção"
                description="Uma leitura única para decidir ajuste de vitrine, mídia ou manutenção."
              />
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <StackItem
                  tone="warning"
                  title={report.analysis.topRisk ?? "Sem risco dominante"}
                  description={
                    heroRow?.decisionSummary ??
                    "Sem risco crítico consolidado para o recorte atual."
                  }
                  aside={heroRow?.stampName ?? "Sem item dominante"}
                />
                <StackItem
                  tone="info"
                  title="Próxima ação"
                  description={primaryAction ?? heroRow?.recommendedAction ?? "Sem ação dominante para o recorte."}
                  aside={heroRow?.decisionTitle ?? "Observação"}
                />
              </div>
            </SurfaceCard>
          </section>
        </>
      ) : null}

      {view === "executive" ? (
        <>
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.34fr)_minmax(18rem,0.66fr)]">
            <SurfaceCard>
              <SectionHeading title="Estampa em foco" description="Leitura principal da estampa que resume o recorte." />
              {heroRow ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
                  <div className="atlas-component-stack">
                    <div className="flex flex-wrap gap-2">
                      <EntityChip text={heroRow.decisionTitle} />
                      <EntityChip text={classificationLabel(heroRow.classification)} />
                      <EntityChip text={heroRow.productType} />
                    </div>
                    <div className="atlas-component-stack-tight">
                      <h2 className="font-headline text-2xl font-semibold tracking-tight text-on-surface">{heroRow.stampName}</h2>
                      <p className="text-sm leading-6 text-on-surface-variant">{report.hero.description || heroRow.decisionSummary}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <AnalyticsKpiCard
                        label="Views"
                        value={integerFormatter.format(heroRow.views)}
                        description="Volume de visualizações do item no GA4."
                        tone="default"
                      />
                      <AnalyticsKpiCard
                        label="Tx. carrinho"
                        value={percentFormatter.format(heroRow.addToCartRate)}
                        description="Views convertendo em adição ao carrinho."
                        tone={heroRow.decision === "scale_now" ? "positive" : heroRow.decision === "boost_traffic" ? "info" : heroRow.decision === "review_listing" ? "warning" : "default"}
                      />
                      <AnalyticsKpiCard
                        label="Receita real"
                        value={currencyFormatter.format(heroRow.realGrossRevenue)}
                        description="Receita real conciliada na INK."
                        tone={heroRow.realGrossRevenue > 0 ? "positive" : "default"}
                      />
                    </div>
                    <InlineNotice tone="info">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Ação sugerida</p>
                      <p className="mt-1.5 text-sm leading-6 text-on-surface-variant">{heroRow.recommendedAction}</p>
                    </InlineNotice>
                  </div>

                  <div className="atlas-component-stack-compact">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Motivos do backend</p>
                    <div className="atlas-component-stack-tight">
                      {(report.hero.bullets.length ? report.hero.bullets : heroRow.rationale).map((item) => (
                        <StackItem key={item} title={item} />
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading title="Decisões do recorte" description="Distribuição curta por ação sugerida." />
              <div className="mt-5 grid gap-3">
                {report.playbook.map((group) => (
                  <AnalyticsCalloutCard
                    key={group.decision}
                    eyebrow={group.title}
                    title={`${group.count} estampas no recorte`}
                    description={group.description}
                    tone={group.decision === "scale_now" ? "positive" : group.decision === "review_listing" ? "warning" : "default"}
                    onClick={() => router.push(APP_ROUTES.productInsightsDetail)}
                    actionLabel="Abrir detalhe"
                    footer={group.items.length ? group.items.slice(0, 3).map((item) => item.stampName).join(" • ") : undefined}
                  />
                ))}
              </div>
            </SurfaceCard>
          </section>

          <section className="grid gap-5">
            <SurfaceCard>
              <SectionHeading title={report.analysis.narrativeTitle || "Leitura do portfólio"} description={report.analysis.narrativeBody || "Síntese curta do recorte atual."} />
              {report.analysis.nextActions.length ? (
                <div className="mt-5 atlas-component-stack-tight">
                  {report.analysis.nextActions.map((item) => (
                    <InlineNotice key={item} tone="info" className="text-sm text-on-surface-variant">
                      {item}
                    </InlineNotice>
                  ))}
                </div>
              ) : null}
            </SurfaceCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.16fr)_minmax(18rem,0.84fr)]">
            <SurfaceCard>
              <SectionHeading title="Ganhando destaque" description="Estampas com aceleração recente em views e intenção." />
              <div className="mt-5 atlas-component-stack-tight">
                {report.momentum.gaining.length ? report.momentum.gaining.map((row) => (
                  <AnalyticsCalloutCard
                    key={row.key}
                    eyebrow={row.decisionTitle}
                    title={row.stampName}
                    description={`${integerFormatter.format(row.views)} views no recorte`}
                    footer={`+${(row.viewGrowth * 100).toFixed(1)}% de aceleração recente`}
                    tone="positive"
                    onClick={() => setSelectedKey(row.key)}
                    actionLabel="Abrir"
                  />
                )) : <p className="text-sm text-on-surface-variant">Sem itens ganhando destaque no recorte.</p>}
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading title="Perdendo força" description="Itens com desaceleração recente e que pedem atenção." />
                <div className="mt-5 atlas-component-stack-tight">
                {report.momentum.losing.length ? report.momentum.losing.map((row) => (
                  <AnalyticsCalloutCard
                    key={row.key}
                    eyebrow={row.decisionTitle}
                    title={row.stampName}
                    description={`${integerFormatter.format(row.views)} views no recorte`}
                    footer={`${(row.viewGrowth * 100).toFixed(1)}% de variação recente`}
                    tone="warning"
                    onClick={() => setSelectedKey(row.key)}
                    actionLabel="Abrir"
                  />
                )) : <p className="text-sm text-on-surface-variant">Sem itens perdendo força de forma relevante.</p>}
              </div>
            </SurfaceCard>
          </section>
        </>
      ) : null}

      {view === "radar" ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.56fr)_minmax(18rem,0.52fr)]">
          <SurfaceCard>
            <SectionHeading title="Matriz views x taxa de carrinho" description="Distribuição visual das estampas para localizar escala, teste ou revisão." />
            <div className="mt-5 h-[360px] min-w-0 xl:h-[420px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
                <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" />
                  <XAxis type="number" dataKey="views" stroke="var(--color-on-surface-variant)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis type="number" dataKey="addToCartRate" unit="%" stroke="var(--color-on-surface-variant)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <ZAxis type="number" dataKey="revenue" range={[90, 320]} />
                  <Tooltip formatter={(_, __, entry) => {
                    const payload = entry?.payload as { label?: string; decisionTitle?: string; views?: number; addToCartRate?: number } | undefined;
                    return [
                      `${payload?.label ?? ""} • ${payload?.decisionTitle ?? ""} • ${integerFormatter.format(Number(payload?.views ?? 0))} views • ${(Number(payload?.addToCartRate ?? 0)).toFixed(1)}%`,
                      "Estampa",
                    ];
                  }} contentStyle={{ borderRadius: 14, border: "1px solid var(--color-outline)", backgroundColor: "var(--color-surface)" }} />
                  <Legend />
                  {report.scatterSeries.map((series) => (
                    <Scatter key={series.decision} name={series.title} data={series.points} fill={DECISION_COLORS[series.decision]} />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading title="Classificações" description="Resumo das classes principais para orientar merchandising, catálogo e mídia." />
            <div className="mt-5 grid gap-3">
              {report.classifications.map((group) => (
                <AnalyticsCalloutCard
                  key={group.classification}
                  eyebrow={group.label}
                  title={`${group.count} estampas no recorte atual`}
                  description={group.bullets[0] ?? "Sem leitura adicional para este grupo."}
                  footer={group.bullets.slice(1).join(" • ") || undefined}
                  tone={group.classification === "validated" ? "positive" : group.classification === "opportunity" ? "info" : "warning"}
                />
              ))}
            </div>
          </SurfaceCard>
        </section>
      ) : null}

      {view === "detail" ? (
        <>
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.32fr)_minmax(18rem,0.68fr)]">
            <SurfaceCard>
              <SectionHeading title="Linha do tempo da estampa" description="Views e taxa de carrinho para ler aceleração e perda de força." />
              {selectedRow ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <EntityChip text={selectedRow.stampName} />
                  <EntityChip text={selectedRow.decisionTitle} />
                  <EntityChip text={selectedRow.productType} />
                </div>
              ) : null}
              <div className="mt-5 h-[320px] min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                  <ComposedChart data={trendSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatCompactDate} stroke="var(--color-on-surface-variant)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" stroke="var(--color-on-surface-variant)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--color-on-surface-variant)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value, name) =>
                        name === "addToCartRate"
                          ? [`${Number(value ?? 0).toFixed(1)}%`, "Tx. carrinho"]
                          : [integerFormatter.format(Number(value ?? 0)), "Views"]
                      }
                      labelFormatter={(label) => formatCompactDate(String(label ?? ""))}
                      contentStyle={{ borderRadius: 14, border: "1px solid var(--color-outline)", backgroundColor: "var(--color-surface)" }}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="views" stroke="var(--color-secondary)" strokeWidth={2} dot={false} name="Views" />
                    <Line yAxisId="right" type="monotone" dataKey="addToCartRate" stroke="var(--color-primary)" strokeWidth={2} dot={false} name="Tx. carrinho" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading title="Radar de estampas" description="Lista compacta do recorte atual para auditoria e decisão." />
              <div className="mt-5 max-h-[420px] overflow-auto">
                <div className="atlas-component-stack-tight">
                  {report.rows.map((row) => (
                    <button
                      key={row.key}
                      type="button"
                      onClick={() => setSelectedKey(row.key)}
                      className={`flex w-full items-center justify-between gap-4 border px-4 py-3 text-left transition ${
                        row.key === selectedRow?.key
                          ? "atlas-list-row border-primary/45 bg-primary/5"
                          : "atlas-list-row border-outline bg-surface-container-low hover:border-primary/25 hover:bg-surface"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-on-surface">{row.stampName}</p>
                        <p className="mt-1 truncate text-[11px] leading-5 text-on-surface-variant">{row.decisionSummary}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-on-surface">{integerFormatter.format(row.views)}</p>
                        <p className="text-[11px] text-on-surface-variant">{percentFormatter.format(row.addToCartRate)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </SurfaceCard>
          </section>

          <SurfaceCard className="p-0 overflow-hidden">
            <div className="border-b border-outline p-5">
              <SectionHeading title="Tabela operacional" description="Tabela completa para auditar a decisão, o volume e a venda real por estampa." />
              <div className="mt-4 brandops-toolbar-grid lg:grid-cols-4">
                <label className="brandops-field-stack">
                  <span className="brandops-field-label">Ação</span>
                  <select value={decision} onChange={(event) => setDecision(event.target.value as ProductDecisionAction | "all")} className="brandops-input">
                    <option value="all">Todas as ações</option>
                    {report.decisions.map((item) => <option key={item.decision} value={item.decision}>{item.title} ({item.count})</option>)}
                  </select>
                </label>
                <label className="brandops-field-stack">
                  <span className="brandops-field-label">Classificação</span>
                  <select value={classification} onChange={(event) => setClassification(event.target.value as ProductInsightClassification | "all")} className="brandops-input">
                    <option value="all">Todas as classificações</option>
                    {report.classifications.map((item) => <option key={item.classification} value={item.classification}>{item.label} ({item.count})</option>)}
                  </select>
                </label>
                <label className="brandops-field-stack">
                  <span className="brandops-field-label">Tipo</span>
                  <select value={productType} onChange={(event) => setProductType(event.target.value)} className="brandops-input">
                    <option value="all">Todos os tipos</option>
                    {report.filters.availableTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label className="brandops-field-stack">
                  <span className="brandops-field-label">Ordenação</span>
                  <select value={sort} onChange={(event) => setSort(event.target.value as ProductInsightSort)} className="brandops-input">
                    {report.filters.availableSorts.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <DetailTable rows={report.rows} />
          </SurfaceCard>
        </>
      ) : null}
    </div>
  );
}

export default function ProductInsightsPage() {
  return <ProductInsightsWorkspace />;
}

