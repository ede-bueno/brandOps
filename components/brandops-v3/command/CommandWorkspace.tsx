"use client";

import { V3ModuleChrome } from "../BrandOpsShellV3";
import {
  EvidenceList,
  ExecutiveQueueBoard,
  FocusList,
  MetricRibbon,
  SourceHealth,
  TrendBars,
  WorkspaceTabs,
} from "../StudioPrimitives";
import {
  buildCommandMetrics,
  getStudioWorkspaceTabs,
  makeModuleFallback,
  mapActionsToFocus,
  type StudioFocusItem,
  type StudioModuleContext,
} from "@/lib/brandops-v3/view-models";
import { currencyFormatter } from "@/lib/brandops/format";
import type { ManagementSnapshotV2 } from "@/lib/brandops/types";

function mapManagementToneToFocusTone(tone: string): StudioFocusItem["tone"] {
  if (tone === "negative") return "bad";
  if (tone === "warning") return "warn";
  if (tone === "positive") return "good";
  return "info";
}

export function CommandWorkspace({
  snapshot,
  context,
}: {
  snapshot: ManagementSnapshotV2;
  context: StudioModuleContext;
}) {
  const requestedTab = context.tab;
  const activeTab =
    requestedTab === "drivers" || requestedTab === "sources" ? requestedTab : "decisions";
  const metrics = buildCommandMetrics(snapshot);
  const focus = mapActionsToFocus(snapshot.decisionQueue);
  const driverItems = [
    {
      label: "Caixa",
      title: snapshot.cashDrivers.headline,
      detail: snapshot.cashDrivers.summary,
      href: "/studio/finance",
      tone: "warn" as const,
    },
    {
      label: "Aquisição",
      title: snapshot.acquisitionSnapshot.headline,
      detail: snapshot.acquisitionSnapshot.summary,
      href: "/studio/growth",
      tone: "info" as const,
    },
    {
      label: "Oferta",
      title: snapshot.offerSnapshot.headline,
      detail: snapshot.offerSnapshot.summary,
      href: "/studio/offer",
      tone: "good" as const,
    },
    ...snapshot.operationalRisks.items.slice(0, 1).map((risk) => ({
      label: "Risco",
      title: risk.title,
      detail: risk.summary,
      href: risk.href,
      tone: "bad" as const,
    })),
  ];

  return (
    <V3ModuleChrome
      eyebrow="Comando"
      title={snapshot.executiveStatus.title}
      description={snapshot.executiveStatus.summary}
      aside={
        <div className="v3-confidence">
          <span>Confiança</span>
          <strong>{snapshot.context.confidenceLabel}</strong>
        </div>
      }
    >
      <MetricRibbon metrics={metrics} />

      <section className="v3-command-grid">
        <div className="v3-panel v3-brief-panel">
          <span>Brief operacional</span>
          <h2>{snapshot.executiveStatus.highlight}</h2>
          <p>{snapshot.executiveStatus.nextMove}</p>
          <FocusList items={focus.length ? focus : makeModuleFallback("command")} />
        </div>
        <div className="v3-panel v3-panel-quiet">
          <div className="v3-panel-heading">
            <span>Plano dominante</span>
            <strong>{snapshot.cashDrivers.dominantMetric.label}</strong>
          </div>
          <div className="v3-panel-body">
            <div className="v3-copy-block">
              <strong>{snapshot.cashDrivers.dominantMetric.value}</strong>
              <p>{snapshot.cashDrivers.dominantMetric.description}</p>
            </div>
            <FocusList items={driverItems.slice(0, 4)} />
          </div>
        </div>
      </section>

      <section className="v3-panel">
        <div className="v3-panel-heading">
          <span>Decisões Atlas</span>
          <strong>{snapshot.context.brandName}</strong>
        </div>
        <WorkspaceTabs active={activeTab} tabs={getStudioWorkspaceTabs("command", context)} />
        {activeTab === "decisions" ? (
          <ExecutiveQueueBoard
            brandId={snapshot.context.brandId}
            from={snapshot.context.from}
            to={snapshot.context.to}
            actions={snapshot.decisionQueue}
            fallbackModule="command"
          />
        ) : null}
        {activeTab === "drivers" ? (
          <div className="v3-section-grid">
            <TrendBars
              title="Caixa e resultado"
              items={snapshot.cashDrivers.trend.map((item) => ({
                label: item.label,
                value: item.netResult,
                detail: `Pós-mídia ${currencyFormatter.format(item.contributionAfterMedia)}`,
                tone: item.netResult >= 0 ? "good" : "bad",
              }))}
            />
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Leituras reconciliadas</span>
              </div>
              <FocusList
                items={[
                  ...snapshot.cashDrivers.drivers.map((item) => ({
                    label: item.label,
                    title: item.value,
                    detail: item.summary,
                    href: item.href,
                    tone: mapManagementToneToFocusTone(item.tone),
                  })),
                  ...snapshot.acquisitionSnapshot.drivers.slice(0, 2).map((item) => ({
                    label: item.label,
                    title: item.value,
                    detail: item.summary,
                    href: item.href,
                    tone: "info" as const,
                  })),
                  ...snapshot.offerSnapshot.drivers.slice(0, 2).map((item) => ({
                    label: item.label,
                    title: item.value,
                    detail: item.summary,
                    href: item.href,
                    tone: "good" as const,
                  })),
                ].slice(0, 6)}
              />
            </div>
          </div>
        ) : null}
        {activeTab === "sources" ? (
          <div className="v3-section-stack">
            <SourceHealth sources={snapshot.sourceHealth} />
            <EvidenceList links={snapshot.evidenceLinks} />
          </div>
        ) : null}
      </section>
    </V3ModuleChrome>
  );
}

