import { google } from "googleapis";
import type { analyticsdata_v1beta } from "googleapis";

type ServiceAccountPayload = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

export type Ga4SyncRow = {
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
};

export type Ga4ItemSyncRow = {
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
};

function getGa4ServiceAccount() {
  const raw = process.env.GA4_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("GA4_SERVICE_ACCOUNT_JSON não configurada.");
  }

  let parsed: ServiceAccountPayload;
  try {
    parsed = JSON.parse(raw) as ServiceAccountPayload;
  } catch {
    throw new Error("GA4_SERVICE_ACCOUNT_JSON inválida.");
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Credencial do GA4 incompleta.");
  }

  return {
    ...parsed,
    private_key: parsed.private_key.replace(/\\n/g, "\n"),
  };
}

function toInteger(value?: string | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function toNumber(value?: string | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateDimension(value?: string | null) {
  if (!value || value.length !== 8) {
    return "";
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export async function fetchGa4DailyPerformance(
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<Ga4SyncRow[]> {
  const credentials = getGa4ServiceAccount();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });

  const analyticsData = google.analyticsdata({
    version: "v1beta",
    auth,
  });

  const response = await analyticsData.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      dimensions: [
        { name: "date" },
        { name: "sessionSourceMedium" },
        { name: "sessionCampaignName" },
        { name: "landingPagePlusQueryString" },
      ],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "screenPageViews" },
        { name: "addToCarts" },
        { name: "checkouts" },
        { name: "ecommercePurchases" },
        { name: "purchaseRevenue" },
      ],
      keepEmptyRows: false,
      limit: "100000",
      returnPropertyQuota: true,
    },
  } as analyticsdata_v1beta.Params$Resource$Properties$Runreport);

  const data = response.data;
  const rows = data.rows ?? [];
  return rows.map((row: analyticsdata_v1beta.Schema$Row) => ({
    date: formatDateDimension(row.dimensionValues?.[0]?.value),
    sourceMedium: row.dimensionValues?.[1]?.value?.trim() ?? "",
    campaignName: row.dimensionValues?.[2]?.value?.trim() ?? "",
    landingPage: row.dimensionValues?.[3]?.value?.trim() ?? "",
    sessions: toInteger(row.metricValues?.[0]?.value),
    totalUsers: toInteger(row.metricValues?.[1]?.value),
    pageViews: toInteger(row.metricValues?.[2]?.value),
    addToCarts: toInteger(row.metricValues?.[3]?.value),
    beginCheckouts: toInteger(row.metricValues?.[4]?.value),
    purchases: toInteger(row.metricValues?.[5]?.value),
    purchaseRevenue: toNumber(row.metricValues?.[6]?.value),
  }));
}

export async function fetchGa4ItemDailyPerformance(
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<Ga4ItemSyncRow[]> {
  const credentials = getGa4ServiceAccount();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });

  const analyticsData = google.analyticsdata({
    version: "v1beta",
    auth,
  });

  const response = await analyticsData.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      dimensions: [
        { name: "date" },
        { name: "itemId" },
        { name: "itemName" },
        { name: "itemBrand" },
        { name: "itemCategory" },
      ],
      metrics: [
        { name: "itemsViewed" },
        { name: "itemsAddedToCart" },
        { name: "itemsCheckedOut" },
        { name: "itemsPurchased" },
        { name: "itemPurchaseQuantity" },
        { name: "itemRevenue" },
        { name: "cartToViewRate" },
        { name: "purchaseToViewRate" },
      ],
      keepEmptyRows: false,
      limit: "100000",
      returnPropertyQuota: true,
    },
  } as analyticsdata_v1beta.Params$Resource$Properties$Runreport);

  const data = response.data;
  const rows = data.rows ?? [];
  return rows.map((row: analyticsdata_v1beta.Schema$Row) => ({
    date: formatDateDimension(row.dimensionValues?.[0]?.value),
    itemId: row.dimensionValues?.[1]?.value?.trim() ?? "",
    itemName: row.dimensionValues?.[2]?.value?.trim() ?? "",
    itemBrand: row.dimensionValues?.[3]?.value?.trim() ?? "",
    itemCategory: row.dimensionValues?.[4]?.value?.trim() ?? "",
    itemViews: toInteger(row.metricValues?.[0]?.value),
    addToCarts: toInteger(row.metricValues?.[1]?.value),
    checkouts: toInteger(row.metricValues?.[2]?.value),
    ecommercePurchases: toInteger(row.metricValues?.[3]?.value),
    itemPurchaseQuantity: toInteger(row.metricValues?.[4]?.value),
    itemRevenue: toNumber(row.metricValues?.[5]?.value),
    cartToViewRate: toNumber(row.metricValues?.[6]?.value),
    purchaseToViewRate: toNumber(row.metricValues?.[7]?.value),
  }));
}
