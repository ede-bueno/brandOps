"use client";

import { FocusList } from "../StudioPrimitives";
import { buildStudioHref } from "@/lib/brandops-v3/view-models";
import type { OfferHubReport } from "@/lib/brandops/types";
import type { StudioModuleContext } from "@/lib/brandops-v3/view-models";

export function OfferProductsPanel({
  report,
  context,
}: {
  report: OfferHubReport;
  context: StudioModuleContext;
}) {
  return (
    <div className="v3-section-grid">
      <div className="v3-panel-body">
        <div className="v3-subsection-head">
          <span>{context.mode === "radar" ? "Radar de momentum" : "Playbook Atlas"}</span>
        </div>
        <FocusList
          items={report.productInsights.playbook.slice(0, 4).map((group) => ({
            label: group.title,
            title: `${group.count} decisões`,
            detail: group.description,
            href: buildStudioHref("offer", {
              surface: "products",
              mode: context.mode ?? "executive",
            }),
            tone:
              group.decision === "scale_now"
                ? "good"
                : group.decision === "review_listing"
                  ? "warn"
                  : "info",
          }))}
        />
      </div>
      <div className="v3-panel-body">
        <div className="v3-subsection-head">
          <span>Momentum</span>
        </div>
        <FocusList
          items={[
            ...report.productInsights.momentum.gaining.slice(0, 2).map((item) => ({
              label: "Ganhos",
              title: item.decisionTitle,
              detail: item.decisionSummary,
              href: buildStudioHref("offer", { surface: "products", mode: "radar" }),
              tone: "good" as const,
            })),
            ...report.productInsights.momentum.losing.slice(0, 2).map((item) => ({
              label: "Queda",
              title: item.decisionTitle,
              detail: item.decisionSummary,
              href: buildStudioHref("offer", { surface: "products", mode: "radar" }),
              tone: "warn" as const,
            })),
          ]}
        />
      </div>
    </div>
  );
}
