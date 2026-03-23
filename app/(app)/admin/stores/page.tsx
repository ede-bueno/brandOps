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

type InviteRole = "BRAND_OWNER" | "SUPER_ADMIN";

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
  const [inviteForm, setInviteForm] = useState({ email: "", fullName: "", role: "BRAND_OWNER" as InviteRole });
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

  return (
    <div className="relative isolate overflow-hidden space-y-6">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 right-[-6rem] h-72 w-72 rounded-full bg-secondary/12 blur-3xl" />
        <div className="absolute left-[-7rem] top-40 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <PageHeader
        eyebrow="Superadmin"
        title="Lojas e Convites"
        description="Organize marcas do grupo, atualize dados institucionais e convide os responsáveis. Visão completa da operação B2B em um só lugar."
        actions={
          <button
            onClick={() => {
              setIsCreating(true);
              setNotice(null);
            }}
            className="brandops-button brandops-button-primary px-5 py-2.5 rounded-xl shadow-lg shadow-secondary/20 flex items-center transition-transform hover:scale-105"
          >
            <CopyPlus size={16} className="mr-2" />
            Nova Loja
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Lojas Ativas" value={brands.length} hint="Cadastradas no workspace" />
        <StatCard icon={Users2} label="Membros Totais" value={totalMembers} hint="Vínculos vigentes" />
        <StatCard icon={Link2} label="Lojas Online" value={brands.filter((brand) => Boolean(brand.website_url)).length} hint="Com portal vinculado" />
        <StatCard icon={MapPin} label="Georeferenciadas" value={brands.filter((brand) => Boolean(brand.address_line)).length} hint="Com endereço completo" />
      </section>

      {notice ? (
        <div
          className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${
            notice.kind === "success"
              ? "border-secondary/20 bg-secondary/5 text-secondary"
              : "border-tertiary/20 bg-tertiary/5 text-tertiary"
          }`}
        >
          {notice.kind === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {notice.text}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <SurfaceCard className="p-4 flex flex-col max-h-[700px]">
            <div className="mb-4 relative">
              <Search size={16} className="absolute left-4 top-3.5 text-on-surface-variant/50" />
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Buscar por nome, slug..."
                className="w-full bg-surface-container/50 border border-outline rounded-[1.25rem] pl-11 pr-4 py-3 text-sm focus:border-secondary/50 focus:bg-surface-container transition-all outline-none text-on-surface"
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
                      className={`w-full group flex items-center gap-4 rounded-[1.25rem] border p-3 text-left transition-all ${
                        isSelected
                          ? "border-secondary/40 bg-secondary/5 shadow-[0_4px_24px_-8px_rgba(78,222,163,0.15)]"
                          : "border-outline bg-transparent hover:border-secondary/30 hover:bg-surface-container/40"
                      }`}
                    >
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border font-bold text-lg shadow-sm transition-colors ${
                        isSelected ? "bg-secondary text-on-secondary border-secondary/20" : "bg-surface-container text-secondary border-outline group-hover:bg-background"
                      }`}>
                        {brand.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-bold ${isSelected ? "text-secondary" : "text-on-surface"}`}>
                          {brand.name}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] uppercase font-semibold tracking-widest text-on-surface-variant opacity-70">
                          {brand.slug ?? "S/ SLUG"}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-outline bg-surface-container/30 px-4 py-8 text-center text-sm font-medium text-on-surface-variant">
                  Nenhuma loja encontrada.
                </div>
              )}
            </div>
          </SurfaceCard>
        </aside>

        <div className="min-w-0">
          {isCreating ? (
            <SurfaceCard className="p-0 border-primary/20 bg-background shadow-2xl">
              <div className="p-6 sm:p-8 bg-surface-container/20 border-b border-outline">
                <SectionHeading
                  title="Cadastrar Nova Loja"
                  description="Preencha os identificadores da marca e prossiga para o registro. Assim que criada, ela aparecerá na barra lateral para gestão de membros e atualizações."
                />
              </div>
              <div className="p-6 sm:p-8">
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
                  submitLabel={creating ? "Criando ambiente..." : "Concluir Cadastro"}
                  disabled={creating}
                  mode="create"
                  onCancel={() => setIsCreating(false)}
                />
              </div>
            </SurfaceCard>
          ) : !selectedBrand ? (
            <div className="h-full flex flex-col items-center justify-center rounded-[2.5rem] border border-dashed border-outline bg-surface-container/20 p-12 text-center text-on-surface-variant opacity-70">
               <Store size={48} className="mb-4 opacity-30" />
               <p className="text-sm font-semibold uppercase tracking-widest mb-1">Nada selecionado</p>
               <p className="max-w-xs text-xs">Escolha uma loja na lista ao lado ou crie uma nova para visualizar seus detalhes.</p>
            </div>
          ) : (
            <SurfaceCard className="p-0 overflow-hidden shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 p-6 sm:p-8 bg-surface-container/20 border-b border-outline">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-outline bg-background text-2xl font-black text-secondary shadow-inner">
                    {selectedBrand.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 pr-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-secondary/80">
                      ID: {selectedBrand.id.split("-")[0]}
                    </p>
                    <h2 className="mt-1 truncate text-3xl font-black text-on-surface tracking-tight">
                      {selectedBrand.name}
                    </h2>
                    <p className="mt-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                      <ClockIcon className="h-3 w-3" /> Atualizado {formatLongDateTime(selectedBrand.updated_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex overflow-x-auto bg-surface-container/10 border-b border-outline px-6 pt-2">
                <button
                  onClick={() => setActiveTab("general")}
                  className={`relative px-4 pb-4 pt-2 text-sm font-bold uppercase tracking-widest transition-colors ${
                    activeTab === "general"
                      ? "text-secondary"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Configurações
                  {activeTab === "general" && (
                     <div className="absolute bottom-0 left-0 w-full h-[3px] bg-secondary rounded-t-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("team")}
                  className={`relative px-4 pb-4 pt-2 text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${
                    activeTab === "team"
                      ? "text-secondary"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Membros do Time
                  <span className="bg-surface-container-high px-2 py-0.5 rounded-full text-[10px]">{selectedMemberCount}</span>
                  {activeTab === "team" && (
                     <div className="absolute bottom-0 left-0 w-full h-[3px] bg-secondary rounded-t-full" />
                  )}
                </button>
              </div>

              <div className="p-6 sm:p-8">
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
                    submitLabel={saving ? "Salvando Alterações..." : "Salvar Configurações"}
                    disabled={saving}
                    mode="edit"
                  />
                ) : (
                  <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
                    <div className="space-y-6">
                      <SectionHeading
                        title="Enviar Acesso"
                        description="Gere um convite seguro. O usuário receberá um link de acesso atrelado diretamente à marca."
                      />
                      <div className="p-5 rounded-2xl border border-outline bg-surface-container/20 space-y-4">
                        <input
                          value={inviteForm.fullName}
                          onChange={(event) => setInviteForm((current) => ({ ...current, fullName: event.target.value }))}
                          placeholder="Nome completo..."
                          className="w-full rounded-xl border border-outline bg-background px-4 py-3 text-sm text-on-surface outline-none transition focus:border-secondary/60 focus:bg-surface-container/50"
                        />
                        <input
                          value={inviteForm.email}
                          onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
                          placeholder="Email corporativo..."
                          className="w-full rounded-xl border border-outline bg-background px-4 py-3 text-sm text-on-surface outline-none transition focus:border-secondary/60 focus:bg-surface-container/50"
                        />
                        <select
                          value={inviteForm.role}
                          onChange={(event) => setInviteForm((current) => ({ ...current, role: event.target.value as InviteRole }))}
                          className="w-full rounded-xl border border-outline bg-background px-4 py-3 text-sm text-on-surface outline-none transition focus:border-secondary/60 focus:bg-surface-container/50 font-semibold appearance-none"
                        >
                          <option value="BRAND_OWNER">Dono da Empresa</option>
                          <option value="SUPER_ADMIN">Acesso Irrestrito (Superadmin)</option>
                        </select>
                        <button
                          type="button"
                          disabled={sending || !selectedBrandId}
                          onClick={async () => {
                            if (!session?.access_token || !selectedBrandId) return;
                            setSending(true);
                            setNotice(null);
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
                              if (!response.ok) throw new Error(payload.error ?? "Falha ao enviar convite.");
                              setNotice({ kind: "success", text: `Convite enviado para ${payload.invited.email}.` });
                              setInviteForm({ email: "", fullName: "", role: "BRAND_OWNER" });
                              await loadBrands(selectedBrandId);
                            } catch (error) {
                              setNotice({
                                kind: "error",
                                text: error instanceof Error ? error.message : "Falha ao enviar convite.",
                              });
                            } finally {
                              setSending(false);
                            }
                          }}
                          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold tracking-wide text-on-secondary transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-md shadow-secondary/20"
                        >
                          <MailPlus size={16} />
                          {sending ? "Disparando..." : "Despachar Convite"}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <SectionHeading
                        title="Time Constituído"
                        description="Equipe operacional que possui plenos direitos sobre a marca."
                      />
                      <div className="space-y-3">
                        {selectedBrand?.brand_members?.length ? (
                          selectedBrand.brand_members.map((member) => (
                            <div key={`${selectedBrand.id}-${member.user_id}`} className="rounded-2xl border border-outline bg-background p-4 flex items-center justify-between group hover:border-secondary/40 transition-colors">
                              <div className="flex items-center gap-4">
                                 <div className="h-10 w-10 flex-shrink-0 bg-surface-container flex items-center justify-center rounded-xl font-bold text-on-surface-variant group-hover:bg-secondary/10 group-hover:text-secondary transition-colors">
                                    {(member.user_profiles?.full_name || member.user_profiles?.email || member.user_id).slice(0, 1).toUpperCase()}
                                 </div>
                                 <div>
                                   <p className="text-sm font-bold text-on-surface">
                                     {member.user_profiles?.full_name || "Membro Confirmado"}
                                   </p>
                                   <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                                     {member.user_profiles?.email ?? "Email ocultado"}
                                   </p>
                                 </div>
                              </div>
                              <span className="rounded-md bg-surface-container-high px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/80">
                                {member.user_profiles?.role === "SUPER_ADMIN" ? "S-ADMIN" : (member.user_profiles?.role ?? "OWNER")}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-outline bg-surface-container/30 px-6 py-8 text-center">
                            <p className="text-sm font-bold text-on-surface-variant/70 uppercase tracking-widest">Workspace Indefinido</p>
                            <p className="text-xs text-on-surface-variant/50 mt-1 max-w-[200px] mx-auto">Ninguém possui acesso direto a este ambiente no momento.</p>
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
    <SurfaceCard className="p-4 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">{label}</p>
        <div className="rounded-xl border border-outline bg-background/50 p-2.5 text-secondary">
          <Icon size={16} />
        </div>
      </div>
      <div>
        <p className="mt-4 text-3xl font-black text-on-surface tracking-tighter">{value}</p>
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
    <div className="space-y-8">
      {formSections.map((section) => (
        <div key={section.title} className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="flex-1 h-px bg-outline" />
             <h3 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant shrink-0">{section.title}</h3>
             <div className="flex-[3] h-px bg-outline" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
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

      <div className="space-y-4">
        <div className="flex items-center gap-3">
           <div className="flex-1 h-px bg-outline" />
           <h3 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant shrink-0">Comentários & SEO</h3>
           <div className="flex-[3] h-px bg-outline" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
           <Field label="Descrição Curta" value={form.description} placeholder="Proposta de valor" onChange={(value) => onChange({ ...form, description: value })} multiline />
           <Field label="Anotações Internas" value={form.notes} placeholder="Condições, tarifas, links" onChange={(value) => onChange({ ...form, notes: value })} multiline />
        </div>
      </div>

      <div className="pt-4 flex gap-3 flex-col-reverse sm:flex-row">
        {onCancel && (
           <button
             type="button"
             disabled={disabled}
             onClick={onCancel}
             className="w-full sm:w-auto px-6 py-3 rounded-xl border border-outline bg-surface-container/50 text-sm font-bold text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface disabled:opacity-50"
           >
             Cancelar
           </button>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => void onSubmit()}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-6 py-3 text-sm font-bold tracking-wide text-on-secondary shadow-md shadow-secondary/20 transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
  const baseClassName = "brandops-input w-full rounded-xl border border-outline bg-background/50 px-4 py-2.5 text-sm font-medium text-on-surface outline-none transition focus:border-secondary focus:bg-background";
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
    <div className="animate-pulse rounded-[1.25rem] border border-outline bg-background p-4">
      <div className="flex gap-4">
         <div className="h-11 w-11 rounded-[1rem] bg-surface-container shrink-0" />
         <div className="flex-1 py-1">
            <div className="h-4 w-3/5 rounded bg-surface-container" />
            <div className="mt-2 h-3 w-2/5 rounded bg-surface-container opacity-50" />
         </div>
      </div>
    </div>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
