const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

function parseCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    delimitersToGuess: [",", ";", "\t", "|"],
  });

  if (result.errors.length) {
    throw new Error(`${filePath}: ${result.errors[0].message}`);
  }

  return result.data;
}

function toNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw
    .replace(/[R$\s%]/g, "")
    .replace(/[()]/g, "")
    .replace(/[^0-9,.-]/g, "");
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  let parsed = normalized;
  if (lastComma >= 0 && lastDot >= 0) {
    parsed =
      lastComma > lastDot
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if (lastComma >= 0) {
    const digits = normalized.length - lastComma - 1;
    parsed =
      digits > 0 && digits <= 2
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if ((normalized.match(/\./g) ?? []).length > 1) {
    parsed = normalized.replace(/\./g, "");
  }
  return Number(parsed) || 0;
}

function round(value) {
  return Number(value.toFixed(2));
}

function sumBy(rows, selector) {
  return round(rows.reduce((sum, row) => sum + selector(row), 0));
}

function main() {
  const base = path.join(process.cwd(), "Exportações");
  const listaPedidos = [
    ...parseCsv(path.join(base, "2025", "Lista de Pedidos.csv")),
    ...parseCsv(path.join(base, "2026", "Lista de Pedidos.csv")),
  ];
  const listaItens = [
    ...parseCsv(path.join(base, "2025", "Lista de Itens.csv")),
    ...parseCsv(path.join(base, "2026", "Lista de Itens.csv")),
  ];
  const pedidosPagos = [
    ...parseCsv(path.join(base, "2025", "Pedidos Pagos.csv")),
    ...parseCsv(path.join(base, "2026", "Pedidos Pagos.csv")),
  ];

  const paidOrders = listaPedidos.filter(
    (row) => String(row["Status de Pagamento"] ?? "").trim() === "Pago",
  );
  const paidOrderNumbers = new Set(
    paidOrders.map((row) => String(row["Pedido"] ?? "").trim()).filter(Boolean),
  );
  const paidItems = listaItens.filter((row) =>
    paidOrderNumbers.has(String(row["Pedido"] ?? "").trim()),
  );

  const report = {
    listaPedidos: {
      totalRows: listaPedidos.length,
      uniqueOrders: new Set(
        listaPedidos.map((row) => String(row["Pedido"] ?? "").trim()).filter(Boolean),
      ).size,
      paidOrders: paidOrders.length,
      paidItemsFromPedido: round(
        paidOrders.reduce((sum, row) => sum + toNumber(row["Items no Pedido"]), 0),
      ),
      faturadoPago: sumBy(paidOrders, (row) => toNumber(row["Valor do Pedido"])),
      descontoPago: sumBy(paidOrders, (row) => toNumber(row["Valor do Desconto"])),
      lucroInkPago: sumBy(paidOrders, (row) => toNumber(row["Comissao"])),
    },
    listaItens: {
      totalRows: listaItens.length,
      uniqueOrders: new Set(
        listaItens.map((row) => String(row["Pedido"] ?? "").trim()).filter(Boolean),
      ).size,
      paidRows: paidItems.length,
      paidItemsQty: round(
        paidItems.reduce((sum, row) => sum + toNumber(row["Quantidade"]), 0),
      ),
      paidGrossValue: sumBy(paidItems, (row) => toNumber(row["Valor Bruto"])),
    },
    pedidosPagos: {
      totalRows: pedidosPagos.length,
      uniqueOrders: new Set(
        pedidosPagos.map((row) => String(row["Número do pedido"] ?? "").trim()).filter(Boolean),
      ).size,
      quantityTotal: round(
        pedidosPagos.reduce((sum, row) => sum + toNumber(row["Quantidade"]), 0),
      ),
      unitValueTotal: sumBy(pedidosPagos, (row) => toNumber(row["Valor unitário"]) * toNumber(row["Quantidade"])),
      allStatus: [...new Set(pedidosPagos.map((row) => String(row["Situação"] ?? "").trim() || "(vazio)"))],
    },
  };

  const outputPath = path.join(process.cwd(), "docs", "omd-union-audit.json");
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ outputPath, report }, null, 2));
}

main();
