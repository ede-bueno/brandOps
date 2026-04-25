"use client";

import Link from "next/link";
import { V3ModuleChrome } from "../BrandOpsShellV3";
import {
  ExecutiveQueueBoard,
  FocusList,
  MetricRibbon,
  TrendBars,
} from "../StudioPrimitives";
import { StudioEvidenceSection } from "../shared/StudioEvidenceSection";
import { GrowthMediaPanel } from "./GrowthMediaPanel";
import { GrowthTrafficPanel } from "./GrowthTrafficPanel";
import { resolveGrowthWorkspaceMeta } from "./resolveGrowthWorkspaceMeta";
import {
  buildGrowthMetrics,
  buildStudioHref,
  makeModuleFallback,
  mapActionsToFocus,
  type GrowthStudioSurface,
  type StudioModuleContext,
} from "@/lib/brandops-v3/view-models";
import { integerFormatter } from "@/lib/brandops/format";
import type { AcquisitionHubReport } from "@/lib/brandops/types";

export function GrowthWorkspace({
  report,
  context,
}: {
  report: AcquisitionHubReport;
  context: StudioModuleContext;
}) {
  const requestedSurface = context.surface as GrowthStudioSurface;
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
        {requestedSurface === "overview" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Frentes do módulo</span>
              </div>
              <FocusList
                items={[
                  {
                    label: "Mídia",
                    title: "Abrir leitura de mídia",
                    detail:
                      "Acompanhe investimento, verba dominante e sinais por campanha no recorte.",
                    href: buildStudioHref("growth", { surface: "media" }),
                    tone: "info",
                  },
                  {
                    label: "Campanhas",
                    title: "Priorizar ativos e verba",
                    detail:
                      "Use a camada de campanhas para encontrar onde existe espaço real de escala ou revisão.",
                    href: buildStudioHref("growth", { surface: "media", mode: "campaigns" }),
                    tone: "good",
                  },
                  {
                    label: "Radar",
                    title: "Ler pressão diária",
                    detail:
                      "Abra o radar para acompanhar a curva de eficiência e resposta do período.",
                    href: buildStudioHref("growth", { surface: "media", mode: "radar" }),
                    tone: "warn",
                  },
                  {
                    label: "Tráfego",
                    title: "Localizar gargalos do funil",
                    detail:
                      "Cruze origem, sessões e conversão antes de escalar qualquer campanha.",
                    href: buildStudioHref("growth", { surface: "traffic" }),
                    tone: "info",
                  },
                ]}
              />
            </div>
            <div className="v3-panel-body">
              <TrendBars
                title="Pulso do recorte"
                items={report.overview.trend.slice(-6).map((point) => ({
                  label: point.date,
                  value: point.purchaseRevenue - point.spend,
                  detail: `Sessões ${integerFormatter.format(point.sessions)}`,
                  tone: point.purchaseRevenue >= point.spend ? "good" : "warn",
                }))}
              />
            </div>
          </div>
        ) : null}
        {requestedSurface === "media" ? <GrowthMediaPanel report={report} context={context} /> : null}
        {requestedSurface === "traffic" ? <GrowthTrafficPanel report={report} context={context} /> : null}
        {requestedSurface === "evidence" ? (
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
