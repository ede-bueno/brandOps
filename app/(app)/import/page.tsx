"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { AlertCircle, CheckCircle2, Loader2, UploadCloud, DatabaseZap, Clock, FileCheck2 } from "lucide-react";
import { useBrandOps } from "@/components/BrandOpsProvider";
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
      setMessage("Importando arquivos e atualizando a marca...");
      await importFiles(activeBrand?.name || "", files);
      setStatus("success");
      setMessage("Importação concluída com sucesso.");
      setFiles([]);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Falha ao importar.");
    }
  };

  const importedKinds = activeBrand ? Object.values(activeBrand.files) : [];
  const importedCount = importedKinds.length;
  const progressPercent = Math.round((importedCount / expectedFiles.length) * 100);

  return (
    <div className="relative isolate overflow-hidden space-y-6 lg:space-y-8">
      {/* Background patterns */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 right-[-6rem] h-96 w-96 rounded-full bg-secondary/10 blur-[120px]" />
        <div className="absolute left-[-7rem] top-40 h-80 w-80 rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <PageHeader
        eyebrow="Integração de Dados"
        title="Upload & Saneamento"
        description="Abasteça o ecossistema com os CSVs exportados da operação. O sistema os reconhece pela estrutura de colunas e atualiza a base da marca ativa automaticamente."
      />

      {activeBrand && (
        <SurfaceCard className="p-0 overflow-hidden bg-background/50 border-secondary/10 shadow-sm">
           <div className="p-5 sm:p-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-outline bg-surface-container/20">
              <div className="flex items-center gap-5">
                 <div className="flex h-14 w-14 items-center justify-center rounded-[1rem] bg-secondary/10 text-secondary border border-secondary/20 shadow-inner">
                    <DatabaseZap size={24} />
                 </div>
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                       <span className="relative flex h-2.5 w-2.5">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
                       </span>
                       <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Destino Conectado</p>
                    </div>
                    <h2 className="text-2xl font-black text-on-surface tracking-tight">{activeBrand.name}</h2>
                 </div>
              </div>

              <div className="flex-1 max-w-md w-full">
                 <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest mb-2">
                    <span className="text-on-surface-variant">Saúde da Base</span>
                    <span className="text-secondary">{progressPercent}% Completo</span>
                 </div>
                 <div className="h-2.5 w-full bg-surface-container rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-secondary transition-all duration-1000 ease-out" 
                      style={{ width: `${progressPercent}%` }} 
                    />
                 </div>
              </div>
           </div>
        </SurfaceCard>
      )}

      <section className="grid gap-6 lg:gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 lg:space-y-8 flex flex-col">
          <div
            {...getRootProps()}
            className={`group relative overflow-hidden rounded-[2.5rem] border-2 border-dashed transition-all duration-300 p-10 sm:p-14 text-center cursor-pointer flex-1 flex flex-col justify-center min-h-[300px] ${
              isDragActive 
                ? "border-secondary bg-secondary/5 scale-100 shadow-[0_0_40px_-10px_rgba(78,222,163,0.2)]" 
                : "border-outline bg-surface-container/30 hover:border-secondary/30 hover:bg-surface-container/50"
            }`}
          >
            <input {...getInputProps()} />
            
            <div className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] shadow-sm transition-all duration-500 ${isDragActive ? "bg-secondary text-on-secondary scale-110 shadow-secondary/30" : "bg-background border border-outline text-on-surface-variant/70 group-hover:scale-105 group-hover:text-secondary"}`}>
              <UploadCloud size={40} className={isDragActive ? "animate-pulse" : ""} />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
              Arraste os CSVs da Operação
            </h2>
            <p className="mt-4 max-w-sm mx-auto text-sm leading-relaxed text-on-surface-variant">
              Você pode importar arquivos unificados ou múltiplos de uma vez. O sistema reconhecerá Shopify, Meta, ou planilhas de CMV.
            </p>
            
            <div className="mt-8 flex justify-center gap-2">
              <span className="rounded-full bg-background border border-outline px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                CSVs em UTF-8
              </span>
            </div>
          </div>

          {files.length > 0 && (
            <SurfaceCard className="p-6 sm:p-8 animate-in slide-in-from-bottom-4 duration-500 fade-in border-secondary/20 shadow-lg shadow-black/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-on-surface">Fila de Processamento</h3>
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mt-1">
                    {files.length} arquivo(s) na rampa
                  </p>
                </div>
                <button
                  onClick={handleImport}
                  disabled={status === "running" || !activeBrand}
                  className="brandops-button brandops-button-primary px-8 py-3 rounded-xl shadow-md min-w-[200px]"
                >
                  {status === "running" ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      <span>Processando Base...</span>
                    </div>
                  ) : "Iniciar Importação"}
                </button>
              </div>
              
              <div className="grid gap-3 sm:grid-cols-2">
                {files.map((file) => (
                  <div key={`${file.name}-${file.size}`} className="flex items-center gap-4 p-4 rounded-2xl border border-outline bg-background/50">
                    <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-surface-container text-secondary">
                      <FileCheck2 size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-on-surface text-sm truncate">{file.name}</p>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {message && (
                <div
                  className={`mt-6 flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-bold ${
                    status === "error"
                      ? "border-tertiary/20 bg-tertiary/5 text-tertiary"
                      : "border-secondary/20 bg-secondary/5 text-secondary"
                  }`}
                >
                  {status === "running" ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : status === "success" ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <AlertCircle size={20} />
                  )}
                  <span>{message}</span>
                </div>
              )}
            </SurfaceCard>
          )}
        </div>

        <div className="space-y-6">
          <SurfaceCard className="p-0 overflow-hidden flex flex-col h-full bg-surface-container/10 border-outline">
             <div className="p-6 sm:p-8 border-b border-outline bg-background">
                <SectionHeading
                  title="Checklist de Arquivos"
                  description="Verifique quais conjuntos de dados já alimentam a marca."
                />
             </div>
             
             <div className="p-6 sm:p-8 flex-1 space-y-3 bg-surface-container/20">
               {expectedFiles.map((fileName) => {
                 const importedFile = importedKinds.find(k => k.fileName === fileName);
                 const isImported = !!importedFile;
                 return (
                   <div 
                     key={fileName} 
                     className={`flex flex-col p-4 rounded-2xl border transition-all ${
                       isImported 
                         ? "border-secondary/30 bg-background shadow-sm hover:border-secondary/50" 
                         : "border-outline border-dashed bg-transparent opacity-60"
                     }`}
                   >
                     <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-[1rem] border ${
                          isImported ? "bg-secondary text-on-secondary border-secondary/20" : "bg-surface-container text-on-surface-variant/40 border-outline"
                        }`}>
                          {isImported ? <CheckCircle2 size={20} /> : <div className="h-1.5 w-1.5 rounded-full bg-current" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-bold truncate ${isImported ? "text-on-surface" : "text-on-surface-variant"}`}>
                            {fileName}
                          </p>
                          {isImported ? (
                             <p className="text-[10px] font-bold uppercase tracking-wider text-secondary mt-1 flex items-center gap-1.5">
                               <Clock size={10} />
                               {importedFile.rowCount} REGISTROS GRAVADOS
                             </p>
                          ) : (
                             <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mt-1">
                               Pendente de upload
                             </p>
                          )}
                        </div>
                     </div>
                   </div>
                 );
               })}
             </div>
          </SurfaceCard>
        </div>
      </section>
    </div>
  );
}
