"use client";

import Image from "next/image";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { V3ModuleChrome } from "../BrandOpsShellV3";
import {
  ExecutiveQueueBoard,
  FocusList,
  InlineEmpty,
  MetricRibbon,
  TrendBars,
  WorkspaceTabs,
} from "../StudioPrimitives";
import { StudioEvidenceSection } from "../shared/StudioEvidenceSection";
import { resolveOfferWorkspaceMeta } from "./resolveOfferWorkspaceMeta";
import {
  buildOfferMetrics,
  buildStudioHref,
  getStudioWorkspaceTabs,
  mapActionsToFocus,
  type OfferStudioSurface,
  type StudioModuleContext,
} from "@/lib/brandops-v3/view-models";
import { currencyFormatter, integerFormatter } from "@/lib/brandops/format";
import type { OfferHubReport } from "@/lib/brandops/types";

export function OfferWorkspace({
  report,
  context,
}: {
  report: OfferHubReport;
  context: StudioModuleContext;
}) {
  const requestedSurface = context.surface as OfferStudioSurface;
  const activeTab: OfferStudioSurface =
    requestedSurface === "sales" ||
    requestedSurface === "catalog" ||
    requestedSurface === "evidence"
      ? requestedSurface
      : "products";
  const topProducts = report.catalog.highlights.topSellers.length
    ? report.catalog.highlights.topSellers
    : report.catalog.rows.slice(0, 6);
  const offerMeta = resolveOfferWorkspaceMeta(context);

  return (
    <V3ModuleChrome
      eyebrow="Oferta"
      title={offerMeta.title}
      description={offerMeta.description}
      aside={
        <Link className="v3-primary-link" href={offerMeta.actionHref}>
          {offerMeta.actionLabel}
        </Link>
      }
    >
      <MetricRibbon metrics={buildOfferMetrics(report)} />
      {offerMeta.banner ? (
        <div className="v3-note">
          <strong>Sinal do recorte</strong>
          <p>{offerMeta.banner}</p>
        </div>
      ) : null}

      <section className="v3-command-grid">
        <div className="v3-panel v3-brief-panel">
          <span>O que mais pesa</span>
          <h2>{report.productInsights.hero.title}</h2>
          <p>{report.productInsights.hero.description}</p>
          <FocusList
            items={
              mapActionsToFocus(report.priorities).length
                ? mapActionsToFocus(report.priorities)
                : report.productInsights.featured.slice(0, 4).map((product) => ({
                    label: product.productType,
                    title: product.decisionTitle,
                    detail: product.decisionSummary,
                    href: buildStudioHref("offer", { surface: "products" }),
                    tone: "info" as const,
                  }))
            }
          />
        </div>
        <div className="v3-panel v3-panel-quiet">
          <TrendBars
            title="Produtos em destaque"
            items={report.overview.topProducts.slice(0, 5).map((item) => ({
              label: item.label,
              value:
                Number(item.value.replace(/[^\d,-]/g, "").replace(/\./g, "").replace(",", ".")) || 0,
              detail: item.summary,
              tone: "good" as const,
            }))}
          />
        </div>
      </section>

      <section className="v3-panel v3-panel-quiet">
        <div className="v3-panel-heading">
          <span>Painel de oferta</span>
          <strong>{report.context.brandName}</strong>
        </div>
        <WorkspaceTabs active={activeTab} tabs={getStudioWorkspaceTabs("offer", context)} />
        {activeTab === "products" ? (
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
        ) : null}
        {activeTab === "sales" ? (
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
        ) : null}
        {activeTab === "catalog" ? (
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
        ) : null}
        {activeTab === "evidence" ? (
          <StudioEvidenceSection
            queue={
              <ExecutiveQueueBoard
                brandId={report.context.brandId}
                from={report.context.from}
                to={report.context.to}
                actions={report.priorities}
                fallbackModule="offer"
              />
            }
            sources={report.sourceHealth}
            links={report.evidenceLinks}
          />
        ) : null}
      </section>
    </V3ModuleChrome>
  );
}

