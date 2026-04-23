import { buildStudioHref, type StudioModuleContext } from "@/lib/brandops-v3/view-models";

export function resolveOfferWorkspaceMeta(context: StudioModuleContext) {
  const requestedSurface = context.surface;

  if (requestedSurface === "sales") {
    return {
      title: "Vendas e demanda real",
      description:
        "Receita, unidades e playbook comercial tratados como leitura operacional do portfólio.",
      actionLabel: "Abrir portfólio",
      actionHref: buildStudioHref("offer", { surface: "products" }),
      banner: "Vendas em foco: veja o que realmente converte, sustenta caixa e merece mais atenção comercial.",
    };
  }

  if (requestedSurface === "catalog") {
    return {
      title: "Catálogo operacional",
      description:
        "Cobertura visual, produtos ativos e itens descobertos em uma única superfície de manutenção comercial.",
      actionLabel: "Abrir vendas",
      actionHref: buildStudioHref("offer", { surface: "sales" }),
      banner: "Catálogo em foco: revise cobertura visual, itens ativos e lacunas que travam escala.",
    };
  }

  if (requestedSurface === "evidence") {
    return {
      title: "Evidências de oferta",
      description:
        "Fila executiva, fontes e reconciliação do portfólio sem poluir a leitura principal.",
      actionLabel: "Abrir portfólio",
      actionHref: buildStudioHref("offer", { surface: "products" }),
      banner: "Evidências em foco: confirme se o sinal de produto está sustentado por venda, atenção e consistência.",
    };
  }

  if (context.mode === "executive") {
    return {
      title: "Portfólio executivo",
      description:
        "Foco, momentum e próxima decisão comercial em uma leitura curta de produtos.",
      actionLabel: "Abrir radar",
      actionHref: buildStudioHref("offer", { surface: "products", mode: "radar" }),
      banner: "Leitura executiva em foco: priorize quais itens proteger, escalar ou retirar da frente comercial.",
    };
  }

  if (context.mode === "radar") {
    return {
      title: "Radar do portfólio",
      description:
        "Use esta camada para localizar escala, perda de força e itens que pedem revisão.",
      actionLabel: "Abrir catálogo",
      actionHref: buildStudioHref("offer", { surface: "catalog" }),
      banner: "Radar em foco: acompanhe momentum, perda de força e itens que pedem revisão imediata.",
    };
  }

  if (context.mode === "detail") {
    return {
      title: "Detalhamento de produtos",
      description:
        "Audite item, decisão e contexto comercial com profundidade, sem virar dashboard paralelo.",
      actionLabel: "Abrir vendas",
      actionHref: buildStudioHref("offer", { surface: "sales" }),
      banner:
        "Detalhe em foco: use esta camada para validar SKU, decisão e contexto comercial sem ruído.",
    };
  }

  return {
    title: "Portfólio e venda real",
    description:
      "Catálogo, produtos e sinais comerciais tratados como inventário ativo da marca.",
    actionLabel: "Abrir catálogo",
    actionHref: buildStudioHref("offer", { surface: "catalog" }),
    banner: null,
  };
}
