"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CircleAlert, CircleCheck, Database, PackageSearch } from "lucide-react";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  fetchAcquisitionHubReport,
  fetchCommandCenterReport,
  fetchFinanceHubReport,
  fetchOfferHubReport,
} from "@/lib/brandops/database";
import { currencyFormatter, integerFormatter, percentFormatter } from "@/lib/brandops/format";
import type {
  AcquisitionHubReport,
  FinanceHubReport,
  ManagementSnapshotV2,
  OfferHubReport,
} from "@/lib/brandops/types";
import {
  buildStudioHref,
  buildCommandMetrics,
  buildGrowthMetrics,
  buildOfferMetrics,
  buildOpsFocusItems,
  buildOpsMetrics,
  getStudioModuleContext,
  getStudioNavItem,
  getStudioWorkspaceTabs,
  makeModuleFallback,
  mapActionsToFocus,
  type GrowthStudioSurface,
  type OfferStudioSurface,
  type OpsStudioSurface,
  type StudioFocusItem,
  type StudioModuleContext,
  type StudioModule,
} from "@/lib/brandops-v3/view-models";
import { resolveGrowthWorkspaceMeta } from "./growth/resolveGrowthWorkspaceMeta";
import { resolveOfferWorkspaceMeta } from "./offer/resolveOfferWorkspaceMeta";
import { FinanceWorkspace } from "./finance/FinanceWorkspace";
import {
  EvidenceList,
  ExecutiveQueueBoard,
  FocusList,
  InlineEmpty,
  MetricRibbon,
  SourceHealth,
  TrendBars,
  V3LoadingPanel,
  WorkspaceTabs,
} from "./StudioPrimitives";
import { StudioEvidenceSection } from "./shared/StudioEvidenceSection";
import { V3EmptyState, V3ModuleChrome } from "./BrandOpsShellV3";

type StudioReport =
  | ManagementSnapshotV2
  | FinanceHubReport
  | AcquisitionHubReport
  | OfferHubReport
  | null;

type StudioPageSearchParams = Record<string, string | string[] | undefined>;

function mapManagementToneToFocusTone(tone: string): StudioFocusItem["tone"] {
  if (tone === "negative") return "bad";
  if (tone === "warning") return "warn";
  if (tone === "positive") return "good";
  return "info";
}

