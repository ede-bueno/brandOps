export type CsvFileKind =
  | "meta"
  | "feed"
  | "pedidos_pagos"
  | "lista_pedidos"
  | "lista_itens";

export type UserRole = "SUPER_ADMIN" | "BRAND_OWNER";

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
}

export interface SalesLine {
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
}

export interface OrderItem {
  orderNumber: string;
  orderDate: string;
  customerName?: string;
  productName: string;
  productSpecs?: string;
  quantity: number;
  grossValue: number;
}

export interface MediaRow {
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
}

export interface CmvEntry {
  productId: string;
  productName: string;
  unitCost: number;
  updatedAt: string;
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
}

export interface WorkspaceState {
  brands: BrandDataset[];
  activeBrandId: string | null;
}

export interface BrandSummaryMetrics {
  grossRevenue: number;
  netRevenue: number;
  discounts: number;
  orderCount: number;
  paidOrderCount: number;
  unitsSold: number;
  averageTicket: number;
  mediaSpend: number;
  grossRoas: number;
  contributionAfterMedia: number;
  contributionMargin: number;
  commissionTotal: number;
  cmvTotal: number;
  operatingResult: number;
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
  date: string;
  campaignName: string;
  adsetName: string;
  adName: string;
  metric: string;
  value: string;
  reason: string;
  severity: "high" | "medium";
}
