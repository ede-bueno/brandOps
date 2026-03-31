export type CsvFileKind =
  | "meta"
  | "feed"
  | "cmv_produtos"
  | "pedidos_pagos"
  | "lista_pedidos"
  | "lista_itens";

export type UserRole = "SUPER_ADMIN" | "BRAND_OWNER";

export type PeriodFilter = "today" | "7d" | "14d" | "30d" | "month" | "all" | "custom";

export type CmvMatchType = "SKU" | "PRODUCT" | "TYPE";

export type SanitizationDecision = "PENDING" | "KEPT" | "IGNORED";

export type IntegrationProvider = "ink" | "meta" | "ga4";

export type IntegrationMode = "manual_csv" | "api" | "disabled";

export type IntegrationSyncStatus = "idle" | "running" | "success" | "error";
export type MediaDataSource = "manual_csv" | "api";

export interface ImportRunInfo {
  kind: CsvFileKind;
  fileName: string;
  importedAt: string;
  rowCount: number;
}

export interface ImportedFileRun {
  fileName: string;
  importedAt: string;
  rowCount: number;
  insertedCount: number;
}

export interface ImportedFileInfo {
  kind: CsvFileKind;
  totalRuns: number;
  totalRows: number;
  totalInserted: number;
  lastImportedAt: string;
  runs: ImportedFileRun[];
}

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string | null;
  role: UserRole;
}

export interface CatalogProduct {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  additionalImageUrls?: string[];
  link?: string;
  price: number;
  salePrice: number | null;
  availability?: string;
  condition?: string;
  mpn?: string;
  googleProductCategory?: string;
  fbProductCategory?: string;
  brand?: string;
  productType?: string;
  collections?: string[];
  keywords?: string[];
  color?: string;
  gender?: string;
  material?: string;
  ageGroup?: string;
  size?: string;
}

export interface PaidOrder {
  id?: string;
  orderNumber: string;
  orderDate: string;
  paymentMethod: string;
  paymentStatus: string;
  customerName: string;
  itemsInOrder: number;
  orderValue: number;
  discountValue: number;
  commissionValue: number;
  couponName?: string | null;
  source: string;
  trackingUrl?: string;
  shippingState?: string;
  isIgnored?: boolean;
  ignoreReason?: string | null;
  sanitizationStatus?: SanitizationDecision;
  sanitizationNote?: string | null;
  sanitizedAt?: string | null;
  sanitizedBy?: string | null;
}

export interface SalesLine {
  id?: string;
  orderNumber: string;
  orderDate: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  orderDiscountValue: number;
  shippingValue: number;
  orderStatus: string;
  sku?: string;
  isIgnored?: boolean;
  ignoreReason?: string | null;
}

export interface OrderItem {
  id?: string;
  orderNumber: string;
  orderDate: string;
  customerName?: string;
  sku?: string;
  productName: string;
  productSpecs?: string;
  productType?: string | null;
  quantity: number;
  grossValue: number;
  cmvUnitApplied?: number;
  cmvTotalApplied?: number;
  cmvRuleType?: CmvMatchType | null;
  cmvRuleLabel?: string | null;
  isIgnored?: boolean;
  ignoreReason?: string | null;
}

export interface MediaRow {
  id?: string;
  date: string;
  campaignName: string;
  adsetName: string;
  accountName: string;
  adName: string;
  platform: string;
  placement: string;
  devicePlatform: string;
  delivery: string;
  reach: number;
  impressions: number;
  clicksAll: number;
  spend: number;
  purchases: number;
  purchaseValue: number;
  linkClicks: number;
  ctrAll: number;
  ctrLink: number;
  addToCart: number;
  isIgnored?: boolean;
  ignoreReason?: string | null;
  sanitizationStatus?: SanitizationDecision;
  sanitizationNote?: string | null;
  sanitizedAt?: string | null;
  sanitizedBy?: string | null;
  dataSource?: MediaDataSource;
}

