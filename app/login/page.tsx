"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { useBrandOps } from "@/components/BrandOpsProvider";

const trustPoints = [
  "Acesso segregado por marca e por perfil.",
  "Atualização por CSV com histórico preservado.",
  "Leitura financeira, mídia e operação no mesmo ambiente.",
];

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
    <div className="brandops-grid min-h-screen px-4 py-4 text-on-surface lg:px-6 lg:py-6">
      <div className="brandops-panel-strong mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl items-center px-6 py-8 lg:px-10 lg:py-10">
        <div className="grid w-full gap-10 lg:grid-cols-[1.04fr_0.96fr]">
          <section className="flex flex-col justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-secondary/25 bg-secondary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
                <Sparkles size={14} />
                Acesso seguro
              </div>
              <h1 className="mt-4 max-w-3xl font-headline text-5xl font-semibold tracking-tight text-on-surface lg:text-6xl">
                Entre no BrandOps para operar a marca com contexto completo.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-on-surface-variant">
                O acesso abre apenas as marcas e rotinas que pertencem ao seu perfil.
                A ideia aqui é reduzir retrabalho e manter cada responsável vendo o que realmente precisa acompanhar.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {trustPoints.map((item) => (
                <div key={item} className="brandops-card rounded-[24px] p-5">
                  <ShieldCheck size={18} className="text-secondary" />
                  <p className="mt-4 text-sm leading-7 text-on-surface-variant">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="brandops-card rounded-[28px] p-6 lg:p-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/12 text-secondary">
              <LockKeyhole size={24} />
            </div>
            <h2 className="mt-5 font-headline text-2xl font-semibold tracking-tight text-on-surface">
              Entrar no painel
            </h2>
            <p className="mt-2 text-sm leading-7 text-on-surface-variant">
              Use o email cadastrado para abrir o seu workspace.
            </p>

            <form
              className="mt-8 space-y-4"
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
                <label className="mb-2 block text-sm text-on-surface-variant">Email cadastrado</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
          </section>
        </div>
      </div>
    </div>
  );
}
