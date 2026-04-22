"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, Images, Search } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard, TaskWorkspaceIntro } from "@/components/ui-shell";
import { fetchCatalogReport } from "@/lib/brandops/database";
import { currencyFormatter, integerFormatter } from "@/lib/brandops/format";
import type { CatalogReport, CatalogStatusFilter } from "@/lib/brandops/types";

const EMPTY_REPORT: CatalogReport = {
  summary: {
    totalProducts: 0,
    soldProducts: 0,
    totalUnitsSold: 0,
    productsWithGallery: 0,
    metaCatalogProducts: 0,
    manualFeedProducts: 0,
  },
  rows: [],
  options: {
    productTypes: [],
    collections: [],
  },
  highlights: {
    topSellers: [],
    uncovered: [],
  },
  playbook: {
    scale: {
      title: "Escalar exposição",
      description: "Produtos que já vendem e contam com galeria suficiente para ganhar mais tração.",
      count: 0,
      items: [],
    },
    review: {
      title: "Revisar cobertura",
      description: "Produtos sem venda ou com pouca galeria, pedindo revisão visual ou de distribuição.",
      count: 0,
      items: [],
    },
    monitor: {
      title: "Monitorar",
      description: "Produtos com sinais intermediários, ainda sem motivo forte para acelerar ou cortar.",
      count: 0,
      items: [],
    },
  },
  analysis: {
    narrativeTitle: "Catálogo sem base no recorte",
    narrativeBody: "Ainda não há produtos suficientes neste recorte para formar uma leitura operacional do catálogo.",
    nextActions: [],
    topOpportunity: null,
    topRisk: null,
  },
  filters: {
    search: "",
    status: "all",
    productType: "all",
    collection: "all",
  },
  meta: {
    generatedAt: "",
    from: null,
    to: null,
    sourceMode: "manual_feed",
    sourceLabel: "Feed manual",
    metaCatalogReady: false,
    hasData: false,
  },
};

