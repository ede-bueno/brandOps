import type {
  BrandDataset,
  BrandSummaryMetrics,
  CampaignPerformance,
  DailyMediaPoint,
  DailySalesPoint,
  MediaAnomaly,
  TopProductPerformance,
} from "./types";

const PAID_STATUS = new Set(["Pago"]);

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function toCurrencyLabel(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function getPaidOrders(brand: BrandDataset) {
  return brand.paidOrders.filter((order) => PAID_STATUS.has(order.paymentStatus));
}

export function getPaidOrderNumbers(brand: BrandDataset) {
  return new Set(getPaidOrders(brand).map((order) => order.orderNumber));
}

export function computeBrandMetrics(brand: BrandDataset): BrandSummaryMetrics {
  const paidOrders = getPaidOrders(brand);
  const paidOrderNumbers = new Set(paidOrders.map((order) => order.orderNumber));
  const paidItems = brand.orderItems.filter((item) =>
    paidOrderNumbers.has(item.orderNumber),
  );
  const paidSalesLines = brand.salesLines.filter((item) =>
    paidOrderNumbers.has(item.orderNumber),
  );
  const grossRevenue = paidItems.reduce((sum, item) => sum + item.grossValue, 0);
  const netRevenue = paidOrders.reduce((sum, order) => sum + order.orderValue, 0);
  const discounts = paidOrders.reduce((sum, order) => sum + order.discountValue, 0);
  const unitsSold = paidItems.reduce((sum, item) => sum + item.quantity, 0);
  const mediaSpend = brand.media.reduce((sum, row) => sum + row.spend, 0);
  const commissionTotal = paidOrders.reduce(
    (sum, order) => sum + order.commissionValue,
    0,
  );
  const cmvMap = new Map(
    brand.cmvEntries.map((entry) => [entry.productId, entry.unitCost]),
  );
  const cmvTotal = paidSalesLines.reduce(
    (sum, line) => sum + line.quantity * (cmvMap.get(line.productId) ?? 0),
    0,
  );
  const contributionAfterMedia = netRevenue - mediaSpend - commissionTotal;
  const operatingResult = contributionAfterMedia - cmvTotal;

  return {
    grossRevenue: round(grossRevenue),
    netRevenue: round(netRevenue),
    discounts: round(discounts),
    orderCount: brand.paidOrders.length,
    paidOrderCount: paidOrders.length,
    unitsSold,
    averageTicket: round(paidOrders.length ? netRevenue / paidOrders.length : 0),
    mediaSpend: round(mediaSpend),
    grossRoas: round(mediaSpend ? netRevenue / mediaSpend : 0, 2),
    contributionAfterMedia: round(contributionAfterMedia),
    contributionMargin: round(netRevenue ? contributionAfterMedia / netRevenue : 0, 4),
    commissionTotal: round(commissionTotal),
    cmvTotal: round(cmvTotal),
    operatingResult: round(operatingResult),
  };
}

export function buildDailySalesSeries(brand: BrandDataset): DailySalesPoint[] {
  const paidOrders = getPaidOrders(brand);
  const byDate = new Map<string, DailySalesPoint>();
  const orderToItems = new Map<string, number>();

  brand.orderItems.forEach((item) => {
    orderToItems.set(item.orderNumber, (orderToItems.get(item.orderNumber) ?? 0) + item.quantity);
  });

  paidOrders.forEach((order) => {
    const bucket = byDate.get(order.orderDate) ?? {
      date: order.orderDate,
      revenue: 0,
      orders: 0,
      items: 0,
    };
    bucket.revenue += order.orderValue;
    bucket.orders += 1;
    bucket.items += orderToItems.get(order.orderNumber) ?? order.itemsInOrder;
    byDate.set(order.orderDate, bucket);
  });

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function buildTopProducts(brand: BrandDataset): TopProductPerformance[] {
  const paidOrderNumbers = getPaidOrderNumbers(brand);
  const byProduct = new Map<string, TopProductPerformance>();

  brand.orderItems
    .filter((item) => paidOrderNumbers.has(item.orderNumber))
    .forEach((item) => {
      const key = `${item.productName}__${item.productSpecs ?? ""}`;
      const current = byProduct.get(key) ?? {
        productKey: key,
        productName: item.productSpecs
          ? `${item.productName} • ${item.productSpecs}`
          : item.productName,
        quantity: 0,
        grossRevenue: 0,
      };
      current.quantity += item.quantity;
      current.grossRevenue += item.grossValue;
      byProduct.set(key, current);
    });

  return [...byProduct.values()]
    .sort((a, b) => b.grossRevenue - a.grossRevenue)
    .slice(0, 10)
    .map((item) => ({
      ...item,
      grossRevenue: round(item.grossRevenue),
    }));
}

export function buildCampaignPerformance(brand: BrandDataset): CampaignPerformance[] {
  const byCampaign = new Map<string, CampaignPerformance>();

  brand.media.forEach((row) => {
    const current = byCampaign.get(row.campaignName) ?? {
      campaignName: row.campaignName,
      spend: 0,
      purchaseValue: 0,
      purchases: 0,
      impressions: 0,
      clicks: 0,
      roas: 0,
    };
    current.spend += row.spend;
    current.purchaseValue += row.purchaseValue;
    current.purchases += row.purchases;
    current.impressions += row.impressions;
    current.clicks += row.linkClicks || row.clicksAll;
    byCampaign.set(row.campaignName, current);
  });

  return [...byCampaign.values()]
    .map((campaign) => ({
      ...campaign,
      spend: round(campaign.spend),
      purchaseValue: round(campaign.purchaseValue),
      roas: round(campaign.spend ? campaign.purchaseValue / campaign.spend : 0, 2),
    }))
    .sort((a, b) => b.spend - a.spend);
}

export function buildDailyMediaSeries(brand: BrandDataset): DailyMediaPoint[] {
  const byDate = new Map<string, DailyMediaPoint>();
  brand.media.forEach((row) => {
    const current = byDate.get(row.date) ?? {
      date: row.date,
      spend: 0,
      purchaseValue: 0,
      purchases: 0,
    };
    current.spend += row.spend;
    current.purchaseValue += row.purchaseValue;
    current.purchases += row.purchases;
    byDate.set(row.date, current);
  });
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function buildMediaAnomalies(brand: BrandDataset): MediaAnomaly[] {
  const averageTicket = computeBrandMetrics(brand).averageTicket || 0;
  const anomalies: MediaAnomaly[] = [];

  brand.media.forEach((row, index) => {
    if (row.impressions === 0 && row.spend > 0) {
      anomalies.push({
        id: `spend-without-impression-${index}`,
        date: row.date,
        campaignName: row.campaignName,
        adsetName: row.adsetName,
        adName: row.adName,
        metric: "Investimento",
        value: toCurrencyLabel(row.spend),
        reason: "Linha com gasto registrado e zero impressões. Vale revisar a exportação ou deduplicação.",
        severity: "medium",
      });
    }

    if (row.clicksAll > row.impressions && row.impressions > 0) {
      anomalies.push({
        id: `clicks-over-impressions-${index}`,
        date: row.date,
        campaignName: row.campaignName,
        adsetName: row.adsetName,
        adName: row.adName,
        metric: "Cliques",
        value: `${row.clicksAll} cliques / ${row.impressions} impressões`,
        reason: "Cliques totais acima das impressões. Isso normalmente indica dado inconsistente na linha agregada.",
        severity: "high",
      });
    }

    if (row.purchases > 0 && averageTicket > 0) {
      const valuePerPurchase = row.purchaseValue / row.purchases;
      if (valuePerPurchase > averageTicket * 4) {
        anomalies.push({
          id: `conversion-outlier-${index}`,
          date: row.date,
          campaignName: row.campaignName,
          adsetName: row.adsetName,
          adName: row.adName,
          metric: "Valor por compra",
          value: toCurrencyLabel(valuePerPurchase),
          reason: "Valor por compra muito acima do ticket médio pago da marca. Pode ser atribuição inflada da Meta.",
          severity: "high",
        });
      }
    }
  });

  return anomalies.sort((a, b) => {
    if (a.severity === b.severity) {
      return a.date.localeCompare(b.date);
    }
    return a.severity === "high" ? -1 : 1;
  });
}

export function buildCmvCandidates(brand: BrandDataset) {
  const paidOrderNumbers = getPaidOrderNumbers(brand);
  const byProduct = new Map<
    string,
    {
      productId: string;
      productName: string;
      quantity: number;
      revenue: number;
    }
  >();

  brand.salesLines
    .filter((line) => paidOrderNumbers.has(line.orderNumber))
    .forEach((line) => {
      const current = byProduct.get(line.productId) ?? {
        productId: line.productId,
        productName: line.productName,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += line.quantity;
      current.revenue += line.quantity * line.unitPrice;
      byProduct.set(line.productId, current);
    });

  const cmvMap = new Map(
    brand.cmvEntries.map((entry) => [entry.productId, entry.unitCost]),
  );

  return [...byProduct.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .map((product) => ({
      ...product,
      revenue: round(product.revenue),
      unitCost: cmvMap.get(product.productId) ?? null,
    }));
}
