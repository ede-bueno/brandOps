"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Loader2, LockKeyhole, MailCheck } from "lucide-react";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { BRANDING } from "@/lib/branding";
import { requestBrandSelectionOnNextWorkspaceLoad } from "@/lib/brandops/provider-workspace";

type LoginMode = "password" | "magic-link";

function toFriendlyAuthErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Nao foi possivel autenticar agora. Tente novamente em instantes.";
  }

  const message = error.message.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "Email ou senha invalidos. Se preferir, peça um link magico para entrar sem senha.";
  }

  if (message.includes("email not confirmed")) {
    return "Seu email ainda nao foi confirmado. Use o link magico para concluir o acesso.";
  }

  if (message.includes("signup is disabled")) {
    return "O provedor de autenticacao recusou a solicitacao agora. Tente o link magico.";
  }

  if (message.includes("rate limit")) {
    return "Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.";
  }

  return error.message;
}

export default function LoginPage() {
  const router = useRouter();
  const { session, signIn, requestMagicLink, isLoading } = useBrandOps();
  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && session) {
      router.replace("/dashboard");
    }
  }, [isLoading, router, session]);

  const submitLabel = useMemo(
    () => (mode === "password" ? "Entrar" : "Enviar link magico"),
    [mode],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      if (mode === "password") {
        requestBrandSelectionOnNextWorkspaceLoad();
        await signIn(email.trim(), password);
        return;
      }

      requestBrandSelectionOnNextWorkspaceLoad();
      await requestMagicLink(email.trim());
      setNotice(
        "Se este email estiver autorizado no Atlas, enviamos um link magico para concluir o acesso.",
      );
    } catch (authError) {
      setError(toFriendlyAuthErrorMessage(authError));
    } finally {
      setIsSubmitting(false);
    }
  }

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
          <p className="mt-2 text-sm text-on-surface-variant">Entre com senha ou link mágico e volte direto para a operação.</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
          <span className="rounded-full border border-outline px-2.5 py-1">Torre</span>
          <span className="rounded-full border border-outline px-2.5 py-1">Atlas IA</span>
          <span className="rounded-full border border-outline px-2.5 py-1">Operação POD</span>
        </div>

        <div className="mt-6 flex gap-2 rounded-2xl border border-outline bg-surface-container-low p-1">
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setError("");
              setNotice("");
            }}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              mode === "password"
                ? "bg-background text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <KeyRound size={14} />
              Senha
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("magic-link");
              setError("");
              setNotice("");
            }}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              mode === "magic-link"
                ? "bg-background text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <MailCheck size={14} />
              Link magico
            </span>
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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

          {mode === "password" ? (
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
          ) : (
            <div className="rounded-2xl border border-outline bg-surface-container-low px-4 py-3 text-sm leading-6 text-on-surface-variant">
              O Atlas envia um link direto para o email informado. Ao abrir o link, voce entra no painel sem precisar lembrar a senha.
            </div>
          )}

          {error ? (
            <div className="rounded-xl border border-tertiary/20 bg-tertiary-container/60 px-4 py-3 text-sm text-on-tertiary-container">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-xl border border-primary/15 bg-primary-container/50 px-4 py-3 text-sm text-on-primary-container">
              {notice}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || isLoading || !email.trim() || (mode === "password" && !password)}
            className="brandops-button brandops-button-primary inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm disabled:translate-y-0 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            {submitLabel}
          </button>
        </form>

        <div className="mt-5 rounded-2xl border border-outline bg-background/70 px-4 py-3 text-xs leading-5 text-on-surface-variant">
          <p className="font-semibold text-on-surface">Se a senha falhar</p>
          <p className="mt-1">
            Tente <span className="font-semibold text-on-surface">Link magico</span>. Ele costuma destravar o acesso mais rápido.
          </p>
        </div>
      </div>
    </div>
  );
}
