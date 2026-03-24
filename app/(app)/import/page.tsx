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
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import type { CsvFileKind, IntegrationMode, IntegrationProvider } from "@/lib/brandops/types";

type ImportStatus = "idle" | "running" | "success" | "error";

const sourceDefinitions: Array<{
  kind: CsvFileKind;
  label: string;
  description: string;
  provider?: IntegrationProvider;
}> = [
  {
    kind: "lista_pedidos",
    label: "Lista de Pedidos",
    description: "Fonte principal da camada comercial da INK.",
    provider: "ink",
  },
  {
    kind: "lista_itens",
    label: "Lista de Itens",
    description: "Base real de peças vendidas e aplicação de CMV.",
    provider: "ink",
  },
  {
    kind: "pedidos_pagos",
    label: "Pedidos Pagos",
    description: "Detalhamento operacional por linha/SKU.",
    provider: "ink",
  },
  {
    kind: "meta",
    label: "Meta Export",
    description: "Investimento e performance de mídia paga.",
    provider: "meta",
  },
  {
    kind: "feed",
    label: "Feed Facebook",
    description: "Catálogo de apoio para produtos e criativos.",
  },
];

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(`${value}T00:00:00`));
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
  const { activeBrand, importFiles } = useBrandOps();
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [message, setMessage] = useState("");

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
      setMessage("Importando arquivos, cruzando duplicados e atualizando a base da marca...");
      await importFiles(activeBrand?.name || "", files);
      setStatus("success");
      setMessage("Importação concluída com sucesso. Os CSVs duplicados foram consolidados pela chave de pedido/ocorrência.");
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

  const progressPercent = stats
    ? Math.round((completedSources / sourceChecklist.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integração de dados"
        title="Importação"
        description="Suba os CSVs exportados por janela de tempo. O BrandOps consolida os arquivos por chave de pedido/ocorrência, evita duplicidade e mantém o histórico já saneado no banco."
      />

      {activeBrand && stats && (
        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <SurfaceCard className="p-0 overflow-hidden">
            <div className="flex flex-col gap-5 border-b border-outline p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary-container text-secondary">
                  <DatabaseZap size={24} />
                </div>
                <div>
                  <p className="eyebrow">Base ativa</p>
                  <h2 className="font-headline text-2xl font-semibold tracking-tight text-on-surface">
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

            <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
              <article className="panel-muted p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Rodadas importadas
                </p>
                <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
                  {stats.totalRuns}
                </p>
              </article>
              <article className="panel-muted p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Linhas processadas
                </p>
                <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
                  {stats.totalRows.toLocaleString("pt-BR")}
                </p>
              </article>
              <article className="panel-muted p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Primeiro pedido
                </p>
                <p className="mt-2 text-lg font-semibold text-on-surface">
                  {formatDate(stats.firstOrderDate)}
                </p>
              </article>
              <article className="panel-muted p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Último pedido
                </p>
                <p className="mt-2 text-lg font-semibold text-on-surface">
                  {formatDate(stats.lastOrderDate)}
                </p>
              </article>
            </div>
          </SurfaceCard>

          <SurfaceCard className="flex flex-col justify-between gap-4">
              <SectionHeading
                title="Regra operacional"
                description="Você pode subir 2025 e 2026 em blocos. O sistema consolida por número do pedido e preserva saneamentos já registrados."
              />
              <div className="space-y-3 text-sm text-on-surface-variant">
                <p>
                  `Lista de Pedidos` é a fonte principal da camada comercial da INK.
                </p>
                <p>
                  `Lista de Itens` é a base real de peças vendidas e do CMV histórico.
                </p>
                <p>
                  `Meta Export` continua aceito como contingência mesmo quando a loja estiver em modo API.
                </p>
              </div>
            </SurfaceCard>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceCard className="p-0 overflow-hidden">
          <div
            {...getRootProps()}
            className={`cursor-pointer border-b border-outline px-6 py-10 text-center transition-all ${
              isDragActive
                ? "bg-secondary-container/50"
                : "bg-surface-container-low hover:bg-surface-container"
            }`}
          >
            <input {...getInputProps()} />
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-surface text-secondary shadow-sm">
              <UploadCloud size={34} />
            </div>
            <h2 className="mt-5 font-headline text-2xl font-semibold tracking-tight text-on-surface">
              Arraste os CSVs da operação
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-on-surface-variant">
              Suba quantos arquivos forem necessários. O BrandOps identifica o tipo pelo cabeçalho, consolida janelas sobrepostas e evita duplicações no banco.
            </p>
          </div>

          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <SectionHeading
                title="Fila pronta para processar"
                description="Os arquivos enviados ficam aqui até o disparo da importação."
              />
              <button
                onClick={handleImport}
                disabled={status === "running" || !activeBrand || files.length === 0}
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
                  <article
                    key={`${file.name}-${file.size}`}
                    className="panel-muted flex items-center gap-4 p-4"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary-container text-secondary">
                      <FileCheck2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-on-surface">{file.name}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-outline p-5 text-sm text-on-surface-variant">
                Nenhum arquivo selecionado ainda.
              </div>
            )}

            {message && (
              <div
                className={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                  status === "error"
                    ? "border-error/20 bg-error-container/30 text-on-error-container"
                    : "border-secondary/20 bg-secondary-container/30 text-on-secondary-container"
                }`}
              >
                {status === "running" ? (
                  <Loader2 size={18} className="mt-0.5 animate-spin" />
                ) : status === "success" ? (
                  <CheckCircle2 size={18} className="mt-0.5" />
                ) : (
                  <AlertCircle size={18} className="mt-0.5" />
                )}
                <span>{message}</span>
              </div>
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-0 overflow-hidden">
          <div className="border-b border-outline p-6">
            <SectionHeading
              title="Checklist consolidado"
              description="Soma de todas as importações bem-sucedidas por grupo de arquivo."
            />
          </div>

          <div className="space-y-3 p-6">
            {sourceChecklist.map((source) => {
              const info = activeBrand?.files[source.kind];
              const providerMode = getProviderMode(activeBrand, source.provider);
              const modeHint =
                source.provider === "meta" && providerMode === "api"
                  ? "API ativa com fallback manual"
                  : source.provider === "ga4" && providerMode === "api"
                    ? "API ativa"
                    : providerMode === "manual_csv"
                      ? "Upload manual"
                      : providerMode === "disabled"
                        ? "Desabilitado"
                        : null;
              return (
                <article
                  key={source.kind}
                  className={`rounded-2xl border p-4 ${
                    info
                      ? "border-secondary/20 bg-surface-container-low"
                      : "border-dashed border-outline bg-transparent"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                        info
                          ? "bg-secondary-container text-secondary"
                          : "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      {info ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-on-surface">{source.label}</p>
                          <p className="mt-1 text-sm text-on-surface-variant">
                            {source.description}
                          </p>
                          {modeHint ? (
                            <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-secondary">
                              {modeHint}
                            </p>
                          ) : null}
                        </div>
                        <span className="status-chip">
                          {info ? `${info.totalRuns} rodada(s)` : "Pendente"}
                        </span>
                      </div>
                      {info ? (
                        <div className="mt-3 grid gap-2 text-sm text-on-surface-variant sm:grid-cols-3">
                          <p>{info.totalRows.toLocaleString("pt-BR")} linhas lidas</p>
                          <p>{info.totalInserted.toLocaleString("pt-BR")} linhas consolidadas</p>
                          <p>Última em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(info.lastImportedAt))}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
