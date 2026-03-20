"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
    <div className="min-h-screen bg-background px-6 py-12 text-on-surface">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-secondary">
              BrandOps
            </p>
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-on-surface lg:text-5xl">
              Acesso ao painel operacional.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-on-surface-variant">
              Entre com seu email cadastrado para ver apenas as marcas e dados que
              você pode operar.
            </p>
          </div>

          <div className="rounded-3xl border border-outline bg-surface-container p-6">
            <h2 className="text-xl font-semibold text-on-surface">Autenticar</h2>
            <form
              className="mt-6 space-y-4"
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
                  className="w-full rounded-xl border border-outline bg-background px-4 py-3 text-on-surface outline-none"
                  placeholder="contato@marca.com"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-on-surface-variant">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-outline bg-background px-4 py-3 text-on-surface outline-none"
                  placeholder="Sua senha"
                />
              </div>
              {error ? (
                <div className="rounded-2xl border border-tertiary/40 bg-tertiary/10 px-4 py-3 text-sm text-tertiary">
                  {error}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-semibold text-on-secondary disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                Entrar
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
