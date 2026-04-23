"use client";

import { FocusList, TrendBars } from "../StudioPrimitives";
import { buildStudioHref, type StudioFocusItem, type StudioModuleContext } from "@/lib/brandops-v3/view-models";
import { percentFormatter } from "@/lib/brandops/format";
import type { AcquisitionHubReport } from "@/lib/brandops/types";

function mapSignalTone(tone: string) {
  if (tone === "positive") return "good" as const;
  if (tone === "warning") return "warn" as const;
  return "info" as const;
}

export function GrowthTrafficPanel({
  report,
}: {
  report: AcquisitionHubReport;
  context: StudioModuleContext;
}) {
  return (
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
              tone: mapSignalTone(report.traffic.signals.sessionToCartRate.tone),
            },
            {
              label: "Checkout",
              value: report.traffic.summary.checkoutRate,
              detail: report.traffic.signals.checkoutRate.description,
              tone: mapSignalTone(report.traffic.signals.checkoutRate.tone),
            },
            {
              label: "Compra",
              value: report.traffic.summary.purchaseRate,
              detail: report.traffic.signals.purchaseRate.description,
              tone: mapSignalTone(report.traffic.signals.purchaseRate.tone),
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
  );
}