function PlaybookColumn({
  title,
  description,
  count,
  items,
}: CatalogReport["playbook"]["scale"]) {
  return (
    <SurfaceCard>
      <SectionHeading
        title={title}
        description={`${description} ${count ? `${count} item(ns) classificados.` : "Sem itens classificados nesta zona."}`}
      />
      <div className="mt-5 atlas-component-stack-compact">
        {items.length ? (
          items.map((product) => (
            <article key={`${title}-${product.id}`} className="panel-muted p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-on-surface">{product.printName}</p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {product.productType ?? "Sem tipo"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-on-surface">
                    {integerFormatter.format(product.unitsSold)} pçs
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                    {integerFormatter.format(product.galleryCount)} imgs
                  </p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="panel-muted p-3.5 text-sm text-on-surface-variant">
            O Atlas ainda não encontrou itens suficientes nesta faixa do playbook.
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}

export default function FeedPage() {
  const { activeBrand, activeBrandId, brands, periodRange, selectedPeriodLabel, isLoading } = useBrandOps();
  const [view, setView] = useState<"overview" | "playbook" | "grid">("overview");
  const [report, setReport] = useState<CatalogReport>(EMPTY_REPORT);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CatalogStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const primaryAction = report.analysis.nextActions[0] ?? null;

  const selectedBrandName =
    activeBrand?.name ??
    brands.find((brand) => brand.id === activeBrandId)?.name ??
    "Loja";

  useEffect(() => {
    if (!activeBrandId) {
      setReport(EMPTY_REPORT);
      setReportError(null);
      setIsReportLoading(false);
      return;
    }

    let cancelled = false;
    const currentBrandId = activeBrandId;

    async function loadReport() {
      setIsReportLoading(true);
      setReportError(null);

      try {
        const nextReport = await fetchCatalogReport(currentBrandId, {
          from: periodRange?.start ?? null,
          to: periodRange?.end ?? null,
          search,
          status: statusFilter,
          productType: typeFilter,
          collection: collectionFilter,
        });

        if (!cancelled) {
          setReport(nextReport);
        }
      } catch (error) {
        if (!cancelled) {
          setReport(EMPTY_REPORT);
          setReportError(
            error instanceof Error ? error.message : "Nao foi possivel carregar o catalogo.",
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
  }, [activeBrandId, collectionFilter, periodRange?.end, periodRange?.start, search, statusFilter, typeFilter]);

  const isPageLoading =
    Boolean(activeBrandId) && (isLoading || isReportLoading || !activeBrand);

  if (!activeBrandId && !activeBrand) {
    return (
      <EmptyState
        title="Nenhum catalogo disponivel"
        description="Escolha uma marca para visualizar o catalogo de produtos."
      />
    );
  }

  if (isPageLoading) {
    return (
      <div className="atlas-page-stack">
        <PageHeader
          eyebrow="Catalogo visual"
          title="Feed de Produtos"
          description={`Carregando o catalogo da loja ${selectedBrandName}.`}
        />
        <div className="atlas-page-stack animate-pulse">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-surface-container" />
            ))}
          </div>
          <div className="h-[520px] rounded-3xl bg-surface-container" />
        </div>
      </div>
    );
  }

  if (!activeBrand) {
    return (
      <EmptyState
        title={reportError ? "Catalogo indisponivel" : "Dados da loja indisponiveis"}
        description={reportError ?? "Nao foi possivel carregar o catalogo da loja selecionada."}
        variant={reportError ? "error" : "default"}
      />
    );
  }

  if (!report.meta.hasData) {
    return (
      <EmptyState
        title={reportError ? "Catalogo indisponivel" : "Ainda nao ha catalogo carregado"}
        description={
          reportError ??
          "Importe o feed manual ou prepare a integracao Meta Catalog para abrir a biblioteca visual da marca."
        }
        variant={reportError ? "error" : "default"}
      />
    );
  }

  return (
    <div className="atlas-page-stack">
      <PageHeader
        eyebrow="Catalogo visual"
        title="Console de catálogo"
        description="Cobertura, venda e distribuição visual do catálogo."
        actions={
          <div className="flex flex-wrap gap-2">
            <span className="atlas-inline-metric">{selectedBrandName}</span>
            <span className="atlas-inline-metric">{report.meta.sourceLabel}</span>
          </div>
        }
      />

      <TaskWorkspaceIntro
        title="Filtrar o catálogo, localizar cobertura e abrir a grade certa."
        description="Use busca, filtros e modos para encontrar item, cobertura e gargalo visual sem perder a origem da fonte."
        primaryAction={primaryAction ?? report.analysis.narrativeTitle}
        primaryDescription="Combine filtros, grade e playbook para decidir cobertura, distribuição e revisão do catálogo."
        supportItems={[
          {
            label: "Maior oportunidade",
            value: report.analysis.topOpportunity ?? "Sem destaque",
            description: "Sinal mais promissor para empurrar exposição ou cobertura.",
            tone: "positive",
          },
          {
            label: "Revisar primeiro",
            value: report.analysis.topRisk ?? "Sem risco dominante",
            description: "Gargalo que merece ajuste antes de novas expansões.",
            tone: "warning",
          },
          {
            label: "Origem ativa",
            value: report.meta.sourceLabel,
            description: report.analysis.narrativeBody,
            tone: "info",
          },
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceCard>
          <SectionHeading
            title="Filtro rápido"
            description="Refine a leitura sem espalhar controles pela tela."
            aside={<span className="atlas-inline-metric">{selectedPeriodLabel}</span>}
          />
          <div className="mt-5 brandops-toolbar-grid lg:grid-cols-2">
            <label className="brandops-field-stack lg:col-span-2">
              <span className="brandops-field-label">Busca</span>
              <div className="brandops-input-with-icon">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por estampa, coleção ou palavra-chave"
                  className="brandops-input"
                />
              </div>
            </label>
            <label className="brandops-field-stack">
              <span className="brandops-field-label">Tipo</span>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="brandops-input">
                <option value="all">Todos os tipos</option>
                {report.options.productTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="brandops-field-stack">
              <span className="brandops-field-label">Coleção</span>
              <select value={collectionFilter} onChange={(event) => setCollectionFilter(event.target.value)} className="brandops-input">
                <option value="all">Todas as coleções</option>
                {report.options.collections.map((collection) => (
                  <option key={collection} value={collection}>{collection}</option>
                ))}
              </select>
            </label>
            <label className="brandops-field-stack">
              <span className="brandops-field-label">Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as CatalogStatusFilter)} className="brandops-input">
                <option value="all">Com ou sem venda</option>
                <option value="sold">Somente com venda</option>
                <option value="unsold">Somente sem venda</option>
              </select>
            </label>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            title="Radar da fonte"
            description="Origem ativa e cobertura visual em um bloco curto."
          />
          <div className="mt-5 grid gap-3">
            <div className="atlas-callout-card rounded-2xl border p-4" data-tone="info">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                Modo de origem
              </p>
              <div className="mt-3 text-[16px] font-semibold text-on-surface">{report.meta.sourceLabel}</div>
              <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">{report.analysis.narrativeBody}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="atlas-callout-card rounded-2xl border p-4" data-tone="positive">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  Meta Catalog
                </p>
                <div className="mt-3 text-[16px] font-semibold text-on-surface">
                  {integerFormatter.format(report.summary.metaCatalogProducts)}
                </div>
                <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
                  Produtos já prontos para a fonte Meta.
                </p>
              </div>
              <div className="atlas-callout-card rounded-2xl border p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  Feed manual
                </p>
                <div className="mt-3 text-[16px] font-semibold text-on-surface">
                  {integerFormatter.format(report.summary.manualFeedProducts)}
                </div>
                <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
                  Produtos ainda sustentados pelo feed da INK.
                </p>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeading
            title="Exploração do catálogo"
            description="Visão geral, playbook e grade em um fluxo curto."
            aside={<span className="atlas-inline-metric">{report.rows.length} produto(s)</span>}
          />
          <div className="brandops-subtabs">
            <button type="button" className="brandops-subtab" data-active={view === "overview"} onClick={() => setView("overview")}>Visão geral</button>
            <button type="button" className="brandops-subtab" data-active={view === "playbook"} onClick={() => setView("playbook")}>Playbook</button>
            <button type="button" className="brandops-subtab" data-active={view === "grid"} onClick={() => setView("grid")}>Grade</button>
          </div>
        </div>
      </SurfaceCard>

      {view === "overview" ? (
      <>
        <SurfaceCard>
          <SectionHeading title="Próximos passos" description="Abra só o que pede ação agora." />
          <details className="atlas-disclosure mt-5" open={!report.analysis.nextActions.length}>
            <summary>
              <span>Ações sugeridas pelo Atlas</span>
              <span>{report.analysis.nextActions.length || 0}</span>
            </summary>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {report.analysis.nextActions.length ? (
                report.analysis.nextActions.map((action) => (
                  <article key={action} className="panel-muted p-3.5 text-sm leading-6 text-on-surface-variant">{action}</article>
                ))
              ) : (
                <article className="panel-muted p-3.5 text-sm leading-6 text-on-surface-variant md:col-span-3">Ainda não há ações fortes para o recorte atual.</article>
              )}
            </div>
          </details>
        </SurfaceCard>

        <section className="grid gap-4 xl:grid-cols-2">
          <SurfaceCard>
            <SectionHeading title="Mais vendidos" description="Produtos que já merecem mais atenção." />
            <div className="mt-5 atlas-component-stack-tight">
              {report.highlights.topSellers.length ? report.highlights.topSellers.map((product) => (
                <div key={product.id} className="rounded-2xl border border-outline bg-surface-container-low p-3">
                  <p className="font-semibold text-on-surface">{product.printName}</p>
                  <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">{product.productType ?? "Sem tipo"} • {integerFormatter.format(product.unitsSold)} pecas</p>
                </div>
              )) : <p className="text-sm text-on-surface-variant">Ainda nao ha produtos vendidos no recorte.</p>}
            </div>
          </SurfaceCard>
          <SurfaceCard>
            <SectionHeading title="Oportunidades de cobertura" description="Itens que ainda pedem reforço visual ou distribuição." />
            <div className="mt-5 atlas-component-stack-tight">
              {report.highlights.uncovered.length ? report.highlights.uncovered.map((product) => (
                <div key={product.id} className="rounded-2xl border border-outline bg-surface-container-low p-3">
                  <p className="font-semibold text-on-surface">{product.printName}</p>
                  <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">{product.productType ?? "Sem tipo"} • {integerFormatter.format(product.galleryCount)} imagens • {integerFormatter.format(product.unitsSold)} pecas</p>
                </div>
              )) : <p className="text-sm text-on-surface-variant">Nao ha gargalos visuais evidentes neste recorte.</p>}
            </div>
          </SurfaceCard>
        </section>
      </>
      ) : null}

      {view === "playbook" ? (
      <section className="grid gap-4 xl:grid-cols-3">
        <PlaybookColumn {...report.playbook.scale} />
        <PlaybookColumn {...report.playbook.review} />
        <PlaybookColumn {...report.playbook.monitor} />
      </section>
      ) : null}

      {view === "grid" ? (
      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {report.rows.map((product) => (
          <SurfaceCard key={product.id} className="overflow-hidden p-0">
            <div className="aspect-[4/3] bg-surface-container">
              {product.imageUrl ? (
                <Image src={product.imageUrl} alt={product.title} width={960} height={720} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-on-surface-variant"><Images size={28} /></div>
              )}
            </div>
              <div className="atlas-component-stack p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                {product.productType ? <span className="atlas-inline-metric">{product.productType}</span> : null}
                <span className="atlas-inline-metric">
                  {product.dataSource === "meta_catalog" ? "Meta Catalog" : "Feed manual"}
                </span>
                <span className="atlas-inline-metric">
                  {integerFormatter.format(product.unitsSold)} pecas
                </span>
              </div>
              <div>
                <p className="text-lg font-semibold text-on-surface">{product.printName}</p>
                <p className="mt-1 text-sm text-on-surface-variant">{product.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="panel-muted p-3">
                  <p className="text-[11px] uppercase tracking-wide text-on-surface-variant">Preco</p>
                  <p className="mt-1 font-semibold text-on-surface">{currencyFormatter.format(product.salePrice ?? product.price)}</p>
                </div>
                <div className="panel-muted p-3">
                  <p className="text-[11px] uppercase tracking-wide text-on-surface-variant">Galeria</p>
                  <p className="mt-1 font-semibold text-on-surface">{integerFormatter.format(product.galleryCount)} imagens</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.link ? <Link href={product.link} target="_blank" className="brandops-button brandops-button-secondary"><ExternalLink size={14} />Abrir produto</Link> : null}
                {product.imageUrl ? <Link href={product.imageUrl} target="_blank" className="brandops-button brandops-button-ghost">Ver imagem</Link> : null}
              </div>
            </div>
          </SurfaceCard>
        ))}
      </section>
      ) : null}
    </div>
  );
}
