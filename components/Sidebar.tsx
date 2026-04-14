import Link from "next/link";
import {
  LayoutDashboard,
  Upload,
  ShieldAlert,
  LogOut,
  TrendingUp,
  DollarSign,
  PieChart,
  Megaphone,
  Briefcase
} from "lucide-react";

export function Sidebar() {
  return (
    <div className="w-68 bg-surface border-r border-outline flex flex-col h-screen shrink-0">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight text-on-surface flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          BrandOps
        </h1>
        <p className="text-xs text-ink-muted mt-1 uppercase tracking-widest font-semibold ml-7">Analytics</p>
      </div>

      <nav className="flex-1 px-4 space-y-6 overflow-y-auto mt-2">
        {/* DOMÍNIO: VISÃO GERAL */}
        <div>
          <p className="px-3 mb-2 text-[0.65rem] font-bold text-ink-muted uppercase tracking-wider">
            Visão Central
          </p>
          <div className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-surface-container-high text-on-surface-variant hover:text-primary font-medium group"
            >
              <LayoutDashboard size={18} className="text-ink-muted group-hover:text-primary transition-colors" />
          <span className="text-sm">Torre de Controle</span>
            </Link>
          </div>
        </div>

        {/* DOMÍNIO: FINANÇAS E DRE */}
        <div>
          <p className="px-3 mb-2 text-[0.65rem] font-bold text-ink-muted uppercase tracking-wider">
            Financeiro e Gestão
          </p>
          <div className="space-y-1">
            <Link
              href="/dre"
              className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-surface-container-high text-on-surface-variant hover:text-primary font-medium group"
            >
              <DollarSign size={18} className="text-ink-muted group-hover:text-primary transition-colors" />
              <span className="text-sm">DRE Consolidado</span>
            </Link>
            <Link
              href="/cmv"
              className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-surface-container-high text-on-surface-variant hover:text-primary font-medium group"
            >
              <PieChart size={18} className="text-ink-muted group-hover:text-primary transition-colors" />
              <span className="text-sm">Custo & CMV</span>
            </Link>
          </div>
        </div>

        {/* DOMÍNIO: MARKETING E VENDAS */}
        <div>
          <p className="px-3 mb-2 text-[0.65rem] font-bold text-ink-muted uppercase tracking-wider">
            Marketing & Growth
          </p>
          <div className="space-y-1">
            <Link
              href="/sales"
              className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-surface-container-high text-on-surface-variant hover:text-primary font-medium group"
            >
              <TrendingUp size={18} className="text-ink-muted group-hover:text-primary transition-colors" />
              <span className="text-sm">Performance Vendas</span>
            </Link>
            <Link
              href="/media"
              className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-surface-container-high text-on-surface-variant hover:text-primary font-medium group"
            >
              <Megaphone size={18} className="text-ink-muted group-hover:text-primary transition-colors" />
              <span className="text-sm">Performance Mídia</span>
            </Link>
          </div>
        </div>

        {/* DOMÍNIO: OPERAÇÕES */}
        <div>
          <p className="px-3 mb-2 text-[0.65rem] font-bold text-ink-muted uppercase tracking-wider">
            Data Engineering
          </p>
          <div className="space-y-1">
            <Link
              href="/import"
              className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-surface-container-high text-on-surface-variant hover:text-primary font-medium group"
            >
              <Upload size={18} className="text-ink-muted group-hover:text-primary transition-colors" />
              <span className="text-sm">ETL & Imports</span>
            </Link>
            <Link
              href="/sanitization"
              className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-surface-container-high text-on-surface-variant hover:text-primary font-medium group"
            >
              <ShieldAlert size={18} className="text-ink-muted group-hover:text-primary transition-colors" />
              <span className="text-sm">Saneamento e Alertas</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-outline bg-surface-container-lowest">
        <button className="flex items-center gap-3 px-3 py-2 w-full rounded-xl hover:bg-error-container hover:text-error transition-colors text-on-surface-variant font-medium group">
          <LogOut size={18} className="text-ink-muted group-hover:text-error transition-colors" />
          <span className="text-sm">Sair da Seção</span>
        </button>
      </div>
    </div>
  );
}
