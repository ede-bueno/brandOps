"use client";

import { FocusList } from "../StudioPrimitives";
import { buildStudioHref, mapActionsToFocus, type StudioModuleContext } from "@/lib/brandops-v3/view-models";
import { currencyFormatter } from "@/lib/brandops/format";
import type { FinanceHubReport } from "@/lib/brandops/types";

export function FinanceOperationsPrimary({
  report,
  context,
}: {
  report: FinanceHubReport;
  context: StudioModuleContext;
}) {
  return (
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
  );
}

export function FinanceOperationsSecondary({
  report,
  topProductName,
  topProductRevenue,
}: {
  report: FinanceHubReport;
  topProductName?: string;
  topProductRevenue?: number;
}) {
  return (
    <div className="v3-panel-body">
      <div className="v3-subsection-head">
        <span>Prioridades do Atlas</span>
      </div>
      <FocusList
        items={[
          ...mapActionsToFocus(report.priorities),
          {
            label: "Produto com maior custo",
            title: topProductName ?? "Sem item dominante",
            detail: topProductRevenue
              ? `${currencyFormatter.format(topProductRevenue)} em venda real no recorte.`
              : "Quando houver venda consolidada, o BrandOps destaca o item que mais sustenta caixa.",
            href: buildStudioHref("offer", { surface: "sales" }),
            tone: "info" as const,
          },
        ].slice(0, 4)}
      />
    </div>
  );
}
