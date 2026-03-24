import Papa from "papaparse";
import type {
  BrandDataset,
  CatalogProduct,
  CsvFileKind,
  ImportRunInfo,
  ImportedFileInfo,
  MediaRow,
  OrderItem,
  PaidOrder,
  SalesLine,
} from "./types";

type CsvRecord = Record<string, string>;

const META_REQUIRED = ["Nome da campanha", "Valor usado (BRL)", "Dia"];
const FEED_REQUIRED = ["id", "title", "price", "image_link"];
const CMV_REQUIRED = ["Produto", "CMV_Unit", "Tipo"];
const PEDIDOS_REQUIRED = ["Número do pedido", "ID produto", "Descrição"];
const LISTA_PEDIDOS_REQUIRED = [
  "Pedido",
  "Status de Pagamento",
  "Valor do Pedido",
];
const LISTA_ITENS_REQUIRED = ["Pedido", "Nome do produto", "Valor Bruto"];

function normalizeHeader(header: string) {
  return header.trim().replace(/\uFEFF/g, "");
}

function ensureUniqueHeaders(headers: string[]) {
  const counts = new Map<string, number>();
  return headers.map((header) => {
    const normalized = normalizeHeader(header);
    const count = counts.get(normalized) ?? 0;
    counts.set(normalized, count + 1);
    return count === 0 ? normalized : `${normalized}__${count + 1}`;
  });
}

function toObjects(rows: string[][]): CsvRecord[] {
  if (!rows.length) {
    return [];
  }

  const headers = ensureUniqueHeaders(rows[0]);
  return rows.slice(1).filter((row) => row.some((value) => value?.trim())).map((row) => {
    const record: CsvRecord = {};
    headers.forEach((header, index) => {
      record[header] = (row[index] ?? "").trim();
    });
    return record;
  });
}

function parseCsvMatrix(text: string) {
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true,
    delimitersToGuess: [",", ";", "\t", "|"],
  });

  if (result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

function matchesRequired(headers: string[], required: string[]) {
  const headerSet = new Set(headers.map(normalizeHeader));
  return required.every((column) => headerSet.has(column));
}

export function detectCsvFileKind(headers: string[]): CsvFileKind {
  if (matchesRequired(headers, META_REQUIRED)) {
    return "meta";
  }
  if (matchesRequired(headers, FEED_REQUIRED)) {
    return "feed";
  }
  if (matchesRequired(headers, CMV_REQUIRED)) {
    return "cmv_produtos";
  }
  if (matchesRequired(headers, PEDIDOS_REQUIRED)) {
    return "pedidos_pagos";
  }
  if (matchesRequired(headers, LISTA_PEDIDOS_REQUIRED)) {
    return "lista_pedidos";
  }
  if (matchesRequired(headers, LISTA_ITENS_REQUIRED)) {
    return "lista_itens";
  }
  throw new Error("Arquivo CSV não reconhecido. Verifique o cabeçalho exportado.");
}

export function parseCurrencyLike(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const trimmed = value.trim().replace(/\u00A0/g, " ");
  if (!trimmed) {
    return 0;
  }

  const isNegative = /^\(.*\)$/.test(trimmed) || trimmed.startsWith("-");
  const sanitized = trimmed
    .replace(/[R$\s%]/g, "")
    .replace(/[()]/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!sanitized) {
    return 0;
  }

  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");
  let normalized = sanitized;

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      normalized = sanitized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = sanitized.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    const decimalDigits = sanitized.length - lastComma - 1;
    normalized =
      decimalDigits > 0 && decimalDigits <= 2
        ? sanitized.replace(/\./g, "").replace(",", ".")
        : sanitized.replace(/,/g, "");
  } else if ((sanitized.match(/\./g) ?? []).length > 1) {
    normalized = sanitized.replace(/\./g, "");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return isNegative ? -Math.abs(parsed) : parsed;
}

export function parseIntegerLike(value: string | undefined) {
  return Math.round(parseCurrencyLike(value));
}

export function toIsoDate(value: string | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  }

  return raw;
}

function parseFeed(records: CsvRecord[]): CatalogProduct[] {
  return records.map((record) => ({
    id: record.id,
    title: record.title,
    description: record.description,
    imageUrl: record.image_link,
    link: record.link,
    price: parseCurrencyLike(record.price),
    salePrice: record.sale_price ? parseCurrencyLike(record.sale_price) : null,
    brand: record.brand,
    color: record.color,
    gender: record.gender,
    material: record.material,
    size: record.size,
  }));
}

function parsePaidOrders(records: CsvRecord[]): PaidOrder[] {
  return records.map((record) => ({
    orderNumber: record.Pedido,
    orderDate: toIsoDate(record.Data),
    paymentMethod: record["Método de Pagamento"],
    paymentStatus: record["Status de Pagamento"],
    customerName: record.Cliente,
    itemsInOrder: parseIntegerLike(record["Items no Pedido"]),
    orderValue: parseCurrencyLike(record["Valor do Pedido"]),
    discountValue: parseCurrencyLike(record["Valor do Desconto"]),
    commissionValue: parseCurrencyLike(record.Comissao),
    couponName: record["Nome do Cupom"]?.trim() || null,
    source: record.Origem,
    trackingUrl: record["Link de Rastreio"],
    shippingState: record["Estado da Entrega"],
  }));
}

