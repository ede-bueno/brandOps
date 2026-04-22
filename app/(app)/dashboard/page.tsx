"use client";

import { startTransition, useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { CommandCenterView } from "@/components/management-v2";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  fetchCommandCenterReport,
  updateExecutiveActionQueueItem,
} from "@/lib/brandops/database";
import type {
  ExecutiveActionItem,
  ExecutiveActionStatus,
  ManagementSnapshotV2,
} from "@/lib/brandops/types";

function LoadingShell() {
  return (
    <div className="atlas-page-stack-compact animate-pulse">
      <div className="h-32 rounded-[1.7rem] bg-surface-container" />
      <div className="grid gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-24 rounded-2xl bg-surface-container" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl bg-surface-container" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(21rem,0.85fr)]">
        <div className="h-[34rem] rounded-[1.7rem] bg-surface-container" />
        <div className="h-[34rem] rounded-[1.7rem] bg-surface-container" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [report, setReport] = useState<ManagementSnapshotV2 | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
  const {
    activeBrand,
    activeBrandId,
    brands,
    periodRange,
    selectedPeriodLabel,
    isLoading,
  } = useBrandOps();

  const selectedBrandName =
    activeBrand?.name ??
    brands.find((brand) => brand.id === activeBrandId)?.name ??
    "Marca";

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
        const nextReport = await fetchCommandCenterReport(
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
            error instanceof Error
              ? error.message
              : "Não foi possível consolidar o Centro de Comando.",
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
    return <LoadingShell />;
  }

  if (!activeBrandId && !activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca em foco"
        description="Selecione uma marca para abrir o Centro de Comando do Atlas."
      />
    );
  }

  if (!activeBrand) {
    return (
      <EmptyState
        title={reportError ? "Centro de Comando indisponível" : "Dados da marca indisponíveis"}
        description={reportError ?? "Não foi possível carregar o contexto da marca selecionada."}
      />
    );
  }

  if (!report) {
    return (
      <EmptyState
        title="Centro de Comando vazio"
        description="Ainda não há leitura suficiente para montar a gestão desta marca no recorte atual."
      />
    );
  }

  const handleUpdateAction = (
    action: ExecutiveActionItem,
    update: { status?: ExecutiveActionStatus; reviewAt?: string | null },
  ) => {
    if (!activeBrandId) {
      return;
    }

    const nextStatus = update.status ?? action.status;
    const nextReviewAt =
      update.reviewAt === undefined ? action.reviewAt : update.reviewAt;

    setPendingActionKey(action.actionKey);
    setReport((current) =>
      current
        ? {
            ...current,
            decisionQueue: current.decisionQueue.map((item) =>
              item.actionKey === action.actionKey
                ? {
                    ...item,
                    status: nextStatus,
                    reviewAt: nextReviewAt,
                  }
                : item,
            ),
          }
        : current,
    );

    startTransition(() => {
      void updateExecutiveActionQueueItem(activeBrandId, {
        actionKey: action.actionKey,
        domain: action.domain,
        status: nextStatus,
        reviewAt: nextReviewAt,
        from: periodRange?.start ?? null,
        to: periodRange?.end ?? null,
      })
        .then(() => {
          setPendingActionKey(null);
        })
        .catch((error) => {
          setReportError(
            error instanceof Error
              ? error.message
              : "Não foi possível salvar a fila executiva.",
          );
          setPendingActionKey(null);
          void fetchCommandCenterReport(
            activeBrandId,
            periodRange?.start ?? null,
            periodRange?.end ?? null,
          )
            .then((nextReport) => setReport(nextReport))
            .catch(() => undefined);
        });
    });
  };

  return (
    <CommandCenterView
      snapshot={{
        ...report,
        context: {
          ...report.context,
          brandName: selectedBrandName,
        },
      }}
      selectedPeriodLabel={selectedPeriodLabel}
      onUpdateAction={handleUpdateAction}
      pendingActionKey={pendingActionKey}
    />
  );
}
