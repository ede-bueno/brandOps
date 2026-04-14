import "server-only";

import { extractPrintName } from "@/lib/brandops/metrics";
import type {
  BrandIntegrationConfig,
  CatalogAnalysis,
  CatalogProduct,
  CatalogPlaybookGroup,
  CatalogReport,
  CatalogReportFilters,
  CatalogReportRow,
  CatalogStatusFilter,
  OrderItem,
} from "@/lib/brandops/types";

export type CatalogReportRequestFilters = {
  from?: string | null;
  to?: string | null;
  search?: string | null;
  status?: CatalogStatusFilter | null;
  productType?: string | "all" | null;
  collection?: string | "all" | null;
};

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeProduct(product: CatalogProduct, unitsSold: number): CatalogReportRow {
  const additionalImageUrls = product.additionalImageUrls ?? [];
  return {
    ...product,
    dataSource: product.dataSource ?? "manual_feed",
    unitsSold,
    printName: extractPrintName(product.title, product.productType),
    galleryCount: (product.imageUrl ? 1 : 0) + additionalImageUrls.length,
  };
}

function collectSalesBySku(orderItems: OrderItem[]) {
  const totals = new Map<string, number>();

  orderItems
    .filter((item) => !item.isIgnored)
    .forEach((item) => {
      const key = String(item.sku ?? "").trim();
      if (!key) {
        return;
      }

      totals.set(key, (totals.get(key) ?? 0) + Number(item.quantity ?? 0));
    });

  return totals;
}

function applyFilters(rows: CatalogReportRow[], filters: CatalogReportRequestFilters) {
  const normalizedSearch = normalizeText(filters.search);

  return rows.filter((row) => {
    if (filters.status === "sold" && row.unitsSold <= 0) {
      return false;
    }

    if (filters.status === "unsold" && row.unitsSold > 0) {
      return false;
    }

    if (filters.productType && filters.productType !== "all" && row.productType !== filters.productType) {
      return false;
    }

    if (filters.collection && filters.collection !== "all" && !(row.collections ?? []).includes(filters.collection)) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = normalizeText(
      [
        row.title,
        row.printName,
        row.productType,
        ...(row.collections ?? []),
        ...(row.keywords ?? []),
      ].join(" "),
    );

    return haystack.includes(normalizedSearch);
  });
}

function detectSourceMode(
  rows: CatalogReportRow[],
  integrations: BrandIntegrationConfig[],
): CatalogReport["meta"]["sourceMode"] {
  const hasManualFeed = rows.some(
    (row) => row.sourcePresence?.manualFeed ?? row.dataSource !== "meta_catalog",
  );
  const hasMetaCatalog = rows.some(
    (row) => row.sourcePresence?.metaCatalog ?? row.dataSource === "meta_catalog",
  );

  if (hasManualFeed && hasMetaCatalog) {
    return "mixed";
  }

  if (hasMetaCatalog) {
    return "meta_catalog";
  }

  const metaIntegration = integrations.find((integration) => integration.provider === "meta");
  if (metaIntegration?.mode === "api" && metaIntegration.settings.catalogId) {
    return "mixed";
  }

  return "manual_feed";
}

function buildSourceLabel(sourceMode: CatalogReport["meta"]["sourceMode"]) {
  if (sourceMode === "meta_catalog") {
    return "Meta Catalog";
  }

  if (sourceMode === "mixed") {
    return "Meta + feed manual";
  }

  return "Feed manual";
}

function buildHighlights(rows: CatalogReportRow[]) {
  return {
    topSellers: [...rows]
      .filter((row) => row.unitsSold > 0)
      .sort((left, right) => right.unitsSold - left.unitsSold || right.price - left.price)
      .slice(0, 6),
    uncovered: [...rows]
      .filter((row) => row.galleryCount <= 1 || row.unitsSold <= 0)
      .sort((left, right) => left.unitsSold - right.unitsSold || left.galleryCount - right.galleryCount)
      .slice(0, 6),
  };
}

function classifyCatalogRow(row: CatalogReportRow) {
  if (row.unitsSold > 0 && row.galleryCount >= 2) {
    return "scale" as const;
  }

  if (row.unitsSold <= 0 || row.galleryCount <= 1) {
    return "review" as const;
  }

  return "monitor" as const;
}

function buildPlaybookGroup(
  title: string,
  description: string,
  rows: CatalogReportRow[],
): CatalogPlaybookGroup {
  return {
    title,
    description,
    count: rows.length,
    items: rows.slice(0, 6),
  };
}