function getSearchParamValue(
  searchParams: StudioPageSearchParams | undefined,
  key: string,
) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function CommandWorkspace({
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
        <WorkspaceTabs
          active={activeTab}
          tabs={getStudioWorkspaceTabs("command", context)}
        />
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

function GrowthWorkspace({
  report,
  context,
}: {
  report: AcquisitionHubReport;
  context: StudioModuleContext;
}) {
  const requestedSurface = context.surface as GrowthStudioSurface;
  const nextActiveTab: GrowthStudioSurface =
    requestedSurface === "traffic" || requestedSurface === "evidence" ? requestedSurface : "media";
  const activeTab = nextActiveTab;
  const focus = [
    ...mapActionsToFocus(report.priorities),
    {
      label: "Campanha",
      title: report.media.commandRoom.bestScale?.campaignName ?? "Sem campanha de escala",
      detail: report.media.commandRoom.bestScaleSummary ?? report.media.analysis.narrativeBody,
      tone: "info" as const,
      href: buildStudioHref("growth", { surface: "media", mode: "campaigns" }),
    },
    {
      label: "Tráfego",
      title: report.traffic.highlights.topSource?.label ?? "Sem fonte dominante",
      detail: report.traffic.story,
      tone: "info" as const,
      href: buildStudioHref("growth", { surface: "traffic" }),
    },
  ].slice(0, 5);
  const growthMeta = resolveGrowthWorkspaceMeta(context);

  return (
    <V3ModuleChrome
      eyebrow="Crescimento"
      title={growthMeta.title}
      description={growthMeta.description}
      aside={<Link className="v3-primary-link" href={growthMeta.actionHref}>{growthMeta.actionLabel}</Link>}
    >
      <MetricRibbon metrics={buildGrowthMetrics(report)} />
      {growthMeta.banner ? (
        <div className="v3-note">
          <strong>Sinal do recorte</strong>
          <p>{growthMeta.banner}</p>
        </div>
      ) : null}

      <section className="v3-command-grid">
        <div className="v3-panel v3-brief-panel">
          <span>O que mais pesa</span>
          <h2>{report.overview.headline}</h2>
          <p>{report.overview.summary}</p>
          <FocusList items={focus.length ? focus : makeModuleFallback("growth")} />
        </div>
        <div className="v3-panel v3-panel-quiet">
          <TrendBars
            title="Receita e gasto"
            items={report.overview.trend.slice(-6).map((point) => ({
              label: point.date,
              value: point.purchaseRevenue - point.spend,
              detail: `Sessões ${integerFormatter.format(point.sessions)}`,
              tone: point.purchaseRevenue >= point.spend ? "good" : "warn",
            }))}
          />
        </div>
      </section>

      <section className="v3-panel v3-panel-quiet">
        <div className="v3-panel-heading">
            <span>Painel de aquisição</span>
          <strong>{report.context.brandName}</strong>
        </div>
        <WorkspaceTabs
          active={activeTab}
          tabs={getStudioWorkspaceTabs("growth", context)}
        />
        {activeTab === "media" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>
                  {context.mode === "campaigns"
                    ? "Campanhas em foco"
                    : context.mode === "radar"
                      ? "Curva e gasto em foco"
                      : "Campanhas em foco"}
                </span>
              </div>
              {context.mode === "radar" ? (
                <TrendBars
                  title="Receita e gasto"
                  items={report.overview.trend.slice(-6).map((point) => ({
                    label: point.date,
                    value: point.purchaseRevenue - point.spend,
                    detail: `Sessões ${integerFormatter.format(point.sessions)}`,
                    tone: point.purchaseRevenue >= point.spend ? "good" : "warn",
                  }))}
                />
              ) : null}
              <div className="v3-data-list">
                {report.media.campaigns.length ? (
                  report.media.campaigns.slice(0, 8).map((campaign) => (
                    <Link
                      key={campaign.campaignName}
                      href={buildStudioHref("growth", { surface: "media", mode: "campaigns" })}
                    >
                      <span>{campaign.campaignName}</span>
                      <strong>{currencyFormatter.format(campaign.spend)}</strong>
                      <small>{campaign.roas.toFixed(2)}x ROAS</small>
                    </Link>
                  ))
                ) : (
                  <InlineEmpty
                    title="Sem campanhas no recorte"
                    description="A mídia volta a ocupar esta área assim que houver campanha consolidada para o período."
                  />
                )}
              </div>
            </div>
            <div className="v3-section-stack">
              <FocusList
                items={[
                  {
                    label: "Escala",
                    title: report.media.commandRoom.bestScale?.campaignName ?? "Sem campanha líder",
                    detail:
                      report.media.commandRoom.bestScaleSummary ?? report.media.analysis.narrativeBody,
                    href: buildStudioHref("growth", { surface: "media", mode: "campaigns" }),
                    tone: "good",
                  },
                  {
                    label: "Revisão",
                    title:
                      report.media.commandRoom.priorityReview?.campaignName ??
                      "Sem campanha crítica",
                    detail:
                      report.media.commandRoom.priorityReviewSummary ??
                      report.media.analysis.topRisk ??
                      "Sem revisão prioritária sinalizada.",
                    href: buildStudioHref("growth", { surface: "media", mode: "campaigns" }),
                    tone: "warn",
                  },
                ]}
              />
              <FocusList
                items={Object.entries(report.media.signals).map(([key, signal]) => ({
                  label: key,
                  title: signal.title,
                  detail: signal.description,
                  tone:
                    signal.tone === "positive"
                      ? "good"
                      : signal.tone === "warning"
                        ? "warn"
                        : "info",
                }))}
              />
            </div>
          </div>
        ) : null}
        {activeTab === "traffic" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Gargalos do tráfego</span>
              </div>
              <FocusList
                items={[
                  report.traffic.highlights.topSource
                    ? {
                        label: "Fonte",
                        title: report.traffic.highlights.topSource.label,
                        detail:
                          report.traffic.highlights.topSource.summary ?? report.traffic.story,
                        href: buildStudioHref("growth", { surface: "traffic" }),
                        tone: "info" as const,
                      }
                    : null,
                  report.traffic.highlights.topCampaign
                    ? {
                        label: "Campanha",
                        title: report.traffic.highlights.topCampaign.label,
                        detail:
                          report.traffic.highlights.topCampaign.summary ?? report.traffic.frictionSignal,
                        href: buildStudioHref("growth", { surface: "traffic" }),
                        tone: "info" as const,
                      }
                    : null,
                  report.traffic.highlights.topLanding
                    ? {
                        label: "Landing",
                        title: report.traffic.highlights.topLanding.label,
                        detail:
                          report.traffic.highlights.topLanding.summary ?? report.traffic.story,
                        href: buildStudioHref("growth", { surface: "traffic" }),
                        tone: "warn" as const,
                      }
                    : null,
                ].filter(Boolean) as StudioFocusItem[]}
              />
            </div>
            <div className="v3-section-stack">
              <TrendBars
                title="Eficiência do funil"
                items={[
                  {
                    label: "Sessão → carrinho",
                    value: report.traffic.summary.sessionToCartRate,
                    detail: report.traffic.signals.sessionToCartRate.description,
                    tone:
                      report.traffic.signals.sessionToCartRate.tone === "positive"
                        ? "good"
                        : report.traffic.signals.sessionToCartRate.tone === "warning"
                          ? "warn"
                          : "info",
                  },
                  {
                    label: "Checkout",
                    value: report.traffic.summary.checkoutRate,
                    detail: report.traffic.signals.checkoutRate.description,
                    tone:
                      report.traffic.signals.checkoutRate.tone === "positive"
                        ? "good"
                        : report.traffic.signals.checkoutRate.tone === "warning"
                          ? "warn"
                          : "info",
                  },
                  {
                    label: "Compra",
                    value: report.traffic.summary.purchaseRate,
                    detail: report.traffic.signals.purchaseRate.description,
                    tone:
                      report.traffic.signals.purchaseRate.tone === "positive"
                        ? "good"
                        : report.traffic.signals.purchaseRate.tone === "warning"
                          ? "warn"
                          : "info",
                  },
                ]}
                formatValue={(value) => percentFormatter.format(value)}
              />
              <div className="v3-note">
                <strong>Fricção em leitura</strong>
                <p>{report.traffic.frictionSignal}</p>
              </div>
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
                fallbackModule="growth"
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

function OfferWorkspace({
  report,
  context,
}: {
  report: OfferHubReport;
  context: StudioModuleContext;
}) {
  const requestedSurface = context.surface as OfferStudioSurface;
  const nextActiveTab: OfferStudioSurface =
    requestedSurface === "sales" ||
    requestedSurface === "catalog" ||
    requestedSurface === "evidence"
      ? requestedSurface
      : "products";
  const activeTab = nextActiveTab;
  const topProducts = report.catalog.highlights.topSellers.length
    ? report.catalog.highlights.topSellers
    : report.catalog.rows.slice(0, 6);
  const offerMeta = resolveOfferWorkspaceMeta(context);

  return (
    <V3ModuleChrome
      eyebrow="Oferta"
      title={offerMeta.title}
      description={offerMeta.description}
      aside={<Link className="v3-primary-link" href={offerMeta.actionHref}>{offerMeta.actionLabel}</Link>}
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
              value: Number(item.value.replace(/[^\d,-]/g, "").replace(/\./g, "").replace(",", ".")) || 0,
              detail: item.summary,
              tone: "good",
            }))}
          />
        </div>
      </section>

      <section className="v3-panel v3-panel-quiet">
        <div className="v3-panel-heading">
            <span>Painel de oferta</span>
          <strong>{report.context.brandName}</strong>
        </div>
        <WorkspaceTabs
          active={activeTab}
          tabs={getStudioWorkspaceTabs("offer", context)}
        />
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
                  href: buildStudioHref("offer", { surface: "products", mode: context.mode ?? "executive" }),
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
                    <Link
                      key={product.productKey}
                      href={buildStudioHref("offer", { surface: "sales" })}
                    >
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

function OpsWorkspace({ context }: { context: StudioModuleContext }) {
  const requestedSurface = context.surface as OpsStudioSurface;
  const nextActiveTab: OpsStudioSurface =
    requestedSurface === "imports" ||
    requestedSurface === "governance" ||
    requestedSurface === "support"
      ? requestedSurface
      : "integrations";
  const activeTab = nextActiveTab;
  const { activeBrand } = useBrandOps();
  const focus = buildOpsFocusItems(activeBrand);
  const integrations = activeBrand?.integrations ?? [];
  const files = Object.values(activeBrand?.files ?? {}).sort((left, right) =>
    right.lastImportedAt.localeCompare(left.lastImportedAt),
  );
  const featureFlags = Object.entries(activeBrand?.governance.featureFlags ?? {});
  const opsMeta =
    requestedSurface === "imports"
      ? {
          title: "Importação e processamento",
          description:
            "Mantenha as cargas previsíveis e acompanhe arquivos recentes sem sair do módulo operacional.",
          actionLabel: "Abrir integrações",
          actionHref: buildStudioHref("ops", { surface: "integrations" }),
          banner: "Importação em foco: acompanhe cargas recentes, previsibilidade do processamento e próximos arquivos.",
        }
      : requestedSurface === "governance"
        ? {
            title:
              context.focus === "sanitization" ? "Saneamento e revisões" : "Governança operacional",
            description:
              context.focus === "sanitization"
                ? "Acompanhe revisões pendentes e saneamento sem misturar isso com leitura executiva."
                : "Flags, consistência operacional e contexto administrativo reunidos em uma única camada.",
            actionLabel: context.focus === "sanitization" ? "Abrir imports" : "Abrir ajuda",
            actionHref:
              context.focus === "sanitization"
                ? buildStudioHref("ops", { surface: "imports" })
                : buildStudioHref("ops", { surface: "support" }),
            banner:
              context.focus === "sanitization"
                ? "Saneamento em foco: trate pendências e ruído da base antes de confiar na leitura gerencial."
                : "Governança em foco: revise flags, acessos e consistência operacional da marca.",
          }
        : requestedSurface === "support"
          ? {
              title: "Ajuda, tutoriais e administração",
              description:
                "Conhecimento operacional, setup guiado e atalhos administrativos reunidos numa camada discreta.",
              actionLabel: "Abrir integrações",
              actionHref: buildStudioHref("ops", { surface: "integrations" }),
              banner:
                "Suporte em foco: concentre setup guiado, ajuda operacional e administração sem poluir o trabalho principal.",
            }
          : {
              title: "Central operacional",
              description:
                "Imports, saneamento, integrações e governança reunidos para manter a operação previsível.",
              actionLabel: "Importar",
              actionHref: buildStudioHref("ops", { surface: "imports" }),
              banner: null,
            };

  return (
    <V3ModuleChrome
      eyebrow="Operação"
      title={opsMeta.title}
      description={opsMeta.description}
      aside={<Link className="v3-primary-link" href={opsMeta.actionHref}>{opsMeta.actionLabel}</Link>}
    >
      <MetricRibbon metrics={buildOpsMetrics(activeBrand)} />
      {opsMeta.banner ? (
        <div className="v3-note">
          <strong>Sinal do recorte</strong>
          <p>{opsMeta.banner}</p>
        </div>
      ) : null}

      <section className="v3-command-grid">
        <div className="v3-panel v3-brief-panel">
            <span>Estado operacional</span>
            <h2>{activeBrand?.name ?? "Módulo operacional"}</h2>
          <p>
            Use esta área para manter fontes, catálogo e governança previsíveis enquanto a leitura
            executiva continua no Comando.
          </p>
          <FocusList items={focus.length ? focus : makeModuleFallback("ops")} />
        </div>
        <div className="v3-panel v3-panel-quiet">
          <TrendBars
            title="Últimas cargas"
            items={files.slice(0, 5).map((file) => ({
              label: file.kind,
              value: file.totalInserted,
              detail: file.lastImportedAt.slice(0, 10),
              tone: "info",
            }))}
            formatValue={(value) => `${integerFormatter.format(value)} linhas`}
          />
        </div>
      </section>

      <section className="v3-panel v3-panel-quiet">
        <div className="v3-panel-heading">
          <span>Operação da marca</span>
          <strong>{activeBrand?.governance.planTier ?? "starter"}</strong>
        </div>
        <WorkspaceTabs
          active={activeTab}
          tabs={getStudioWorkspaceTabs("ops", context)}
        />
        {activeTab === "integrations" ? (
          <div className="v3-panel-body">
            {context.provider ? (
              <div className="v3-note">
                <strong>Provedor em foco</strong>
                <p>
                  O console foi aberto já com o provedor <strong>{context.provider.toUpperCase()}</strong> em foco.
                </p>
              </div>
            ) : null}
            <div className="v3-ops-grid">
              {integrations.length ? (
                integrations.map((integration) => (
                  <Link
                    key={integration.id}
                    href={buildStudioHref("ops", {
                      surface: "integrations",
                      provider: integration.provider,
                    })}
                    data-status={integration.lastSyncStatus}
                  >
                    {integration.lastSyncStatus === "error" ? (
                      <CircleAlert size={18} />
                    ) : (
                      <CircleCheck size={18} />
                    )}
                    <span>{integration.provider.toUpperCase()}</span>
                    <strong>{integration.mode}</strong>
                    <small>{integration.lastSyncAt?.slice(0, 10) ?? "sem sync"}</small>
                  </Link>
                ))
              ) : (
                <InlineEmpty
                  title="Sem integrações conectadas"
                  description="Conecte Meta, GA4, INK ou feed para ativar a camada operacional."
                />
              )}
            </div>
          </div>
        ) : null}
        {activeTab === "imports" ? (
          <div className="v3-panel-body">
            <div className="v3-data-list">
              {files.length ? (
                files.map((file) => (
                  <Link key={file.kind} href={buildStudioHref("ops", { surface: "imports", focus: file.kind })}>
                    <span>{file.kind}</span>
                    <strong>{integerFormatter.format(file.totalInserted)} linhas</strong>
                    <small>{file.runs[0]?.fileName ?? file.lastImportedAt.slice(0, 10)}</small>
                  </Link>
                ))
              ) : (
                <InlineEmpty
                  title="Nenhum arquivo recente"
                  description="As últimas cargas aparecem aqui assim que a operação começar a importar arquivos."
                />
              )}
            </div>
          </div>
        ) : null}
        {activeTab === "governance" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Flags do módulo</span>
              </div>
              <div className="v3-flag-grid">
                {featureFlags.map(([key, enabled]) => (
                  <article key={key} data-enabled={enabled}>
                    <span>{key}</span>
                    <strong>{enabled ? "Ativo" : "Desligado"}</strong>
                  </article>
                ))}
              </div>
            </div>
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Revisões pendentes</span>
              </div>
              <FocusList items={focus.length ? focus : makeModuleFallback("ops")} />
            </div>
          </div>
        ) : null}
        {activeTab === "support" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Atalhos de conhecimento</span>
              </div>
              <FocusList
                items={[
                  {
                    label: "Tutoriais",
                    title: context.provider
                      ? `Setup ${context.provider.toUpperCase()}`
                      : "Guias de integração",
                    detail:
                      context.provider
                        ? "Abra o passo a passo do provedor já no contexto operacional da marca."
                        : "Centralize onboarding, setup e troubleshooting sem sair do Studio.",
                    href: buildStudioHref("ops", {
                      surface: "support",
                      provider: context.provider ?? undefined,
                    }),
                    tone: "info",
                  },
                  {
                    label: "Ajuda",
                    title: "Central de suporte",
                    detail: "Documente perguntas frequentes, atalhos operacionais e contexto de uso.",
                    href: buildStudioHref("ops", { surface: "support" }),
                    tone: "good",
                  },
                  {
                    label: "Administração",
                    title: "Marcas e governança",
                    detail: "Ajustes administrativos e organização de marcas agora ficam no mesmo console.",
                    href: buildStudioHref("ops", { surface: "governance", focus: "stores" }),
                    tone: "warn",
                  },
                ]}
              />
            </div>
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Estado do módulo</span>
              </div>
              <FocusList items={focus.length ? focus : makeModuleFallback("ops")} />
            </div>
          </div>
        ) : null}
      </section>
    </V3ModuleChrome>
  );
}

