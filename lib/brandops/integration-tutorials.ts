import type { IntegrationProvider } from "@/lib/brandops/types";

export type GuidedIntegrationProvider = Extract<IntegrationProvider, "meta" | "ga4">;

export type TutorialExternalLink = {
  label: string;
  href: string;
  helper: string;
};

export type TutorialStep = {
  title: string;
  items: string[];
  outcome: string;
};

export type TutorialErrorGuide = {
  title: string;
  explanation: string;
  actions: string[];
};

export type IntegrationTutorial = {
  provider: GuidedIntegrationProvider;
  title: string;
  eyebrow: string;
  summary: string;
  audience: string;
  route: string;
  prerequisites: string[];
  steps: TutorialStep[];
  validation: string[];
  commonErrors: TutorialErrorGuide[];
  externalLinks: TutorialExternalLink[];
};

export const INTEGRATION_TUTORIALS: Record<GuidedIntegrationProvider, IntegrationTutorial> = {
  meta: {
    provider: "meta",
    title: "Tutorial Meta Ads",
    eyebrow: "Aquisição",
    summary:
      "Conecte a conta de anúncios e o catálogo da loja com passo a passo operacional, sem depender de leitura técnica do backend.",
    audience: "Gestor da marca ou operador responsável pela mídia da loja.",
    route: "/integrations/tutorials/meta",
    prerequisites: [
      "Ter acesso à conta de anúncios correta da marca.",
      "Ter acesso ao Business Manager que controla a conta e o catálogo.",
      "Saber qual conta de anúncios será usada no BrandOps.",
      "Ter um token válido da Meta gerado a partir do app e do usuário corretos.",
    ],
    steps: [
      {
        title: "1. Conferir a conta de anúncios e o catálogo",
        items: [
          "Abra o Ads Manager e confirme qual conta de anúncios realmente pertence à loja.",
          "Abra o Business Settings e confirme se o catálogo correto está vinculado à operação.",
          "Anote o `ID da conta` e, se houver catálogo, anote também o `ID do catálogo`.",
        ],
        outcome: "Você sai desta etapa com os IDs corretos antes de preencher o BrandOps.",
      },
      {
        title: "2. Configurar o modo da integração no BrandOps",
        items: [
          "Abra `Integrações` no BrandOps.",
          "Selecione `Meta Ads`.",
          "Defina o modo `API + fallback manual` se quiser integração viva com contingência.",
          "Preencha `ID da conta de anúncios` e `ID do catálogo da Meta` quando existir.",
          "Ajuste a janela padrão de sincronização em dias.",
          "Salve a configuração antes de mexer no token.",
        ],
        outcome: "A loja fica preparada para usar a Meta no contexto operacional correto.",
      },
      {
        title: "3. Salvar o token próprio da loja",
        items: [
          "Ainda em `Meta Ads`, cole o token da Meta no campo de credencial.",
          "Clique em `Salvar credencial Meta`.",
          "Confirme se o BrandOps passou a exibir que a marca tem token salvo.",
        ],
        outcome: "O BrandOps passa a operar com o segredo da própria loja, e não com uma credencial global.",
      },
      {
        title: "4. Executar a sincronização",
        items: [
          "Clique em `Sincronizar Meta agora` para trazer mídia e campanhas.",
          "Se a loja usa catálogo da Meta, execute também `Sincronizar catálogo`.",
          "Revise a data da última sincronização e o status retornado pelo BrandOps.",
        ],
        outcome: "Os dados de mídia e, quando aplicável, o catálogo ficam disponíveis para leitura operacional.",
      },
      {
        title: "5. Validar o resultado no produto",
        items: [
          "Abra `Mídia e Performance` para conferir se o dado chegou.",
          "Abra `Catálogo` e `Produtos e Insights` se o catálogo da Meta estiver ativo.",
          "Se houver divergência, revise primeiro ID da conta, ID do catálogo e permissões do token.",
        ],
        outcome: "Você confirma a integração olhando o resultado na operação, e não só o formulário salvo.",
      },
    ],
    validation: [
      "A integração aparece como operando via API.",
      "A data da última sincronização é atualizada.",
      "Campanhas e gasto passam a aparecer na camada de mídia.",
      "Se catálogo estiver ativo, produtos da fonte Meta aparecem na camada de catálogo.",
    ],
    commonErrors: [
      {
        title: "Token ausente",
        explanation:
          "A configuração operacional foi salva, mas a loja ainda não salvou o próprio token.",
        actions: [
          "Salvar o token da Meta na própria marca.",
          "Executar a sincronização novamente.",
        ],
      },
      {
        title: "Erro (#100) da Meta",
        explanation:
          "O app, o usuário ou o token não têm acesso suficiente à API acionada, especialmente no catálogo.",
        actions: [
          "Revisar permissões do app no Meta for Developers.",
          "Revisar acesso da conta ao catálogo e ao Business Manager.",
          "Gerar um token com o escopo operacional correto.",
        ],
      },
      {
        title: "Catálogo não sincroniza",
        explanation: "O BrandOps só consegue sincronizar catálogo quando o `ID do catálogo` está correto.",
        actions: [
          "Confirmar o ID do catálogo no Business Settings.",
          "Salvar o ID no BrandOps antes de rodar a sincronização.",
        ],
      },
    ],
    externalLinks: [
      {
        label: "Ads Manager",
        href: "https://adsmanager.facebook.com/",
        helper: "Use para confirmar a conta de anúncios da loja.",
      },
      {
        label: "Meta Business Settings",
        href: "https://business.facebook.com/settings/",
        helper: "Use para revisar catálogo, permissões e ativos da operação.",
      },
      {
        label: "Meta App Dashboard",
        href: "https://developers.facebook.com/apps/",
        helper: "Use para revisar o app usado para gerar o token e suas capacidades.",
      },
    ],
  },
  ga4: {
    provider: "ga4",
    title: "Tutorial Google Analytics 4",
    eyebrow: "Analytics",
    summary:
      "Configure a propriedade GA4 da loja, salve o JSON certo e valide a leitura de tráfego no BrandOps.",
    audience: "Gestor da marca ou operador responsável por analytics.",
    route: "/integrations/tutorials/ga4",
    prerequisites: [
      "Ter acesso à propriedade GA4 correta da loja.",
      "Ter acesso ao projeto do Google Cloud que hospeda a service account.",
      "Ter o JSON completo da service account com permissão de leitura.",
      "Saber a `Property ID` correta da marca.",
    ],
    steps: [
      {
        title: "1. Confirmar a propriedade e o acesso",
        items: [
          "Abra o painel do Google Analytics e confirme a propriedade correta da loja.",
          "Abra o Admin da propriedade e valide se a conta tem acesso ao ativo certo.",
      "Confirme a `Property ID` que será usada no BrandOps.",
        ],
        outcome: "Você evita conectar uma propriedade errada ou sem acesso suficiente.",
      },
      {
        title: "2. Preparar a service account",
        items: [
          "Abra o Google Cloud e localize a service account usada para a integração.",
          "Garanta que o JSON completo esteja disponível.",
          "No GA4, conceda acesso de leitura ao e-mail da service account.",
        ],
        outcome: "A credencial fica pronta para leitura da propriedade da loja.",
      },
      {
        title: "3. Configurar o conector no BrandOps",
        items: [
          "Abra `Integrações` no BrandOps.",
          "Selecione `Google Analytics 4`.",
          "Defina o modo `API`.",
          "Preencha a `Property ID` e a `Timezone` da propriedade.",
          "Salve a configuração antes de colar o JSON.",
        ],
        outcome: "A loja fica preparada para consultar a propriedade certa.",
      },
      {
        title: "4. Salvar a credencial da loja",
        items: [
          "Cole o JSON completo da service account no campo do GA4.",
          "Clique em `Salvar credencial GA4`.",
          "Confirme se o BrandOps passou a mostrar a credencial como salva.",
        ],
        outcome: "A credencial passa a ser tratada como segredo da própria marca.",
      },
      {
        title: "5. Sincronizar e validar",
        items: [
          "Clique em `Sincronizar GA4 agora`.",
          "Aguarde o retorno com período e quantidade de linhas consolidadas.",
          "Abra `Tráfego Digital` para conferir se os dados apareceram no BrandOps.",
        ],
        outcome: "A leitura de tráfego fica operacional no produto.",
      },
    ],
    validation: [
      "A integração aparece em modo API.",
      "O BrandOps registra sincronização do GA4 com sucesso.",
      "Dados de tráfego passam a aparecer na leitura operacional.",
      "Dados de sessões, eventos e conversão aparecem na leitura de tráfego.",
    ],
    commonErrors: [
      {
        title: "Property ID incorreta",
        explanation:
          "A integração pode salvar, mas a leitura vai falhar ou puxar dados da propriedade errada.",
        actions: [
          "Revisar a propriedade diretamente no painel do GA4.",
          "Corrigir a `Property ID` no BrandOps e sincronizar de novo.",
        ],
      },
      {
        title: "JSON incompleto ou inválido",
        explanation:
          "O BrandOps precisa do JSON completo da service account para autenticar corretamente.",
        actions: [
          "Gerar o JSON no Google Cloud.",
          "Conferir se `client_email` e `private_key` estão presentes.",
        ],
      },
      {
        title: "Sem permissão de leitura",
        explanation:
          "A service account existe, mas ainda não recebeu acesso à propriedade no GA4.",
        actions: [
          "Adicionar a service account na propriedade com acesso de leitura.",
          "Esperar a permissão propagar e sincronizar novamente.",
        ],
      },
    ],
    externalLinks: [
      {
        label: "Google Analytics",
        href: "https://analytics.google.com/analytics/web/",
        helper: "Use para localizar a propriedade e revisar acessos.",
      },
      {
        label: "Google Cloud Service Accounts",
        href: "https://console.cloud.google.com/iam-admin/serviceaccounts",
        helper: "Use para localizar a service account e gerar o JSON.",
      },
      {
        label: "Ajuda oficial do GA4 sobre acessos",
        href: "https://support.google.com/analytics/answer/9305788",
        helper: "Use para revisar concessão de acesso à propriedade.",
      },
    ],
  },
};

export function getIntegrationTutorial(provider: string) {
  if (provider === "meta" || provider === "ga4") {
    return INTEGRATION_TUTORIALS[provider];
  }

  return null;
}
