"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { FinanceHubView } from "@/components/management-v2";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { fetchFinanceHubReport } from "@/lib/brandops/database";
import type { FinanceHubReport } from "@/lib/brandops/types";

export default function FinancePage() {
  const [report, setReport] = useState<FinanceHubReport | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const { activeBrand, activeBrandId, periodRange, selectedPeriodLabel, isLoading } = useBrandOps();

  useEffect(() => {
    if (!activeBrandId) {
      setReport(null);
      setReportError(null);
      setIsReportLoading(false);
      return;
    }

    let cancelled = false;
    const brandId = activeBrandId;

    async function loadReport() {
      setIsReportLoading(true);
      setReportError(null);

      try {
        const nextReport = await fetchFinanceHubReport(
          brandId,
          periodRange?.start ?? null,
          periodRange?.end ?? null,
        );
        if (!cancelled) {
          setReport(nextReport);
        }
      } catch (error) {
        if (!cancelled) {
          setReport(null);
          setReportError(
            error instanceof Error ? error.message : "Não foi possível carregar o hub Financeiro.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsReportLoading(false);
        }
      }
    }

    void loadReport();
    return () => {
      cancelled = true;
    };
  }, [activeBrandId, periodRange?.end, periodRange?.start]);

  const isBrandLoading = Boolean(activeBrandId) && (isLoading || isReportLoading || !activeBrand);

  if (isBrandLoading) {
    return <div className="h-96 animate-pulse rounded-[1.7rem] bg-surface-container" />;
  }

  if (!activeBrandId && !activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca em foco"
        description="Selecione uma marca para abrir o hub Financeiro."
      />
    );
  }

  if (!activeBrand || !report) {
    return (
      <EmptyState
        title="Hub Financeiro indisponível"
        description={reportError ?? "Não foi possível consolidar o hub financeiro da marca."}
      />
    );
  }

  return <FinanceHubView report={report} selectedPeriodLabel={selectedPeriodLabel} />;
}
