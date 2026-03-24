"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, Images, Search } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { currencyFormatter, integerFormatter } from "@/lib/brandops/format";
import { extractPrintName } from "@/lib/brandops/metrics";

type CatalogStatusFilter = "all" | "sold" | "unsold";

export default function FeedPage() {
  const { activeBrand } = useBrandOps();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CatalogStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const catalogEntries = useMemo(() => {
    if (!activeBrand) {
      return [];
    }

    const salesBySku = new Map<string, number>();
    activeBrand.salesLines.forEach((line) => {
      const key = String(line.productId ?? line.sku ?? "").trim();
      if (!key) {
        return;
      }
      salesBySku.set(key, (salesBySku.get(key) ?? 0) + (line.quantity ?? 0));
    });

    return activeBrand.catalog.map((product) => {
      const unitsSold = salesBySku.get(product.id) ?? 0;
      return {
        ...product,
        unitsSold,
        printName: extractPrintName(product.title, product.productType),
      };
    });
  }, [activeBrand]);

  const typeOptions = useMemo(() => {
    return [...new Set(catalogEntries.map((product) => product.productType).filter(Boolean))].sort();
  }, [catalogEntries]);

  const visibleEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return catalogEntries.filter((product) => {
      if (statusFilter === "sold" && product.unitsSold <= 0) {
        return false;
      }
      if (statusFilter === "unsold" && product.unitsSold > 0) {
        return false;
      }
      if (typeFilter !== "all" && product.productType !== typeFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        product.title,
        product.printName,
        product.productType,
        ...(product.collections ?? []),
        ...(product.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [catalogEntries, search, statusFilter, typeFilter]);

  const soldProducts = catalogEntries.filter((product) => product.unitsSold > 0).length;
  const totalUnitsSold = catalogEntries.reduce((acc, product) => acc + product.unitsSold, 0);
  const productsWithGallery = catalogEntries.filter(
    (product) => product.imageUrl || (product.additionalImageUrls?.length ?? 0) > 0,
  ).length;

  if (!activeBrand) {
    return (
      <EmptyState
        title="Nenhum catálogo disponível"
        description="Importe o feed de produtos para visualizar as estampas, mockups e páginas do catálogo da marca."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catálogo visual"
        title="Feed de Produtos"
        description="Biblioteca visual do feed exportado pela INK. Aqui você consegue revisar estampas, mockups, páginas do produto e cruzar rapidamente com o volume vendido."
        badge="Base completa do catálogo"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SurfaceCard>
          <p className="text-sm text-on-surface-variant">SKUs no feed</p>
          <p className="mt-3 text-3xl font-semibold text-on-surface">
            {integerFormatter.format(catalogEntries.length)}
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-on-surface-variant">SKUs com venda</p>
          <p className="mt-3 text-3xl font-semibold text-on-surface">
            {integerFormatter.format(soldProducts)}
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-on-surface-variant">Peças vendidas conciliadas</p>
          <p className="mt-3 text-3xl font-semibold text-on-surface">
            {integerFormatter.format(totalUnitsSold)}
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-on-surface-variant">Produtos com imagens</p>
          <p className="mt-3 text-3xl font-semibold text-on-surface">
            {integerFormatter.format(productsWithGallery)}
          </p>
        </SurfaceCard>
      </section>

      <SurfaceCard>
        <SectionHeading
          title="Filtros do catálogo"
          description="Use busca, tipo de peça e status de venda para navegar pelas estampas com mais rapidez."
        />
        <div className="mt-5 grid gap-3 lg:grid-cols-[1.3fr_0.7fr_0.7fr]">
          <label className="relative block">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por estampa, coleção ou palavra-chave"
              className="brandops-input w-full pl-10 pr-3 py-2.5"
            />
          </label>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="brandops-input w-full px-3 py-2.5"
          >
            <option value="all">Todos os tipos</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as CatalogStatusFilter)}
            className="brandops-input w-full px-3 py-2.5"
          >
            <option value="all">Com ou sem venda</option>
            <option value="sold">Somente com venda</option>
            <option value="unsold">Somente sem venda</option>
          </select>
        </div>
      </SurfaceCard>

      {!visibleEntries.length ? (
        <EmptyState
          title="Nenhum produto encontrado"
          description="Ajuste os filtros ou importe um feed mais recente para visualizar as estampas desta marca."
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visibleEntries.map((product) => (
            <SurfaceCard key={product.id} className="overflow-hidden p-0">
              <div className="aspect-[4/3] bg-surface-container">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.title}
                    width={960}
                    height={720}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-on-surface-variant">
                    <Images size={28} />
                  </div>
                )}
              </div>

              <div className="space-y-4 p-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {product.productType ? (
                      <span className="status-chip">{product.productType}</span>
                    ) : null}
                    {product.unitsSold > 0 ? (
                      <span className="rounded-full bg-secondary-container px-3 py-1 text-[11px] font-semibold text-on-secondary-container">
                        {integerFormatter.format(product.unitsSold)} peças vendidas
                      </span>
                    ) : (
                      <span className="rounded-full bg-surface-container-high px-3 py-1 text-[11px] font-semibold text-on-surface-variant">
                        Sem venda conciliada
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-lg font-semibold text-on-surface">{product.printName}</p>
                    <p className="mt-1 text-sm text-on-surface-variant">{product.title}</p>
                  </div>

                  {product.collections?.length ? (
                    <p className="text-xs leading-5 text-on-surface-variant">
                      Coleções: {product.collections.slice(0, 3).join(" • ")}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="panel-muted p-3">
                    <p className="text-xs uppercase tracking-wide text-on-surface-variant">Preço</p>
                    <p className="mt-1 font-semibold text-on-surface">
                      {currencyFormatter.format(product.salePrice ?? product.price)}
                    </p>
                  </div>
                  <div className="panel-muted p-3">
                    <p className="text-xs uppercase tracking-wide text-on-surface-variant">Mockups extras</p>
                    <p className="mt-1 font-semibold text-on-surface">
                      {integerFormatter.format(product.additionalImageUrls?.length ?? 0)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {product.link ? (
                    <Link
                      href={product.link}
                      target="_blank"
                      className="brandops-button brandops-button-secondary"
                    >
                      <ExternalLink size={14} />
                      Abrir produto
                    </Link>
                  ) : null}
                  {product.imageUrl ? (
                    <Link
                      href={product.imageUrl}
                      target="_blank"
                      className="brandops-button brandops-button-ghost"
                    >
                      Ver imagem
                    </Link>
                  ) : null}
                </div>
              </div>
            </SurfaceCard>
          ))}
        </section>
      )}
    </div>
  );
}
