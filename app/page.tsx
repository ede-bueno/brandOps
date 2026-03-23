import Link from "next/link";
import { ArrowRight, BarChart3, Building2, ShieldCheck, Upload } from "lucide-react";

const highlights = [
  {
    icon: Building2,
    title: "Operação multi-marca",
    description:
      "Troque de marca sem trocar de contexto. Cada workspace preserva dados, acessos e histórico.",
  },
  {
    icon: Upload,
    title: "Atualização por export",
    description:
      "Pedidos, itens, catálogo, mídia e CMV entram por CSV no fluxo que você já usa no dia a dia.",
  },
  {
    icon: BarChart3,
    title: "Leitura financeira útil",
    description:
      "DRE, contribuição, custo, mídia e despesas entram na mesma conversa, sem planilha paralela.",
  },
];

const steps = [
  "Conecte a marca e organize quem pode operar ou apenas acompanhar.",
  "Importe os arquivos da operação e saneie somente o que exigir decisão humana.",
  "Acompanhe a evolução diária, por período e por centro de custo, em um painel único.",
];

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-4 text-on-background lg:px-6 lg:py-6">
      <div className="brandops-panel mx-auto max-w-7xl overflow-hidden rounded-[32px] px-6 py-8 lg:px-10 lg:py-10">
        <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="eyebrow">BrandOps</p>
              <h1 className="max-w-4xl font-headline text-5xl font-semibold tracking-[-0.06em] text-on-surface lg:text-6xl">
                A operação das suas marcas de print on demand, em um só cockpit.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-on-surface-variant lg:text-lg">
                BrandOps foi desenhado para centralizar o que mais pesa na gestão: vendas, mídia,
                CMV, despesas e governança de acesso. Tudo em torno do que acontece na operação
                real, não em torno da planilha.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="brandops-button brandops-button-primary"
              >
                Entrar no painel
                <ArrowRight size={15} />
              </Link>
              <a
                href="#como-funciona"
                className="brandops-button brandops-button-secondary"
              >
                Entender o fluxo
              </a>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="panel-muted rounded-2xl p-5">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                      <Icon size={20} />
                    </div>
                    <h2 className="mt-4 text-base font-semibold tracking-[-0.025em] text-on-surface">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>

          <section id="como-funciona" className="panel-muted rounded-[24px] p-6 lg:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Fluxo de uso</p>
                <h2 className="mt-3 font-headline text-2xl font-semibold tracking-[-0.04em] text-on-surface">
                  Um sistema interno que organiza a gestão sem criar ruído.
                </h2>
              </div>
              <div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:inline-flex">
                <ShieldCheck size={24} />
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="brandops-card rounded-2xl px-5 py-4"
                >
                  <div className="flex gap-4">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-sm font-bold text-primary">
                      {index + 1}
                    </span>
                    <p className="pt-1 text-sm leading-7 text-on-surface-variant">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
