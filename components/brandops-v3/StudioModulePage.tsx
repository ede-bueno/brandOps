"use client";

import { useEffect, useMemo, useState } from "react";
import { Database } from "lucide-react";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  fetchAcquisitionHubReport,
  fetchCommandCenterReport,
  fetchFinanceHubReport,
  fetchOfferHubReport,
} from "@/lib/brandops/database";
import type { AcquisitionHubReport, FinanceHubReport, ManagementSnapshotV2, OfferHubReport } from "@/lib/brandops/types";
import {
  getStudioModuleContext,
  getStudioNavItem,
  type StudioModuleContext,
  type StudioModule,
} from "@/lib/brandops-v3/view-models";
import { CommandWorkspace } from "./command/CommandWorkspace";
import { FinanceWorkspace } from "./finance/FinanceWorkspace";
import { GrowthWorkspace } from "./growth/GrowthWorkspace";
import { OpsWorkspace } from "./ops/OpsWorkspace";
import { OfferWorkspace } from "./offer/OfferWorkspace";
import {
  V3LoadingPanel,
} from "./StudioPrimitives";
import { V3EmptyState } from "./BrandOpsShellV3";

type StudioReport =
  | ManagementSnapshotV2
  | FinanceHubReport
  | AcquisitionHubReport
  | OfferHubReport
  | null;

type StudioPageSearchParams = Record<string, string | string[] | undefined>;

function getSearchParamValue(
  searchParams: StudioPageSearchParams | undefined,
  key: string,
) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function ModuleReportView({
  module,
  report,
  context,
}: {
  module: StudioModule;
  report: StudioReport;
  context: StudioModuleContext;
}) {
  if (module === "ops") {
    return <OpsWorkspace context={context} />;
  }

  if (!report) {
    return (
      <V3EmptyState
        title="Módulo sem relatório"
        description="O BrandOps não recebeu dados suficientes para montar esta superfície ainda."
      />
    );
  }

  if (module === "command") {
    return <CommandWorkspace snapshot={report as ManagementSnapshotV2} context={context} />;
  }

  if (module === "finance") {
    return <FinanceWorkspace report={report as FinanceHubReport} context={context} />;
  }

  if (module === "growth") {
    return <GrowthWorkspace report={report as AcquisitionHubReport} context={context} />;
  }

  return <OfferWorkspace report={report as OfferHubReport} context={context} />;
}

export function StudioModulePage({
  module,
  searchParams,
}: {
  module: StudioModule;
  searchParams?: StudioPageSearchParams;
}) {
  const [report, setReport] = useState<StudioReport>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const { activeBrand, activeBrandId, isLoading, periodRange } = useBrandOps();
  const activeNav = getStudioNavItem(module);
  const moduleContext = useMemo(
    () =>
      getStudioModuleContext(module, {
        get: (key: string) => getSearchParamValue(searchParams, key),
      }),
    [module, searchParams],
  );
  const periodKey = useMemo(
    () => `${periodRange?.start ?? "na"}-${periodRange?.end ?? "na"}`,
    [periodRange?.end, periodRange?.start],
  );

  useEffect(() => {
    if (module === "ops") {
      setReport(null);
      setReportError(null);
      setIsReportLoading(false);
      return;
    }

    if (!activeBrandId) {
      setReport(null);
      setReportError(null);
      setIsReportLoading(false);
      return;
    }

    const brandId = activeBrandId;
    let cancelled = false;

    async function loadReport() {
      setIsReportLoading(true);
      setReportError(null);
      try {
        const from = periodRange?.start ?? null;
        const to = periodRange?.end ?? null;
        const nextReport =
          module === "command"
            ? await fetchCommandCenterReport(brandId, from, to)
            : module === "finance"
              ? await fetchFinanceHubReport(brandId, from, to)
              : module === "growth"
                ? await fetchAcquisitionHubReport(brandId, from, to)
                : await fetchOfferHubReport(brandId, from, to);

        if (!cancelled) {
          setReport(nextReport);
        }
      } catch (error) {
        if (!cancelled) {
          setReport(null);
          setReportError(
            error instanceof Error ? error.message : "Não foi possível carregar este módulo.",
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
  }, [activeBrandId, module, periodKey, periodRange?.end, periodRange?.start]);

  if (!activeBrandId && !activeBrand) {
    return (
      <V3EmptyState
        title="Nenhuma marca ativa"
        description="Selecione ou cadastre uma marca para abrir o BrandOps Studio."
      />
    );
  }

  if ((isLoading && !activeBrand) || isReportLoading) {
    return <V3LoadingPanel label={`Montando ${activeNav.label.toLowerCase()}`} />;
  }

  if (reportError) {
    return (
      <div className="v3-error-panel">
        <Database size={20} />
        <strong>{activeNav.label} indisponível</strong>
        <p>{reportError}</p>
      </div>
    );
  }

  return <ModuleReportView module={module} report={report} context={moduleContext} />;
}
