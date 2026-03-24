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

function parseNumber(value) {
  const raw = String(value ?? "").trim().replace(/\u00A0/g, " ");
  if (!raw) {
    return 0;
  }

  const sanitized = raw
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
    normalized =
      lastComma > lastDot
        ? sanitized.replace(/\./g, "").replace(",", ".")
        : sanitized.replace(/,/g, "");
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
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function main() {
  const filePath =
    process.argv[2] ||
    path.join(process.env.USERPROFILE || "", "Downloads", "Lista de Pedidos.csv");

  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }

  const rows = parseCsv(filePath);
  const paidRows = rows.filter(
    (row) => String(row["Status de Pagamento"] || "").trim() === "Pago",
  );

  const sums = paidRows.reduce(
    (acc, row) => {
      const items = parseNumber(row["Items no Pedido"]);
      const orderValue = parseNumber(row["Valor do Pedido"]);
      const discountValue = parseNumber(row["Valor do Desconto"]);
      const commissionValue = parseNumber(row.Comissao);
      const couponName = String(row["Nome do Cupom"] || "").trim();

      acc.orders += 1;
      acc.items += items;
      acc.faturado += orderValue;
      acc.descontoTotal += discountValue;
      acc.lucro += commissionValue;
      if (couponName) {
        acc.ordersWithCoupon += 1;
        acc.descontoPedidosComCupom += discountValue;
      }

      return acc;
    },
    {
      orders: 0,
      items: 0,
      faturado: 0,
      descontoTotal: 0,
      lucro: 0,
      ordersWithCoupon: 0,
      descontoPedidosComCupom: 0,
    },
  );

  const ticketMedio = sums.orders ? sums.faturado / sums.orders : 0;
  const itensPorVenda = sums.orders ? sums.items / sums.orders : 0;
  const lucroMedio = sums.items ? sums.lucro / sums.items : 0;

  console.log(
    JSON.stringify(
      {
        filePath,
        paidOrders: sums.orders,
        itemsSold: sums.items,
        itemsPerOrder: round(itensPorVenda, 2),
        faturado: round(sums.faturado),
        ticketMedio: round(ticketMedio),
        lucro: round(sums.lucro),
        lucroMedio: round(lucroMedio),
        descontoTotal: round(sums.descontoTotal),
        ordersWithCoupon: sums.ordersWithCoupon,
        descontoPedidosComCupom: round(sums.descontoPedidosComCupom),
      },
      null,
      2,
    ),
  );
}

main();
