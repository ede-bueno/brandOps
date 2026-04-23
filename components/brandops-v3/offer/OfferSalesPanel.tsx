"use client";

import Link from "next/link";
import { FocusList, InlineEmpty } from "../StudioPrimitives";
import { buildStudioHref } from "@/lib/brandops-v3/view-models";
import { currencyFormatter, integerFormatter } from "@/lib/brandops/format";
import type { OfferHubReport } from "@/lib/brandops/types";

export function OfferSalesPanel({ report }: { report: OfferHubReport }) {
  return (
    <div className="v3-section-grid">
      <div className="v3-panel-body">
        <div className="v3-subsection-head">
          <span>Receita que puxa o recorte</span>
        </div>
        <div className="v3-data-list">
          {report.sales.topProducts.length ? (
            report.sales.topProducts.slice(0, 8).map((product) => (
              <Link key={product.productKey} href={buildStudioHref("offer", { surface: "sales" })}>
                <span>{product.productName}</span>
                <strong>{currencyFormatter.format(product.grossRevenue)}</strong>
                <small>{integerFormatter.format(product.quantity)} itens</small>
              </Link>
            ))
          ) : (
            <InlineEmpty
              title="Sem receita consolidada"
              description="Quando houver venda real no recorte, a leitura comercial aparece aqui."
            />
          )}
        </div>
      </div>
      <div className="v3-panel-body">
        <div className="v3-subsection-head">
          <span>Leitura comercial</span>
        </div>
        <FocusList
          items={report.overview.topProducts.slice(0, 4).map((item) => ({
            label: item.label,
            title: item.value,
            detail: item.summary,
            href: buildStudioHref("offer", { surface: "sales" }),
            tone: "good" as const,
          }))}
        />
      </div>
    </div>
  );
}
