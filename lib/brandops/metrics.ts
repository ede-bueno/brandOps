import type {
  AnnualDreReport,
  BrandDataset,
  BrandSummaryMetrics,
  CampaignPerformance,
  DailyMediaPoint,
  DailySalesPoint,
  MediaAnomaly,
  MonthlyDreEntry,
  MonthlyExpenseBreakdown,
  PeriodFilter,
  TopProductPerformance,
  WeeklyPerformanceRow,
} from "./types";

const PAID_STATUS = new Set(["Pago"]);

function parseDateValue(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toMonthKey(date: string) {
  return date.slice(0, 7);
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${year}-${month}`;
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function toCurrencyLabel(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function buildEmptySummaryMetrics(): BrandSummaryMetrics {
  return {
    grossRevenue: 0,
    netRevenue: 0,
    netAfterFees: 0,
    discounts: 0,
    orderCount: 0,
    paidOrderCount: 0,
    unitsSold: 0,
    averageTicket: 0,
    mediaSpend: 0,
    grossRoas: 0,
    grossMargin: 0,
    contributionAfterMedia: 0,
    contributionMargin: 0,
    commissionTotal: 0,
    cmvTotal: 0,
    operatingExpensesTotal: 0,
    operatingResult: 0,
    operatingMargin: 0,
  };
}

function finalizeSummaryMetrics(metrics: BrandSummaryMetrics): BrandSummaryMetrics {
  const netAfterFees = metrics.netRevenue - metrics.commissionTotal;
  const grossMargin = netAfterFees - metrics.cmvTotal;
  const contributionAfterMedia = grossMargin - metrics.mediaSpend;
  const operatingResult = contributionAfterMedia - metrics.operatingExpensesTotal;

  return {
    grossRevenue: round(metrics.grossRevenue),
    netRevenue: round(metrics.netRevenue),
    netAfterFees: round(netAfterFees),
    discounts: round(metrics.discounts),
    orderCount: metrics.orderCount,
    paidOrderCount: metrics.paidOrderCount,
    unitsSold: metrics.unitsSold,
    averageTicket: round(metrics.paidOrderCount ? metrics.netRevenue / metrics.paidOrderCount : 0),
    mediaSpend: round(metrics.mediaSpend),
    grossRoas: round(metrics.mediaSpend ? metrics.grossRevenue / metrics.mediaSpend : 0, 2),
    grossMargin: round(grossMargin),
    contributionAfterMedia: round(contributionAfterMedia),
    contributionMargin: round(metrics.netRevenue ? contributionAfterMedia / metrics.netRevenue : 0, 4),
    commissionTotal: round(metrics.commissionTotal),
    cmvTotal: round(metrics.cmvTotal),
    operatingExpensesTotal: round(metrics.operatingExpensesTotal),
    operatingResult: round(operatingResult),
    operatingMargin: round(metrics.netRevenue ? operatingResult / metrics.netRevenue : 0, 4),
  };
}

function getIsoWeekParts(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  return {
    year: utcDate.getUTCFullYear(),
    week: weekNumber,
    key: `${utcDate.getUTCFullYear()}-S${String(weekNumber).padStart(2, "0")}`,
    sortValue: utcDate.getTime(),
  };
}

export function detectProductType(title?: string | null, sku?: string | null) {
  const haystack = `${normalizeText(title)} ${normalizeText(sku)}`.trim();
  if (!haystack) {
    return null;
  }

  if (haystack.includes("cropped moletom")) return "Cropped moletom";
  if (haystack.includes("hoodie moletom") || haystack.includes(" moletom hoodie") || haystack.includes("hoodie")) {
    return "Hoodie moletom";
  }
  if (haystack.includes("sueter moletom") || haystack.includes("sueter")) return "Suéter moletom";
  if (haystack.includes("oversized")) return "Oversized";
  if (haystack.includes("peruana") || haystack.includes("algodao peruano")) return "Peruana";
  if (haystack.includes("body infantil") || haystack.includes("body")) return "Body Infantil";
  if (haystack.includes("infantil")) return "Infantil (tee)";
  if (haystack.includes("regata")) return "Regata";
  if (haystack.includes("cropped")) return "Cropped (tee)";
  if (haystack.includes("camiseta")) return "Camiseta clássica/fem";

  return null;
}

function getLatestDatasetDate(brand: BrandDataset) {
  const values = [
    ...brand.paidOrders.map((item) => item.orderDate),
    ...brand.orderItems.map((item) => item.orderDate),
    ...brand.salesLines.map((item) => item.orderDate),
    ...brand.media.map((item) => item.date),
    ...brand.expenses.map((item) => item.incurredOn),
  ]
    .map(parseDateValue)
    .filter((item): item is Date => Boolean(item))
    .sort((a, b) => b.getTime() - a.getTime());

  return values[0] ?? null;
}

function buildPeriodRange(referenceDate: Date, period: PeriodFilter) {
  const end = new Date(referenceDate);
  end.setHours(0, 0, 0, 0);

  if (period === "all") {
    return null;
  }

  const start = new Date(end);

  if (period === "month") {
    start.setDate(1);
    return {
      start: toDateKey(start),
      end: toDateKey(end),
    };
  }

  const days = period === "7d" ? 7 : period === "15d" ? 15 : 30;
  start.setDate(start.getDate() - (days - 1));

  return {
    start: toDateKey(start),
    end: toDateKey(end),
  };
}

function inRange(date: string, range: { start: string; end: string } | null) {
  if (!range) {
    return true;
  }

  return date >= range.start && date <= range.end;
}

export function getPeriodLabel(period: PeriodFilter) {
  switch (period) {
    case "7d":
      return "Últimos 7 dias";
    case "15d":
      return "Últimos 15 dias";
    case "30d":
      return "Últimos 30 dias";
    case "month":
      return "Mês atual";
    case "all":
      return "Todo o período";
  }
}

export function filterBrandDatasetByPeriod(
  brand: BrandDataset,
  period: PeriodFilter,
): BrandDataset {
  if (period === "all") {
    return brand;
  }

  const referenceDate = getLatestDatasetDate(brand);
  if (!referenceDate) {
    return brand;
  }

  const range = buildPeriodRange(referenceDate, period);
  const paidOrders = brand.paidOrders.filter((item) => inRange(item.orderDate, range));
  const paidOrderNumbers = new Set(paidOrders.map((item) => item.orderNumber));

  return {
    ...brand,
    paidOrders,
    orderItems: brand.orderItems.filter(
      (item) =>
        inRange(item.orderDate, range) &&
        (!item.orderNumber || paidOrderNumbers.has(item.orderNumber)),
    ),
    salesLines: brand.salesLines.filter(
      (item) =>
        inRange(item.orderDate, range) &&
        (!item.orderNumber || paidOrderNumbers.has(item.orderNumber)),
    ),
    media: brand.media.filter((item) => inRange(item.date, range)),
    expenses: brand.expenses.filter((item) => inRange(item.incurredOn, range)),
  };
}

export function getPaidOrders(brand: BrandDataset) {
  return brand.paidOrders.filter(
    (order) => PAID_STATUS.has(order.paymentStatus) && !order.isIgnored,
  );
}

export function getPaidOrderNumbers(brand: BrandDataset) {
  return new Set(getPaidOrders(brand).map((order) => order.orderNumber));
}

function getActiveOrderItems(brand: BrandDataset) {
  const paidOrderNumbers = getPaidOrderNumbers(brand);
  return brand.orderItems.filter(
    (item) => paidOrderNumbers.has(item.orderNumber) && !item.isIgnored,
  );
}

function getActiveMediaRows(brand: BrandDataset) {
  return brand.media.filter((row) => !row.isIgnored);
}

export function computeBrandMetrics(brand: BrandDataset): BrandSummaryMetrics {
  const paidOrders = getPaidOrders(brand);
  const paidItems = getActiveOrderItems(brand);
  const grossRevenue = paidItems.reduce((sum, item) => sum + item.grossValue, 0);
  const netRevenue = paidOrders.reduce((sum, order) => sum + order.orderValue, 0);
  const discounts = paidOrders.reduce((sum, order) => sum + order.discountValue, 0);
  const unitsSold = paidItems.reduce((sum, item) => sum + item.quantity, 0);
  const mediaSpend = getActiveMediaRows(brand).reduce((sum, row) => sum + row.spend, 0);
  const commissionTotal = paidOrders.reduce(
    (sum, order) => sum + order.commissionValue,
    0,
  );
  const cmvTotal = paidItems.reduce((sum, item) => sum + (item.cmvTotalApplied ?? 0), 0);
  const operatingExpensesTotal = brand.expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  return finalizeSummaryMetrics({
    grossRevenue,
    netRevenue,
    netAfterFees: 0,
    discounts,
    orderCount: brand.paidOrders.length,
    paidOrderCount: paidOrders.length,
    unitsSold,
    averageTicket: 0,
    mediaSpend,
    grossRoas: 0,
    grossMargin: 0,
    contributionAfterMedia: 0,
    contributionMargin: 0,
    commissionTotal,
    cmvTotal,
    operatingExpensesTotal,
    operatingResult: 0,
    operatingMargin: 0,
  });
}

export function buildDailySalesSeries(brand: BrandDataset): DailySalesPoint[] {
  const paidOrders = getPaidOrders(brand);
  const byDate = new Map<string, DailySalesPoint>();
  const orderToItems = new Map<string, number>();

  getActiveOrderItems(brand).forEach((item) => {
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
  const byProduct = new Map<string, TopProductPerformance>();

  getActiveOrderItems(brand).forEach((item) => {
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

  getActiveMediaRows(brand).forEach((row) => {
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
  getActiveMediaRows(brand).forEach((row) => {
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

export function buildDailyContributionSeries(brand: BrandDataset) {
  const byDate = new Map<
    string,
    {
      date: string;
      grossRevenue: number;
      discounts: number;
      netRevenue: number;
      cmv: number;
      mediaSpend: number;
      contribution: number;
    }
  >();

  getPaidOrders(brand).forEach((order) => {
    const current = byDate.get(order.orderDate) ?? {
      date: order.orderDate,
      grossRevenue: 0,
      discounts: 0,
      netRevenue: 0,
      cmv: 0,
      mediaSpend: 0,
      contribution: 0,
    };
    current.discounts += order.discountValue;
    current.netRevenue += order.orderValue;
    byDate.set(order.orderDate, current);
  });

  getActiveOrderItems(brand).forEach((item) => {
    const current = byDate.get(item.orderDate) ?? {
      date: item.orderDate,
      grossRevenue: 0,
      discounts: 0,
      netRevenue: 0,
      cmv: 0,
      mediaSpend: 0,
      contribution: 0,
    };
    current.grossRevenue += item.grossValue;
    current.cmv += item.cmvTotalApplied ?? 0;
    byDate.set(item.orderDate, current);
  });

  getActiveMediaRows(brand).forEach((row) => {
    const current = byDate.get(row.date) ?? {
      date: row.date,
      grossRevenue: 0,
      discounts: 0,
      netRevenue: 0,
      cmv: 0,
      mediaSpend: 0,
      contribution: 0,
    };
    current.mediaSpend += row.spend;
    byDate.set(row.date, current);
  });

  return [...byDate.values()]
    .map((item) => ({
      ...item,
      contribution: round(item.netRevenue - item.cmv - item.mediaSpend),
      grossRevenue: round(item.grossRevenue),
      discounts: round(item.discounts),
      netRevenue: round(item.netRevenue),
      cmv: round(item.cmv),
      mediaSpend: round(item.mediaSpend),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildExpenseSummary(brand: BrandDataset) {
  const byCategory = new Map<string, { categoryName: string; amount: number }>();

  brand.expenses.forEach((expense) => {
    const current = byCategory.get(expense.categoryId) ?? {
      categoryName: expense.categoryName,
      amount: 0,
    };
    current.amount += expense.amount;
    byCategory.set(expense.categoryId, current);
  });

  return [...byCategory.values()]
    .map((item) => ({
      categoryName: item.categoryName,
      amount: round(item.amount),
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function buildAnnualDreReport(brand: BrandDataset): AnnualDreReport {
  const paidOrders = getPaidOrders(brand);
  const paidItems = getActiveOrderItems(brand);
  const activeMedia = getActiveMediaRows(brand);
  const monthMetrics = new Map<string, BrandSummaryMetrics>();
  const expenseByCategory = new Map<string, MonthlyExpenseBreakdown>();

  function ensureMonth(monthKey: string) {
    const existing = monthMetrics.get(monthKey);
    if (existing) {
      return existing;
    }
    const next = buildEmptySummaryMetrics();
    monthMetrics.set(monthKey, next);
    return next;
  }

  paidOrders.forEach((order) => {
    const bucket = ensureMonth(toMonthKey(order.orderDate));
    bucket.netRevenue += order.orderValue;
    bucket.discounts += order.discountValue;
    bucket.commissionTotal += order.commissionValue;
    bucket.paidOrderCount += 1;
    bucket.orderCount += 1;
  });

  paidItems.forEach((item) => {
    const bucket = ensureMonth(toMonthKey(item.orderDate));
    bucket.grossRevenue += item.grossValue;
    bucket.cmvTotal += item.cmvTotalApplied ?? 0;
    bucket.unitsSold += item.quantity;
  });

  activeMedia.forEach((row) => {
    const bucket = ensureMonth(toMonthKey(row.date));
    bucket.mediaSpend += row.spend;
  });

  brand.expenses.forEach((expense) => {
    const monthKey = toMonthKey(expense.incurredOn);
    const bucket = ensureMonth(monthKey);
    bucket.operatingExpensesTotal += expense.amount;

    const currentCategory = expenseByCategory.get(expense.categoryId) ?? {
      categoryId: expense.categoryId,
      categoryName: expense.categoryName,
      valuesByMonth: {},
      total: 0,
    };
    currentCategory.valuesByMonth[monthKey] = round(
      (currentCategory.valuesByMonth[monthKey] ?? 0) + expense.amount,
    );
    currentCategory.total = round(currentCategory.total + expense.amount);
    expenseByCategory.set(expense.categoryId, currentCategory);
  });

  const months: MonthlyDreEntry[] = [...monthMetrics.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([monthKey, metrics]) => ({
      monthKey,
      label: formatMonthLabel(monthKey),
      metrics: finalizeSummaryMetrics(metrics),
    }));

  const total = months.reduce<BrandSummaryMetrics>((accumulator, month) => {
    accumulator.grossRevenue += month.metrics.grossRevenue;
    accumulator.netRevenue += month.metrics.netRevenue;
    accumulator.discounts += month.metrics.discounts;
    accumulator.orderCount += month.metrics.orderCount;
    accumulator.paidOrderCount += month.metrics.paidOrderCount;
    accumulator.unitsSold += month.metrics.unitsSold;
    accumulator.mediaSpend += month.metrics.mediaSpend;
    accumulator.commissionTotal += month.metrics.commissionTotal;
    accumulator.cmvTotal += month.metrics.cmvTotal;
    accumulator.operatingExpensesTotal += month.metrics.operatingExpensesTotal;
    return accumulator;
  }, buildEmptySummaryMetrics());

  return {
    months,
    total: finalizeSummaryMetrics(total),
    expenseBreakdown: [...expenseByCategory.values()].sort((a, b) => b.total - a.total),
  };
}

export function buildWeeklyPerformanceTable(brand: BrandDataset): WeeklyPerformanceRow[] {
  const rows = new Map<
    string,
    WeeklyPerformanceRow & {
      sortValue: number;
    }
  >();

  function ensureRow(dateValue: string) {
    const week = getIsoWeekParts(dateValue);
    if (!week) {
      return null;
    }
    const existing = rows.get(week.key);
    if (existing) {
      return existing;
    }
    const next = {
      periodKey: week.key,
      adsSpend: 0,
      impressions: 0,
      clicks: 0,
      metaPurchases: 0,
      realPieces: 0,
      grossRevenue: 0,
      cmv: 0,
      grossMargin: 0,
      adcostPerPiece: 0,
      averageTicket: 0,
      grossRoas: 0,
      netRoas: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      metaCvr: 0,
      realCvr: 0,
      sortValue: week.sortValue,
    };
    rows.set(week.key, next);
    return next;
  }

  getActiveMediaRows(brand).forEach((row) => {
    const bucket = ensureRow(row.date);
    if (!bucket) {
      return;
    }
    bucket.adsSpend += row.spend;
    bucket.impressions += row.impressions;
    bucket.clicks += row.linkClicks || row.clicksAll;
    bucket.metaPurchases += row.purchases;
  });

  getActiveOrderItems(brand).forEach((item) => {
    const bucket = ensureRow(item.orderDate);
    if (!bucket) {
      return;
    }
    bucket.realPieces += item.quantity;
    bucket.grossRevenue += item.grossValue;
    bucket.cmv += item.cmvTotalApplied ?? 0;
  });

  return [...rows.values()]
    .map((row) => {
      const grossMargin = row.grossRevenue - row.cmv;
      const clicksBase = row.clicks || 0;
      const impressionsBase = row.impressions || 0;
      const pieceBase = row.realPieces || 0;
      return {
        periodKey: row.periodKey,
        adsSpend: round(row.adsSpend),
        impressions: row.impressions,
        clicks: row.clicks,
        metaPurchases: row.metaPurchases,
        realPieces: row.realPieces,
        grossRevenue: round(row.grossRevenue),
        cmv: round(row.cmv),
        grossMargin: round(grossMargin),
        adcostPerPiece: round(pieceBase ? row.adsSpend / pieceBase : 0),
        averageTicket: round(pieceBase ? row.grossRevenue / pieceBase : 0),
        grossRoas: round(row.adsSpend ? row.grossRevenue / row.adsSpend : 0, 2),
        netRoas: round(row.adsSpend ? grossMargin / row.adsSpend : 0, 2),
        ctr: round(impressionsBase ? row.clicks / impressionsBase : 0, 4),
        cpc: round(clicksBase ? row.adsSpend / clicksBase : 0),
        cpm: round(impressionsBase ? (row.adsSpend / impressionsBase) * 1000 : 0),
        metaCvr: round(clicksBase ? row.metaPurchases / clicksBase : 0, 4),
        realCvr: round(clicksBase ? row.realPieces / clicksBase : 0, 4),
      };
    })
    .sort((a, b) => b.periodKey.localeCompare(a.periodKey));
}

export function buildMediaAnomalies(brand: BrandDataset): MediaAnomaly[] {
  const metrics = computeBrandMetrics(brand);
  const averageTicket = metrics.averageTicket || 0;
  const anomalies: MediaAnomaly[] = [];

  brand.media.forEach((row, index) => {
    if (row.impressions === 0 && row.spend > 0) {
      anomalies.push({
        id: `media-spend-without-impression-${row.id}-${index}`,
        target: "MEDIA",
        targetId: row.id,
        date: row.date,
        campaignName: row.campaignName,
        adsetName: row.adsetName,
        adName: row.adName,
        metric: "Investimento",
        value: toCurrencyLabel(row.spend),
        reason: "Gasto registrado com zero impressões. Vale revisar a exportação antes de considerar essa linha no resultado.",
        severity: "medium",
        isIgnored: Boolean(row.isIgnored),
        ignoreReason: row.ignoreReason ?? null,
      });
    }

    if (row.clicksAll > row.impressions && row.impressions > 0) {
      anomalies.push({
        id: `media-clicks-over-impressions-${row.id}-${index}`,
        target: "MEDIA",
        targetId: row.id,
        date: row.date,
        campaignName: row.campaignName,
        adsetName: row.adsetName,
        adName: row.adName,
        metric: "Cliques",
        value: `${row.clicksAll} cliques / ${row.impressions} impressões`,
        reason: "Cliques totais acima das impressões. Isso normalmente indica agregação inconsistente da linha.",
        severity: "high",
        isIgnored: Boolean(row.isIgnored),
        ignoreReason: row.ignoreReason ?? null,
      });
    }

    if (row.purchases > 0 && averageTicket > 0) {
      const valuePerPurchase = row.purchaseValue / row.purchases;
      if (valuePerPurchase > averageTicket * 4) {
        anomalies.push({
          id: `media-conversion-outlier-${row.id}-${index}`,
          target: "MEDIA",
          targetId: row.id,
          date: row.date,
          campaignName: row.campaignName,
          adsetName: row.adsetName,
          adName: row.adName,
          metric: "Valor por compra",
          value: toCurrencyLabel(valuePerPurchase),
          reason: "Valor por compra muito acima do ticket médio pago da marca. O operador deve revisar e decidir se essa linha entra no resultado.",
          severity: "high",
          isIgnored: Boolean(row.isIgnored),
          ignoreReason: row.ignoreReason ?? null,
        });
      }
    }
  });

  const averageOrderValue =
    getPaidOrders(brand).reduce((sum, order) => sum + order.orderValue, 0) /
    Math.max(getPaidOrders(brand).length, 1);

  brand.paidOrders.forEach((order, index) => {
    if (order.orderValue > Math.max(averageOrderValue * 3.5, averageTicket * 3.5) && order.orderValue > 300) {
      anomalies.push({
        id: `order-high-value-${order.id}-${index}`,
        target: "ORDER",
        targetId: order.id,
        orderNumber: order.orderNumber,
        date: order.orderDate,
        campaignName: `Pedido ${order.orderNumber}`,
        adsetName: order.customerName,
        adName: order.paymentStatus,
        metric: "Valor do pedido",
        value: toCurrencyLabel(order.orderValue),
        reason: "Pedido muito acima do padrão da base. O operador pode ignorar esse pedido se confirmar que é erro ou duplicidade.",
        severity: "high",
        isIgnored: Boolean(order.isIgnored),
        ignoreReason: order.ignoreReason ?? null,
      });
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
  const byProduct = new Map<
    string,
    {
      productId: string;
      productName: string;
      quantity: number;
      revenue: number;
      unitCost: number | null;
      productType: string | null;
    }
  >();

  const productRuleMap = new Map(
    brand.cmvEntries
      .filter((entry) => entry.matchType === "PRODUCT")
      .map((entry) => [normalizeText(entry.matchLabel), entry.unitCost]),
  );

  getActiveOrderItems(brand).forEach((item) => {
    const label = item.productSpecs ? `${item.productName} • ${item.productSpecs}` : item.productName;
    const key = normalizeText(label);
    const current = byProduct.get(key) ?? {
      productId: key,
      productName: label,
      quantity: 0,
      revenue: 0,
      unitCost: productRuleMap.get(normalizeText(item.productName)) ?? null,
      productType: item.productType ?? detectProductType(item.productName, item.sku),
    };
    current.quantity += item.quantity;
    current.revenue += item.grossValue;
    byProduct.set(key, current);
  });

  return [...byProduct.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .map((product) => ({
      ...product,
      revenue: round(product.revenue),
    }));
}

export function buildCmvTypeCandidates(brand: BrandDataset) {
  const byType = new Map<
    string,
    {
      typeKey: string;
      typeLabel: string;
      quantity: number;
      revenue: number;
      unitCost: number | null;
    }
  >();

  const typeRuleMap = new Map(
    brand.cmvEntries
      .filter((entry) => entry.matchType === "TYPE")
      .map((entry) => [normalizeText(entry.matchLabel), entry.unitCost]),
  );

  getActiveOrderItems(brand).forEach((item) => {
    const typeLabel = item.productType ?? detectProductType(item.productName, item.sku) ?? "Sem tipo detectado";
    const typeKey = normalizeText(typeLabel);
    const current = byType.get(typeKey) ?? {
      typeKey,
      typeLabel,
      quantity: 0,
      revenue: 0,
      unitCost: typeRuleMap.get(typeKey) ?? null,
    };
    current.quantity += item.quantity;
    current.revenue += item.grossValue;
    byType.set(typeKey, current);
  });

  return [...byType.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .map((item) => ({
      ...item,
      revenue: round(item.revenue),
    }));
}
