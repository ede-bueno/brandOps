import Link from "next/link";
import { BRANDING } from "@/lib/branding";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-on-surface">
      <section className="brandops-panel atlas-tech-grid max-w-xl p-8 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-secondary">
          {BRANDING.appName}
        </p>
        <h1 className="mt-4 font-headline text-3xl font-bold text-on-surface">Página não encontrada</h1>
        <p className="mt-3 text-sm leading-7 text-on-surface-variant">
          O endereço solicitado não existe ou foi movido. Volte para o painel para
          continuar operando normalmente.
        </p>
        <Link
          href="/dashboard"
          className="brandops-button brandops-button-primary mt-6 inline-flex px-5 py-3 text-sm"
        >
          Ir para o dashboard
        </Link>
      </section>
    </main>
  );
}
