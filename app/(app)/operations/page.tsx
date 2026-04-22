"use client";

import { BackofficeDirectory } from "@/components/management-v2";
import { APP_ROUTES } from "@/lib/brandops/routes";

export default function OperationsPage() {
  return (
    <BackofficeDirectory
      eyebrow="Backoffice"
      title="Operações"
      description="Importação, saneamento e integrações saem da navegação primária e viram console operacional."
      groups={[
        {
          title: "Base operacional",
          description: "Entradas que sustentam a confiança do Atlas antes da análise gerencial.",
          items: [
            {
              label: "ETL e importação",
              summary: "Suba arquivos, acompanhe ingestão e estabilize a base da marca.",
              href: APP_ROUTES.import,
            },
            {
              label: "Saneamento",
              summary: "Revise pendências que ainda contaminam a leitura ou pedem decisão humana.",
              href: APP_ROUTES.sanitization,
            },
            {
              label: "Integrações",
              summary: "Meta, GA4 e Gemini com status, sync e fallback operacional.",
              href: APP_ROUTES.integrations,
            },
          ],
        },
      ]}
    />
  );
}
