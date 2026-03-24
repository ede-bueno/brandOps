"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, LockKeyhole } from "lucide-react";
import { useBrandOps } from "@/components/BrandOpsProvider";

export default function LoginPage() {
  const router = useRouter();
  const { session, signIn, isLoading } = useBrandOps();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace("/dashboard");
    }
  }, [router, session]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="brandops-panel w-full max-w-md px-6 py-7 shadow-sm sm:px-7 sm:py-8">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/12 text-secondary">
          <LockKeyhole size={22} />
        </div>
        <div className="mt-5">
          <p className="eyebrow">BrandOps</p>
          <h1 className="mt-2 font-headline text-2xl font-semibold tracking-tight text-on-surface">
            Entrar no painel
          </h1>
        </div>

        <form
          className="mt-7 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setIsSubmitting(true);
            try {
              await signIn(email, password);
              router.replace("/dashboard");
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
              className="brandops-input w-full rounded-xl px-4 py-3"
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
              className="brandops-input w-full rounded-xl px-4 py-3"
              placeholder="Sua senha"
            />
          </div>
          {error ? (
            <div className="rounded-2xl border border-tertiary/20 bg-tertiary/10 px-4 py-3 text-sm text-tertiary">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-semibold text-on-secondary transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
