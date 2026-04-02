export type CsvFileKind =
  | "meta"
  | "feed"
  | "cmv_produtos"
  | "pedidos_pagos"
  | "lista_pedidos"
  | "lista_itens";

export type UserRole = "SUPER_ADMIN" | "BRAND_OWNER";

export type PeriodFilter =
  | "today"
  | "7d"
  | "14d"
  | "30d"
  | "month"
  | "lastMonth"
  | "all"
  | "custom";

export type CmvMatchType = "SKU" | "PRODUCT" | "TYPE";

export type SanitizationDecision = "PENDING" | "KEPT" | "IGNORED";
export type SanitizationReviewAction = "PENDING" | "KEPT" | "IGNORED";

export type IntegrationProvider = "ink" | "meta" | "ga4";

export type IntegrationMode = "manual_csv" | "api" | "disabled";

export type IntegrationSyncStatus = "idle" | "running" | "success" | "error";
export type MediaDataSource = "manual_csv" | "api";
export type CatalogDataSource = "manual_feed" | "meta_catalog";

export interface CatalogSourcePresence {
  manualFeed: boolean;
  metaCatalog: boolean;
}

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
  dataSource?: CatalogDataSource;
  externalCatalogId?: string | null;
  sourcePresence?: CatalogSourcePresence;
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
  rowHash?: string | null;
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
  isActive: boolean;
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
      catalogId?: string;
      manualFallback?: boolean;
      syncWindowDays?: number;
      catalogSyncAt?: string;
      catalogSyncStatus?: string;
      catalogSyncError?: string | null;
      catalogProductCount?: number;
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
  hydration: {
    catalogLoaded: boolean;
    salesLinesLoaded: boolean;
    ga4ItemDailyLoaded: boolean;
  };
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
  sanitizationReviews: SanitizationReview[];
}

