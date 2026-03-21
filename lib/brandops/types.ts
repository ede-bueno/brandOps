export type CsvFileKind =
  | "meta"
  | "feed"
  | "cmv_produtos"
  | "pedidos_pagos"
  | "lista_pedidos"
  | "lista_itens";

export type UserRole = "SUPER_ADMIN" | "BRAND_OWNER";

export type PeriodFilter = "7d" | "15d" | "30d" | "month" | "all";

export type CmvMatchType = "SKU" | "PRODUCT" | "TYPE";

export interface ImportedFileInfo {
  kind: CsvFileKind;
  fileName: string;
  importedAt: string;
  rowCount: number;
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
  link?: string;
  price: number;
  salePrice: number | null;
  brand?: string;
  color?: string;
  gender?: string;
  material?: string;
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
  source: string;
  trackingUrl?: string;
  shippingState?: string;
  isIgnored?: boolean;
  ignoreReason?: string | null;
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
}

export interface CmvEntry {
  id: string;
  matchType: CmvMatchType;
  matchValue: string;
  matchLabel: string;
  unitCost: number;
  source: string;
  validFrom: string;
  updatedAt: string;
}

export interface CmvCheckpoint {
  id: string;
  createdAt: string;
  note?: string | null;
  itemsUpdated: number;
  unmatchedItems: number;
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
}

export interface WorkspaceState {
  brands: BrandDataset[];
  activeBrandId: string | null;
}

export interface BrandSummaryMetrics {
  grossRevenue: number;
  netRevenue: number;
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
  contributionMargin: number;
  commissionTotal: number;
  cmvTotal: number;
  operatingExpensesTotal: number;
  operatingResult: number;
  operatingMargin: number;
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
