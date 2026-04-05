"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CopyPlus,
  MailPlus,
  MapPin,
  Search,
  Settings2,
  Store,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import {
  AnalyticsCalloutCard,
  AnalyticsKpiCard,
} from "@/components/analytics/AnalyticsPrimitives";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { formatLongDateTime } from "@/lib/brandops/format";
import { BRAND_PLAN_LABELS, normalizeBrandGovernance } from "@/lib/brandops/governance";
import {
  EntityChip,
  FormField,
  InlineNotice,
  PageHeader,
  SectionHeading,
  SurfaceCard,
} from "@/components/ui-shell";
import type { BrandPlanTier } from "@/lib/brandops/types";

type AdminBrand = {
  id: string;
  name: string;
  slug?: string | null;
  website_url?: string | null;
  description?: string | null;
  logo_url?: string | null;
  contact_email?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  tax_id?: string | null;
  notes?: string | null;
  plan_tier?: BrandPlanTier | null;
  feature_flags?: {
    atlasAi?: boolean;
    atlasCommandCenter?: boolean;
    brandLearning?: boolean;
    geminiModelCatalog?: boolean;
  } | null;
  governance?: {
    planTier: BrandPlanTier;
    featureFlags: {
      atlasAi: boolean;
      atlasCommandCenter: boolean;
      brandLearning: boolean;
      geminiModelCatalog: boolean;
    };
  };
  created_at: string;
  updated_at: string;
  brand_members?: Array<{
    user_id: string;
    user_profiles?: {
      email?: string | null;
      full_name?: string | null;
      role?: string | null;
    } | null;
  }>;
};

type BrandFormState = {
  name: string;
  slug: string;
  websiteUrl: string;
  description: string;
  logoUrl: string;
  contactEmail: string;
  instagramUrl: string;
  facebookUrl: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  taxId: string;
  notes: string;
  planTier: BrandPlanTier;
  atlasAi: boolean;
  atlasCommandCenter: boolean;
  brandLearning: boolean;
  geminiModelCatalog: boolean;
};

type BrandTextFieldKey = {
  [Key in keyof BrandFormState]: BrandFormState[Key] extends string ? Key : never;
}[keyof BrandFormState];

const emptyBrandForm: BrandFormState = {
  name: "",
  slug: "",
  websiteUrl: "",
  description: "",
  logoUrl: "",
  contactEmail: "",
  instagramUrl: "",
  facebookUrl: "",
  addressLine: "",
  city: "",
  state: "",
  postalCode: "",
  taxId: "",
  notes: "",
  planTier: "starter",
  atlasAi: false,
  atlasCommandCenter: false,
  brandLearning: false,
  geminiModelCatalog: false,
};

function toBrandPayload(form: BrandFormState) {
  return {
    ...form,
    planTier: form.planTier,
    featureFlags: {
      atlasAi: form.atlasAi,
      atlasCommandCenter: form.atlasCommandCenter,
      brandLearning: form.brandLearning,
      geminiModelCatalog: form.geminiModelCatalog,
    },
  };
}

const formSections: ReadonlyArray<{
  title: string;
  fields: ReadonlyArray<readonly [BrandTextFieldKey, string, string]>;
}> = [
  {
    title: "Identidade",
    fields: [
      ["name", "Nome da loja", "Oh My Dog"],
      ["slug", "Slug", "ohmydog"],
      ["websiteUrl", "Site principal", "https://..."],
      ["logoUrl", "URL do Logo", "https://..."],
    ],
  },
  {
    title: "Contato e redes",
    fields: [
      ["contactEmail", "Email de contato", "contato@marca.com"],
      ["instagramUrl", "Instagram", "https://instagram.com/..."],
      ["facebookUrl", "Facebook", "https://facebook.com/..."],
      ["taxId", "CNPJ/CPF", "00.000..."],
    ],
  },
  {
    title: "Endereço comercial",
    fields: [
      ["addressLine", "Rua, N°", "Rua Exemplo, 123"],
      ["city", "Cidade", "Sua Cidade"],
      ["state", "UF", "SP"],
      ["postalCode", "CEP", "00000-000"],
    ],
  },
] as const;

