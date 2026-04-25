"use client";

import Link from "next/link";
import { V3ModuleChrome } from "../BrandOpsShellV3";
import {
  ExecutiveQueueBoard,
  FocusList,
  MetricRibbon,
  TrendBars,
} from "../StudioPrimitives";
import { StudioEvidenceSection } from "../shared/StudioEvidenceSection";
import { OfferCatalogPanel } from "./OfferCatalogPanel";
import { OfferProductsPanel } from "./OfferProductsPanel";
import { OfferSalesPanel } from "./OfferSalesPanel";
import { resolveOfferWorkspaceMeta } from "./resolveOfferWorkspaceMeta";
import {
  buildOfferMetrics,
  buildStudioHref,
  mapActionsToFocus,
  type OfferStudioSurface,
  type StudioModuleContext,
} from "@/lib/brandops-v3/view-models";
import type { OfferHubReport } from "@/lib/brandops/types";

export function OfferWorkspace({
  report,
  context,
}: {
  report: OfferHubReport;
  context: StudioModuleContext;
}) {
  const requestedSurface = context.surface as OfferStudioSurface;
  const priorityFocus = mapActionsToFocus(report.priorities);
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
              priorityFocus.length
                ? priorityFocus
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
        {requestedSurface === "overview" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Frentes do módulo</span>
              </div>
              <FocusList
                items={[
                  {
                    label: "Produtos",
                    title: "Abrir decisões do portfólio",
                    detail:
                      "Veja itens que merecem proteção, revisão ou escala sem sair do domínio de oferta.",
                    href: buildStudioHref("offer", { surface: "products" }),
                    tone: "good",
                  },
                  {
                    label: "Radar",
                    title: "Ler momentum dos itens",
                    detail:
                      "Acompanhe quais produtos estão ganhando ou perdendo força no recorte.",
                    href: buildStudioHref("offer", { surface: "products", mode: "radar" }),
                    tone: "warn",
                  },
                  {
                    label: "Vendas",
                    title: "Cruzar receita e unidades",
                    detail:
                      "Valide demanda real e contribuição comercial antes de aumentar o portfólio.",
                    href: buildStudioHref("offer", { surface: "sales" }),
                    tone: "info",
                  },
                  {
                    label: "Catálogo",
                    title: "Revisar cobertura visual",
                    detail:
                      "Abra o catálogo para localizar itens ativos, descobertos e lacunas de feed.",
                    href: buildStudioHref("offer", { surface: "catalog" }),
                    tone: "info",
                  },
                ]}
              />
            </div>
            <div className="v3-panel-body">
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
          </div>
        ) : null}
        {requestedSurface === "products" ? <OfferProductsPanel report={report} context={context} /> : null}
        {requestedSurface === "sales" ? <OfferSalesPanel report={report} /> : null}
        {requestedSurface === "catalog" ? <OfferCatalogPanel report={report} topProducts={topProducts} /> : null}
        {requestedSurface === "evidence" ? (
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
