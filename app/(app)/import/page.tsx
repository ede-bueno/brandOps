"use client";

import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  FileCheck2,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { AnalyticsKpiCard } from "@/components/analytics/AnalyticsPrimitives";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { EmptyState } from "@/components/EmptyState";
import { InlineNotice, PageHeader, SectionHeading, StackItem, SurfaceCard } from "@/components/ui-shell";
import type { CsvFileKind, IntegrationMode, IntegrationProvider } from "@/lib/brandops/types";

type ImportStatus = "idle" | "running" | "success" | "error";
type ImportTab = "upload" | "checklist" | "history";

type SourceInfo = {
  kind: CsvFileKind;
  label: string;
  description: string;
  provider?: IntegrationProvider;
};

type RecentImportRow = SourceInfo & {
  totalRuns: number;
  totalRows: number;
  totalInserted: number;
  lastImportedAt: string;
  modeLabel: string;
};

const sourceDefinitions: SourceInfo[] = [
  {
    kind: "lista_pedidos",
    label: "Lista de Pedidos",
    description: "Base comercial principal da INK.",
    provider: "ink",
  },
  {
    kind: "lista_itens",
    label: "Lista de Itens",
    description: "Peças vendidas e custo histórico.",
    provider: "ink",
  },
  {
    kind: "pedidos_pagos",
    label: "Pedidos Pagos",
    description: "Detalhe operacional por venda.",
    provider: "ink",
  },
  {
    kind: "meta",
    label: "Meta Export",
    description: "Investimento e desempenho de mídia.",
    provider: "meta",
  },
  {
    kind: "feed",
    label: "Feed Facebook",
    description: "Catálogo de apoio para produtos e criativos.",
  },
];