function toForm(brand: AdminBrand | null): BrandFormState {
  return {
    name: brand?.name ?? "",
    slug: brand?.slug ?? "",
    websiteUrl: brand?.website_url ?? "",
    description: brand?.description ?? "",
    logoUrl: brand?.logo_url ?? "",
    contactEmail: brand?.contact_email ?? "",
    instagramUrl: brand?.instagram_url ?? "",
    facebookUrl: brand?.facebook_url ?? "",
    addressLine: brand?.address_line ?? "",
    city: brand?.city ?? "",
    state: brand?.state ?? "",
    postalCode: brand?.postal_code ?? "",
    taxId: brand?.tax_id ?? "",
    notes: brand?.notes ?? "",
    planTier: brand?.governance?.planTier ?? "starter",
    atlasAi: brand?.governance?.featureFlags.atlasAi ?? false,
    atlasCommandCenter:
      brand?.governance?.featureFlags.atlasCommandCenter ?? false,
    brandLearning: brand?.governance?.featureFlags.brandLearning ?? false,
    geminiModelCatalog:
      brand?.governance?.featureFlags.geminiModelCatalog ?? false,
  };
}

function countReleasedCapabilities(governance: AdminBrand["governance"] | null | undefined) {
  if (!governance) {
    return 0;
  }

  return Object.values(governance.featureFlags).filter(Boolean).length;
}

function describeGovernance(governance: AdminBrand["governance"] | null | undefined) {
  if (!governance) {
    return "Sem governanca estruturada.";
  }

  const labels: string[] = [];

  if (governance.featureFlags.atlasAi) labels.push("Atlas IA");
  if (governance.featureFlags.atlasCommandCenter) labels.push("Torre IA");
  if (governance.featureFlags.brandLearning) labels.push("Aprender negocio");
  if (governance.featureFlags.geminiModelCatalog) labels.push("Catalogo Gemini");

  return labels.length ? labels.join(", ") : "Sem recursos inteligentes liberados.";
}

