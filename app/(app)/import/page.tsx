"use client";

import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AlertCircle, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { EmptyState } from "@/components/EmptyState";

type ImportStatus = "idle" | "running" | "success" | "error";

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
      files.map((file) => {
        let kind = "não reconhecido";
        try {
          const sample = file.name;
          kind = sample;
        } catch {
          kind = "não reconhecido";
        }
        return {
          file,
          kind,
        };
      }),
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
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-on-surface">Importação</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-on-surface-variant">
          Envie os CSVs exportados da operação. O BrandOps identifica cada arquivo
          pelos cabeçalhos e atualiza só o bloco correspondente da marca.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-outline bg-surface-container p-6">
            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
              Marca de destino
            </label>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                value={brandName}
                onChange={(event) => setBrandName(event.target.value)}
                placeholder="Ex.: Oh My Dog"
                className="rounded-xl border border-outline bg-background px-4 py-3 text-sm text-on-surface outline-none"
              />
              <select
                value=""
                onChange={(event) => {
                  if (event.target.value) {
                    setBrandName(event.target.value);
                  }
                }}
                className="rounded-xl border border-outline bg-background px-4 py-3 text-sm text-on-surface outline-none"
              >
                <option value="">Selecionar marca existente</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.name} className="text-black">
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            {...getRootProps()}
            className={`rounded-3xl border-2 border-dashed p-10 text-center transition-colors ${
              isDragActive
                ? "border-secondary bg-secondary/10"
                : "border-outline bg-surface-container hover:border-secondary/40"
            }`}
          >
            <input {...getInputProps()} />
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary/15 text-secondary">
              <UploadCloud size={28} />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-on-surface">
              Solte os CSVs aqui
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Você pode enviar um ou mais arquivos por vez. Os cabeçalhos definem
              o tipo de cada importação.
            </p>
          </div>

          {files.length ? (
            <div className="rounded-3xl border border-outline bg-surface-container p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-on-surface">
                  Arquivos prontos para envio
                </h2>
                <button
                  onClick={handleImport}
                  disabled={status === "running" || !brandName.trim()}
                  className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-on-secondary disabled:opacity-60"
                >
                  {status === "running" ? "Enviando..." : "Importar"}
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {fileSummaries.map(({ file }) => (
                  <div
                    key={`${file.name}-${file.size}`}
                    className="rounded-2xl border border-outline bg-background p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-on-surface">{file.name}</p>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {message ? (
                <div
                  className={`mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
                    status === "error"
                      ? "border-tertiary/40 bg-tertiary/10 text-tertiary"
                      : "border-outline bg-background text-on-surface-variant"
                  }`}
                >
                  {status === "running" ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : status === "success" ? (
                    <CheckCircle2 size={18} className="text-secondary" />
                  ) : (
                    <AlertCircle size={18} />
                  )}
                  <span>{message}</span>
                </div>
              ) : null}
            </div>
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
          <div className="rounded-3xl border border-outline bg-surface-container p-6">
            <h2 className="text-lg font-semibold text-on-surface">Arquivos esperados</h2>
            <div className="mt-4 space-y-3 text-sm text-on-surface-variant">
              <div className="rounded-2xl border border-outline bg-background p-4">Meta Export.csv</div>
              <div className="rounded-2xl border border-outline bg-background p-4">feed_facebook.csv</div>
              <div className="rounded-2xl border border-outline bg-background p-4">Pedidos Pagos.csv</div>
              <div className="rounded-2xl border border-outline bg-background p-4">Lista de Pedidos.csv</div>
              <div className="rounded-2xl border border-outline bg-background p-4">Lista de Itens.csv</div>
            </div>
          </div>

          <div className="rounded-3xl border border-outline bg-surface-container p-6">
            <h2 className="text-lg font-semibold text-on-surface">Marca carregada</h2>
            {activeBrand ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-outline bg-background p-4">
                  <p className="font-semibold text-on-surface">{activeBrand.name}</p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {importedKinds.length} bloco(s) atualizados
                  </p>
                </div>
                {importedKinds.map((file) => (
                  <div
                    key={file.kind}
                    className="rounded-2xl border border-outline bg-background p-4 text-sm text-on-surface-variant"
                  >
                    <span className="font-medium text-on-surface">{file.fileName}</span>
                    <br />
                    {file.rowCount} linhas
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-on-surface-variant">
                Nenhuma marca em foco.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
