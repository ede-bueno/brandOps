"use client";

import { useEffect } from "react";
import { BRANDING } from "@/lib/branding";

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
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-on-background">
      <div className="brandops-panel atlas-tech-grid w-full max-w-xl p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          {BRANDING.appName}
        </p>
        <h1 className="mt-4 font-headline text-3xl font-semibold tracking-tight text-on-surface">
          Ocorreu um erro inesperado
        </h1>
        <p className="mt-3 text-base leading-7 text-on-surface-variant">
          O sistema encontrou uma falha ao carregar esta área. Tente novamente em alguns
          instantes.
        </p>
        {isLocalhost() ? (
          <div className="mt-4 rounded-xl border border-tertiary/20 bg-tertiary-container/40 p-4 text-left text-xs text-on-tertiary-container">
            <p className="font-semibold text-on-surface">Diagnóstico local</p>
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
          className="brandops-button brandops-button-primary mt-6 inline-flex items-center justify-center px-5 py-2.5 text-sm"
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
