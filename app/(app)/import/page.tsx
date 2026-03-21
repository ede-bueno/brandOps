"use client";

import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AlertCircle, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";

type ImportStatus = "idle" | "running" | "success" | "error";

const expectedFiles = [
  "Meta Export.csv",
  "feed_facebook.csv",
  "Controle Financeiro - Oh, My Dog! - CMV_Produtos.csv",
  "Pedidos Pagos.csv",
  "Lista de Pedidos.csv",
  "Lista de Itens.csv",
];

export default function ImportPage() {
  const { activeBrand, brands, importFiles } = useBrandOps();
  const [brandName, setBrandName] = useState(activeBrand?.name ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [message, setMessage] = useState("");

  const onDrop = (acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    if (!brandName && activeBrand?.name) {
      setBrandName(activeBrand.name);
    }
    setStatus("idle");
    setMessage("");
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: true,
  });

  const fileSummaries = useMemo(
    () =>
      files.map((file) => ({
        file,
        kind: file.name,
      })),
    [files],
  );

  const handleImport = async () => {
    try {
      setStatus("running");
      setMessage("Importando arquivos e atualizando a marca...");
      await importFiles(brandName, files);
      setStatus("success");
      setMessage("Importação concluída com sucesso.");
      setFiles([]);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Falha ao importar.");
    }
  };

  const importedKinds = activeBrand ? Object.values(activeBrand.files) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Atualização da base"
        title="Importação"
        description="Envie os CSVs exportados da operação. O sistema identifica o tipo pelo cabeçalho, atualiza só o bloco correspondente e reaplica checkpoint de CMV quando a base de custo já existe."
      />

      <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="space-y-6">
          <SurfaceCard>
            <SectionHeading
              title="Destino da importação"
              description="Você pode importar direto para a marca em foco ou selecionar outra já cadastrada."
            />
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                value={brandName}
                onChange={(event) => setBrandName(event.target.value)}
                placeholder="Ex.: Oh My Dog"
                className="soft-input"
              />
              <select
                value=""
                onChange={(event) => {
                  if (event.target.value) {
                    setBrandName(event.target.value);
                  }
                }}
                className="soft-select md:min-w-64"
              >
                <option value="">Selecionar marca existente</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.name} className="text-black">
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
          </SurfaceCard>

          <section
            {...getRootProps()}
            className={`panel-surface px-8 py-10 text-center ${
              isDragActive ? "border-[rgba(215,249,120,0.4)] bg-[rgba(215,249,120,0.08)]" : ""
            }`}
          >
            <input {...getInputProps()} />
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/6 text-[var(--color-secondary)]">
              <UploadCloud size={30} />
            </div>
            <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-ink-strong)]">
              Solte os CSVs aqui
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--color-ink-soft)]">
              Você pode enviar um ou mais arquivos por vez. Os cabeçalhos definem o
              tipo de cada importação.
            </p>
          </section>

          {files.length ? (
            <SurfaceCard>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <SectionHeading title="Arquivos prontos para envio" description="Revise o pacote antes de atualizar a base." />
                <button
                  onClick={handleImport}
                  disabled={status === "running" || !brandName.trim()}
                  className="soft-button soft-button-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "running" ? "Enviando..." : "Importar agora"}
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {fileSummaries.map(({ file }) => (
                  <article key={`${file.name}-${file.size}`} className="panel-muted p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[var(--color-ink-strong)]">{file.name}</p>
                        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {message ? (
                <div
                  className={`mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
                    status === "error"
                      ? "border-[rgba(255,125,125,0.2)] bg-[rgba(255,125,125,0.08)] text-[var(--color-error)]"
                      : "border-[var(--color-line-soft)] bg-black/20 text-[var(--color-ink-soft)]"
                  }`}
                >
                  {status === "running" ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : status === "success" ? (
                    <CheckCircle2 size={18} className="text-[var(--color-primary)]" />
                  ) : (
                    <AlertCircle size={18} />
                  )}
                  <span>{message}</span>
                </div>
              ) : null}
            </SurfaceCard>
          ) : (
            <EmptyState
              title="Nenhum arquivo selecionado"
              description="Selecione ao menos um dos CSVs da operação para atualizar a base da marca."
              ctaHref="/import"
              ctaLabel="Aguardando arquivos"
            />
          )}
        </div>

        <div className="space-y-6">
          <SurfaceCard>
            <SectionHeading
              title="Arquivos esperados"
              description="Você não precisa subir tudo em toda rodada, mas essa é a base padrão da operação."
            />
            <div className="mt-5 space-y-3 text-sm text-[var(--color-ink-soft)]">
              {expectedFiles.map((file) => (
                <div key={file} className="panel-muted p-4">
                  {file}
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading title="Marca carregada" description="Resumo rápido da base atual desta marca." />
            {activeBrand ? (
              <div className="mt-5 space-y-3">
                <div className="panel-muted p-4">
                  <p className="font-semibold text-[var(--color-ink-strong)]">{activeBrand.name}</p>
                  <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                    {importedKinds.length} bloco(s) atualizados
                  </p>
                </div>
                {importedKinds.map((file) => (
                  <div key={file.kind} className="panel-muted p-4 text-sm text-[var(--color-ink-soft)]">
                    <span className="font-medium text-[var(--color-ink-strong)]">{file.fileName}</span>
                    <br />
                    {file.rowCount} linhas
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--color-ink-soft)]">Nenhuma marca em foco.</p>
            )}
          </SurfaceCard>
        </div>
      </section>
    </div>
  );
}
