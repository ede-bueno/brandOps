"use client";

import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";

const dashboardTopics = [
  {
    title: "Faturado",
    body: "Soma do campo `Valor do Pedido` da exportação da INK para os pedidos pagos no período.",
  },
  {
    title: "Descontos Totais",
    body: "Soma do campo `Valor do Desconto` da exportação da INK. Inclui cupom, Pix e qualquer outro desconto operacional.",
  },
  {
    title: "Desconto via Cupom",
    body: "Recorte do desconto total considerando apenas pedidos em que `Nome do Cupom` veio preenchido.",
  },
  {
    title: "Comissão INK",
    body: "Valor do campo `Comissao` exportado pela INK. É a sua parte líquida informada pela plataforma nessa camada comercial.",
  },
  {
    title: "CMV Aplicado",
    body: "Custo de mercadoria vendida calculado por tipo de peça, respeitando a vigência histórica do custo na data da venda.",
  },
  {
    title: "Margem de contribuição",
    body: "RLD menos CMV e menos mídia. Mostra quanto sobra da operação antes de descontar as despesas fixas/operacionais.",
  },
  {
    title: "Custo variável",
    body: "Parte do faturamento consumida pelos custos variáveis do período, principalmente CMV e mídia.",
  },
  {
    title: "Ponto de equilíbrio",
    body: "Quanto de RLD a marca precisa gerar para cobrir as despesas operacionais com a margem atual.",
  },
];

const dreTopics = [
  {
    title: "Faturado -> Descontos -> RLD",
    body: "A linha comercial começa no faturado da INK. Depois descontamos `Valor do Desconto` para chegar à Receita Líquida de Desconto (RLD).",
  },
  {
    title: "CMV histórico",
    body: "O custo por tipo de peça pode mudar ao longo do tempo. Cada regra tem vigência e o sistema aplica a regra correta conforme a data da venda.",
  },
  {
    title: "Resultado",
    body: "Margem de contribuição menos despesas operacionais lançadas no centro de custo.",
  },
];

const sanitizationTopics = [
  {
    title: "Manter cálculo",
    body: "Confirma que a linha suspeita continua válida para os relatórios. A decisão fica salva no banco e persiste em reimportações.",
  },
  {
    title: "Ignorar cálculo",
    body: "Remove a linha suspeita dos cálculos da aplicação. O histórico de decisão também fica salvo no banco.",
  },
  {
    title: "Voltar para pendente",
    body: "Retira a decisão anterior e recoloca a ocorrência na fila operacional para nova avaliação.",
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Central de ajuda"
        title="Como o BrandOps calcula os números"
        description="Resumo direto da lógica por trás dos cards, tabelas e relatórios. Use esta página como referência interna para operar o sistema e explicar os indicadores aos donos das marcas."
      />

      <section id="dashboard" className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard>
          <SectionHeading
            title="Dashboard"
            description="Leitura consolidada da operação com base comercial da INK e análise gerencial do BrandOps."
          />
          <div className="mt-5 grid gap-3">
            {dashboardTopics.map((topic) => (
              <article key={topic.title} className="panel-muted p-4">
                <h3 className="font-semibold text-on-surface">{topic.title}</h3>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">{topic.body}</p>
              </article>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard id="dre">
          <SectionHeading
            title="DRE"
            description="Como a visão financeira é construída mês a mês."
          />
          <div className="mt-5 grid gap-3">
            {dreTopics.map((topic) => (
              <article key={topic.title} className="panel-muted p-4">
                <h3 className="font-semibold text-on-surface">{topic.title}</h3>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">{topic.body}</p>
              </article>
            ))}
          </div>
        </SurfaceCard>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <SurfaceCard id="sanitization">
          <SectionHeading
            title="Saneamento"
            description="O sistema aponta divergências; o operador decide como tratá-las."
          />
          <div className="mt-5 grid gap-3">
            {sanitizationTopics.map((topic) => (
              <article key={topic.title} className="panel-muted p-4">
                <h3 className="font-semibold text-on-surface">{topic.title}</h3>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">{topic.body}</p>
              </article>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard id="cmv">
          <SectionHeading
            title="CMV"
            description="Lógica operacional do custo por tipo de peça."
          />
          <div className="mt-5 space-y-3 text-sm leading-6 text-on-surface-variant">
            <p>
              O CMV é cadastrado por tipo de peça e não por estampa individual. O sistema concilia
              os itens vendidos e aplica o custo unitário vigente na data da venda.
            </p>
            <p>
              Quando o custo muda, uma nova vigência é criada. O histórico anterior é preservado para
              não quebrar meses já fechados.
            </p>
            <p>
              O frete pago pelo cliente não entra no CMV. O objetivo é medir o custo real com a INK
              para produzir e entregar a peça.
            </p>
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
