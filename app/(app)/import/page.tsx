"use client";

import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { EmptyState } from "@/components/EmptyState";
import {
  InlineNotice,
  OperationalMetric,
  OperationalMetricStrip,
  PageHeader,
  SectionHeading,
  StackItem,
  SurfaceCard,
  WorkspaceTabs,
} from "@/components/ui-shell";
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
  const { activeBrand, importFiles, isBrandHydrating, selectedPeriodLabel } = useBrandOps();
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
  const primaryAction = files.length
    ? "Conferir fila e iniciar importação"
    : progressPercent >= 100
      ? "Base pronta para novas janelas"
      : "Completar checklist da base";
  const metaMode =
    activeBrand && getProviderMode(activeBrand, "meta") === "api" ? "API + fallback" : "CSV manual";

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
      <div className="atlas-page-stack-compact">
        <PageHeader
          eyebrow="Integração de dados"
          title="Importação"
          description={`Carregando o histórico de importações da loja ${activeBrand.name}.`}
        />
        <div className="atlas-page-stack animate-pulse">
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
        ctaHref={null}
        ctaLabel={null}
      />
    );
  }

  return (
    <div className="atlas-page-stack-compact">
      <PageHeader
        eyebrow="Integração de dados"
        title="Console de importação"
        description="Envie arquivos, acompanhe a fila e mantenha a base íntegra."
        actions={
          <div className="flex flex-wrap gap-2">
            <WorkspaceTabs
              items={importTabs.map((tab) => ({
                key: tab.key,
                label: tab.label,
                active: activeTab === tab.key,
                onClick: () => setActiveTab(tab.key),
              }))}
            />
            <span className="atlas-inline-metric">{activeBrand.name}</span>
            <span className="atlas-inline-metric">{progressPercent}% consolidado</span>
          </div>
        }
      />

      <OperationalMetricStrip>
        <OperationalMetric
          label="Rodadas"
          value={String(stats?.totalRuns ?? 0)}
          helper="Total de importações registradas pela marca."
          tone="info"
        />
        <OperationalMetric
          label="Linhas"
          value={(stats?.totalRows ?? 0).toLocaleString("pt-BR")}
          helper="Volume total lido por CSV ao longo do histórico."
        />
        <OperationalMetric
          label="Consolidação"
          value={String(progressPercent)}
          helper="Percentual do checklist padrão já consolidado."
          tone="positive"
        />
        <OperationalMetric
          label="Período"
          value={`${formatDate(stats?.firstOrderDate)} - ${formatDate(stats?.lastOrderDate)}`}
          helper="Janela comercial coberta pela base ativa."
        />
      </OperationalMetricStrip>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]">
        <SurfaceCard>
          <SectionHeading
            title="Direção da base"
            description="O próximo movimento para manter a importação íntegra e pronta para operação."
            aside={<span className="atlas-inline-metric">{selectedPeriodLabel}</span>}
          />
          <div className="mt-5 atlas-component-stack">
            <article className="panel-muted p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
                Próximo movimento
              </p>
              <p className="mt-2 font-semibold text-on-surface">{primaryAction}</p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                A ação principal agora para manter a base íntegra e pronta para uso.
              </p>
            </article>
            <div className="grid gap-3 md:grid-cols-2">
              <article className="panel-muted p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
                  Cobertura atual
                </p>
                <p className="mt-2 font-semibold text-on-surface">
                  {completedSources}/{sourceChecklist.length} fontes consolidadas
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  O checklist padrão da marca já avançou {progressPercent}% neste ambiente.
                </p>
              </article>
              <article className="panel-muted p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
                  Modo Meta
                </p>
                <p className="mt-2 font-semibold text-on-surface">{metaMode}</p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  O canal Meta continua aceitando contingência por CSV quando necessário.
                </p>
              </article>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            title="Pulso da importação"
            description="Saúde da base e janela coberta."
          />
            <div className="mt-5 atlas-component-stack">
              <article className="panel-muted p-3.5">
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
            </article>
            <OperationalMetricStrip baseColumns={2} desktopColumns={2}>
              <OperationalMetric
                label="Checklist"
                value={`${completedSources}/${sourceChecklist.length}`}
                helper="Fontes já consolidadas na base ativa."
                tone={progressPercent >= 100 ? "positive" : "info"}
              />
              <OperationalMetric
                label="Janela coberta"
                value={`${formatDate(stats?.firstOrderDate)} - ${formatDate(stats?.lastOrderDate)}`}
                helper="Faixa comercial já reconhecida na marca."
              />
            </OperationalMetricStrip>
          </div>
        </SurfaceCard>
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
                O importador identifica o tipo pelo cabeçalho, consolida janelas sobrepostas e evita duplicidade.
              </p>
            </div>

            <div className="p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <SectionHeading
                title="Fila"
                description="Só o que está pronto para entrar agora."
                aside={<span className="atlas-inline-metric">{files.length} arquivo(s)</span>}
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
              title="Guia rápido"
              description="Regras rápidas para importar a base."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <OperationalMetric
                label="Checklist pronto"
                value={`${completedSources}/${sourceChecklist.length}`}
                helper="Fontes já consolidadas na base ativa."
                tone={progressPercent >= 100 ? "positive" : "info"}
              />
              <OperationalMetric
                label="Janela coberta"
                value={`${formatDate(stats?.firstOrderDate)} - ${formatDate(stats?.lastOrderDate)}`}
                helper="Faixa comercial já reconhecida na marca."
              />
            </div>
            <details className="atlas-disclosure" open={!files.length}>
              <summary>
                <span>Abrir regras rápidas</span>
                <span>3</span>
              </summary>
            <div className="mt-4 atlas-component-stack-compact text-sm text-on-surface-variant">
                <p>`Lista de Pedidos` mantém a linha comercial principal da INK.</p>
                <p>`Lista de Itens` alimenta peças vendidas e CMV histórico.</p>
                <p>`Meta Export` segue como contingência quando a loja opera em API.</p>
              </div>
            </details>
          </SurfaceCard>
        </section>
      )}

      {activeTab === "checklist" && (
        <section className="grid gap-4 xl:grid-cols-[1fr_1.05fr]">
          <SurfaceCard>
            <OperationalMetricStrip>
              <OperationalMetric
                label="Rodadas importadas"
                value={String(stats?.totalRuns ?? 0)}
                helper="Total acumulado de execuções por fonte."
                tone="info"
              />
              <OperationalMetric
                label="Linhas processadas"
                value={(stats?.totalRows ?? 0).toLocaleString("pt-BR")}
                helper="Volume total lido e consolidado."
              />
              <OperationalMetric
                label="Primeiro pedido"
                value={formatDate(stats?.firstOrderDate)}
                helper="Início do histórico comercial."
              />
              <OperationalMetric
                label="Último pedido"
                value={formatDate(stats?.lastOrderDate)}
                helper="Fim da janela já reconhecida."
              />
            </OperationalMetricStrip>
          </SurfaceCard>

          <SurfaceCard className="p-0 overflow-hidden">
            <div className="border-b border-outline p-4">
              <SectionHeading
                title="Checklist consolidado"
                description="Resumo por arquivo, já obedecendo o modo de cada integração."
              />
            </div>

              <div className="atlas-component-stack-compact p-4">
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
                        <div className="atlas-component-stack-tight">
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
                        <div className="atlas-component-stack-tight">
                          <p>{source.description}</p>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                            {modeHint}
                          </p>
                        </div>
                      )
                    }
                    aside={<span className="atlas-inline-metric">{info ? `${info.totalRuns} rodada(s)` : "Pendente"}</span>}
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
            <div className="border-b border-outline p-4">
              <SectionHeading
                title="Últimas importações"
                description="O que entrou por último na base."
              />
            </div>

              <div className="atlas-component-stack-compact p-4">
              {recentImports.length ? (
                recentImports.map((row) => (
                  <StackItem
                    key={`${row.kind}-${row.lastImportedAt}`}
                    title={row.label}
                    description={
                      <div className="atlas-component-stack-tight">
                        <p>{row.description}</p>
                        <div className="grid gap-1 pt-1 sm:grid-cols-3">
                          <span>{row.totalRuns} rodada(s)</span>
                          <span>{row.totalRows.toLocaleString("pt-BR")} linhas</span>
                          <span>{formatDateTime(row.lastImportedAt)}</span>
                        </div>
                      </div>
                    }
                    aside={<span className="atlas-inline-metric">{row.modeLabel}</span>}
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
                    aside={<span className="atlas-inline-metric">{info ? "Ativo" : "Pendente"}</span>}
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
