"use client";

import { BackofficeDirectory } from "@/components/management-v2";
import { APP_ROUTES } from "@/lib/brandops/routes";

export default function PlatformPage() {
  return (
    <BackofficeDirectory
      eyebrow="Backoffice"
      title="Plataforma"
      description="Governança, acessos, Atlas, ajuda e tutoriais ficam organizados fora da camada primária de gestão."
      groups={[
        {
          title: "Governança e Atlas",
          description: "Configuração estratégica da marca e do comportamento do Atlas.",
          items: [
            {
              label: "Central estratégica",
              summary: "Governança, automações e parâmetros do Atlas.",
              href: APP_ROUTES.settings,
            },
            {
              label: "Acessos",
              summary: "Perfis, membros e administração das marcas.",
              href: APP_ROUTES.adminStores,
            },
            {
              label: "Tutoriais",
              summary: "Materiais de configuração de Meta, GA4 e Gemini.",
              href: APP_ROUTES.integrationsTutorials,
            },
          ],
        },
        {
          title: "Suporte",
          description: "Ajuda contextual e material de orientação fora do fluxo de análise principal.",
          items: [
            {
              label: "Ajuda",
              summary: "Documentação e orientação operacional do produto.",
              href: APP_ROUTES.help,
            },
          ],
        },
      ]}
    />
  );
}
