import { buildStudioHref, type StudioModuleContext } from "@/lib/brandops-v3/view-models";

export function resolveOpsWorkspaceMeta(context: StudioModuleContext) {
  const requestedSurface = context.surface;

  if (requestedSurface === "imports") {
    return {
      title: "Importação e processamento",
      description:
        "Mantenha as cargas previsíveis e acompanhe arquivos recentes sem sair do módulo operacional.",
      actionLabel: "Abrir integrações",
      actionHref: buildStudioHref("ops", { surface: "integrations" }),
      banner: "Importação em foco: acompanhe cargas recentes, previsibilidade do processamento e próximos arquivos.",
    };
  }

  if (requestedSurface === "governance") {
    return {
      title: context.focus === "sanitization" ? "Saneamento e revisões" : "Governança operacional",
      description:
        context.focus === "sanitization"
          ? "Acompanhe revisões pendentes e saneamento sem misturar isso com leitura executiva."
          : "Flags, consistência operacional e contexto administrativo reunidos em uma única camada.",
      actionLabel: context.focus === "sanitization" ? "Abrir imports" : "Abrir ajuda",
      actionHref:
        context.focus === "sanitization"
          ? buildStudioHref("ops", { surface: "imports" })
          : buildStudioHref("ops", { surface: "support" }),
      banner:
        context.focus === "sanitization"
          ? "Saneamento em foco: trate pendências e ruído da base antes de confiar na leitura gerencial."
          : "Governança em foco: revise flags, acessos e consistência operacional da marca.",
    };
  }

  if (requestedSurface === "support") {
    return {
      title: "Ajuda, tutoriais e administração",
      description:
        "Conhecimento operacional, setup guiado e atalhos administrativos reunidos numa camada discreta.",
      actionLabel: "Abrir integrações",
      actionHref: buildStudioHref("ops", { surface: "integrations" }),
      banner:
        "Suporte em foco: concentre setup guiado, ajuda operacional e administração sem poluir o trabalho principal.",
    };
  }

  return {
    title: "Central operacional",
    description:
      "Imports, saneamento, integrações e governança reunidos para manter a operação previsível.",
    actionLabel: "Importar",
    actionHref: buildStudioHref("ops", { surface: "imports" }),
    banner: null,
  };
}

