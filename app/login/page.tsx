import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-12 text-on-surface">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl items-center">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-secondary">
              BrandOps
            </p>
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-on-surface lg:text-5xl">
              Controle operacional e financeiro para quem toca várias marcas POD.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-on-surface-variant">
              Esta base já está preparada para importar os CSVs reais de pedidos,
              itens, catálogo e Meta Ads. O próximo passo de autenticação com
              Supabase continua no backlog operacional.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-xl bg-secondary px-5 py-3 text-sm font-semibold text-on-secondary"
              >
                Entrar no painel
              </Link>
              <Link
                href="/import"
                className="rounded-xl border border-outline px-5 py-3 text-sm font-semibold text-on-surface"
              >
                Ir para importação
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-outline bg-surface-container p-6">
            <p className="text-sm font-semibold text-on-surface">
              Recorte deste MVP
            </p>
            <div className="mt-6 space-y-4 text-sm text-on-surface-variant">
              <div className="rounded-2xl border border-outline bg-surface-container-high p-4">
                Importação real dos cinco CSVs padrão por marca.
              </div>
              <div className="rounded-2xl border border-outline bg-surface-container-high p-4">
                Dashboard, vendas, mídia, DRE e saneamento lendo dados importados.
              </div>
              <div className="rounded-2xl border border-outline bg-surface-container-high p-4">
                Gestão manual de CMV por produto para evoluir o DRE.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