export interface CmvEntry {
  id: string;
  matchType: CmvMatchType;
  matchValue: string;
  matchLabel: string;
  unitCost: number;
  source: string;
  validFrom: string;
  validTo?: string | null;
  updatedAt: string;
}

export interface CmvCheckpoint {
  id: string;
  createdAt: string;
  note?: string | null;
  itemsUpdated: number;
  unmatchedItems: number;
}

export interface CmvOrderDetail {
  orderNumber: string;
  orderDate: string;
  customerName: string;
  units: number;
  orderValue: number;
  cmvTotal: number;
  itemsSummary: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
  isSystem: boolean;
}

export interface BrandExpense {
  id: string;
  categoryId: string;
  categoryName: string;
  incurredOn: string;
  amount: number;
  description: string;
}

export interface BrandIntegrationConfig {
  id: string;
  provider: IntegrationProvider;
  mode: IntegrationMode;
  settings: {
    propertyId?: string;
    timezone?: string;
    adAccountId?: string;
    manualFallback?: boolean;
    syncWindowDays?: number;
  };
  lastSyncAt?: string | null;
  lastSyncStatus: IntegrationSyncStatus;
  lastSyncError?: string | null;
}

export interface Ga4DailyPerformanceRow {
  id: string;
  date: string;
  sourceMedium: string;
  campaignName: string;
  landingPage: string;
  sessions: number;
  totalUsers: number;
  pageViews: number;
  addToCarts: number;
  beginCheckouts: number;
  purchases: number;
  purchaseRevenue: number;
  lastSyncedAt?: string | null;
}

export interface Ga4ItemDailyPerformanceRow {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  itemBrand: string;
  itemCategory: string;
  itemViews: number;
  addToCarts: number;
  checkouts: number;
  ecommercePurchases: number;
  itemPurchaseQuantity: number;
  itemRevenue: number;
  cartToViewRate: number;
  purchaseToViewRate: number;
  lastSyncedAt?: string | null;
}

export interface BrandDataset {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  files: Partial<Record<CsvFileKind, ImportedFileInfo>>;
  catalog: CatalogProduct[];
  paidOrders: PaidOrder[];
  salesLines: SalesLine[];
  orderItems: OrderItem[];
  media: MediaRow[];
  cmvEntries: CmvEntry[];
  cmvCheckpoints: CmvCheckpoint[];
  expenseCategories: ExpenseCategory[];
  expenses: BrandExpense[];
  integrations: BrandIntegrationConfig[];
  ga4DailyPerformance: Ga4DailyPerformanceRow[];
  ga4ItemDailyPerformance: Ga4ItemDailyPerformanceRow[];
}

export interface CustomDateRange {
  from: string;
  to: string;
}

export interface WorkspaceState {
  brands: BrandDataset[];
  activeBrandId: string | null;
}

export interface BrandSummaryMetrics {
  grossRevenue: number;
  rob: number; // Receita Operacional Bruta
  netRevenue: number;
  rld: number; // Receita Líquida Disponível (netRevenue - discounts)
  netAfterFees: number;
  discounts: number;
  orderCount: number;
  paidOrderCount: number;
  unitsSold: number;
  averageTicket: number;
  mediaSpend: number;
  grossRoas: number;
  grossMargin: number;
  contributionAfterMedia: number;
  contributionMargin: number; // Margem de Contribuição (rld - cmv - mediaSpend)
  commissionTotal: number;
  cmvTotal: number;
  fixedExpensesTotal: number; // Despesas Fixas
  operatingExpensesTotal: number;
  operatingResult: number;
  netResult: number; // Resultado Líquido (Margem de Contribuição - Despesas Fixas)
  operatingMargin: number;
  itemsPerOrder: number; // IPT - Peças por Pedido
  revenuePerUnit: number; // RLD / Peças
  avgMarkup: number; // RLD / CMV
  breakEvenPoint: number; // Ponto de Equilíbrio
  couponDiscounts: number;
  inkProfit: number;
  averageInkProfit: number;
  hasItemDetailCoverage: boolean;
}





