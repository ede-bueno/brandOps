"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { currencyFormatter, percentFormatter } from "@/lib/brandops/format";
import { buildStudioHref } from "@/lib/brandops-v3/view-models";
import { MarginDecisionPanel, MarginPeriodSummaryPanel } from "./margin/MarginHeroPanels";
import { MarginRadarPanel } from "./margin/MarginRadarPanel";
import { MarginTimelinePanel } from "./margin/MarginTimelinePanel";
import { WorkspaceTabs } from "./StudioPrimitives";
import { V3EmptyState, V3ModuleChrome } from "./BrandOpsShellV3";

type MarginViewMode = "historical" | "filtered";
type MarginSection = "radar" | "timeline";

function buildMarginHref(view: MarginViewMode, section: MarginSection) {
  const params = new URLSearchParams();
  params.set("view", view);
  params.set("section", section);
  return `/studio/margin?${params.toString()}`;
}

export function ContributionMarginPageV3({
  view,
  section,
}: {
  view?: string | null;
  section?: string | null;
}) {
  const viewMode: MarginViewMode = view === "filtered" ? "filtered" : "historical";
  const activeSection: MarginSection = section === "timeline" ? "timeline" : "radar";
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
        <MarginDecisionPanel
          primaryAction={primaryAction}
          viewMode={viewMode}
          selectedPeriodLabel={selectedPeriodLabel}
          contributionMargin={report.total.contributionMargin}
          momentumTitle={momentum.title}
          momentumDescription={momentum.description}
          momentumTone={momentum.tone}
        />
        <MarginPeriodSummaryPanel
          selectedBrandName={selectedBrandName}
          bestMonthLabel={bestMonth ? bestMonth.label : "Sem histórico"}
          bestMonthContribution={bestMonth?.contributionAfterMedia}
          worstMonthLabel={worstMonth ? worstMonth.label : "Sem histórico"}
          worstMonthContribution={worstMonth?.contributionAfterMedia}
          latestMonthLabel={latestMonth ? latestMonth.label : "Sem fechamento"}
          latestMonthResult={latestMonth?.netResult}
        />
      </section>

      <section className="v3-panel">
        <div className="v3-panel-heading">
          <span>Painel da margem</span>
          <strong>{viewMode === "historical" ? "Histórico completo" : selectedPeriodLabel}</strong>
        </div>
        <WorkspaceTabs
          active={viewMode}
          tabs={[
            { key: "historical", label: "Histórico", href: buildMarginHref("historical", activeSection) },
            { key: "filtered", label: "Recorte ativo", href: buildMarginHref("filtered", activeSection) },
          ]}
        />
        <WorkspaceTabs
          active={activeSection}
          tabs={[
            { key: "radar", label: "Radar", href: buildMarginHref(viewMode, "radar") },
            { key: "timeline", label: "Linha do tempo", href: buildMarginHref(viewMode, "timeline") },
          ]}
        />

        {activeSection === "radar" ? (
          <MarginRadarPanel
            latestMonths={latestMonths}
            cmvShare={cmvShare}
            mediaShare={mediaShare}
            expenseShare={expenseShare}
            contributionMargin={report.total.contributionMargin}
          />
        ) : (
          <MarginTimelinePanel latestMonths={latestMonths} />
        )}
      </section>
    </V3ModuleChrome>
  );
}
