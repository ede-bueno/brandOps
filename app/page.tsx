import Link from "next/link";
import { ArrowRight, ShieldCheck, Upload, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-on-background">
      <section className="mx-auto grid min-h-screen max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10">
        <div className="space-y-8">
          <div className="inline-flex rounded-full border border-outline bg-surface-container px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
            BrandOps
          </div>

          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-on-surface lg:text-7xl">
              Controle suas marcas POD com uma operação única.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-on-surface-variant">
              Centralize vendas, mídia, CMV e importações em um painel pensado para
              quem precisa acompanhar várias marcas sem perder o detalhe que importa.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-semibold text-on-secondary"
            >
              Entrar no painel
              <ArrowRight size={16} />
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center rounded-xl border border-outline px-5 py-3 text-sm font-semibold text-on-surface"
            >
              Ver como funciona
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-outline bg-surface-container p-4">
              <ShieldCheck className="text-secondary" size={20} />
              <p className="mt-3 text-sm font-semibold text-on-surface">Acesso por perfil</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Super admin e dono de marca enxergam apenas o que precisam.
              </p>
            </div>
            <div className="rounded-2xl border border-outline bg-surface-container p-4">
              <Upload className="text-secondary" size={20} />
              <p className="mt-3 text-sm font-semibold text-on-surface">Atualização por CSV</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Suba os exports da operação e atualize os dados em lote.
              </p>
            </div>
            <div className="rounded-2xl border border-outline bg-surface-container p-4">
              <BarChart3 className="text-secondary" size={20} />
              <p className="mt-3 text-sm font-semibold text-on-surface">Leitura executiva</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Veja a operação, a mídia e a margem em uma mesma visão.
              </p>
            </div>
          </div>
        </div>

        <div
          id="como-funciona"
          className="rounded-3xl border border-outline bg-surface-container p-8 shadow-2xl shadow-black/20"
        >
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-secondary">
            Fluxo de uso
          </p>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-outline bg-background p-4">
              <p className="text-sm font-semibold text-on-surface">1. Entre na conta</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Use o login cadastrado para abrir o workspace da sua marca.
              </p>
            </div>
            <div className="rounded-2xl border border-outline bg-background p-4">
              <p className="text-sm font-semibold text-on-surface">2. Envie os CSVs</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Atualize pedidos, catálogo, mídia e custos sem retrabalho manual.
              </p>
            </div>
            <div className="rounded-2xl border border-outline bg-background p-4">
              <p className="text-sm font-semibold text-on-surface">3. Acompanhe o resultado</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Consulte receita, despesa, CMV e alertas em tempo de operação.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
