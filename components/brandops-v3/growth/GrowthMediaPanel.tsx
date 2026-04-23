"use client";

import Link from "next/link";
import { FocusList, InlineEmpty, TrendBars } from "../StudioPrimitives";
import { buildStudioHref } from "@/lib/brandops-v3/view-models";
import { currencyFormatter, integerFormatter } from "@/lib/brandops/format";
import type { AcquisitionHubReport } from "@/lib/brandops/types";
import type { StudioModuleContext } from "@/lib/brandops-v3/view-models";

function mapSignalTone(tone: string) {
  if (tone === "positive") return "good" as const;
  if (tone === "warning") return "warn" as const;
  return "info" as const;
}

export function GrowthMediaPanel({
  report,
  context,
}: {
  report: AcquisitionHubReport;
  context: StudioModuleContext;
}) {
  return (
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
                report.media.commandRoom.priorityReview?.campaignName ?? "Sem campanha crítica",
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
            tone: mapSignalTone(signal.tone),
          }))}
        />
      </div>
    </div>
  );
}
