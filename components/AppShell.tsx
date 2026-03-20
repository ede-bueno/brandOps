"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, DatabaseZap, FileUp, LayoutDashboard, ShieldAlert, Tags } from "lucide-react";
import { useBrandOps } from "./BrandOpsProvider";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Vendas", icon: BarChart3 },
  { href: "/media", label: "Mídia", icon: BarChart3 },
  { href: "/dre", label: "DRE", icon: DatabaseZap },
  { href: "/import", label: "Importação", icon: FileUp },
  { href: "/sanitization", label: "Saneamento", icon: ShieldAlert },
  { href: "/cmv", label: "CMV", icon: Tags },
];

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { activeBrand, activeBrandId, brands, setActiveBrandId } = useBrandOps();

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r border-outline bg-surface-container-low px-6 py-6">
          <div className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-secondary">
              BrandOps
            </p>
            <h1 className="mt-3 text-2xl font-bold text-on-surface">
              Operação financeira para POD
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Consolide mídia, pedidos e catálogo em uma leitura única por marca.
            </p>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
                    isActive
                      ? "bg-secondary text-on-secondary"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-outline bg-surface-container p-4">
            <p className="text-xs font-semibold text-on-surface">Escopo atual</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              MVP com importação real de CSV e persistência local por marca, pronto
              para conectar autenticação e Supabase.
            </p>
          </div>
        </aside>

        <div className="flex-1">
          <header className="sticky top-0 z-30 border-b border-outline bg-background/90 backdrop-blur">
            <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">
                  Painel operacional
                </p>
                <h2 className="text-xl font-semibold text-on-surface">
                  {activeBrand?.name ?? "Nenhuma marca selecionada"}
                </h2>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="rounded-xl border border-outline bg-surface-container px-3 py-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                    Marca ativa
                  </label>
                  <select
                    value={activeBrandId ?? ""}
                    onChange={(event) => setActiveBrandId(event.target.value)}
                    className="min-w-56 bg-transparent text-sm text-on-surface outline-none"
                    disabled={!brands.length}
                  >
                    {!brands.length && <option value="">Nenhuma marca importada</option>}
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id} className="text-black">
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl border border-outline bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
                  {`${brands.length} marca(s) carregada(s)`}
                </div>
              </div>
            </div>
          </header>

          <main className="px-5 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