function ModuleReportView({
  module,
  report,
  context,
}: {
  module: StudioModule;
  report: StudioReport;
  context: StudioModuleContext;
}) {
  if (module === "ops") {
    return <OpsWorkspace context={context} />;
  }

  if (!report) {
    return (
      <V3EmptyState
        title="Módulo sem relatório"
        description="O BrandOps não recebeu dados suficientes para montar esta superfície ainda."
      />
    );
  }

  if (module === "command") {
    return <CommandWorkspace snapshot={report as ManagementSnapshotV2} context={context} />;
  }

  if (module === "finance") {
    return <FinanceWorkspace report={report as FinanceHubReport} context={context} />;
  }

  if (module === "growth") {
    return <GrowthWorkspace report={report as AcquisitionHubReport} context={context} />;
  }

  return <OfferWorkspace report={report as OfferHubReport} context={context} />;
}

export function StudioModulePage({
  module,
  searchParams,
}: {
  module: StudioModule;
  searchParams?: StudioPageSearchParams;
}) {
  const [report, setReport] = useState<StudioReport>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const { activeBrand, activeBrandId, isLoading, periodRange } = useBrandOps();
  const activeNav = getStudioNavItem(module);
  const moduleContext = useMemo(
    () =>
      getStudioModuleContext(module, {
        get: (key: string) => getSearchParamValue(searchParams, key),
      }),
    [module, searchParams],
  );
  const periodKey = useMemo(
    () => `${periodRange?.start ?? "na"}-${periodRange?.end ?? "na"}`,
    [periodRange?.end, periodRange?.start],
  );

  useEffect(() => {
    if (module === "ops") {
      setReport(null);
      setReportError(null);
      setIsReportLoading(false);
      return;
    }

    if (!activeBrandId) {
      setReport(null);
      setReportError(null);
      setIsReportLoading(false);
      return;
    }

    const brandId = activeBrandId;
    let cancelled = false;

    async function loadReport() {
      setIsReportLoading(true);
      setReportError(null);
      try {
        const from = periodRange?.start ?? null;
        const to = periodRange?.end ?? null;
        const nextReport =
          module === "command"
            ? await fetchCommandCenterReport(brandId, from, to)
            : module === "finance"
              ? await fetchFinanceHubReport(brandId, from, to)
              : module === "growth"
                ? await fetchAcquisitionHubReport(brandId, from, to)
                : await fetchOfferHubReport(brandId, from, to);

        if (!cancelled) {
          setReport(nextReport);
        }
      } catch (error) {
        if (!cancelled) {
          setReport(null);
          setReportError(
            error instanceof Error ? error.message : "Não foi possível carregar este módulo.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsReportLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [activeBrandId, module, periodKey, periodRange?.end, periodRange?.start]);

  if (!activeBrandId && !activeBrand) {
    return (
      <V3EmptyState
        title="Nenhuma marca ativa"
        description="Selecione ou cadastre uma marca para abrir o BrandOps Studio."
      />
    );
  }

  if ((isLoading && !activeBrand) || isReportLoading) {
    return <V3LoadingPanel label={`Montando ${activeNav.label.toLowerCase()}`} />;
  }

  if (reportError) {
    return (
      <div className="v3-error-panel">
        <Database size={20} />
        <strong>{activeNav.label} indisponível</strong>
        <p>{reportError}</p>
      </div>
    );
  }

  return <ModuleReportView module={module} report={report} context={moduleContext} />;
}
