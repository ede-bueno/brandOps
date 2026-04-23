"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Loader2, LockKeyhole, MailCheck, Sparkles } from "lucide-react";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { BRANDING } from "@/lib/branding";

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
      router.replace("/studio");
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
        await signIn(email.trim(), password);
        return;
      }

      await requestMagicLink(email.trim());
      setNotice(
        "Se este email estiver autorizado no BrandOps, enviamos um link magico para concluir o acesso.",
      );
    } catch (authError) {
      setError(toFriendlyAuthErrorMessage(authError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="brandops-v3 v3-auth-screen" data-module="command" data-accent="blue">
      <section className="v3-auth-panel">
        <div className="v3-auth-brand">
          <div className="v3-brand-glyph" aria-hidden="true">
            <span />
            <span />
          </div>
          <div>
            <strong>{BRANDING.appName}</strong>
            <span>Camada Atlas</span>
          </div>
        </div>

        <div className="v3-auth-copy">
          <span>Acesso operacional</span>
          <h1>Entre para comandar a marca.</h1>
          <p>Use senha ou link mágico. O BrandOps abre direto no Studio da operação ativa.</p>
        </div>

        <div className="v3-auth-strip" aria-label="Pilares do BrandOps">
          <span>Comando</span>
          <span>Operação POD</span>
          <span>Atlas IA</span>
        </div>

        <div className="v3-auth-mode">
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setError("");
              setNotice("");
            }}
            data-active={mode === "password"}
          >
            <KeyRound size={14} />
            Senha
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("magic-link");
              setError("");
              setNotice("");
            }}
            data-active={mode === "magic-link"}
          >
            <MailCheck size={14} />
            Link mágico
          </button>
        </div>

        <form className="v3-auth-form" onSubmit={handleSubmit}>
          <div>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="v3-auth-input"
              placeholder="contato@marca.com"
            />
          </div>

          {mode === "password" ? (
            <div>
              <label>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="v3-auth-input"
                placeholder="Sua senha"
              />
            </div>
          ) : (
            <div className="v3-auth-note">
              <Sparkles size={15} />
              <p>Atlas envia um link direto para o email informado. Ao abrir o link, você entra sem precisar lembrar a senha.</p>
            </div>
          )}

          {error ? (
            <div className="v3-auth-alert" data-tone="bad">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="v3-auth-alert" data-tone="good">
              {notice}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || isLoading || !email.trim() || (mode === "password" && !password)}
            className="v3-auth-submit"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            {submitLabel}
          </button>
        </form>

        <div className="v3-auth-help">
          <LockKeyhole size={15} />
          <p>
            Se a senha falhar, tente <strong>link mágico</strong>. Ele costuma destravar o acesso mais rápido.
          </p>
        </div>
      </section>
    </div>
  );
}
