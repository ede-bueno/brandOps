"use client";

import { currencyFormatter, percentFormatter } from "@/lib/brandops/format";
import type { AnnualDreReport } from "@/lib/brandops/types";

export function MarginTimelinePanel({
  latestMonths,
}: {
  latestMonths: AnnualDreReport["months"];
}) {
  return (
    <div className="v3-ledger">
      <div className="v3-ledger-row v3-ledger-head">
        <span>Indicador</span>
        {latestMonths.map((month) => (
          <strong key={month.monthKey}>{month.label}</strong>
        ))}
      </div>
      <div className="v3-ledger-row">
        <span>Contribuição</span>
        {latestMonths.map((month) => (
          <strong key={`contribution-${month.monthKey}`}>
            {currencyFormatter.format(month.metrics.contributionAfterMedia)}
          </strong>
        ))}
      </div>
      <div className="v3-ledger-row">
        <span>Margem</span>
        {latestMonths.map((month) => (
          <strong key={`margin-${month.monthKey}`}>
            {percentFormatter.format(month.metrics.contributionMargin)}
          </strong>
        ))}
      </div>
      <div className="v3-ledger-row">
        <span>Resultado</span>
        {latestMonths.map((month) => (
          <strong key={`result-${month.monthKey}`}>
            {currencyFormatter.format(month.metrics.netResult)}
          </strong>
        ))}
      </div>
    </div>
  );
}
