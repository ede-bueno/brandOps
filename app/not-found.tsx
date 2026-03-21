import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-on-surface">
      <section className="max-w-xl rounded-3xl border border-outline bg-surface-container p-8 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-secondary">
          BrandOps
        </p>
        <h1 className="mt-4 text-3xl font-bold text-on-surface">Página não encontrada</h1>
        <p className="mt-3 text-sm leading-7 text-on-surface-variant">
          O endereço solicitado não existe ou foi movido. Volte para o painel para
          continuar operando normalmente.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-xl bg-secondary px-5 py-3 text-sm font-semibold text-on-secondary"
        >
          Ir para o dashboard
        </Link>
      </section>
    </main>
  );
}
