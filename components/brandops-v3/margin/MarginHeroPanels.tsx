"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { currencyFormatter } from "@/lib/brandops/format";
import { buildStudioHref } from "@/lib/brandops-v3/view-models";

export function MarginDecisionPanel({
  primaryAction,
  viewMode,
  selectedPeriodLabel,
  contributionMargin,
  momentumTitle,
  momentumDescription,
  momentumTone,
}: {
  primaryAction: string;
  viewMode: "historical" | "filtered";
  selectedPeriodLabel: string;
  contributionMargin: number;
  momentumTitle: string;
  momentumDescription: string;
  momentumTone: "positive" | "warning" | "neutral";
}) {
  return (
    <div className="v3-panel v3-brief-panel">
      <span>Decisão de margem</span>
      <h2>{primaryAction}</h2>
      <p>
        {viewMode === "historical"
          ? "A leitura histórica ajuda a separar desvio estrutural de ruído pontual."
          : `Você está olhando o mesmo recorte ativo do shell: ${selectedPeriodLabel}.`}
      </p>
      <div className="v3-focus-list">
        <Link href={buildStudioHref("finance", { surface: "dre" })} data-tone="warn">
          <div>
            <span>Melhor próximo passo</span>
            <strong>
              {contributionMargin < 0 ? "Fechar DRE e despesas" : "Cruzar com aquisição"}
            </strong>
            <p>
              {contributionMargin < 0
                ? "Valide linha a linha antes de aceitar qualquer expansão."
                : "Cheque se a tração veio de mídia eficiente ou de mix comercial."}
            </p>
          </div>
          <ArrowUpRight size={16} />
        </Link>
        <article
          data-tone={
            momentumTone === "positive"
              ? "good"
              : momentumTone === "warning"
                ? "warn"
                : "info"
          }
        >
          <div>
            <span>Momentum</span>
            <strong>{momentumTitle}</strong>
            <p>{momentumDescription}</p>
          </div>
        </article>
      </div>
    </div>
  );
}

export function MarginPeriodSummaryPanel({
  selectedBrandName,
  bestMonthLabel,
  bestMonthContribution,
  worstMonthLabel,
  worstMonthContribution,
  latestMonthLabel,
  latestMonthResult,
}: {
  selectedBrandName: string;
  bestMonthLabel: string;
  bestMonthContribution?: number | null;
  worstMonthLabel: string;
  worstMonthContribution?: number | null;
  latestMonthLabel: string;
  latestMonthResult?: number | null;
}) {
  return (
    <div className="v3-panel">
      <div className="v3-panel-heading">
        <span>Resumo do período</span>
        <strong>{selectedBrandName}</strong>
      </div>
      <div className="v3-panel-body">
        <div className="v3-focus-list">
          <article data-tone="good">
            <div>
              <span>Melhor mês</span>
              <strong>{bestMonthLabel}</strong>
              <p>
                {typeof bestMonthContribution === "number"
                  ? currencyFormatter.format(bestMonthContribution)
                  : "Ainda não há mês suficiente para comparação."}
              </p>
            </div>
          </article>
          <article data-tone="warn">
            <div>
              <span>Pior mês</span>
              <strong>{worstMonthLabel}</strong>
              <p>
                {typeof worstMonthContribution === "number"
                  ? currencyFormatter.format(worstMonthContribution)
                  : "Ainda não há mês suficiente para comparação."}
              </p>
            </div>
          </article>
          <article data-tone="info">
            <div>
              <span>Último fechamento</span>
              <strong>{latestMonthLabel}</strong>
              <p>
                {typeof latestMonthResult === "number"
                  ? `Resultado ${currencyFormatter.format(latestMonthResult)}`
                  : "A série aparece aqui assim que houver fechamento mensal."}
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