export interface SanitizationReview {
  id: string;
  sourceTable: "media_performance" | "orders" | "order_items";
  sourceRowId: string;
  sourceKey?: string | null;
  anomalyType: string;
  action: SanitizationReviewAction;
  reason?: string | null;
  reviewedBy?: string | null;
  reviewedAt: string;
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

export interface SalesReportSummary {
  grossRevenue: number;
  discounts: number;
  commissionTotal: number;
  paidOrderCount: number;
  unitsSold: number;
  averageTicket: number;
  couponDiscounts: number;
  hasItemDetailCoverage: boolean;
}

export interface SalesReport {
  summary: SalesReportSummary;
  dailySeries: DailySalesPoint[];
  topProducts: TopProductPerformance[];
}

export interface SalesDetailReport {
  dailySeries: DailySalesPoint[];
  topProducts: TopProductPerformance[];
}

export interface MediaReportSummary {
  spend: number;
  purchaseValue: number;
  purchases: number;
  reach: number;
  impressions: number;
  clicksAll: number;
  linkClicks: number;
  attributedRoas: number;
  ctrAll: number;
  ctrLink: number;
  cpc: number;
  cpa: number;
}

export interface MediaReportDailyPoint extends DailyMediaPoint {
  reach: number;
  impressions: number;
  clicksAll: number;
  linkClicks: number;
  attributedRoas: number;
  ctrAll: number;
  ctrLink: number;
  cpc: number;
  cpa: number;
}

export type MediaCampaignAction = "scale" | "monitor" | "review";

export interface MediaCampaignReportRow {
  campaignName: string;
  spend: number;
  purchaseValue: number;
  purchases: number;
  reach: number;
  impressions: number;
  clicksAll: number;
  linkClicks: number;
  roas: number;
  ctrAll: number;
  ctrLink: number;
  cpc: number;
  cpa: number;
  action: MediaCampaignAction;
  summary: string;
}

export interface MediaCommandRoom {
  bestScale: MediaCampaignReportRow | null;
  priorityReview: MediaCampaignReportRow | null;
  narrative: string;
  bestScaleSummary: string | null;
  priorityReviewSummary: string | null;
}

export interface MediaSignal {
  tone: "positive" | "warning" | "neutral";
  title: string;
  description: string;
}

export interface MediaSignals {
  attributedRoas: MediaSignal;
  ctrAll: MediaSignal;
  ctrLink: MediaSignal;
  cpc: MediaSignal;
  cpa: MediaSignal;
}

export interface MediaHighlights {
  topCampaignBySpend: MediaCampaignReportRow | null;
}

export interface MediaPlaybookGroup {
  title: string;
  description: string;
  count: number;
  items: MediaCampaignReportRow[];
}

export interface MediaAnalysis {
  narrativeTitle: string;
  narrativeBody: string;
  nextActions: string[];
  topRisk: string | null;
  topOpportunity: string | null;
}

export interface MediaReportMeta {
  generatedAt: string;
  from: string | null;
  to: string | null;
  mode: string;
  manualFallback: boolean;
  hasData: boolean;
}

export interface MediaReport {
  summary: MediaReportSummary;
  dailySeries: MediaReportDailyPoint[];
  campaigns: MediaCampaignReportRow[];
  commandRoom: MediaCommandRoom;
  highlights: MediaHighlights;
  signals: MediaSignals;
  playbook: {
    scale: MediaPlaybookGroup;
    review: MediaPlaybookGroup;
    monitor: MediaPlaybookGroup;
  };
  analysis: MediaAnalysis;
  meta: MediaReportMeta;
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

export interface SanitizationReportMeta {
  generatedAt: string;
  pendingCount: number;
  historyCount: number;
  hasData: boolean;
}

export interface SanitizationReport {
  pending: MediaAnomaly[];
  history: MediaAnomaly[];
  meta: SanitizationReportMeta;
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

export interface FinancialReportSummary extends BrandSummaryMetrics {
  activeMonthCount: number;
  averageMonthlyFixedExpenses: number;
  breakEvenDisplay: number | null;
  breakEvenReliable: boolean;
  breakEvenReason: string;
}

export interface FinancialReportMonthHighlight {
  monthKey: string;
  label: string;
  contributionAfterMedia: number;
  netResult: number;
  rld: number;
  fixedExpensesTotal: number;
  contributionMargin: number;
  operatingMargin: number;
}

export interface FinancialReportShares {
  cmvShare: number;
  mediaShare: number;
  expenseShare: number;
  variableCostShare: number;
}

export interface FinancialReportMomentum {
  tone: "positive" | "warning" | "neutral";
  title: string;
  description: string;
  delta: number;
  currentAverage: number;
  previousAverage: number;
  hasComparison: boolean;
}

export interface FinancialReportTopExpenseCategory {
  categoryId: string;
  categoryName: string;
  total: number;
}

export interface FinancialReportAnalysis {
  bestContributionMonth: FinancialReportMonthHighlight | null;
  worstContributionMonth: FinancialReportMonthHighlight | null;
  latestMonth: FinancialReportMonthHighlight | null;
  topExpenseCategory: FinancialReportTopExpenseCategory | null;
  shares: FinancialReportShares;
  momentum: FinancialReportMomentum;
}

export interface AnnualDreReport {
  months: MonthlyDreEntry[];
  total: FinancialReportSummary;
  expenseBreakdown: MonthlyExpenseBreakdown[];
  analysis: FinancialReportAnalysis;
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
  purchaseRate: number;
  revenuePerSession: number;
}

export interface TrafficReportHighlight {
  key: string;
  label: string;
  sessions: number;
  purchases: number;
  purchaseRevenue: number;
  purchaseRate: number;
  revenuePerSession: number;
  summary: string | null;
}

export interface TrafficSignal {
  tone: "positive" | "warning" | "neutral";
  title: string;
  description: string;
}

export interface TrafficSignals {
  revenuePerSession: TrafficSignal;
  sessionToCartRate: TrafficSignal;
  checkoutRate: TrafficSignal;
  purchaseRate: TrafficSignal;
}

export interface TrafficHighlights {
  topSource: TrafficReportHighlight | null;
  topCampaign: TrafficReportHighlight | null;
  topLanding: TrafficReportHighlight | null;
  topRevenueLanding: TrafficReportHighlight | null;
}

export interface TrafficPlaybookGroup {
  title: string;
  description: string;
  count: number;
  items: TrafficBreakdownRow[];
}

export interface TrafficAnalysis {
  narrativeTitle: string;
  narrativeBody: string;
  nextActions: string[];
  topOpportunity: string | null;
  topRisk: string | null;
}

export interface TrafficReportMeta {
  generatedAt: string;
  from: string | null;
  to: string | null;
  hasData: boolean;
}

export interface TrafficReport {
  summary: TrafficSummaryMetrics;
  dailySeries: Array<
    TrafficTimeSeriesPoint & {
      purchaseRate: number;
      revenuePerSession: number;
      sessionToCartRate: number;
      checkoutRate: number;
    }
  >;
  sources: TrafficBreakdownRow[];
  campaigns: TrafficBreakdownRow[];
  landingPages: TrafficBreakdownRow[];
  story: string;
  frictionSignal: string;
  highlights: TrafficHighlights;
  signals: TrafficSignals;
  playbook: {
    scale: TrafficPlaybookGroup;
    review: TrafficPlaybookGroup;
    monitor: TrafficPlaybookGroup;
  };
  analysis: TrafficAnalysis;
  meta: TrafficReportMeta;
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

export interface ProductInsightTrendPoint {
  date: string;
  views: number;
  addToCarts: number;
  addToCartRate: number;
}

export type ProductInsightSort =
  | "priority"
  | "views"
  | "addToCartRate"
  | "realUnitsSold"
  | "viewGrowth";

export interface ProductInsightDecisionSummary {
  decision: ProductDecisionAction;
  title: string;
  description: string;
  count: number;
  items: ProductInsightRow[];
}

export interface ProductInsightClassificationSummary {
  classification: ProductInsightClassification;
  label: string;
  count: number;
  bullets: string[];
}

export interface ProductInsightOverview {
  totalRows: number;
  totalViews: number;
  totalAddToCarts: number;
  totalRevenue: number;
  totalRealUnitsSold: number;
  totalRealGrossRevenue: number;
  averageAddToCartRate: number;
  averageCheckoutRate: number;
  averagePurchaseRate: number;
}

export interface ProductInsightMomentum {
  gaining: ProductInsightRow[];
  losing: ProductInsightRow[];
}

export interface ProductInsightScatterPoint {
  classification: ProductInsightClassification;
  views: number;
  addToCartRate: number;
  revenue: number;
  label: string;
  decisionTitle: string;
}

export interface ProductInsightScatterSeries {
  decision: ProductDecisionAction;
  title: string;
  points: ProductInsightScatterPoint[];
}

export interface ProductInsightSortOption {
  value: ProductInsightSort;
  label: string;
}

export interface ProductInsightsFilters {
  decision: ProductDecisionAction | "all";
  classification: ProductInsightClassification | "all";
  productType: string | "all";
  sort: ProductInsightSort;
  availableTypes: string[];
  availableSorts: ProductInsightSortOption[];
}

export interface ProductInsightsMeta {
  generatedAt: string;
  from: string | null;
  to: string | null;
  hasData: boolean;
  heroKey: string | null;
}

export interface ProductInsightHero {
  row: ProductInsightRow | null;
  title: string;
  description: string;
  bullets: string[];
}

export interface ProductInsightsPlaybookGroup {
  decision: ProductDecisionAction;
  title: string;
  description: string;
  count: number;
  items: ProductInsightRow[];
}

export interface ProductInsightsAnalysis {
  narrativeTitle: string;
  narrativeBody: string;
  nextActions: string[];
  topOpportunity: string | null;
  topRisk: string | null;
}

export interface ProductInsightsReport {
  rows: ProductInsightRow[];
  trendByKey: Record<string, ProductInsightTrendPoint[]>;
  overview: ProductInsightOverview;
  featured: ProductInsightRow[];
  watchlist: ProductInsightRow[];
  decisions: ProductInsightDecisionSummary[];
  classifications: ProductInsightClassificationSummary[];
  momentum: ProductInsightMomentum;
  scatter: ProductInsightScatterPoint[];
  scatterSeries: ProductInsightScatterSeries[];
  hero: ProductInsightHero;
  playbook: ProductInsightsPlaybookGroup[];
  analysis: ProductInsightsAnalysis;
  filters: ProductInsightsFilters;
  meta: ProductInsightsMeta;
}

export type CatalogStatusFilter = "all" | "sold" | "unsold";

export interface CatalogReportRow extends CatalogProduct {
  unitsSold: number;
  printName: string;
  galleryCount: number;
}

export interface CatalogReportSummary {
  totalProducts: number;
  soldProducts: number;
  totalUnitsSold: number;
  productsWithGallery: number;
  metaCatalogProducts: number;
  manualFeedProducts: number;
}

export interface CatalogReportOptions {
  productTypes: string[];
  collections: string[];
}

export interface CatalogReportHighlights {
  topSellers: CatalogReportRow[];
  uncovered: CatalogReportRow[];
}

export interface CatalogPlaybookGroup {
  title: string;
  description: string;
  count: number;
  items: CatalogReportRow[];
}

export interface CatalogAnalysis {
  narrativeTitle: string;
  narrativeBody: string;
  nextActions: string[];
  topOpportunity: string | null;
  topRisk: string | null;
}

export interface CatalogReportFilters {
  search: string;
  status: CatalogStatusFilter;
  productType: string | "all";
  collection: string | "all";
}

export interface CatalogReportMeta {
  generatedAt: string;
  from: string | null;
  to: string | null;
  sourceMode: "manual_feed" | "meta_catalog" | "mixed";
  sourceLabel: string;
  metaCatalogReady: boolean;
  hasData: boolean;
}

export interface CatalogReport {
  summary: CatalogReportSummary;
  rows: CatalogReportRow[];
  options: CatalogReportOptions;
  highlights: CatalogReportHighlights;
  playbook: {
    scale: CatalogPlaybookGroup;
    review: CatalogPlaybookGroup;
    monitor: CatalogPlaybookGroup;
  };
  analysis: CatalogAnalysis;
  filters: CatalogReportFilters;
  meta: CatalogReportMeta;
}
