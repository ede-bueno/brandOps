"use client";

import Link from "next/link";
import { V3ModuleChrome } from "../BrandOpsShellV3";
import { ExecutiveQueueBoard, FocusList, InlineEmpty, MetricRibbon, TrendBars, WorkspaceTabs } from "../StudioPrimitives";
import { StudioEvidenceSection } from "../shared/StudioEvidenceSection";
import { FinanceDreTab } from "./FinanceDreTab";
import { FinanceLedger } from "./FinanceLedger";
import { FinanceOperationsTab } from "./FinanceOperationsTab";
import { FinanceOverviewPanel } from "./FinanceOverviewPanel";
import { FinanceSalesTab } from "./FinanceSalesTab";
import { getFinanceWorkspaceMeta } from "./getFinanceWorkspaceMeta";
import {
  buildStudioHref,
  buildFinanceMetrics,
  getStudioWorkspaceTabs,
  mapActionsToFocus,
  type FinanceStudioSurface,
  type StudioFocusItem,
  type StudioModuleContext,
} from "@/lib/brandops-v3/view-models";
import { currencyFormatter, integerFormatter } from "@/lib/brandops/format";
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
            primary={
              <div className="v3-panel-body">
                <div className="v3-subsection-head">
                  <span>{context.focus === "cmv" ? "Custos e CMV" : "Rotina financeira"}</span>
                </div>
                <FocusList
                  items={[
                    {
                      label: "Lançamentos",
                      title: "Registrar competência, categoria e despesa",
                      detail:
                        "Registre despesas e categorias sem sair da leitura financeira do recorte.",
                      href: buildStudioHref("finance", { surface: "operations" }),
                      tone: "info",
                    },
                    {
                      label: "CMV",
                      title: currencyFormatter.format(report.financial.total.cmvTotal),
                      detail:
                        "Valide o custo dos itens vendidos e a pressão do recorte antes de escalar mídia ou catálogo.",
                      href: buildStudioHref("finance", { surface: "operations", focus: "cmv" }),
                      tone: "warn",
                    },
                    {
                      label: "Fechamento",
                      title: `${report.financial.months.length} competências reconciliadas`,
                      detail: "Volte ao DRE para consolidar leitura e decisões do período.",
                      href: buildStudioHref("finance", { surface: "dre" }),
                      tone: "good",
                    },
                  ]}
                />
              </div>
            }
            secondary={
              <div className="v3-panel-body">
                <div className="v3-subsection-head">
                  <span>Prioridades do Atlas</span>
                </div>
                <FocusList
                  items={[
                    ...mapActionsToFocus(report.priorities),
                    {
                      label: "Produto com maior custo",
                      title: topProducts[0]?.productName ?? "Sem item dominante",
                      detail: topProducts[0]
                        ? `${currencyFormatter.format(topProducts[0].grossRevenue)} em venda real no recorte.`
                        : "Quando houver venda consolidada, o BrandOps destaca o item que mais sustenta caixa.",
                      href: buildStudioHref("offer", { surface: "sales" }),
                      tone: "info" as const,
                    },
                  ].slice(0, 4)}
                />
              </div>
            }
          />
        ) : null}
        {activeTab === "sales" ? (
          <FinanceSalesTab
            sales={
              <div className="v3-panel-body">
                <div className="v3-subsection-head">
                  <span>Produtos que sustentam caixa</span>
                </div>
                <div className="v3-data-list">
                  {topProducts.length ? (
                    topProducts.map((product) => (
                      <Link key={product.productKey} href={buildStudioHref("offer", { surface: "sales" })}>
                        <span>{product.productName}</span>
                        <strong>{currencyFormatter.format(product.grossRevenue)}</strong>
                        <small>{integerFormatter.format(product.quantity)} itens</small>
                      </Link>
                    ))
                  ) : (
                    <InlineEmpty
                      title="Sem venda dominante"
                      description="Quando o recorte tiver venda consolidada, os itens líderes aparecem aqui."
                    />
                  )}
                </div>
              </div>
            }
            playbook={
              <div className="v3-panel-body">
                <div className="v3-subsection-head">
                  <span>Playbook de venda</span>
                </div>
                <FocusList
                  items={[
                    {
                      label: report.sales.playbook.protect.title,
                      title: `${report.sales.playbook.protect.count} itens para proteger`,
                      detail: report.sales.playbook.protect.description,
                      href: buildStudioHref("offer", { surface: "sales" }),
                      tone: "warn",
                    },
                    {
                      label: report.sales.playbook.grow.title,
                      title: `${report.sales.playbook.grow.count} itens para crescer`,
                      detail: report.sales.playbook.grow.description,
                      href: buildStudioHref("offer", { surface: "sales" }),
                      tone: "good",
                    },
                    {
                      label: report.sales.playbook.review.title,
                      title: `${report.sales.playbook.review.count} itens para revisar`,
                      detail: report.sales.playbook.review.description,
                      href: buildStudioHref("offer", { surface: "sales" }),
                      tone: "info",
                    },
                  ]}
                />
              </div>
            }
          />
        ) : null}
        {activeTab === "evidence" ? (
          <StudioEvidenceSection sources={report.sourceHealth} links={report.evidenceLinks} />
        ) : null}
      </section>
    </V3ModuleChrome>
  );
}