export interface CampaignPerformance {
  campaignName: string;
  spend: number;
  purchaseValue: number;
  purchases: number;
  impressions: number;
  clicks: number;
  roas: number;
}

export interface DailySalesPoint {
  date: string;
  revenue: number;
  orders: number;
  items: number;
}

export interface DailyMediaPoint {
  date: string;
  spend: number;
  purchaseValue: number;
  purchases: number;
}

export interface TopProductPerformance {
  productKey: string;
  productName: string;
  quantity: number;
  grossRevenue: number;
}

export interface MediaAnomaly {
  id: string;
  target: "MEDIA" | "ORDER";
  targetId?: string;
  orderNumber?: string;
  date: string;
  campaignName: string;
  adsetName: string;
  adName: string;
  metric: string;
  value: string;
  reason: string;
  severity: "high" | "medium";
  isIgnored: boolean;
  ignoreReason?: string | null;
  sanitizationStatus: SanitizationDecision;
  sanitizationNote?: string | null;
  sanitizedAt?: string | null;
}

export interface MonthlyDreEntry {
  monthKey: string;
  label: string;
  metrics: BrandSummaryMetrics;
}

export interface MonthlyExpenseBreakdown {
  categoryId: string;
  categoryName: string;
  valuesByMonth: Record<string, number>;
  total: number;
}

export interface AnnualDreReport {
  months: MonthlyDreEntry[];
  total: BrandSummaryMetrics;
  expenseBreakdown: MonthlyExpenseBreakdown[];
}

export interface WeeklyPerformanceRow {
  periodKey: string;
  adsSpend: number;
  impressions: number;
  clicks: number;
  metaPurchases: number;
  realPieces: number;
  grossRevenue: number;
  cmv: number;
  grossMargin: number;
  adcostPerPiece: number;
  averageTicket: number;
  grossRoas: number;
  netRoas: number;
  ctr: number;
  cpc: number;
  cpm: number;
  metaCvr: number;
  realCvr: number;
}

export interface TrafficSummaryMetrics {
  sessions: number;
  totalUsers: number;
  pageViews: number;
  addToCarts: number;
  beginCheckouts: number;
  purchases: number;
  purchaseRevenue: number;
  sessionToCartRate: number;
  checkoutRate: number;
  purchaseRate: number;
  revenuePerSession: number;
}

export interface TrafficTimeSeriesPoint {
  date: string;
  sessions: number;
  totalUsers: number;
  addToCarts: number;
  beginCheckouts: number;
  purchases: number;
  purchaseRevenue: number;
}

export interface TrafficBreakdownRow {
  key: string;
  label: string;
  sessions: number;
  totalUsers: number;
  pageViews: number;
  addToCarts: number;
  beginCheckouts: number;
  purchases: number;
  purchaseRevenue: number;
}

export type ProductInsightClassification =
  | "validated"
  | "opportunity"
  | "low_traffic"
  | "review";

export type ProductDecisionAction =
  | "scale_now"
  | "boost_traffic"
  | "review_listing"
  | "watch";

export type ProductDecisionConfidence = "high" | "medium" | "low";

export interface ProductInsightRow {
  key: string;
  itemIds: string[];
  stampName: string;
  productType: string;
  views: number;
  addToCarts: number;
  checkouts: number;
  purchases: number;
  quantity: number;
  revenue: number;
  addToCartRate: number;
  conversionRate: number;
  classification: ProductInsightClassification;
  decision: ProductDecisionAction;
  decisionConfidence: ProductDecisionConfidence;
  decisionTitle: string;
  decisionSummary: string;
  recommendedAction: string;
  rationale: string[];
  previousViews: number;
  previousAddToCartRate: number;
  viewGrowth: number;
  addToCartRateDelta: number;
  checkoutRate: number;
  purchaseRate: number;
  realUnitsSold: number;
  realGrossRevenue: number;
}
