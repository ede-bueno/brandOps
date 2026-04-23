"use client";

import Link from "next/link";
import { V3ModuleChrome } from "../BrandOpsShellV3";
import {
  ExecutiveQueueBoard,
  FocusList,
  InlineEmpty,
  MetricRibbon,
  TrendBars,
  WorkspaceTabs,
} from "../StudioPrimitives";
import { StudioEvidenceSection } from "../shared/StudioEvidenceSection";
import { resolveGrowthWorkspaceMeta } from "./resolveGrowthWorkspaceMeta";
import {
  buildGrowthMetrics,
  buildStudioHref,
  getStudioWorkspaceTabs,
  makeModuleFallback,
  mapActionsToFocus,
  type GrowthStudioSurface,
  type StudioFocusItem,
  type StudioModuleContext,
} from "@/lib/brandops-v3/view-models";
import { currencyFormatter, integerFormatter, percentFormatter } from "@/lib/brandops/format";
import type { AcquisitionHubReport } from "@/lib/brandops/types";

export function GrowthWorkspace({
  report,
  context,
}: {
  report: AcquisitionHubReport;
  context: StudioModuleContext;
}) {
  const requestedSurface = context.surface as GrowthStudioSurface;
  const activeTab: GrowthStudioSurface =
    requestedSurface === "traffic" || requestedSurface === "evidence" ? requestedSurface : "media";
  const focus = [
    ...mapActionsToFocus(report.priorities),
    {
      label: "Campanha",
      title: report.media.commandRoom.bestScale?.campaignName ?? "Sem campanha de escala",
      detail: report.media.commandRoom.bestScaleSummary ?? report.media.analysis.narrativeBody,
      tone: "info" as const,
      href: buildStudioHref("growth", { surface: "media", mode: "campaigns" }),
    },
    {
      label: "Tráfego",
      title: report.traffic.highlights.topSource?.label ?? "Sem fonte dominante",
      detail: report.traffic.story,
      tone: "info" as const,
      href: buildStudioHref("growth", { surface: "traffic" }),
    },
  ].slice(0, 5);
  const growthMeta = resolveGrowthWorkspaceMeta(context);

  return (
    <V3ModuleChrome
      eyebrow="Crescimento"
      title={growthMeta.title}
      description={growthMeta.description}
      aside={
        <Link className="v3-primary-link" href={growthMeta.actionHref}>
          {growthMeta.actionLabel}
        </Link>
      }
    >
      <MetricRibbon metrics={buildGrowthMetrics(report)} />
      {growthMeta.banner ? (
        <div className="v3-note">
          <strong>Sinal do recorte</strong>
          <p>{growthMeta.banner}</p>
        </div>
      ) : null}

      <section className="v3-command-grid">
        <div className="v3-panel v3-brief-panel">
          <span>O que mais pesa</span>
          <h2>{report.overview.headline}</h2>
          <p>{report.overview.summary}</p>
          <FocusList items={focus.length ? focus : makeModuleFallback("growth")} />
        </div>
        <div className="v3-panel v3-panel-quiet">
          <TrendBars
            title="Receita e gasto"
            items={report.overview.trend.slice(-6).map((point) => ({
              label: point.date,
              value: point.purchaseRevenue - point.spend,
              detail: `Sessões ${integerFormatter.format(point.sessions)}`,
              tone: point.purchaseRevenue >= point.spend ? "good" : "warn",
            }))}
          />
        </div>
      </section>

      <section className="v3-panel v3-panel-quiet">
        <div className="v3-panel-heading">
          <span>Painel de aquisição</span>
          <strong>{report.context.brandName}</strong>
        </div>
        <WorkspaceTabs active={activeTab} tabs={getStudioWorkspaceTabs("growth", context)} />
        {activeTab === "media" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>
                  {context.mode === "campaigns"
                    ? "Campanhas em foco"
                    : context.mode === "radar"
                      ? "Curva e gasto em foco"
                      : "Campanhas em foco"}
                </span>
              </div>
              {context.mode === "radar" ? (
                <TrendBars
                  title="Receita e gasto"
                  items={report.overview.trend.slice(-6).map((point) => ({
                    label: point.date,
                    value: point.purchaseRevenue - point.spend,
                    detail: `Sessões ${integerFormatter.format(point.sessions)}`,
                    tone: point.purchaseRevenue >= point.spend ? "good" : "warn",
                  }))}
                />
              ) : null}
              <div className="v3-data-list">
                {report.media.campaigns.length ? (
                  report.media.campaigns.slice(0, 8).map((campaign) => (
                    <Link
                      key={campaign.campaignName}
                      href={buildStudioHref("growth", { surface: "media", mode: "campaigns" })}
                    >
                      <span>{campaign.campaignName}</span>
                      <strong>{currencyFormatter.format(campaign.spend)}</strong>
                      <small>{campaign.roas.toFixed(2)}x ROAS</small>
                    </Link>
                  ))
                ) : (
                  <InlineEmpty
                    title="Sem campanhas no recorte"
                    description="A mídia volta a ocupar esta área assim que houver campanha consolidada para o período."
                  />
                )}
              </div>
            </div>
            <div className="v3-section-stack">
              <FocusList
                items={[
                  {
                    label: "Escala",
                    title: report.media.commandRoom.bestScale?.campaignName ?? "Sem campanha líder",
                    detail:
                      report.media.commandRoom.bestScaleSummary ?? report.media.analysis.narrativeBody,
                    href: buildStudioHref("growth", { surface: "media", mode: "campaigns" }),
                    tone: "good",
                  },
                  {
                    label: "Revisão",
                    title:
                      report.media.commandRoom.priorityReview?.campaignName ??
                      "Sem campanha crítica",
                    detail:
                      report.media.commandRoom.priorityReviewSummary ??
                      report.media.analysis.topRisk ??
                      "Sem revisão prioritária sinalizada.",
                    href: buildStudioHref("growth", { surface: "media", mode: "campaigns" }),
                    tone: "warn",
                  },
                ]}
              />
              <FocusList
                items={Object.entries(report.media.signals).map(([key, signal]) => ({
                  label: key,
                  title: signal.title,
                  detail: signal.description,
                  tone:
                    signal.tone === "positive"
                      ? "good"
                      : signal.tone === "warning"
                        ? "warn"
                        : "info",
                }))}
              />
            </div>
          </div>
        ) : null}
        {activeTab === "traffic" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Gargalos do tráfego</span>
              </div>
              <FocusList
                items={[
                  report.traffic.highlights.topSource
                    ? {
                        label: "Fonte",
                        title: report.traffic.highlights.topSource.label,
                        detail:
                          report.traffic.highlights.topSource.summary ?? report.traffic.story,
                        href: buildStudioHref("growth", { surface: "traffic" }),
                        tone: "info" as const,
                      }
                    : null,
                  report.traffic.highlights.topCampaign
                    ? {
                        label: "Campanha",
                        title: report.traffic.highlights.topCampaign.label,
                        detail:
                          report.traffic.highlights.topCampaign.summary ?? report.traffic.frictionSignal,
                        href: buildStudioHref("growth", { surface: "traffic" }),
                        tone: "info" as const,
                      }
                    : null,
                  report.traffic.highlights.topLanding
                    ? {
                        label: "Landing",
                        title: report.traffic.highlights.topLanding.label,
                        detail:
                          report.traffic.highlights.topLanding.summary ?? report.traffic.story,
                        href: buildStudioHref("growth", { surface: "traffic" }),
                        tone: "warn" as const,
                      }
                    : null,
                ].filter(Boolean) as StudioFocusItem[]}
              />
            </div>
            <div className="v3-section-stack">
              <TrendBars
                title="Eficiência do funil"
                items={[
                  {
                    label: "Sessão → carrinho",
                    value: report.traffic.summary.sessionToCartRate,
                    detail: report.traffic.signals.sessionToCartRate.description,
                    tone:
                      report.traffic.signals.sessionToCartRate.tone === "positive"
                        ? "good"
                        : report.traffic.signals.sessionToCartRate.tone === "warning"
                          ? "warn"
                          : "info",
                  },
                  {
                    label: "Checkout",
                    value: report.traffic.summary.checkoutRate,
                    detail: report.traffic.signals.checkoutRate.description,
                    tone:
                      report.traffic.signals.checkoutRate.tone === "positive"
                        ? "good"
                        : report.traffic.signals.checkoutRate.tone === "warning"
                          ? "warn"
                          : "info",
                  },
                  {
                    label: "Compra",
                    value: report.traffic.summary.purchaseRate,
                    detail: report.traffic.signals.purchaseRate.description,
                    tone:
                      report.traffic.signals.purchaseRate.tone === "positive"
                        ? "good"
                        : report.traffic.signals.purchaseRate.tone === "warning"
                          ? "warn"
                          : "info",
                  },
                ]}
                formatValue={(value) => percentFormatter.format(value)}
              />
              <div className="v3-note">
                <strong>Fricção em leitura</strong>
                <p>{report.traffic.frictionSignal}</p>
              </div>
            </div>
          </div>
        ) : null}
        {activeTab === "evidence" ? (
          <StudioEvidenceSection
            queue={
              <ExecutiveQueueBoard
                brandId={report.context.brandId}
                from={report.context.from}
                to={report.context.to}
                actions={report.priorities}
                fallbackModule="growth"
              />
            }
            sources={report.sourceHealth}
            links={report.evidenceLinks}
          />
        ) : null}
      </section>
    </V3ModuleChrome>
  );
}

