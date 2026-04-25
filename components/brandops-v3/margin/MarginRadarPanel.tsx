"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { currencyFormatter, percentFormatter } from "@/lib/brandops/format";
import { buildStudioHref } from "@/lib/brandops-v3/view-models";
import type { AnnualDreReport } from "@/lib/brandops/types";

export function MarginRadarPanel({
  latestMonths,
  cmvShare,
  mediaShare,
  expenseShare,
  contributionMargin,
}: {
  latestMonths: AnnualDreReport["months"];
  cmvShare: number;
  mediaShare: number;
  expenseShare: number;
  contributionMargin: number;
}) {
  return (
    <div className="v3-section-grid">
      <div className="v3-panel-body">
        <div className="v3-subsection-head">
          <span>Últimos meses</span>
        </div>
        <div className="v3-data-list">
          {latestMonths.map((month) => (
            <Link key={month.monthKey} href={buildStudioHref("finance", { surface: "dre" })}>
              <span>{month.label}</span>
              <strong>{currencyFormatter.format(month.metrics.contributionAfterMedia)}</strong>
              <small>{percentFormatter.format(month.metrics.contributionMargin)} margem</small>
            </Link>
          ))}
        </div>
      </div>
      <div className="v3-section-stack">
        <div className="v3-note">
          <strong>Distribuição de pressão</strong>
          <p>
            CMV {percentFormatter.format(cmvShare)} | Mídia {percentFormatter.format(mediaShare)} |
            Despesas {percentFormatter.format(expenseShare)}
          </p>
        </div>
        <div className="v3-focus-list">
          <article data-tone={contributionMargin >= 0 ? "good" : "bad"}>
            <div>
              <span>Margem atual</span>
              <strong>{percentFormatter.format(contributionMargin)}</strong>
              <p>
                {contributionMargin >= 0
                  ? "A contribuição ainda sustenta a operação no período."
                  : "A margem foi comprimida e precisa de correção antes de escalar."}
              </p>
            </div>
          </article>
          <Link href={buildStudioHref("growth", { surface: "media" })} data-tone="info">
            <div>
              <span>Cruzar com aquisição</span>
              <strong>
                {contributionMargin >= 0 ? "Validar ganho via mídia" : "Entender pressão da mídia"}
              </strong>
              <p>Abra Crescimento para ver se a tração ou a pressão veio do gasto.</p>
            </div>
            <ArrowUpRight size={16} />
          </Link>
          <Link href={buildStudioHref("offer", { surface: "sales" })} data-tone="info">
            <div>
              <span>Cruzar com oferta</span>
              <strong>Checar mix e ticket</strong>
              <p>Abra Oferta para confirmar se o mix comercial está sustentando a margem.</p>
            </div>
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