function buildPlaybook(rows: CatalogReportRow[]) {
  const scale = rows.filter((row) => classifyCatalogRow(row) === "scale");
  const review = rows.filter((row) => classifyCatalogRow(row) === "review");
  const monitor = rows.filter((row) => classifyCatalogRow(row) === "monitor");

  return {
    scale: buildPlaybookGroup(
      "Escalar exposição",
      "Produtos que já vendem e contam com galeria suficiente para ganhar mais tração.",
      scale,
    ),
    review: buildPlaybookGroup(
      "Revisar cobertura",
      "Produtos sem venda ou com pouca galeria, pedindo revisão visual ou de distribuição.",
      review,
    ),
    monitor: buildPlaybookGroup(
      "Monitorar",
      "Produtos com sinais intermediários, ainda sem motivo forte para acelerar ou cortar.",
      monitor,
    ),
  };
}

function buildAnalysis(
  rows: CatalogReportRow[],
  highlights: CatalogReport["highlights"],
  playbook: CatalogReport["playbook"],
  metaCatalogReady: boolean,
): CatalogAnalysis {
  if (!rows.length) {
    return {
      narrativeTitle: "Catálogo sem base no recorte",
      narrativeBody:
        "Ainda não há produtos suficientes neste recorte para formar uma leitura operacional do catálogo.",
      nextActions: [],
      topOpportunity: null,
      topRisk: null,
    };
  }

  const nextActions: string[] = [];
  if (highlights.topSellers[0]) {
    nextActions.push(`Usar ${highlights.topSellers[0].printName} como referência de vitrine e distribuição para produtos parecidos.`);
  }
  if (highlights.uncovered[0]) {
    nextActions.push(`Revisar a galeria e a exposição de ${highlights.uncovered[0].printName}, que aparece como gargalo do recorte.`);
  }
  if (metaCatalogReady) {
    nextActions.push("Aproveitar a integração Meta Catalog para ampliar a base visual sem depender só do feed manual.");
  }

  if (playbook.scale.count > playbook.review.count) {
    return {
      narrativeTitle: "Catálogo com base para acelerar vencedores",
      narrativeBody:
        "O recorte mostra um núcleo de produtos já validados, com venda e cobertura visual suficiente para ganhar mais exposição sem depender apenas de descoberta orgânica.",
      nextActions,
      topOpportunity: highlights.topSellers[0]?.printName ?? null,
      topRisk: highlights.uncovered[0]?.printName ?? null,
    };
  }

  return {
    narrativeTitle: "Catálogo ainda concentrado em gargalos de cobertura",
    narrativeBody:
      "A principal oportunidade está em corrigir produtos sem venda ou com pouca galeria antes de ampliar a distribuição do catálogo como um todo.",
    nextActions,
    topOpportunity: highlights.topSellers[0]?.printName ?? null,
    topRisk: highlights.uncovered[0]?.printName ?? null,
  };
}

export function buildCatalogReport(
  catalog: CatalogProduct[],
  orderItems: OrderItem[],
  integrations: BrandIntegrationConfig[],
  filters: CatalogReportRequestFilters = {},
): CatalogReport {
  const salesBySku = collectSalesBySku(orderItems);
  const allRows = catalog
    .map((product) => normalizeProduct(product, salesBySku.get(product.id) ?? 0))
    .sort((left, right) => right.unitsSold - left.unitsSold || left.title.localeCompare(right.title));
  const rows = applyFilters(allRows, filters);
  const sourceMode = detectSourceMode(allRows, integrations);
  const highlights = buildHighlights(rows);
  const metaCatalogReady = Boolean(
    integrations.find((integration) => integration.provider === "meta")?.settings.catalogId,
  );
  const playbook = buildPlaybook(rows);

  return {
    summary: {
      totalProducts: rows.length,
      soldProducts: rows.filter((row) => row.unitsSold > 0).length,
      totalUnitsSold: rows.reduce((accumulator, row) => accumulator + row.unitsSold, 0),
      productsWithGallery: rows.filter((row) => row.galleryCount > 0).length,
      metaCatalogProducts: rows.filter((row) => row.sourcePresence?.metaCatalog).length,
      manualFeedProducts: rows.filter((row) => row.sourcePresence?.manualFeed).length,
    },
    rows,
    options: {
      productTypes: [...new Set(allRows.map((row) => row.productType).filter(Boolean))].sort((left, right) =>
        String(left).localeCompare(String(right)),
      ) as string[],
      collections: [...new Set(allRows.flatMap((row) => row.collections ?? []).filter(Boolean))].sort((left, right) =>
        left.localeCompare(right),
      ),
    },
    highlights,
    playbook,
    analysis: buildAnalysis(rows, highlights, playbook, metaCatalogReady),
    filters: {
      search: filters.search?.trim() ?? "",
      status: filters.status ?? "all",
      productType: filters.productType ?? "all",
      collection: filters.collection ?? "all",
    } satisfies CatalogReportFilters,
    meta: {
      generatedAt: new Date().toISOString(),
      from: filters.from ?? null,
      to: filters.to ?? null,
      sourceMode,
      sourceLabel: buildSourceLabel(sourceMode),
      metaCatalogReady,
      hasData: rows.length > 0,
    },
  };
}
