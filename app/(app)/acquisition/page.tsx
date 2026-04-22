"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { AcquisitionHubView } from "@/components/management-v2";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { fetchAcquisitionHubReport } from "@/lib/brandops/database";
import type { AcquisitionHubReport } from "@/lib/brandops/types";

export default function AcquisitionPage() {
  const [report, setReport] = useState<AcquisitionHubReport | null>(null);
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
        const nextReport = await fetchAcquisitionHubReport(
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
            error instanceof Error ? error.message : "Não foi possível carregar o hub de Aquisição.",
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
        description="Selecione uma marca para abrir o hub de Aquisição."
      />
    );
  }

  if (!activeBrand || !report) {
    return (
      <EmptyState
        title="Hub de Aquisição indisponível"
        description={reportError ?? "Não foi possível consolidar o hub de aquisição da marca."}
      />
    );
  }

  return <AcquisitionHubView report={report} selectedPeriodLabel={selectedPeriodLabel} />;
}
