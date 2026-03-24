"use client";

import { useCallback, useEffect, useState } from "react";
import type { ComponentType } from "react";
import {
  Building2,
  CopyPlus,
  Link2,
  MailPlus,
  MapPin,
  Search,
  Settings2,
  Users2,
  Store,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { formatLongDateTime } from "@/lib/brandops/format";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";

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
};

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
};

const formSections = [
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
  };
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
  const [activeTab, setActiveTab] = useState<"general" | "team">("general");
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

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Superadmin"
        title="Lojas e Convites"
        description="Gerencie marcas, dados institucionais e acessos sem sair do workspace."
        actions={
          <button
            onClick={() => {
              setIsCreating(true);
              setNotice(null);
            }}
            className="brandops-button brandops-button-primary flex items-center rounded-lg px-4 py-2"
          >
            <CopyPlus size={16} className="mr-2" />
            Nova Loja
          </button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} label="Lojas Ativas" value={brands.length} hint="Cadastradas no workspace" />
        <StatCard icon={Users2} label="Membros Totais" value={totalMembers} hint="Vínculos vigentes" />
        <StatCard icon={Link2} label="Lojas Online" value={brands.filter((brand) => Boolean(brand.website_url)).length} hint="Com portal vinculado" />
        <StatCard icon={MapPin} label="Georeferenciadas" value={brands.filter((brand) => Boolean(brand.address_line)).length} hint="Com endereço completo" />
      </section>

      {notice ? (
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
            notice.kind === "success"
              ? "border-secondary/20 bg-secondary/5 text-secondary"
              : "border-tertiary/20 bg-tertiary/5 text-tertiary"
          }`}
        >
          {notice.kind === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {notice.text}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <SurfaceCard className="flex max-h-[720px] flex-col p-3">
            <div className="mb-3 relative">
              <Search size={16} className="absolute left-4 top-3.5 text-on-surface-variant/50" />
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Buscar por nome, slug..."
                className="w-full rounded-lg border border-outline bg-surface-container/50 py-2.5 pl-10 pr-3 text-sm text-on-surface outline-none transition focus:border-secondary/50 focus:bg-surface-container"
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
                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => {
                        setSelectedBrandId(brand.id);
                        setIsCreating(false);
                        setActiveTab("general");
                      }}
                      className={`w-full group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
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
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-outline bg-surface-container/30 px-4 py-6 text-center text-sm font-medium text-on-surface-variant">
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
                  description="Preencha os dados principais da marca para liberar a operação e o cadastro de acessos."
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
                        body: JSON.stringify(createForm),
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
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-outline bg-surface-container/20 p-10 text-center text-on-surface-variant opacity-70">
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
                        {selectedBrand.contact_email ? <MetaChip icon={MailPlus} text={selectedBrand.contact_email} /> : null}
                        {selectedLocation ? <MetaChip icon={MapPin} text={selectedLocation} /> : null}
                        {selectedBrand.website_url ? (
                          <a
                            href={selectedBrand.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-outline bg-background px-2 py-1 font-medium text-on-surface transition hover:border-secondary/40 hover:text-secondary"
                          >
                            Site
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <MiniStat label="Membros" value={selectedMemberCount.toString()} />
                    <MiniStat label="Site" value={selectedBrand.website_url ? "ativo" : "pendente"} />
                    <MiniStat label="Atualizado" value={formatLongDateTime(selectedBrand.updated_at)} className="col-span-2 sm:col-span-1" />
                  </div>
                </div>
              </div>

              <div className="flex overflow-x-auto border-b border-outline bg-surface-container/10 px-5 pt-1.5 sm:px-6">
                <button
                  onClick={() => setActiveTab("general")}
                  className={`relative px-3 py-3 text-sm font-semibold transition-colors ${
                    activeTab === "general"
                      ? "text-secondary"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Configurações
                  {activeTab === "general" && (
                     <div className="absolute bottom-0 left-0 h-[2px] w-full rounded-t-full bg-secondary" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("team")}
                  className={`relative flex items-center gap-2 px-3 py-3 text-sm font-semibold transition-colors ${
                    activeTab === "team"
                      ? "text-secondary"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Membros do Time
                  <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px]">{selectedMemberCount}</span>
                  {activeTab === "team" && (
                     <div className="absolute bottom-0 left-0 h-[2px] w-full rounded-t-full bg-secondary" />
                  )}
                </button>
              </div>

              <div className="px-5 py-5 sm:px-6">
                {activeTab === "general" ? (
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
                          body: JSON.stringify(selectedForm),
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
                ) : (
                  <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
                    <div className="space-y-4">
                      <SectionHeading
                        title="Criar acesso"
                        description="Cadastre um responsável com senha definida. O acesso fica isolado apenas nesta marca."
                      />
                      {lastProvisionedAccess ? (
                        <div className="rounded-xl border border-secondary/25 bg-secondary/6 p-4">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-secondary">
                            Credencial pronta
                          </p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-lg border border-outline bg-background px-3 py-2.5">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">Email</p>
                              <p className="mt-1 text-sm font-semibold text-on-surface">{lastProvisionedAccess.email}</p>
                            </div>
                            <div className="rounded-lg border border-outline bg-background px-3 py-2.5">
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
                      <div className="space-y-3 rounded-xl border border-outline bg-surface-container/20 p-4">
                        <input
                          value={inviteForm.fullName}
                          onChange={(event) => setInviteForm((current) => ({ ...current, fullName: event.target.value }))}
                          placeholder="Nome completo..."
                          className="w-full rounded-lg border border-outline bg-background px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-secondary/60 focus:bg-surface-container/50"
                        />
                        <input
                          value={inviteForm.email}
                          onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
                          placeholder="Email corporativo..."
                          className="w-full rounded-lg border border-outline bg-background px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-secondary/60 focus:bg-surface-container/50"
                        />
                        <input
                          value={inviteForm.password}
                          onChange={(event) => setInviteForm((current) => ({ ...current, password: event.target.value }))}
                          placeholder="Senha inicial (opcional)"
                          className="w-full rounded-lg border border-outline bg-background px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-secondary/60 focus:bg-surface-container/50"
                        />
                        <div className="rounded-lg border border-outline bg-background px-3 py-2.5 text-sm text-on-surface-variant">
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
                          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold tracking-wide text-on-secondary transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <MailPlus size={16} />
                          {sending ? "Criando acesso..." : "Criar acesso"}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <SectionHeading
                        title="Time da loja"
                        description="Pessoas com acesso ativo ao workspace desta marca."
                      />
                      <div className="space-y-2">
                        {selectedBrand?.brand_members?.length ? (
                          selectedBrand.brand_members.map((member) => (
                            <div key={`${selectedBrand.id}-${member.user_id}`} className="group flex items-center justify-between rounded-xl border border-outline bg-background px-4 py-3 transition-colors hover:border-secondary/40">
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
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-outline bg-surface-container/30 px-6 py-8 text-center">
                            <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/70">Workspace indefinido</p>
                            <p className="mx-auto mt-1 max-w-[220px] text-xs text-on-surface-variant/50">Ninguém possui acesso direto a este ambiente no momento.</p>
                          </div>
                        )}
                      </div>
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

function StatCard({ icon: Icon, label, value, hint }: { icon: ComponentType<{ size?: number; className?: string }>; label: string; value: number; hint: string; }) {
  return (
    <SurfaceCard className="flex flex-col justify-between p-3.5">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">{label}</p>
        <div className="rounded-lg border border-outline bg-background/50 p-2 text-secondary">
          <Icon size={15} />
        </div>
      </div>
      <div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-on-surface">{value}</p>
        <p className="mt-1 text-xs font-semibold text-on-surface-variant/60 uppercase tracking-widest">{hint}</p>
      </div>
    </SurfaceCard>
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
              <Field
                key={key}
                label={label}
                value={form[key as keyof BrandFormState]}
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
           <Field label="Descrição curta" value={form.description} placeholder="Proposta de valor" onChange={(value) => onChange({ ...form, description: value })} multiline />
           <Field label="Anotações internas" value={form.notes} placeholder="Condições, tarifas, links" onChange={(value) => onChange({ ...form, notes: value })} multiline />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
        {onCancel && (
           <button
             type="button"
             disabled={disabled}
             onClick={onCancel}
             className="w-full rounded-lg border border-outline bg-surface-container/50 px-5 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface disabled:opacity-50 sm:w-auto"
           >
             Cancelar
           </button>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => void onSubmit()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-2.5 text-sm font-semibold tracking-wide text-on-secondary transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Settings2 size={18} />
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function Field({
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
  const baseClassName = "brandops-input w-full rounded-lg border border-outline bg-background/50 px-3 py-2.5 text-sm font-medium text-on-surface outline-none transition focus:border-secondary focus:bg-background";
  return (
    <label className="space-y-1.5 block">
      <span className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center justify-between">
         {label}
         {!value && <span className="opacity-0 group-focus-within:opacity-100 text-tertiary transition-opacity">*</span>}
      </span>
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

function MiniStat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-lg border border-outline bg-background px-3 py-2 ${className}`.trim()}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function MetaChip({
  icon: Icon,
  text,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  text: string;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-outline bg-background px-2 py-1 font-medium text-on-surface">
      <Icon size={13} className="shrink-0 text-on-surface-variant" />
      <span className="truncate">{text}</span>
    </span>
  );
}
