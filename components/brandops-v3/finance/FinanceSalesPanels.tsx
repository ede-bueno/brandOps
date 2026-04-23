"use client";

import Link from "next/link";
import { FocusList, InlineEmpty } from "../StudioPrimitives";
import { buildStudioHref } from "@/lib/brandops-v3/view-models";
import { currencyFormatter, integerFormatter } from "@/lib/brandops/format";
import type { FinanceHubReport } from "@/lib/brandops/types";

export function FinanceSalesPanel({
  topProducts,
}: {
  topProducts: FinanceHubReport["sales"]["topProducts"];
}) {
  return (
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
  );
}

export function FinancePlaybookPanel({
  report,
}: {
  report: FinanceHubReport;
}) {
  return (
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
  );
}
