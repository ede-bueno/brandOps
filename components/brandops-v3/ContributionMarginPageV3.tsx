"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { currencyFormatter, percentFormatter } from "@/lib/brandops/format";
import { buildStudioHref } from "@/lib/brandops-v3/view-models";
import { V3EmptyState, V3ModuleChrome } from "./BrandOpsShellV3";

type MarginViewMode = "historical" | "filtered";
type MarginSection = "radar" | "timeline";

function MarginTabs({
  active,
  items,
  onChange,
}: {
  active: string;
  items: Array<{ key: string; label: string }>;
  onChange: (key: string) => void;
}) {
  return (
    <div className="v3-tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="v3-tab"
          data-active={item.key === active}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function ContributionMarginPageV3() {
  const [viewMode, setViewMode] = useState<MarginViewMode>("historical");
  const [activeSection, setActiveSection] = useState<MarginSection>("radar");
  const {
    activeBrand,
    activeBrandId,
    brands,
    selectedPeriodLabel,
    isLoading: isDatasetLoading,
    financialReportFiltered,
    financialReportHistorical,
    isDreLoading,
  } = useBrandOps();

  const selectedBrandName =
    activeBrand?.name ?? brands.find((brand) => brand.id === activeBrandId)?.name ?? "Marca";

  const isBrandLoading =
    Boolean(activeBrandId) && (isDatasetLoading || isDreLoading || !activeBrand);

  const report = viewMode === "historical" ? financialReportHistorical : financialReportFiltered;

  const latestMonths = useMemo(() => report?.months.slice(-8) ?? [], [report]);

  if (isBrandLoading) {
    return (
      <div className="v3-loading-panel">
        <span>Carregando margem de contribuição</span>
      </div>
    );
  }

  if (!activeBrandId && !activeBrand) {
    return (
      <V3EmptyState
        title="Nenhuma marca ativa"
        description="Selecione uma marca para abrir a leitura de margem."
      />
    );
  }

  if (!report) {
    return (
      <V3EmptyState
        title="Margem indisponível"
        description="O BrandOps ainda não reuniu dados suficientes para montar esta leitura."
      />
    );
  }

  const analysis = report.analysis;
  const bestMonth = analysis.bestContributionMonth;
  const worstMonth = analysis.worstContributionMonth;
  const latestMonth = analysis.latestMonth;
  const momentum = analysis.momentum;
  const mediaShare = analysis.shares.mediaShare;
  const cmvShare = analysis.shares.cmvShare;
  const expenseShare = analysis.shares.expenseShare;
  const dominantPressure =
    Math.max(cmvShare, mediaShare, expenseShare) === cmvShare
      ? "CMV"
      : Math.max(cmvShare, mediaShare, expenseShare) === mediaShare
        ? "Mídia"
        : "Despesas";
  const primaryAction =
    report.total.contributionMargin < 0
      ? "Reverter a contribuição antes de acelerar mídia ou catálogo."
      : report.total.netResult < 0
        ? "Reduzir pressão operacional até o resultado voltar para o azul."
        : momentum.description;

  return (
    <V3ModuleChrome
      eyebrow="Comando"
      title="Margem de contribuição"
      description="Leitura de tração financeira da marca, com comparação rápida entre histórico completo e recorte ativo."
      aside={
        <Link className="v3-primary-link" href={buildStudioHref("finance", { surface: "dre" })}>
          Abrir DRE
        </Link>
      }
    >
      <section className="v3-metric-ribbon" aria-label="Indicadores de margem">
        <article data-tone={report.total.contributionAfterMedia >= 0 ? "good" : "bad"}>
          <span>Contribuição</span>
          <strong>{currencyFormatter.format(report.total.contributionAfterMedia)}</strong>
          <p>{viewMode === "historical" ? "Série histórica completa." : "Recorte ativo do período."}</p>
        </article>
        <article data-tone={report.total.netResult >= 0 ? "good" : "bad"}>
          <span>Resultado</span>
          <strong>{currencyFormatter.format(report.total.netResult)}</strong>
          <p>Depois de mídia, CMV e despesas operacionais.</p>
        </article>
        <article data-tone={report.total.contributionMargin >= 0 ? "good" : "warn"}>
          <span>Margem</span>
          <strong>{percentFormatter.format(report.total.contributionMargin)}</strong>
          <p>Participação da contribuição sobre a RLD.</p>
        </article>
        <article data-tone="warn">
          <span>Pressão dominante</span>
          <strong>{dominantPressure}</strong>
          <p>Maior peso sobre a margem no recorte analisado.</p>
        </article>
      </section>

      <section className="v3-command-grid">
        <div className="v3-panel v3-brief-panel">
          <span>Decisão de margem</span>
          <h2>{primaryAction}</h2>
          <p>
            {viewMode === "historical"
              ? "A leitura histórica ajuda a separar desvio estrutural de ruído pontual."
              : `Você está olhando o mesmo recorte ativo do shell: ${selectedPeriodLabel}.`}
          </p>
          <div className="v3-focus-list">
            <Link href={buildStudioHref("finance", { surface: "dre" })} data-tone="warn">
              <div>
                <span>Melhor próximo passo</span>
                <strong>{report.total.contributionMargin < 0 ? "Fechar DRE e despesas" : "Cruzar com aquisição"}</strong>
                <p>
                  {report.total.contributionMargin < 0
                    ? "Valide linha a linha antes de aceitar qualquer expansão."
                    : "Cheque se a tração veio de mídia eficiente ou de mix comercial."}
                </p>
              </div>
              <ArrowUpRight size={16} />
            </Link>
            <article data-tone={momentum.tone === "positive" ? "good" : momentum.tone === "warning" ? "warn" : "info"}>
              <div>
                <span>Momentum</span>
                <strong>{momentum.title}</strong>
                <p>{momentum.description}</p>
              </div>
            </article>
          </div>
        </div>

        <div className="v3-panel">
          <div className="v3-panel-heading">
            <span>Resumo do período</span>
            <strong>{selectedBrandName}</strong>
          </div>
          <div className="v3-panel-body">
            <div className="v3-focus-list">
              <article data-tone="good">
                <div>
                  <span>Melhor mês</span>
                  <strong>{bestMonth ? bestMonth.label : "Sem histórico"}</strong>
                  <p>
                    {bestMonth
                      ? currencyFormatter.format(bestMonth.contributionAfterMedia)
                      : "Ainda não há mês suficiente para comparação."}
                  </p>
                </div>
              </article>
              <article data-tone="warn">
                <div>
                  <span>Pior mês</span>
                  <strong>{worstMonth ? worstMonth.label : "Sem histórico"}</strong>
                  <p>
                    {worstMonth
                      ? currencyFormatter.format(worstMonth.contributionAfterMedia)
                      : "Ainda não há mês suficiente para comparação."}
                  </p>
                </div>
              </article>
              <article data-tone="info">
                <div>
                  <span>Último fechamento</span>
                  <strong>{latestMonth ? latestMonth.label : "Sem fechamento"}</strong>
                  <p>
                    {latestMonth
                      ? `Resultado ${currencyFormatter.format(latestMonth.netResult)}`
                      : "A série aparece aqui assim que houver fechamento mensal."}
                  </p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="v3-panel">
        <div className="v3-panel-heading">
          <span>Painel da margem</span>
          <strong>{viewMode === "historical" ? "Histórico completo" : selectedPeriodLabel}</strong>
        </div>
        <MarginTabs
          active={viewMode}
          onChange={(key) => setViewMode(key as MarginViewMode)}
          items={[
            { key: "historical", label: "Histórico" },
            { key: "filtered", label: "Recorte ativo" },
          ]}
        />
        <MarginTabs
          active={activeSection}
          onChange={(key) => setActiveSection(key as MarginSection)}
          items={[
            { key: "radar", label: "Radar" },
            { key: "timeline", label: "Linha do tempo" },
          ]}
        />

        {activeSection === "radar" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Últimos meses</span>
              </div>
              <div className="v3-data-list">
                {latestMonths.map((month) => (
                  <Link key={month.monthKey} href={buildStudioHref("finance", { surface: "dre" })}>
                    <span>{month.label}</span>
                    <strong>{currencyFormatter.format(month.metrics.contributionAfterMedia)}</strong>
                    <small>{percentFormatter.format(month.metrics.contributionMargin)} margem</small>
                  </Link>
                ))}
              </div>
            </div>
            <div className="v3-section-stack">
              <div className="v3-note">
                <strong>Distribuição de pressão</strong>
                <p>
                  CMV {percentFormatter.format(cmvShare)} | Mídia {percentFormatter.format(mediaShare)} | Despesas {percentFormatter.format(expenseShare)}
                </p>
              </div>
              <div className="v3-focus-list">
                <article data-tone={report.total.contributionMargin >= 0 ? "good" : "bad"}>
                  <div>
                    <span>Margem atual</span>
                    <strong>{percentFormatter.format(report.total.contributionMargin)}</strong>
                    <p>
                      {report.total.contributionMargin >= 0
                        ? "A contribuição ainda sustenta a operação no período."
                        : "A margem foi comprimida e precisa de correção antes de escalar."}
                    </p>
                  </div>
                </article>
                <Link href={buildStudioHref("growth", { surface: "media" })} data-tone="info">
                  <div>
                    <span>Cruzar com aquisição</span>
                    <strong>{report.total.contributionMargin >= 0 ? "Validar ganho via mídia" : "Entender pressão da mídia"}</strong>
                    <p>Abra Crescimento para ver se a tração ou a pressão veio do gasto.</p>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
                <Link href={buildStudioHref("offer", { surface: "sales" })} data-tone="info">
                  <div>
                    <span>Cruzar com oferta</span>
                    <strong>Checar mix e ticket</strong>
                    <p>Abra Oferta para confirmar se o mix comercial está sustentando a margem.</p>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="v3-ledger">
            <div className="v3-ledger-row v3-ledger-head">
              <span>Indicador</span>
              {latestMonths.map((month) => (
                <strong key={month.monthKey}>{month.label}</strong>
              ))}
            </div>
            <div className="v3-ledger-row">
              <span>Contribuição</span>
              {latestMonths.map((month) => (
                <strong key={`contribution-${month.monthKey}`}>
                  {currencyFormatter.format(month.metrics.contributionAfterMedia)}
                </strong>
              ))}
            </div>
            <div className="v3-ledger-row">
              <span>Margem</span>
              {latestMonths.map((month) => (
                <strong key={`margin-${month.monthKey}`}>
                  {percentFormatter.format(month.metrics.contributionMargin)}
                </strong>
              ))}
            </div>
            <div className="v3-ledger-row">
              <span>Resultado</span>
              {latestMonths.map((month) => (
                <strong key={`result-${month.monthKey}`}>
                  {currencyFormatter.format(month.metrics.netResult)}
                </strong>
              ))}
            </div>
          </div>
        )}
      </section>
    </V3ModuleChrome>
  );
}
