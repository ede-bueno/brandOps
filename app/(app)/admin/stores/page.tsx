"use client";

import { useCallback, useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  Building2,
  Link2,
  MailPlus,
  MapPin,
  Search,
  Settings2,
  ShieldCheck,
  Users2,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { formatLongDateTime } from "@/lib/brandops/format";

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
      ["websiteUrl", "Site", "https://..."],
      ["logoUrl", "Logo", "https://..."],
    ],
  },
  {
    title: "Contato e presença",
    fields: [
      ["contactEmail", "Email de contato", "contato@marca.com"],
      ["instagramUrl", "Instagram", "https://instagram.com/..."],
      ["facebookUrl", "Facebook", "https://facebook.com/..."],
      ["taxId", "CPF/CNPJ", "000.000.000-00"],
    ],
  },
  {
    title: "Endereço",
    fields: [
      ["addressLine", "Endereço", "Rua, número, bairro"],
      ["city", "Cidade", "Belo Horizonte"],
      ["state", "Estado", "MG"],
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
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 right-[-6rem] h-72 w-72 rounded-full bg-secondary/12 blur-3xl" />
        <div className="absolute left-[-7rem] top-40 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="space-y-8">
        <section className="brandops-panel rounded-[2rem] p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-outline bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary">
                <ShieldCheck size={14} />
                Superadmin
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-on-surface lg:text-4xl">
                  Lojas e convites
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant lg:text-base">
                  Organize marcas, publique dados institucionais e convide responsáveis com
                  um painel que transmite ordem, clareza e confiança.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[28rem]">
              <StatCard icon={Building2} label="Lojas" value={brands.length} hint="Cadastradas no workspace" />
              <StatCard icon={Users2} label="Membros" value={totalMembers} hint="Vínculos ativos" />
              <StatCard icon={Link2} label="Com site" value={brands.filter((brand) => Boolean(brand.website_url)).length} hint="Com presença pública" />
              <StatCard icon={MapPin} label="Com endereço" value={brands.filter((brand) => Boolean(brand.address_line)).length} hint="Dados completos" />
            </div>
          </div>

          {notice ? (
            <div
              className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
                notice.kind === "success"
                  ? "border-secondary/20 bg-secondary/10 text-secondary"
                  : "border-tertiary/20 bg-tertiary/10 text-tertiary"
              }`}
            >
              {notice.text}
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <aside className="space-y-6">
            <Panel title="Diretório de lojas" description="Selecione a loja que deseja editar.">
              <div className="space-y-4">
                <div className="rounded-2xl border border-outline bg-background px-4 py-3">
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                    Buscar loja
                  </label>
                  <div className="flex items-center gap-3">
                    <Search size={16} className="text-on-surface-variant" />
                    <input
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                      placeholder="Nome, slug ou email"
                      className="brandops-input w-full bg-transparent px-3 py-2 text-sm outline-none"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                ) : visibleBrands.length ? (
                  <div className="space-y-3">
                    {visibleBrands.map((brand) => {
                      const isSelected = brand.id === selectedBrandId;
                      const memberCount = brand.brand_members?.length ?? 0;
                      return (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() => setSelectedBrandId(brand.id)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            isSelected
                              ? "border-secondary/40 bg-secondary/10 shadow-[0_0_0_1px_rgba(78,222,163,0.18)]"
                              : "border-outline bg-background hover:border-secondary/30 hover:bg-surface-container/80"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-on-surface">{brand.name}</p>
                              <p className="mt-1 text-xs text-on-surface-variant">
                                {brand.slug ?? "Sem slug"} • {memberCount} membro(s)
                              </p>
                            </div>
                            <span className="rounded-full border border-outline bg-surface-container px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                              {brand.website_url ? "Online" : "Sem site"}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-on-surface-variant">
                            {brand.contact_email ? <Tag>{brand.contact_email}</Tag> : null}
                            {brand.city ? <Tag>{`${brand.city}${brand.state ? `, ${brand.state}` : ""}`}</Tag> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-outline bg-background px-4 py-6 text-sm text-on-surface-variant">
                    Nenhuma loja encontrada para este filtro.
                  </div>
                )}
              </div>
            </Panel>

            <Panel title="Nova loja" description="Cadastre uma marca sem sair desta tela.">
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
                    setNotice({ kind: "success", text: `Loja ${payload.brand.name} criada com sucesso.` });
                    setCreateForm(emptyBrandForm);
                    await loadBrands(payload.brand.id);
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
                submitLabel={creating ? "Criando..." : "Criar loja"}
                disabled={creating}
              />
            </Panel>
          </aside>

          <div className="space-y-6">
            <Panel
              title="Loja selecionada"
              description="Atualize os dados públicos e mantenha a operação organizada."
              actions={
                selectedBrand ? (
                  <div className="rounded-full border border-outline bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                    Atualizada em {formatLongDateTime(selectedBrand.updated_at)}
                  </div>
                ) : null
              }
            >
              {selectedBrand ? (
                <div className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-2xl border border-outline bg-background p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-outline bg-surface-container text-lg font-semibold text-secondary">
                          {selectedBrand.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                            Identidade ativa
                          </p>
                          <h2 className="mt-1 truncate text-2xl font-bold text-on-surface">
                            {selectedBrand.name}
                          </h2>
                          <p className="mt-2 text-sm text-on-surface-variant">
                            {selectedBrand.description ?? "Sem descrição cadastrada."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <InfoBox label="Site" value={selectedBrand.website_url ?? "Não informado"} />
                      <InfoBox label="Email" value={selectedBrand.contact_email ?? "Não informado"} />
                    </div>
                  </div>

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
                        setNotice({ kind: "success", text: `Loja ${payload.brand.name} atualizada.` });
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
                    submitLabel={saving ? "Salvando..." : "Salvar alterações"}
                    disabled={saving}
                    mode="edit"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-outline bg-background px-5 py-8 text-sm text-on-surface-variant">
                  Nenhuma loja em foco. Selecione uma marca na lista à esquerda.
                </div>
              )}
            </Panel>

            <Panel title="Convites e equipe" description="Convide responsáveis e acompanhe quem já está vinculado.">
              <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
                <div className="rounded-2xl border border-outline bg-background p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <MailPlus size={16} className="text-secondary" />
                    <h3 className="text-sm font-semibold text-on-surface">Novo convite</h3>
                  </div>

                  <div className="space-y-3">
                    <input
                      value={inviteForm.fullName}
                      onChange={(event) => setInviteForm((current) => ({ ...current, fullName: event.target.value }))}
                      placeholder="Nome do responsável"
                      className="w-full rounded-2xl border border-outline bg-surface-container px-4 py-3 text-sm text-on-surface outline-none transition placeholder:text-on-surface-variant/70 focus:border-secondary/60"
                    />
                    <input
                      value={inviteForm.email}
                      onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="email@cliente.com"
                      className="w-full rounded-2xl border border-outline bg-surface-container px-4 py-3 text-sm text-on-surface outline-none transition placeholder:text-on-surface-variant/70 focus:border-secondary/60"
                    />
                    <select
                      value={inviteForm.role}
                      onChange={(event) => setInviteForm((current) => ({ ...current, role: event.target.value as InviteRole }))}
                      className="w-full rounded-2xl border border-outline bg-surface-container px-4 py-3 text-sm text-on-surface outline-none transition focus:border-secondary/60"
                    >
                      <option value="BRAND_OWNER">Dono da marca</option>
                      <option value="SUPER_ADMIN">Superadmin</option>
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
                          setNotice({ kind: "success", text: `Convite processado para ${payload.invited.email}.` });
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
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-on-secondary transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <MailPlus size={16} />
                      {sending ? "Enviando..." : "Enviar convite"}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-outline bg-background p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <Users2 size={16} className="text-secondary" />
                    <h3 className="text-sm font-semibold text-on-surface">Membros vinculados</h3>
                    <span className="rounded-full border border-outline bg-surface-container px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                      {selectedMemberCount}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {selectedBrand?.brand_members?.length ? (
                      selectedBrand.brand_members.map((member) => (
                        <div key={`${selectedBrand.id}-${member.user_id}`} className="rounded-2xl border border-outline bg-surface-container p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-on-surface">
                                {member.user_profiles?.full_name || member.user_profiles?.email || member.user_id}
                              </p>
                              <p className="mt-1 text-xs text-on-surface-variant">
                                {member.user_profiles?.email ?? "Email não informado"}
                              </p>
                            </div>
                            <span className="rounded-full border border-outline bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                              {member.user_profiles?.role ?? "Sem perfil"}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-outline bg-surface-container px-4 py-6 text-sm text-on-surface-variant">
                        Nenhum membro vinculado ainda.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </div>
  );
}

function Panel({ title, description, children, actions }: { title: string; description: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="brandops-panel rounded-[1.75rem] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
          <p className="max-w-xl text-sm leading-6 text-on-surface-variant">{description}</p>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function StatCard({ icon: Icon, label, value, hint }: { icon: ComponentType<{ size?: number; className?: string }>; label: string; value: number; hint: string; }) {
  return (
    <div className="rounded-2xl border border-outline bg-background px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">{label}</p>
          <p className="mt-2 text-2xl font-bold text-on-surface">{value}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>
        </div>
        <div className="rounded-2xl border border-outline bg-surface-container p-2.5 text-secondary">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function Tag({ children }: { children: string }) {
  return <span className="rounded-full border border-outline bg-surface-container px-2.5 py-1 text-[11px] font-medium text-on-surface-variant">{children}</span>;
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-outline bg-background px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">{label}</p>
      <p className="mt-2 break-words text-sm text-on-surface">{value}</p>
    </div>
  );
}

function BrandForm({
  form,
  onChange,
  onSubmit,
  submitLabel,
  disabled,
  mode = "create",
}: {
  form: BrandFormState;
  onChange: (value: BrandFormState) => void;
  onSubmit: () => Promise<void>;
  submitLabel: string;
  disabled: boolean;
  mode?: "create" | "edit";
}) {
  return (
    <div className="space-y-5">
      {mode === "edit" ? (
        <div className="rounded-2xl border border-dashed border-outline bg-background px-4 py-3 text-xs leading-6 text-on-surface-variant">
          Ajuste os dados abaixo. Os campos estão agrupados por contexto para reduzir fricção e acelerar revisões.
        </div>
      ) : null}

      {formSections.map((section) => (
        <div key={section.title} className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-on-surface">{section.title}</h3>
            <p className="mt-1 text-xs leading-6 text-on-surface-variant">Campos públicos e de cadastro.</p>
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
        <Field label="Descrição" value={form.description} placeholder="Resumo curto da marca" onChange={(value) => onChange({ ...form, description: value })} multiline />
        <Field label="Observações internas" value={form.notes} placeholder="Observações da operação" onChange={(value) => onChange({ ...form, notes: value })} multiline />
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => void onSubmit()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-on-secondary transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Settings2 size={16} />
        {submitLabel}
      </button>
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
  const baseClassName = "brandops-input w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:border-secondary/60";

  return (
    <label className="space-y-2">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={4}
          className={`${baseClassName} resize-y`}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={baseClassName}
        />
      )}
    </label>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-outline bg-background p-4">
      <div className="h-4 w-3/5 rounded-full bg-surface-container" />
      <div className="mt-3 h-3 w-2/5 rounded-full bg-surface-container" />
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-20 rounded-full bg-surface-container" />
        <div className="h-6 w-24 rounded-full bg-surface-container" />
      </div>
    </div>
  );
}
