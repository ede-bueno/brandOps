"use client";

import { buildFinanceLedgerRows } from "@/lib/brandops-v3/view-models";
import { currencyFormatter } from "@/lib/brandops/format";
import type { FinanceHubReport } from "@/lib/brandops/types";

export function FinanceLedger({ report }: { report: FinanceHubReport }) {
  const months = report.financial.months.slice(-8);
  const monthKeys = new Set(months.map((month) => month.monthKey));
  const filteredReport = {
    ...report.financial,
    months: report.financial.months.filter((month) => monthKeys.has(month.monthKey)),
  };
  const rows = buildFinanceLedgerRows(filteredReport);

  return (
    <div className="v3-ledger">
      <div className="v3-ledger-row v3-ledger-head">
        <span>Indicador</span>
        {months.map((month) => (
          <strong key={month.monthKey}>{month.label}</strong>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.label} className="v3-ledger-row">
          <span>{row.label}</span>
          {row.values.map((value, index) => (
            <strong key={`${row.label}-${months[index]?.monthKey ?? index}`}>
              {currencyFormatter.format(value)}
            </strong>
          ))}
        </div>
      ))}
    </div>
  );
}

