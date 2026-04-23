"use client";

import type { ReactNode } from "react";

export function FinanceOverviewPanel({
  headline,
  summary,
  focus,
  brandName,
  trend,
}: {
  headline: string;
  summary: string;
  focus: ReactNode;
  brandName: string;
  trend: ReactNode;
}) {
  return (
    <section className="v3-command-grid">
      <div className="v3-panel v3-brief-panel">
        <span>O que mais pesa</span>
        <h2>{headline}</h2>
        <p>{summary}</p>
        {focus}
      </div>
      <div className="v3-panel v3-panel-quiet">
        <div className="v3-panel-heading">
          <span>Resumo da marca</span>
          <strong>{brandName}</strong>
        </div>
        {trend}
      </div>
    </section>
  );
}

