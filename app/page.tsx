import Link from "next/link";
import { ArrowRight, BarChart3, Building2, ShieldCheck, Upload } from "lucide-react";

const highlights = [
  {
    icon: Building2,
    title: "Operação multi-marca",
    description: "Troque de marca sem trocar de contexto. Cada workspace preserva dados, acessos e histórico.",
  },
  {
    icon: Upload,
    title: "Atualização por export",
    description: "Pedidos, itens, catálogo, mídia e CMV entram por CSV no fluxo que você já usa no dia a dia.",
  },
  {
    icon: BarChart3,
    title: "Leitura financeira útil",
    description: "DRE, contribuição, custo, mídia e despesas entram na mesma conversa, sem planilha paralela.",
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
      <div className="panel-surface panel-glow mx-auto max-w-7xl overflow-hidden px-6 py-8 lg:px-10 lg:py-10">
        <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="eyebrow">BrandOps</p>
              <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.07em] text-[var(--color-ink-strong)] lg:text-7xl">
                A operação das suas marcas de print on demand, em um só cockpit.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--color-ink-soft)] lg:text-lg">
                BrandOps foi desenhado para centralizar o que mais pesa na gestão:
                vendas, mídia, CMV, despesas e governança de acesso. Tudo em torno
                do que acontece na operação real, não em torno da planilha.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="soft-button soft-button-primary">
                Entrar no painel
                <ArrowRight size={16} />
              </Link>
              <a href="#como-funciona" className="soft-button soft-button-secondary">
                Entender o fluxo
              </a>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="panel-muted p-5">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 text-[var(--color-secondary)]">
                      <Icon size={20} />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-[var(--color-ink-strong)]">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-[var(--color-ink-soft)]">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>

          <section id="como-funciona" className="panel-muted p-6 lg:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Fluxo de uso</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-ink-strong)]">
                  Um sistema interno que organiza a gestão sem criar ruído.
                </h2>
              </div>
              <div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(215,249,120,0.12)] text-[var(--color-primary)] sm:inline-flex">
                <ShieldCheck size={24} />
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {steps.map((step, index) => (
                <div key={step} className="panel-surface px-5 py-5">
                  <div className="flex gap-4">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/6 text-sm font-bold text-[var(--color-primary)]">
                      {index + 1}
                    </span>
                    <p className="pt-1 text-sm leading-7 text-[var(--color-ink-soft)]">{step}</p>
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