const importTabs: Array<{ key: ImportTab; label: string }> = [
  { key: "upload", label: "Enviar" },
  { key: "checklist", label: "Checklist" },
  { key: "history", label: "Histórico" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getProviderMode(
  activeBrand: ReturnType<typeof useBrandOps>["activeBrand"],
  provider?: IntegrationProvider,
) {
  if (!provider || !activeBrand) {
    return "manual_csv" as IntegrationMode;
  }

  return activeBrand.integrations.find((entry) => entry.provider === provider)?.mode ?? "manual_csv";
}

export default function ImportPage() {
  const { activeBrand, importFiles, isBrandHydrating } = useBrandOps();
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<ImportTab>("upload");

  const onDrop = (acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setStatus("idle");
    setMessage("");
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: true,
  });

  const handleImport = async () => {
    try {
      setStatus("running");
      setMessage("Processando os CSVs e consolidando a base da marca...");
      await importFiles(activeBrand?.name || "", files);
      setStatus("success");
      setMessage("Importação concluída. Duplicidades foram consolidadas pela chave correta.");
      setFiles([]);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Falha ao importar.");
    }
  };

  const stats = useMemo(() => {
    if (!activeBrand) {
      return null;
    }

    const importInfos = Object.values(activeBrand.files);
    const orderDates = activeBrand.paidOrders
      .map((order) => order.orderDate)
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));

    return {
      totalRuns: importInfos.reduce((sum, info) => sum + info.totalRuns, 0),
      totalRows: importInfos.reduce((sum, info) => sum + info.totalRows, 0),
      totalInserted: importInfos.reduce((sum, info) => sum + info.totalInserted, 0),
      firstOrderDate: orderDates[0] ?? null,
      lastOrderDate: orderDates[orderDates.length - 1] ?? null,
    };
  }, [activeBrand]);

  const sourceChecklist = useMemo(() => {
    if (!activeBrand) {
      return sourceDefinitions;
    }

    return sourceDefinitions.filter((source) => {
      if (!source.provider) {
        return true;
      }

      const mode = getProviderMode(activeBrand, source.provider);
      if (source.provider === "meta") {
        return mode !== "disabled";
      }

      return true;
    });
  }, [activeBrand]);

  const completedSources = useMemo(
    () => sourceChecklist.filter((source) => activeBrand?.files[source.kind]).length,
    [activeBrand?.files, sourceChecklist],
  );

  const progressPercent = stats ? Math.round((completedSources / sourceChecklist.length) * 100) : 0;

  const recentImports = useMemo<RecentImportRow[]>(() => {
    if (!activeBrand) {
      return [];
    }

    return sourceChecklist
      .map((source) => {
        const info = activeBrand.files[source.kind];
        if (!info) {
          return null;
        }

        return {
          ...source,
          totalRuns: info.totalRuns,
          totalRows: info.totalRows,
          totalInserted: info.totalInserted,
          lastImportedAt: info.lastImportedAt,
          modeLabel:
            source.provider === "meta" && getProviderMode(activeBrand, source.provider) === "api"
              ? "API + fallback"
              : source.provider === "ga4" && getProviderMode(activeBrand, source.provider) === "api"
                ? "API"
                : source.provider === "meta" && getProviderMode(activeBrand, source.provider) === "disabled"
                  ? "Desabilitado"
                  : "CSV manual",
        } satisfies RecentImportRow;
      })
      .filter((entry): entry is RecentImportRow => Boolean(entry))
      .sort((left, right) => right.lastImportedAt.localeCompare(left.lastImportedAt));
  }, [activeBrand, sourceChecklist]);

  if (activeBrand && isBrandHydrating && !Object.keys(activeBrand.files).length) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Integração de dados"
          title="Importação"
          description={`Carregando o histórico de importações da loja ${activeBrand.name}.`}
          badge="Hidratando dados"
        />
        <div className="space-y-5 animate-pulse">
          <div className="h-40 rounded-3xl bg-surface-container" />
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="h-[420px] rounded-3xl bg-surface-container" />
            <div className="h-[420px] rounded-3xl bg-surface-container" />
          </div>
        </div>
      </div>
    );
  }

  if (!activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca selecionada"
        description="Escolha uma loja para importar e consolidar os arquivos da operação."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Integração de dados"
        title="Importação"
        description="Suba os CSVs da operação e o Atlas consolida por chave natural sem duplicar histórico."
      />

      <SurfaceCard className="p-0 overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-outline p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary-container text-secondary">
              <DatabaseZap size={22} />
            </div>
            <div>
              <p className="eyebrow">Base ativa</p>
              <h2 className="font-headline text-lg font-semibold tracking-tight text-on-surface">
                {activeBrand.name}
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                {progressPercent}% do checklist padrão já consolidado.
              </p>
            </div>
          </div>

          <div className="min-w-[220px]">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              <span>Saúde da base</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-secondary transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className="brandops-subtabs">
            {importTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="brandops-subtab"
                data-active={activeTab === tab.key}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </SurfaceCard>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsKpiCard
          label="Rodadas"
          value={String(stats?.totalRuns ?? 0)}
          description="Total de importações registradas pela marca."
          tone="info"
        />
        <AnalyticsKpiCard
          label="Linhas"
          value={(stats?.totalRows ?? 0).toLocaleString("pt-BR")}
          description="Volume total lido por CSV ao longo do histórico."
          tone="default"
        />
        <AnalyticsKpiCard
          label="Consolidação"
          value={String(progressPercent)}
          description="Percentual do checklist padrão já consolidado."
          tone="positive"
        />
        <AnalyticsKpiCard
          label="Período"
          value={`${formatDate(stats?.firstOrderDate)} - ${formatDate(stats?.lastOrderDate)}`}
          description="Janela comercial coberta pela base ativa."
          tone="default"
        />
      </section>

      {activeTab === "upload" && (
        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <SurfaceCard className="p-0 overflow-hidden">
            <div
              {...getRootProps()}
              className={`cursor-pointer border-b border-outline px-5 py-8 text-center transition-all ${
                isDragActive ? "bg-secondary-container/50" : "bg-surface-container-low hover:bg-surface-container"
              }`}
            >
              <input {...getInputProps()} />
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-surface text-secondary shadow-sm">
                <UploadCloud size={30} />
              </div>
              <h2 className="mt-4 font-headline text-lg font-semibold tracking-tight text-on-surface">
                Arraste os CSVs da operação
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">
                O Atlas identifica o tipo pelo cabeçalho, consolida janelas sobrepostas e evita duplicidade.
              </p>
            </div>

            <div className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <SectionHeading
                  title="Fila"
                  description="Arquivos prontos para o disparo."
                />
                <button
                  onClick={handleImport}
                  disabled={status === "running" || !files.length}
                  className="brandops-button brandops-button-primary"
                >
                  {status === "running" ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Importando
                    </>
                  ) : (
                    "Iniciar importação"
                  )}
                </button>
              </div>

              {files.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {files.map((file) => (
                    <StackItem
                      key={`${file.name}-${file.size}`}
                      title={<span className="truncate">{file.name}</span>}
                      description={`${(file.size / 1024).toFixed(1)} KB pronto para leitura`}
                      aside={<FileCheck2 size={16} className="text-secondary" />}
                      tone="info"
                    />
                  ))}
                </div>
              ) : (
                <InlineNotice tone="info" icon={<UploadCloud size={16} />}>
                  <p className="text-sm leading-6">Nenhum arquivo selecionado ainda.</p>
                </InlineNotice>
              )}

              {message && (
                <InlineNotice
                  className="mt-4"
                  tone={status === "error" ? "error" : status === "success" ? "success" : "info"}
                  icon={
                    status === "running" ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : status === "success" ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <AlertCircle size={18} />
                    )
                  }
                >
                  <p className="text-sm leading-6">{message}</p>
                </InlineNotice>
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard className="flex flex-col gap-4">
            <SectionHeading
              title="Regras rápidas"
              description="Aplique os CSVs por janela e preserve o histórico já saneado."
            />
            <div className="space-y-3 text-sm text-on-surface-variant">
              <p>`Lista de Pedidos` mantém a linha comercial da INK.</p>
              <p>`Lista de Itens` alimenta peças vendidas e CMV histórico.</p>
              <p>`Meta Export` continua aceito como contingência quando a loja estiver em API.</p>
            </div>
            <div className="mt-auto rounded-2xl border border-outline bg-surface-container-low p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                Janela padrão
              </p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                O importador consolida múltiplos blocos por chave de pedido/ocorrência e mantém saneamentos já salvos.
              </p>
            </div>
          </SurfaceCard>
        </section>
      )}

      {activeTab === "checklist" && (
        <section className="grid gap-4 xl:grid-cols-[1fr_1.05fr]">
          <SurfaceCard className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
            <AnalyticsKpiCard
              label="Rodadas importadas"
              value={String(stats?.totalRuns ?? 0)}
              description="Total acumulado de execuções por fonte."
              tone="info"
            />
            <AnalyticsKpiCard
              label="Linhas processadas"
              value={(stats?.totalRows ?? 0).toLocaleString("pt-BR")}
              description="Volume total lido e consolidado."
              tone="default"
            />
            <AnalyticsKpiCard
              label="Primeiro pedido"
              value={formatDate(stats?.firstOrderDate)}
              description="Início do histórico comercial."
              tone="default"
            />
            <AnalyticsKpiCard
              label="Último pedido"
              value={formatDate(stats?.lastOrderDate)}
              description="Fim da janela já reconhecida."
              tone="default"
            />
          </SurfaceCard>

          <SurfaceCard className="p-0 overflow-hidden">
            <div className="border-b border-outline p-5">
              <SectionHeading
                title="Checklist consolidado"
                description="Resumo por arquivo, já obedecendo o modo de cada integração."
              />
            </div>

            <div className="space-y-3 p-5">
              {sourceChecklist.map((source) => {
                const info = activeBrand.files[source.kind];
                const providerMode = getProviderMode(activeBrand, source.provider);
                const modeHint =
                  source.provider === "meta" && providerMode === "api"
                    ? "API ativa com fallback manual"
                    : source.provider === "ga4" && providerMode === "api"
                      ? "API ativa"
                      : providerMode === "disabled"
                        ? "Desabilitado"
                        : "CSV manual";

                return (
                  <StackItem
                    key={source.kind}
                    title={source.label}
                    description={
                      info ? (
                        <div className="space-y-1">
                          <p>{source.description}</p>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
                            {modeHint}
                          </p>
                          <div className="grid gap-1 pt-1 sm:grid-cols-3">
                            <span>{info.totalRows.toLocaleString("pt-BR")} linhas lidas</span>
                            <span>{info.totalInserted.toLocaleString("pt-BR")} consolidadas</span>
                            <span>Última em {formatDateTime(info.lastImportedAt)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p>{source.description}</p>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                            {modeHint}
                          </p>
                        </div>
                      )
                    }
                    aside={<span className="status-chip">{info ? `${info.totalRuns} rodada(s)` : "Pendente"}</span>}
                    tone={info ? "positive" : "warning"}
                  />
                );
              })}
            </div>
          </SurfaceCard>
        </section>
      )}

      {activeTab === "history" && (
        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <SurfaceCard className="p-0 overflow-hidden">
            <div className="border-b border-outline p-5">
              <SectionHeading
                title="Últimas importações"
                description="Leitura por fonte para conferir o que entrou por último na base."
              />
            </div>

            <div className="space-y-3 p-5">
              {recentImports.length ? (
                recentImports.map((row) => (
                  <StackItem
                    key={`${row.kind}-${row.lastImportedAt}`}
                    title={row.label}
                    description={
                      <div className="space-y-1">
                        <p>{row.description}</p>
                        <div className="grid gap-1 pt-1 sm:grid-cols-3">
                          <span>{row.totalRuns} rodada(s)</span>
                          <span>{row.totalRows.toLocaleString("pt-BR")} linhas</span>
                          <span>{formatDateTime(row.lastImportedAt)}</span>
                        </div>
                      </div>
                    }
                    aside={<span className="status-chip">{row.modeLabel}</span>}
                    tone="info"
                  />
                ))
              ) : (
                <InlineNotice tone="info" icon={<Clock3 size={16} />}>
                  <p className="text-sm leading-6">Nenhuma importação consolidada ainda para a marca atual.</p>
                </InlineNotice>
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard className="flex flex-col gap-4">
            <SectionHeading
              title="Leitura rápida"
              description="Fontes já consideradas no cálculo operacional."
            />
            <div className="grid gap-3">
              {sourceChecklist.map((source) => {
                const info = activeBrand.files[source.kind];
                return (
                  <StackItem
                    key={`${source.kind}-summary`}
                    title={source.label}
                    description={source.description}
                    aside={<span className="status-chip">{info ? "Ativo" : "Pendente"}</span>}
                    tone={info ? "positive" : "warning"}
                  />
                );
              })}
            </div>
          </SurfaceCard>
        </section>
      )}
    </div>
  );
}