function parseCmvBase(records: CsvRecord[]) {
  return records.map((record) => ({
    productName: record.Produto,
    sku: record.SKU,
    productType: record.Tipo,
    unitCost: parseCurrencyLike(record.CMV_Unit),
  }));
}

function parseSalesLines(records: CsvRecord[]): SalesLine[] {
  return records.map((record) => ({
    orderNumber: record["Número do pedido"],
    orderDate: toIsoDate(record.Data),
    productId: record["ID produto"],
    productName: record.Descrição,
    quantity: parseIntegerLike(record.Quantidade),
    unitPrice: parseCurrencyLike(record["Valor unitário"]),
    orderDiscountValue: parseCurrencyLike(record["Desconto do pedido (% ou valor)"]),
    shippingValue: parseCurrencyLike(record["Frete pedido"]),
    orderStatus: record.Situação,
    sku: record["Código (SKU)"],
  }));
}

function parseOrderItems(records: CsvRecord[]): OrderItem[] {
  return records.map((record) => ({
    orderNumber: record.Pedido,
    orderDate: toIsoDate(record.Data),
    customerName: record["Nome do Cliente"],
    productName: record["Nome do produto"],
    productSpecs: record["Especificações do Produto"],
    quantity: parseIntegerLike(record.Quantidade),
    grossValue: parseCurrencyLike(record["Valor Bruto"]),
  }));
}

function parseMedia(records: CsvRecord[]): MediaRow[] {
  return records.map((record) => ({
    date: toIsoDate(record.Dia),
    campaignName: record["Nome da campanha"],
    adsetName: record["Nome do conjunto de anúncios"],
    accountName: record["Nome da conta"],
    adName: record["Nome do anúncio"],
    platform: record.Plataforma,
    placement: record.Posicionamento,
    devicePlatform: record["Plataforma do dispositivo"],
    delivery: record["Veiculação do anúncio"],
    reach: parseIntegerLike(record.Alcance),
    impressions: parseIntegerLike(record.Impressões),
    clicksAll: parseIntegerLike(record["Cliques (todos)"]),
    spend: parseCurrencyLike(record["Valor usado (BRL)"]),
    purchases: parseIntegerLike(record.Compras),
    purchaseValue: parseCurrencyLike(record["Valor de conversão da compra"]),
    linkClicks: parseIntegerLike(record["Cliques no link"]),
    ctrAll: parseCurrencyLike(record["CTR (todos)"]),
    ctrLink: parseCurrencyLike(record["CTR (taxa de cliques no link)"]),
    addToCart: parseIntegerLike(record["Adições ao carrinho"]),
  }));
}

export async function parseUploadedCsv(file: File) {
  const text = await file.text();
  const matrix = parseCsvMatrix(text);
  if (!matrix.length) {
    throw new Error(`O arquivo ${file.name} está vazio.`);
  }

  const headers = matrix[0];
  const kind = detectCsvFileKind(headers);
  const records = toObjects(matrix);

  const fileInfo: ImportRunInfo = {
    kind,
    fileName: file.name,
    importedAt: new Date().toISOString(),
    rowCount: records.length,
  };

  return {
    kind,
    fileInfo,
    payload: (() => {
      switch (kind) {
        case "feed":
          return { catalog: parseFeed(records) };
        case "cmv_produtos":
          return { cmvBase: parseCmvBase(records) };
        case "lista_pedidos":
          return { paidOrders: parsePaidOrders(records) };
        case "pedidos_pagos":
          return { salesLines: parseSalesLines(records) };
        case "lista_itens":
          return { orderItems: parseOrderItems(records) };
        case "meta":
          return { media: parseMedia(records) };
      }
    })(),
  };
}

export function mergeBrandDataset(
  current: BrandDataset | undefined,
  brandId: string,
  brandName: string,
  fileInfo: ImportRunInfo,
  payload: Partial<BrandDataset>,
): BrandDataset {
  const now = new Date().toISOString();
  const aggregateInfo: ImportedFileInfo = {
    kind: fileInfo.kind,
    totalRuns: (current?.files[fileInfo.kind]?.totalRuns ?? 0) + 1,
    totalRows: (current?.files[fileInfo.kind]?.totalRows ?? 0) + fileInfo.rowCount,
    totalInserted: (current?.files[fileInfo.kind]?.totalInserted ?? 0) + fileInfo.rowCount,
    lastImportedAt: fileInfo.importedAt,
    runs: [
      {
        fileName: fileInfo.fileName,
        importedAt: fileInfo.importedAt,
        rowCount: fileInfo.rowCount,
        insertedCount: fileInfo.rowCount,
      },
      ...(current?.files[fileInfo.kind]?.runs ?? []),
    ],
  };
  return {
    id: current?.id ?? brandId,
    name: brandName,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
    files: {
      ...(current?.files ?? {}),
      [fileInfo.kind]: aggregateInfo,
    },
    catalog: payload.catalog ?? current?.catalog ?? [],
    paidOrders: payload.paidOrders ?? current?.paidOrders ?? [],
    salesLines: payload.salesLines ?? current?.salesLines ?? [],
    orderItems: payload.orderItems ?? current?.orderItems ?? [],
    media: payload.media ?? current?.media ?? [],
    cmvEntries: current?.cmvEntries ?? [],
    cmvCheckpoints: current?.cmvCheckpoints ?? [],
    expenseCategories: current?.expenseCategories ?? [],
    expenses: current?.expenses ?? [],
  };
}
