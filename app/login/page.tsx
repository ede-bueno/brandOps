"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, LockKeyhole } from "lucide-react";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { BRANDING } from "@/lib/branding";

export default function LoginPage() {
  const router = useRouter();
  const { session, signIn, isLoading } = useBrandOps();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && session) {
      router.replace("/dashboard");
    }
  }, [isLoading, router, session]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(58,88,140,0.12)_1px,transparent_0)] bg-[length:24px_24px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(8,145,178,0.18),transparent_62%)]" />
      <div className="brandops-panel atlas-tech-grid relative z-10 w-full max-w-md px-6 py-7 shadow-sm sm:px-7 sm:py-8">
        <div className="atlas-brand-shell inline-flex h-12 w-12 items-center justify-center rounded-xl border text-secondary">
          <LockKeyhole size={22} />
        </div>
        <div className="mt-5">
          <p className="eyebrow">{BRANDING.appName}</p>
          <h1 className="mt-2 font-headline text-2xl font-semibold tracking-tight text-on-surface">
            Entrar no painel
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">{BRANDING.tagline}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ink-muted">
            Torre de controle e inteligência para Print on Demand
          </p>
        </div>

        <form
          className="mt-7 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setIsSubmitting(true);
            try {
              await signIn(email, password);
            } catch (loginError) {
              setError(
                loginError instanceof Error
                  ? loginError.message
                  : "Falha ao autenticar.",
              );
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div>
            <label className="mb-2 block text-sm text-on-surface-variant">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
                className="brandops-input w-full"
              placeholder="contato@marca.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-on-surface-variant">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
                className="brandops-input w-full"
              placeholder="Sua senha"
            />
          </div>
          {error ? (
            <div className="rounded-xl border border-tertiary/20 bg-tertiary-container/60 px-4 py-3 text-sm text-on-tertiary-container">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="brandops-button brandops-button-primary inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm disabled:translate-y-0 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
