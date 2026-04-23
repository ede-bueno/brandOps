"use client";

import Image from "next/image";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { FocusList, InlineEmpty } from "../StudioPrimitives";
import { buildStudioHref } from "@/lib/brandops-v3/view-models";
import { integerFormatter } from "@/lib/brandops/format";
import type { OfferHubReport } from "@/lib/brandops/types";

export function OfferCatalogPanel({
  report,
  topProducts,
}: {
  report: OfferHubReport;
  topProducts: OfferHubReport["catalog"]["highlights"]["topSellers"];
}) {
  return (
    <div className="v3-section-grid">
      <div className="v3-panel-body">
        <div className="v3-subsection-head">
          <span>Produtos em operação</span>
        </div>
        <div className="v3-product-strip">
          {topProducts.length ? (
            topProducts.slice(0, 6).map((product) => (
              <Link key={product.id} href={buildStudioHref("offer", { surface: "catalog" })}>
                {product.imageUrl ? (
                  <Image src={product.imageUrl} alt="" width={96} height={96} unoptimized />
                ) : (
                  <PackageSearch size={22} />
                )}
                <span>{product.title}</span>
                <small>{integerFormatter.format(product.unitsSold)} unidades</small>
              </Link>
            ))
          ) : (
            <InlineEmpty
              title="Catálogo sem itens destacados"
              description="Assim que houver catálogo e venda no recorte, os produtos ativos aparecem aqui."
            />
          )}
        </div>
      </div>
      <div className="v3-panel-body">
        <div className="v3-subsection-head">
          <span>Cobertura do catálogo</span>
        </div>
        <FocusList
          items={report.catalog.highlights.uncovered.slice(0, 4).map((product) => ({
            label: product.productType ?? "Sem tipo",
            title: product.title,
            detail: `${product.galleryCount} imagem(ns) e ${integerFormatter.format(product.unitsSold)} unidade(s).`,
            href: buildStudioHref("offer", { surface: "catalog" }),
            tone: "warn" as const,
          }))}
        />
      </div>
    </div>
  );
}
