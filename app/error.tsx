"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function isLocalhost() {
  if (typeof window === "undefined") {
    return false;
  }

  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("App route error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-6 py-12 text-slate-900">
      <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_60px_rgba(21,32,51,0.08)]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
          BrandOps
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Ocorreu um erro inesperado
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-500">
          O sistema encontrou uma falha ao carregar esta área. Tente novamente em alguns
          instantes.
        </p>
        {isLocalhost() ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-xs text-slate-700">
            <p className="font-semibold text-slate-900">Diagnóstico local</p>
            <p className="mt-2 break-words">
              <strong>Mensagem:</strong> {error.message || "(sem mensagem)"}
            </p>
            {error.digest ? (
              <p className="mt-1 break-words">
                <strong>Digest:</strong> {error.digest}
              </p>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
