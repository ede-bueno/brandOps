"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

type FileStatus = "idle" | "uploading" | "processing" | "success" | "error";

interface UploadFile {
  id: string;
  file: File;
  type: string;
  status: FileStatus;
  progress: number;
  message?: string;
}

const FILE_TYPES = [
  {
    id: "meta",
    name: "Meta Export.csv",
    desc: "Dados de mídia, gasto, impressões, conversões",
  },
  {
    id: "pedidos",
    name: "Pedidos Pagos.csv",
    desc: "Base financeira, receita, descontos",
  },
  {
    id: "lista_pedidos",
    name: "Lista de Pedidos.csv",
    desc: "Vínculo entre pedidos e SKUs",
  },
  {
    id: "itens",
    name: "Lista de Itens.csv",
    desc: "Peças vendidas, faturamento por item",
  },
  {
    id: "feed",
    name: "feed_facebook.csv",
    desc: "Catálogo de produtos e preços",
  },
];

export default function ImportPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => {
      // Try to match file name to expected types
      let type = "unknown";
      if (file.name.toLowerCase().includes("meta")) type = "meta";
      else if (file.name.toLowerCase().includes("pedidos pagos"))
        type = "pedidos";
      else if (file.name.toLowerCase().includes("lista de pedidos"))
        type = "lista_pedidos";
      else if (file.name.toLowerCase().includes("lista de itens"))
        type = "itens";
      else if (file.name.toLowerCase().includes("feed")) type = "feed";

      return {
        id: Math.random().toString(36).substring(7),
        file,
        type,
        status: "idle" as FileStatus,
        progress: 0,
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
  });

  const handleUpload = async (id: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, status: "uploading", progress: 10 } : f,
      ),
    );

    // Simulate upload and processing
    setTimeout(() => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: "processing",
                progress: 50,
                message: "Normalizando e deduplicando...",
              }
            : f,
        ),
      );

      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: "success",
                  progress: 100,
                  message:
                    "Upsert concluído: 1,245 linhas novas, 30 atualizadas.",
                }
              : f,
          ),
        );
      }, 2000);
    }, 1500);
  };

  const handleUploadAll = () => {
    files.filter((f) => f.status === "idle").forEach((f) => handleUpload(f.id));
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Importação de Dados
        </h1>
        <p className="text-slate-500 mt-1">
          Faça o upload dos arquivos CSV para atualizar a base de dados. O
          sistema usa staging, normalização e upsert incremental.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
              ${isDragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-300 hover:border-indigo-400 bg-white"}`}
          >
            <input {...getInputProps()} />
            <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
              <UploadCloud size={24} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              Arraste e solte seus arquivos CSV aqui
            </h3>
            <p className="text-sm text-slate-500">
              ou clique para selecionar do seu computador
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="font-semibold text-slate-900">
                  Arquivos na Fila ({files.length})
                </h3>
                <button
                  onClick={handleUploadAll}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Processar Todos
                </button>
              </div>
              <ul className="divide-y divide-slate-200">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">
                            {file.file.name}
                          </p>
                          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 rounded-full">
                            {file.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-xs text-slate-500">
                            {(file.file.size / 1024).toFixed(1)} KB
                          </p>
                          {file.message && (
                            <p
                              className={`text-xs ${file.status === "success" ? "text-emerald-600" : "text-slate-500"}`}
                            >
                              {file.message}
                            </p>
                          )}
                        </div>

                        {(file.status === "uploading" ||
                          file.status === "processing") && (
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                            <div
                              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-4">
                      {file.status === "idle" && (
                        <>
                          <button
                            onClick={() => handleUpload(file.id)}
                            className="text-sm text-indigo-600 font-medium hover:text-indigo-800"
                          >
                            Processar
                          </button>
                          <button
                            onClick={() => removeFile(file.id)}
                            className="text-sm text-slate-400 hover:text-rose-600"
                          >
                            Remover
                          </button>
                        </>
                      )}
                      {(file.status === "uploading" ||
                        file.status === "processing") && (
                        <Loader2
                          size={20}
                          className="text-indigo-600 animate-spin"
                        />
                      )}
                      {file.status === "success" && (
                        <CheckCircle size={20} className="text-emerald-500" />
                      )}
                      {file.status === "error" && (
                        <AlertCircle size={20} className="text-rose-500" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Instructions Sidebar */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 h-fit">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
            Arquivos Suportados
          </h3>
          <ul className="space-y-4">
            {FILE_TYPES.map((type) => (
              <li key={type.id} className="flex gap-3">
                <div className="mt-0.5">
                  <CheckCircle size={16} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {type.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{type.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-start gap-3 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>
                <strong>Importação Incremental:</strong> O sistema realiza
                upsert. Linhas novas são inseridas, linhas existentes são
                atualizadas e duplicadas perfeitas são ignoradas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
