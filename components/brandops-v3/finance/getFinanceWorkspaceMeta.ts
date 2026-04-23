import type { FinanceStudioSurface, StudioModuleContext } from "@/lib/brandops-v3/view-models";
import { buildStudioHref } from "@/lib/brandops-v3/view-models";

export interface FinanceWorkspaceMeta {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  banner: string | null;
}

export function getFinanceWorkspaceMeta(
  requestedSurface: FinanceStudioSurface,
  context: StudioModuleContext,
): FinanceWorkspaceMeta {
  if (requestedSurface === "operations") {
    return {
      title: context.focus === "cmv" ? "Custos, CMV e composição" : "Lançamentos e categorias",
      description:
        context.focus === "cmv"
          ? "Use este recorte para validar custo aplicado, cobertura de CMV e pressão dos itens vendidos."
          : "Organize competência, despesas e categorias sem perder o contexto financeiro da marca.",
      actionLabel: "Voltar ao DRE",
      actionHref: buildStudioHref("finance", { surface: "dre" }),
      banner:
        context.focus === "cmv"
          ? "CMV em foco: valide cobertura de custo, base aplicada e pressão sobre margem antes de ajustar preço ou escala."
          : "Lançamentos em foco: trabalhe competência, categoria e despesa mantendo o efeito no resultado sempre visível.",
    };
  }

  if (requestedSurface === "sales") {
    return {
      title: "Vendas que sustentam caixa",
      description:
        "Cruze receita real, produtos líderes e playbook comercial sem sair do ambiente financeiro.",
      actionLabel: "Abrir DRE",
      actionHref: buildStudioHref("finance", { surface: "dre" }),
      banner: "Vendas em foco: confira receita real, mix e itens líderes antes de aceitar qualquer leitura de caixa.",
    };
  }

  if (requestedSurface === "evidence") {
    return {
      title: "Evidências e reconciliação financeira",
      description:
        "Fontes, evidências e confiança da leitura financeira em uma única superfície secundária.",
      actionLabel: "Abrir DRE",
      actionHref: buildStudioHref("finance", { surface: "dre" }),
      banner: "Evidências em foco: valide consistência, fonte e reconciliação antes de fechar uma decisão financeira.",
    };
  }

  return {
    title: "Panorama financeiro",
    description:
      "DRE, custos e vendas organizados numa leitura financeira contínua, com Atlas só quando fizer sentido.",
    actionLabel: "Abrir lançamentos",
    actionHref: buildStudioHref("finance", { surface: "operations" }),
    banner: null,
  };
}

