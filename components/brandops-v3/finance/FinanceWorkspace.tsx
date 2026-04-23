"use client";

import Link from "next/link";
import { V3ModuleChrome } from "../BrandOpsShellV3";
import { ExecutiveQueueBoard, FocusList, MetricRibbon, TrendBars, WorkspaceTabs } from "../StudioPrimitives";
import { StudioEvidenceSection } from "../shared/StudioEvidenceSection";
import { FinanceDreTab } from "./FinanceDreTab";
import { FinanceLedger } from "./FinanceLedger";
import { FinanceOperationsPrimary, FinanceOperationsSecondary } from "./FinanceOperationsPanels";
import { FinanceOperationsTab } from "./FinanceOperationsTab";
import { FinanceOverviewPanel } from "./FinanceOverviewPanel";
import { FinancePlaybookPanel, FinanceSalesPanel } from "./FinanceSalesPanels";
import { FinanceSalesTab } from "./FinanceSalesTab";
import { getFinanceWorkspaceMeta } from "./getFinanceWorkspaceMeta";
import {
  buildFinanceMetrics,
  getStudioWorkspaceTabs,
  mapActionsToFocus,
  type FinanceStudioSurface,
  type StudioFocusItem,
  type StudioModuleContext,
} from "@/lib/brandops-v3/view-models";
import { currencyFormatter } from "@/lib/brandops/format";
import type { FinanceHubReport } from "@/lib/brandops/types";

function mapManagementToneToFocusTone(tone: string): StudioFocusItem["tone"] {
  if (tone === "negative") return "bad";
  if (tone === "warning") return "warn";
  if (tone === "positive") return "good";
  return "info";
}

export function FinanceWorkspace({
  report,
  context,
}: {
  report: FinanceHubReport;
  context: StudioModuleContext;
}) {
  const requestedSurface = context.surface as FinanceStudioSurface;
  const activeTab: FinanceStudioSurface =
    requestedSurface === "sales" ||
    requestedSurface === "operations" ||
    requestedSurface === "evidence"
      ? requestedSurface
      : "dre";
  const topProducts = report.sales.topProducts.slice(0, 6);
  const financeMeta = getFinanceWorkspaceMeta(requestedSurface, context);

  return (
    <V3ModuleChrome
      eyebrow="Finanças"
      title={financeMeta.title}
      description={financeMeta.description}
      aside={
        <Link className="v3-primary-link" href={financeMeta.actionHref}>
          {financeMeta.actionLabel}
        </Link>
      }
    >
      <MetricRibbon metrics={buildFinanceMetrics(report)} />
      {financeMeta.banner ? (
        <div className="v3-note">
          <strong>Sinal do recorte</strong>
          <p>{financeMeta.banner}</p>
        </div>
      ) : null}

      <FinanceOverviewPanel
        headline={report.overview.headline}
        summary={report.overview.summary}
        brandName={report.context.brandName}
        focus={
          <FocusList
            items={[
              ...report.overview.drivers.map((item) => ({
                label: item.label,
                title: item.value,
                detail: item.summary,
                href: item.href,
                tone: mapManagementToneToFocusTone(item.tone),
              })),
              ...mapActionsToFocus(report.priorities),
            ].slice(0, 5)}
          />
        }
        trend={
          <TrendBars
            title="Resultado por competência"
            items={report.financial.months.slice(-6).map((month) => ({
              label: month.label,
              value: month.metrics.netResult,
              detail: `RLD ${currencyFormatter.format(month.metrics.rld)}`,
              tone: month.metrics.netResult >= 0 ? "good" : "bad",
            }))}
          />
        }
      />

      <section className="v3-panel v3-panel-quiet">
        <div className="v3-panel-heading">
          <span>Painel financeiro</span>
          <strong>{report.financial.months.length} competências</strong>
        </div>
        <WorkspaceTabs active={activeTab} tabs={getStudioWorkspaceTabs("finance", context)} />
        {activeTab === "dre" ? (
          <FinanceDreTab
            ledger={<FinanceLedger report={report} />}
            queue={
              <ExecutiveQueueBoard
                brandId={report.context.brandId}
                from={report.context.from}
                to={report.context.to}
                actions={report.priorities}
                fallbackModule="finance"
              />
            }
          />
        ) : null}
        {activeTab === "operations" ? (
          <FinanceOperationsTab
            primary={<FinanceOperationsPrimary report={report} context={context} />}
            secondary={
              <FinanceOperationsSecondary
                report={report}
                topProductName={topProducts[0]?.productName}
                topProductRevenue={topProducts[0]?.grossRevenue}
              />
            }
          />
        ) : null}
        {activeTab === "sales" ? (
          <FinanceSalesTab
            sales={<FinanceSalesPanel topProducts={topProducts} />}
            playbook={<FinancePlaybookPanel report={report} />}
          />
        ) : null}
        {activeTab === "evidence" ? (
          <StudioEvidenceSection sources={report.sourceHealth} links={report.evidenceLinks} />
        ) : null}
      </section>
    </V3ModuleChrome>
  );
}
