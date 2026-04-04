"use client";

import { useEffect, useMemo, useState } from "react";
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
import { EntityChip, InlineNotice, PageHeader, SectionHeading, StackItem, SurfaceCard } from "@/components/ui-shell";
import { fetchProductInsightsReport } from "@/lib/brandops/database";
import { currencyFormatter, formatCompactDate, integerFormatter, percentFormatter } from "@/lib/brandops/format";
import type {
  ProductDecisionAction,
  ProductInsightClassification,
  ProductInsightRow,
  ProductInsightSort,
  ProductInsightsReport,
} from "@/lib/brandops/types";

type ProductView = "executive" | "radar" | "detail";

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
    <div className="brandops-table-container">
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
                <div className="space-y-1">
                  <p className="truncate font-semibold text-on-surface">{row.stampName}</p>
                  <p className="truncate text-xs text-on-surface-variant">{row.decisionSummary}</p>
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

export default function ProductInsightsPage() {
  const [view, setView] = useState<ProductView>("executive");
  const [executiveSection, setExecutiveSection] = useState<"hero" | "momentum">("hero");
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

  const isBrandLoading = Boolean(activeBrandId) && (isLoading || isReportLoading || !activeBrand);

  if (isBrandLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Inteligência de produto"
          title="Insights Categorias"
          description={`Carregando os sinais de produto da loja ${selectedBrandName}.`}
          badge={`Período analisado: ${selectedPeriodLabel}`}
        />
        <div className="space-y-6 animate-pulse">
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inteligência de produto"
        title="Insights Categorias"
        description="Leitura decisória das estampas com base em intenção do GA4 e validação operacional da INK. O backend classifica, prioriza e entrega a leitura pronta para decisão."
        badge={`Período analisado: ${selectedPeriodLabel}`}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="brandops-tabs">
              <button type="button" className="brandops-tab" data-active={view === "executive"} onClick={() => setView("executive")}>Visão executiva</button>
              <button type="button" className="brandops-tab" data-active={view === "radar"} onClick={() => setView("radar")}>Radar</button>
              <button type="button" className="brandops-tab" data-active={view === "detail"} onClick={() => setView("detail")}>Detalhamento</button>
            </div>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsKpiCard
          label="Estampas ativas"
          value={integerFormatter.format(report.overview.totalRows)}
          description="Quantidade de estampas que entraram no recorte atual."
          tone="info"
        />
        <AnalyticsKpiCard
          label="Views totais"
          value={integerFormatter.format(report.overview.totalViews)}
          description="Volume de atenção coletado no GA4 para itens do catálogo."
          tone="default"
        />
        <AnalyticsKpiCard
          label="Peças reais"
          value={integerFormatter.format(report.overview.totalRealUnitsSold)}
          description="Venda real conciliada da INK no mesmo recorte."
          tone={report.overview.totalRealUnitsSold > 0 ? "positive" : "default"}
        />
        <AnalyticsKpiCard
          label="Receita real"
          value={currencyFormatter.format(report.overview.totalRealGrossRevenue)}
          description="Receita operacional confirmada pela INK."
          tone={report.overview.totalRealGrossRevenue > 0 ? "positive" : "default"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard>
          <SectionHeading title="Pulse do recorte" description="O Atlas resume o estado atual em linguagem curta para acelerar a leitura operacional." />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <AnalyticsKpiCard
              label="Foco atual"
              value={heroRow?.stampName ?? "Sem foco"}
              description={heroRow?.decisionSummary ?? "Selecione uma estampa para abrir a leitura detalhada."}
            />
            <AnalyticsKpiCard
              label="Maior oportunidade"
              value={report.analysis.topOpportunity ?? "Sem destaque"}
              description="O backend já trouxe o ponto com maior potencial de ganho no recorte ativo."
              tone={report.analysis.topOpportunity ? "positive" : "default"}
            />
            <AnalyticsKpiCard
              label="Maior risco"
              value={report.analysis.topRisk ?? "Sem risco dominante"}
              description="Sinal principal de perda de força ou de baixa conversão para acompanhar primeiro."
              tone={report.analysis.topRisk ? "warning" : "default"}
            />
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading title="Filtros operacionais" description="Os filtros rodam no backend e afinam a leitura sem espalhar controles pela tela." />
          <div className="mt-5 brandops-toolbar-grid lg:grid-cols-2">
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
        </SurfaceCard>
      </section>

      {view === "executive" ? (
        <>
          <SurfaceCard>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <SectionHeading title="Modo executivo" description="Foco principal e momentum divididos em dois blocos curtos." />
              <div className="brandops-subtabs">
                <button type="button" className="brandops-subtab" data-active={executiveSection === "hero"} onClick={() => setExecutiveSection("hero")}>Estampa em foco</button>
                <button type="button" className="brandops-subtab" data-active={executiveSection === "momentum"} onClick={() => setExecutiveSection("momentum")}>Momentum</button>
              </div>
            </div>
          </SurfaceCard>

          {executiveSection === "hero" ? (
          <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
            <SurfaceCard>
              <SectionHeading title="Estampa em foco" description="O backend já entrega a leitura principal e o motivo da decisão." />
              {heroRow ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <EntityChip text={heroRow.decisionTitle} />
                      <EntityChip text={classificationLabel(heroRow.classification)} />
                      <EntityChip text={heroRow.productType} />
                    </div>
                    <div className="space-y-2">
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

                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Motivos do backend</p>
                    <div className="space-y-2">
                      {(report.hero.bullets.length ? report.hero.bullets : heroRow.rationale).map((item) => (
                        <StackItem key={item} title={item} />
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading title="Decisões do recorte" description="Resumo compacto da distribuição por ação sugerida." />
              <div className="mt-5 grid gap-3">
                {report.playbook.map((group) => (
                  <AnalyticsCalloutCard
                    key={group.decision}
                    eyebrow={group.title}
                    title={`${group.count} estampas no recorte`}
                    description={group.description}
                    tone={group.decision === "scale_now" ? "positive" : group.decision === "review_listing" ? "warning" : "default"}
                    onClick={() => {
                      setDecision(group.decision);
                      setView("detail");
                    }}
                    actionLabel="Filtrar"
                    footer={group.items.length ? group.items.slice(0, 3).map((item) => item.stampName).join(" • ") : undefined}
                  />
                ))}
              </div>
            </SurfaceCard>
          </section>
          ) : null}

          {executiveSection === "momentum" ? (
          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <SurfaceCard>
              <SectionHeading title={report.analysis.narrativeTitle || "Leitura do portfólio"} description={report.analysis.narrativeBody || "Síntese curta do recorte atual."} />
              {report.analysis.nextActions.length ? (
                <div className="mt-5 space-y-3">
                  {report.analysis.nextActions.map((item) => (
                    <InlineNotice key={item} tone="info" className="text-sm text-on-surface-variant">
                      {item}
                    </InlineNotice>
                  ))}
                </div>
              ) : null}
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading title="Ganhando destaque" description="Estampas com aceleração recente em views e intenção." />
              <div className="mt-5 space-y-3">
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
              <div className="mt-5 space-y-3">
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
          ) : null}
        </>
      ) : null}

      {view === "radar" ? (
          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <SurfaceCard>
            <SectionHeading title="Matriz views x taxa de carrinho" description="Distribuição visual das estampas para localizar escala, teste ou revisão." />
            <div className="mt-5 h-[360px] min-w-0">
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
          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
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
                <div className="space-y-2">
                  {report.rows.map((row) => (
                    <button
                      key={row.key}
                      type="button"
                      onClick={() => setSelectedKey(row.key)}
                      className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition ${
                        row.key === selectedRow?.key
                          ? "border-primary/45 bg-primary/5"
                          : "border-outline bg-surface-container-low hover:border-primary/25 hover:bg-surface"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-on-surface">{row.stampName}</p>
                        <p className="mt-1 truncate text-xs text-on-surface-variant">{row.decisionSummary}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-on-surface">{integerFormatter.format(row.views)}</p>
                        <p className="text-xs text-on-surface-variant">{percentFormatter.format(row.addToCartRate)}</p>
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
            </div>
            <DetailTable rows={report.rows} />
          </SurfaceCard>
        </>
      ) : null}
    </div>
  );
}
