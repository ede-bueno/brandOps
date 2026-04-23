import { buildStudioHref, type StudioModuleContext } from "@/lib/brandops-v3/view-models";

export function resolveGrowthWorkspaceMeta(context: StudioModuleContext) {
  const requestedSurface = context.surface;

  if (requestedSurface === "traffic") {
    return {
      title: "Diagnóstico de tráfego",
      description:
        "Fontes, gargalos de conversão e fricção do funil em uma superfície de trabalho única.",
      actionLabel: "Abrir mídia",
      actionHref: buildStudioHref("growth", { surface: "media" }),
      banner:
        "Tráfego em foco: use esta camada para localizar fricção do funil, origem mais sensível e perda de conversão.",
    };
  }

  if (requestedSurface === "evidence") {
    return {
      title: "Evidências de aquisição",
      description:
        "Confiança, filas executivas e saúde das fontes de aquisição reunidas em uma camada secundária.",
      actionLabel: "Voltar ao diagnóstico",
      actionHref: buildStudioHref("growth", { surface: "media" }),
      banner:
        "Evidências em foco: confirme confiança, saúde das fontes e sinais reconciliados antes de escalar ou cortar.",
    };
  }

  if (context.mode === "campaigns") {
    return {
      title: "Campanhas e mídia",
      description:
        "Organize verba dominante, prioridade de revisão e leitura por campanha numa mesma camada.",
      actionLabel: "Abrir tráfego",
      actionHref: buildStudioHref("growth", { surface: "traffic" }),
      banner:
        "Campanhas em foco: priorize verba dominante, ativos em revisão e espaço real para escala.",
    };
  }

  if (context.mode === "radar") {
    return {
      title: "Radar de mídia",
      description:
        "Use o recorte para acompanhar eficiência do gasto, pressão diária e resposta do período.",
      actionLabel: "Abrir campanhas",
      actionHref: buildStudioHref("growth", { surface: "media", mode: "campaigns" }),
      banner:
        "Radar em foco: acompanhe curva de eficiência e resposta do período sem perder o elo com receita.",
    };
  }

  if (context.mode === "executive") {
    return {
      title: "Sala de comando de aquisição",
      description:
        "Leia mídia, risco e próximo passo operacional como uma única camada decisória.",
      actionLabel: "Abrir campanhas",
      actionHref: buildStudioHref("growth", { surface: "media", mode: "campaigns" }),
      banner:
        "Leitura executiva em foco: use esta camada para decidir expansão, corte ou revisão de aquisição.",
    };
  }

  return {
    title: "Aquisição e conversão",
    description:
      "Diagnóstico operacional de mídia, tráfego e funil sem transformar a tela em mural de indicadores.",
    actionLabel: "Abrir mídia",
    actionHref: buildStudioHref("growth", { surface: "media" }),
    banner: null,
  };
}