export default function AdminStoresPage() {
  const { profile, session, refreshActiveBrand } = useBrandOps();
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedForm, setSelectedForm] = useState<BrandFormState>(emptyBrandForm);
  const [createForm, setCreateForm] = useState<BrandFormState>(emptyBrandForm);
  const [inviteForm, setInviteForm] = useState({ email: "", fullName: "", password: "" });
  const [lastProvisionedAccess, setLastProvisionedAccess] = useState<{
    email: string;
    password: string;
    alreadyExisted: boolean;
  } | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "team" | "invite">("general");
  const [isCreating, setIsCreating] = useState(false);

  const selectedBrand = brands.find((brand) => brand.id === selectedBrandId) ?? null;
  const visibleBrands = filter.trim()
    ? brands.filter((brand) => {
        const haystack = `${brand.name} ${brand.slug ?? ""} ${brand.contact_email ?? ""}`.toLowerCase();
        return haystack.includes(filter.trim().toLowerCase());
      })
    : brands;

  const loadBrands = useCallback(async (preferredBrandId?: string) => {
    if (!session?.access_token) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/brands", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao carregar lojas.");

      const nextBrands = (payload.brands ?? []) as AdminBrand[];
      setBrands(nextBrands);

      const nextSelected = nextBrands.find((brand) => brand.id === preferredBrandId) ?? nextBrands[0] ?? null;
      if (nextSelected) {
        setSelectedBrandId(nextSelected.id);
        setSelectedForm(toForm(nextSelected));
      } else {
        setSelectedBrandId("");
        setSelectedForm(emptyBrandForm);
      }
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token) return;
    void loadBrands();
  }, [loadBrands, session?.access_token]);

  useEffect(() => {
    if (selectedBrand) setSelectedForm(toForm(selectedBrand));
  }, [selectedBrand]);

  if (profile?.role !== "SUPER_ADMIN") {
    return (
      <EmptyState
        title="Área restrita"
        description="A gestão de lojas e convites fica disponível apenas para superadmin."
      />
    );
  }

  const totalMembers = brands.reduce((count, brand) => count + (brand.brand_members?.length ?? 0), 0);
  const selectedMemberCount = selectedBrand?.brand_members?.length ?? 0;
  const selectedLocation = [selectedBrand?.city, selectedBrand?.state].filter(Boolean).join(", ");
  const selectedGovernance =
    selectedBrand?.governance ??
    normalizeBrandGovernance({
      planTier: selectedBrand?.plan_tier,
      featureFlags: selectedBrand?.feature_flags,
    });

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Superadmin"
        title="Lojas e Convites"
        description="Gerencie marcas, time e acessos do ecossistema Atlas em uma única área operacional."
        actions={
          <button
            onClick={() => {
              setIsCreating(true);
              setNotice(null);
            }}
            className="brandops-button brandops-button-primary"
          >
            <CopyPlus size={16} className="mr-2" />
            Nova Loja
          </button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsKpiCard
          label="Lojas ativas"
          value={String(brands.length)}
          description="Marcas já cadastradas no workspace."
        />
        <AnalyticsKpiCard
          label="Membros totais"
          value={String(totalMembers)}
          description="Vínculos ativos com acesso às lojas."
        />
        <AnalyticsKpiCard
          label="Lojas online"
          value={String(brands.filter((brand) => Boolean(brand.website_url)).length)}
          description="Operações com portal vinculado."
          tone="info"
        />
        <AnalyticsKpiCard
          label="Georeferenciadas"
          value={String(brands.filter((brand) => Boolean(brand.address_line)).length)}
          description="Lojas com endereço comercial completo."
        />
      </section>

      {notice ? (
        <InlineNotice
          tone={notice.kind === "success" ? "success" : "error"}
          icon={notice.kind === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          className="text-sm font-medium"
        >
          {notice.text}
        </InlineNotice>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <SurfaceCard className="flex max-h-[720px] flex-col p-3">
            <div className="mb-3 brandops-input-with-icon">
              <Search size={16} />
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Buscar por nome, slug..."
                className="brandops-input w-full"
              />
            </div>

            <div className="space-y-2 overflow-y-auto pr-1 flex-1 custom-scrollbar">
              {loading ? (
                <div className="space-y-3">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : visibleBrands.length ? (
                visibleBrands.map((brand) => {
                  const isSelected = brand.id === selectedBrandId && !isCreating;
                  const governance =
                    brand.governance ??
                    normalizeBrandGovernance({
                      planTier: brand.plan_tier,
                      featureFlags: brand.feature_flags,
                    });
                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => {
                        setSelectedBrandId(brand.id);
                        setIsCreating(false);
                        setActiveTab("general");
                      }}
                      className={`w-full group flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
                        isSelected
                          ? "border-secondary/40 bg-secondary/5"
                          : "border-outline bg-transparent hover:border-secondary/30 hover:bg-surface-container/40"
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm font-bold transition-colors ${
                        isSelected ? "border-secondary/20 bg-secondary text-on-secondary" : "border-outline bg-surface-container text-secondary group-hover:bg-background"
                      }`}>
                        {brand.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`truncate text-sm font-semibold ${isSelected ? "text-secondary" : "text-on-surface"}`}>
                            {brand.name}
                          </p>
                          <span className="status-chip shrink-0">
                            {brand.brand_members?.length ?? 0}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">
                          <span className="truncate">{brand.slug ?? "S/ slug"}</span>
                          {brand.website_url ? <span className="h-1 w-1 rounded-full bg-secondary/70" /> : null}
                          {brand.website_url ? <span className="truncate">site ativo</span> : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="status-chip">{BRAND_PLAN_LABELS[governance.planTier]}</span>
                          <span className="status-chip">
                            {governance.featureFlags.atlasAi ? "IA on" : "IA off"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="atlas-inline-notice justify-center text-center text-sm font-medium text-on-surface-variant">
                  Nenhuma loja encontrada.
                </div>
              )}
            </div>
          </SurfaceCard>
        </aside>

        <div className="min-w-0">
          {isCreating ? (
            <SurfaceCard className="overflow-hidden p-0">
              <div className="border-b border-outline bg-surface-container/20 px-5 py-4 sm:px-6">
                <SectionHeading
                  title="Cadastrar nova loja"
                  description="Preencha a ficha da marca para liberar operação, identidade e acessos iniciais."
                />
              </div>
              <div className="px-5 py-5 sm:px-6">
                <BrandForm
                  form={createForm}
                  onChange={setCreateForm}
                  onSubmit={async () => {
                    if (!session?.access_token) return;
                    setCreating(true);
                    setNotice(null);
                    try {
                      const response = await fetch("/api/admin/brands", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify(toBrandPayload(createForm)),
                      });
                      const payload = await response.json();
                      if (!response.ok) throw new Error(payload.error ?? "Falha ao criar loja.");
                      setNotice({ kind: "success", text: `Loja ${payload.brand.name} cadastrada com sucesso.` });
                      setCreateForm(emptyBrandForm);
                      await loadBrands(payload.brand.id);
                      setIsCreating(false);
                      await refreshActiveBrand();
                    } catch (error) {
                      setNotice({
                        kind: "error",
                        text: error instanceof Error ? error.message : "Falha ao criar loja.",
                      });
                    } finally {
                      setCreating(false);
                    }
                  }}
                  submitLabel={creating ? "Criando ambiente..." : "Concluir cadastro"}
                  disabled={creating}
                  mode="create"
                  onCancel={() => setIsCreating(false)}
                />
              </div>
            </SurfaceCard>
          ) : !selectedBrand ? (
            <div className="atlas-empty-state flex h-full min-h-[360px] flex-col items-center justify-center p-10 text-center opacity-70">
               <Store size={40} className="mb-4 opacity-30" />
               <p className="mb-1 text-sm font-semibold uppercase tracking-widest">Nada selecionado</p>
               <p className="max-w-xs text-xs">Escolha uma loja na lista ao lado ou crie uma nova para visualizar seus detalhes.</p>
            </div>
          ) : (
            <SurfaceCard className="overflow-hidden p-0 shadow-sm">
              <div className="border-b border-outline bg-surface-container/20 px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-outline bg-background text-lg font-black text-secondary">
                      {selectedBrand.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-secondary/80">
                          ID: {selectedBrand.id.split("-")[0]}
                        </p>
                        {selectedBrand.slug ? <span className="status-chip">{selectedBrand.slug}</span> : null}
                      </div>
                      <h2 className="mt-1 truncate text-2xl font-bold tracking-tight text-on-surface">
                        {selectedBrand.name}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                        <span className="status-chip">{BRAND_PLAN_LABELS[selectedGovernance.planTier]}</span>
                        <span className="status-chip">
                          {selectedGovernance.featureFlags.atlasAi ? "Atlas IA liberado" : "Atlas IA bloqueado"}
                        </span>
                        <span className="status-chip">
                          {countReleasedCapabilities(selectedGovernance)} capacidade(s)
                        </span>
                        {selectedBrand.contact_email ? (
                          <EntityChip icon={<MailPlus size={13} />} text={selectedBrand.contact_email} />
                        ) : null}
                        {selectedLocation ? (
                          <EntityChip icon={<MapPin size={13} />} text={selectedLocation} />
                        ) : null}
                        {selectedBrand.website_url ? (
                          <a
                            href={selectedBrand.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="brandops-button brandops-button-secondary"
                          >
                            Site
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                    <AnalyticsKpiCard
                      label="Membros"
                      value={selectedMemberCount.toString()}
                      description="Usuários vinculados ao workspace da marca."
                    />
                    <AnalyticsKpiCard
                      label="Site"
                      value={selectedBrand.website_url ? "ativo" : "pendente"}
                      description="Estado atual do canal público da loja."
                      tone={selectedBrand.website_url ? "positive" : "warning"}
                    />
                    <AnalyticsKpiCard
                      label="Atualizado"
                      value={formatLongDateTime(selectedBrand.updated_at)}
                      description="Última alteração institucional registrada."
                    />
                    <AnalyticsKpiCard
                      label="Local"
                      value={selectedLocation || "Sem endereço"}
                      description="Referência comercial da operação."
                    />
                  </div>
                </div>
              </div>

              <div className="border-b border-outline bg-surface-container/10 px-5 py-3 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="brandops-tabs overflow-x-auto">
                    <button
                      onClick={() => setActiveTab("general")}
                      data-active={activeTab === "general"}
                      className="brandops-tab"
                    >
                      Configurações
                    </button>
                    <button
                      onClick={() => setActiveTab("team")}
                      data-active={activeTab === "team"}
                      className="brandops-tab"
                    >
                      Time
                      <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px]">{selectedMemberCount}</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("invite")}
                      data-active={activeTab === "invite"}
                      className="brandops-tab"
                    >
                      Novo acesso
                    </button>
                  </div>
                  <span className="status-chip">Loja ativa</span>
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6">
                {activeTab === "general" ? (
                  <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <BrandForm
                      form={selectedForm}
                      onChange={setSelectedForm}
                      onSubmit={async () => {
                        if (!session?.access_token || !selectedBrandId) return;
                        setSaving(true);
                        setNotice(null);
                        try {
                          const response = await fetch(`/api/admin/brands/${selectedBrandId}`, {
                            method: "PATCH",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${session.access_token}`,
                            },
                            body: JSON.stringify(toBrandPayload(selectedForm)),
                          });
                          const payload = await response.json();
                          if (!response.ok) throw new Error(payload.error ?? "Falha ao atualizar loja.");
                          setNotice({ kind: "success", text: `Painel de loja atualizado.` });
                          await loadBrands(selectedBrandId);
                          await refreshActiveBrand();
                        } catch (error) {
                          setNotice({
                            kind: "error",
                            text: error instanceof Error ? error.message : "Falha ao atualizar loja.",
                          });
                        } finally {
                          setSaving(false);
                        }
                      }}
                      submitLabel={saving ? "Salvando alterações..." : "Salvar configurações"}
                      disabled={saving}
                      mode="edit"
                    />
                    <div className="space-y-3">
                      <SectionHeading
                        title="Leitura rápida da loja"
                        description="Resumo executivo para não depender da tela inteira antes de agir."
                      />
                      <AnalyticsCalloutCard
                        title={selectedBrand.slug ?? "Sem slug"}
                        description="Identificador legível da marca no Atlas."
                        eyebrow="Slug"
                      />
                      <AnalyticsCalloutCard
                        eyebrow="Contato"
                        title={selectedBrand.contact_email ?? "Sem email"}
                        description="Canal principal para recuperação de acesso e operação."
                      />
                      <AnalyticsCalloutCard
                        eyebrow="Convites"
                        title={String(selectedMemberCount)}
                        description="Quantidade de acessos ativos nesta marca."
                      />
                      <AnalyticsCalloutCard
                        eyebrow="Plano e governanca"
                        title={BRAND_PLAN_LABELS[selectedGovernance.planTier]}
                        description={describeGovernance(selectedGovernance)}
                        tone={selectedGovernance.featureFlags.atlasAi ? "positive" : "info"}
                      />
                      <div className="panel-muted space-y-3 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                              Governança SaaS
                            </p>
                            <p className="mt-1 text-sm font-semibold text-on-surface">
                              {BRAND_PLAN_LABELS[selectedForm.planTier]}
                            </p>
                          </div>
                          <span className="status-chip">Plano</span>
                        </div>

                        <FormField label="Plano da marca">
                          <select
                            value={selectedForm.planTier}
                            onChange={(event) =>
                              setSelectedForm((current) => {
                                const governance = normalizeBrandGovernance({
                                  planTier: event.target.value as BrandPlanTier,
                                });

                                return {
                                  ...current,
                                  planTier: governance.planTier,
                                  atlasAi: governance.featureFlags.atlasAi,
                                  atlasCommandCenter:
                                    governance.featureFlags.atlasCommandCenter,
                                  brandLearning:
                                    governance.featureFlags.brandLearning,
                                  geminiModelCatalog:
                                    governance.featureFlags.geminiModelCatalog,
                                };
                              })
                            }
                            className="brandops-input w-full"
                          >
                            {Object.entries(BRAND_PLAN_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </FormField>

                        <div className="grid gap-2">
                          <FeatureToggle
                            label="Atlas IA"
                            description="Libera uso do Atlas Analyst na marca."
                            checked={selectedForm.atlasAi}
                            onChange={(checked) =>
                              setSelectedForm((current) => ({ ...current, atlasAi: checked }))
                            }
                          />
                          <FeatureToggle
                            label="Torre com IA"
                            description="Permite a casa nativa do Atlas dentro da Torre de Controle."
                            checked={selectedForm.atlasCommandCenter}
                            onChange={(checked) =>
                              setSelectedForm((current) => ({
                                ...current,
                                atlasCommandCenter: checked,
                              }))
                            }
                          />
                          <FeatureToggle
                            label="Aprender negócio"
                            description="Libera varredura histórica e snapshot de aprendizado da marca."
                            checked={selectedForm.brandLearning}
                            onChange={(checked) =>
                              setSelectedForm((current) => ({
                                ...current,
                                brandLearning: checked,
                              }))
                            }
                          />
                          <FeatureToggle
                            label="Catálogo de modelos Gemini"
                            description="Permite listar os modelos disponíveis pela chave da própria loja."
                            checked={selectedForm.geminiModelCatalog}
                            onChange={(checked) =>
                              setSelectedForm((current) => ({
                                ...current,
                                geminiModelCatalog: checked,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeTab === "team" ? (
                  <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-4">
                      <SectionHeading
                        title="Time da loja"
                        description="Pessoas com acesso ativo ao workspace desta marca."
                      />
                      {selectedBrand?.brand_members?.length ? (
                        <div className="space-y-2">
                          {selectedBrand.brand_members.map((member) => (
                            <div key={`${selectedBrand.id}-${member.user_id}`} className="atlas-list-row group flex items-center justify-between transition-colors hover:border-secondary/30">
                              <div className="flex items-center gap-4">
                                 <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-container font-bold text-on-surface-variant transition-colors group-hover:bg-secondary/10 group-hover:text-secondary">
                                    {(member.user_profiles?.full_name || member.user_profiles?.email || member.user_id).slice(0, 1).toUpperCase()}
                                 </div>
                                 <div className="min-w-0">
                                   <p className="truncate text-sm font-semibold text-on-surface">
                                     {member.user_profiles?.full_name || "Membro confirmado"}
                                   </p>
                                   <p className="mt-0.5 truncate text-xs font-medium text-on-surface-variant">
                                     {member.user_profiles?.email ?? "Email ocultado"}
                                   </p>
                                 </div>
                              </div>
                              <span className="status-chip shrink-0">
                                {member.user_profiles?.role === "SUPER_ADMIN" ? "S-ADMIN" : "MARCA"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="atlas-empty-state px-6 py-8 text-center">
                          <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/70">Workspace indefinido</p>
                          <p className="mx-auto mt-1 max-w-[220px] text-xs text-on-surface-variant/50">Ninguém possui acesso direto a este ambiente no momento.</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <SectionHeading
                        title="Resumo do time"
                        description="Visão curta para decidir convite, ajuste ou revisão de acesso."
                      />
                      <AnalyticsKpiCard
                        label="Membros ativos"
                        value={selectedMemberCount.toString()}
                        description="Usuários vinculados à marca."
                      />
                      <AnalyticsCalloutCard
                        eyebrow="Próximo passo"
                        title="Convidar ou revisar"
                        description="Gere acesso, confirme o papel e valide o workspace na mesma sessão."
                        tone="info"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-4">
                      <SectionHeading
                        title="Criar acesso"
                        description="Cadastre um responsável com senha definida. O acesso fica isolado apenas nesta marca."
                      />
                      {lastProvisionedAccess ? (
                        <div className="panel-muted p-4">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-secondary">
                            Credencial pronta
                          </p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div className="brandops-command-slab px-3 py-3">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">Email</p>
                              <p className="mt-1 text-sm font-semibold text-on-surface">{lastProvisionedAccess.email}</p>
                            </div>
                            <div className="brandops-command-slab px-3 py-3">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">Senha inicial</p>
                              <p className="mt-1 text-sm font-semibold text-on-surface">{lastProvisionedAccess.password}</p>
                            </div>
                          </div>
                          <p className="mt-3 text-xs text-on-surface-variant">
                            {lastProvisionedAccess.alreadyExisted
                              ? "O usuário já existia e a senha foi redefinida."
                              : "O usuário foi criado e já pode entrar com essa senha."}
                          </p>
                        </div>
                      ) : null}
                      <div className="brandops-toolbar-panel space-y-3">
                        <input
                          value={inviteForm.fullName}
                          onChange={(event) => setInviteForm((current) => ({ ...current, fullName: event.target.value }))}
                          placeholder="Nome completo..."
                          className="brandops-input w-full"
                        />
                        <input
                          value={inviteForm.email}
                          onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
                          placeholder="Email corporativo..."
                          className="brandops-input w-full"
                        />
                        <input
                          value={inviteForm.password}
                          onChange={(event) => setInviteForm((current) => ({ ...current, password: event.target.value }))}
                          placeholder="Senha inicial (opcional)"
                          className="brandops-input w-full"
                        />
                        <div className="brandops-command-slab px-3 py-3 text-sm text-on-surface-variant">
                          Perfil criado: <span className="font-semibold text-on-surface">acesso da marca</span>
                        </div>
                        <button
                          type="button"
                          disabled={sending || !selectedBrandId}
                          onClick={async () => {
                            if (!session?.access_token || !selectedBrandId) return;
                            setSending(true);
                            setNotice(null);
                            setLastProvisionedAccess(null);
                            try {
                              const response = await fetch("/api/admin/invitations", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${session.access_token}`,
                                },
                                body: JSON.stringify({ ...inviteForm, brandId: selectedBrandId }),
                              });
                              const payload = await response.json();
                              if (!response.ok) throw new Error(payload.error ?? "Falha ao criar acesso.");
                              setNotice({ kind: "success", text: `Acesso liberado para ${payload.invited.email}.` });
                              setLastProvisionedAccess({
                                email: payload.invited.email,
                                password: payload.invited.password,
                                alreadyExisted: Boolean(payload.invited.alreadyExisted),
                              });
                              setInviteForm({ email: "", fullName: "", password: "" });
                              await loadBrands(selectedBrandId);
                            } catch (error) {
                              setNotice({
                                kind: "error",
                                text: error instanceof Error ? error.message : "Falha ao criar acesso.",
                              });
                            } finally {
                              setSending(false);
                            }
                          }}
                          className="brandops-button brandops-button-primary mt-1 w-full"
                        >
                          <MailPlus size={16} />
                          {sending ? "Criando acesso..." : "Criar acesso"}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <SectionHeading
                        title="Resumo do time"
                        description="Os dados resumidos ajudam a não alongar a área de convite."
                      />
                      <article className="panel-muted p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Membros ativos</p>
                        <p className="mt-2 text-3xl font-semibold text-on-surface">{selectedMemberCount}</p>
                        <p className="mt-1 text-sm text-on-surface-variant">Usuários vinculados à marca.</p>
                      </article>
                      <article className="panel-muted p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Próximo passo</p>
                        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                          Gere o acesso, copie a credencial e valide o papel atribuído na mesma sessão.
                        </p>
                      </article>
                    </div>
                  </div>
                )}
              </div>
            </SurfaceCard>
          )}
        </div>
      </section>
    </div>
  );
}

function BrandForm({
  form,
  onChange,
  onSubmit,
  submitLabel,
  disabled,
  mode: _mode = "create",
  onCancel,
}: {
  form: BrandFormState;
  onChange: (value: BrandFormState) => void;
  onSubmit: () => Promise<void>;
  submitLabel: string;
  disabled: boolean;
  mode?: "create" | "edit";
  onCancel?: () => void;
}) {
  void _mode;

  return (
    <div className="space-y-6">
      {formSections.map((section) => (
        <div key={section.title} className="space-y-3">
          <div className="flex items-center gap-3">
             <h3 className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">{section.title}</h3>
             <div className="h-px flex-1 bg-outline" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {section.fields.map(([key, label, placeholder]) => (
              <FormInputField
                key={key}
                label={label}
                value={form[key]}
                placeholder={placeholder}
                onChange={(value) => onChange({ ...form, [key]: value })}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-3">
        <div className="flex items-center gap-3">
           <h3 className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Comentários e SEO</h3>
           <div className="h-px flex-1 bg-outline" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
           <FormInputField label="Descrição curta" value={form.description} placeholder="Proposta de valor" onChange={(value) => onChange({ ...form, description: value })} multiline />
           <FormInputField label="Anotações internas" value={form.notes} placeholder="Condições, tarifas, links" onChange={(value) => onChange({ ...form, notes: value })} multiline />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
        {onCancel && (
           <button
             type="button"
             disabled={disabled}
             onClick={onCancel}
             className="brandops-button brandops-button-secondary w-full sm:w-auto"
           >
             Cancelar
           </button>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => void onSubmit()}
          className="brandops-button brandops-button-primary flex-1"
        >
          <Settings2 size={18} />
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function FormInputField({
  label,
  value,
  placeholder,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const baseClassName = "brandops-input w-full";
  return (
    <FormField
      label={
        <span className="flex items-center justify-between gap-2">
          <span>{label}</span>
          {!value ? (
            <span className="opacity-0 transition-opacity group-focus-within:opacity-100 text-tertiary">
              *
            </span>
          ) : null}
        </span>
      }
    >
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`${baseClassName} resize-y placeholder:text-on-surface-variant/40`}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`${baseClassName} placeholder:text-on-surface-variant/40`}
        />
      )}
    </FormField>
  );
}

function FeatureToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-xl border border-outline bg-background px-3 py-3">
      <div>
        <p className="text-sm font-semibold text-on-surface">{label}</p>
        <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
          {description}
        </p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
      />
    </label>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-outline bg-background p-3">
      <div className="flex gap-4">
         <div className="h-10 w-10 rounded-lg bg-surface-container shrink-0" />
         <div className="flex-1 py-1">
            <div className="h-4 w-3/5 rounded bg-surface-container" />
            <div className="mt-2 h-3 w-2/5 rounded bg-surface-container opacity-50" />
         </div>
      </div>
    </div>
  );
}

