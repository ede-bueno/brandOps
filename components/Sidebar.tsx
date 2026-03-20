import Link from "next/link";
import {
  LayoutDashboard,
  Upload,
  ShieldAlert,
  Settings,
  LogOut,
  TrendingUp,
  DollarSign,
  PieChart,
} from "lucide-react";

export function Sidebar() {
  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight">POD Analytics</h1>
        <p className="text-xs text-slate-400 mt-1">Financial Intelligence</p>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
        >
          <LayoutDashboard size={18} />
          <span className="text-sm font-medium">Dashboard</span>
        </Link>

        <Link
          href="/dre"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
        >
          <DollarSign size={18} />
          <span className="text-sm font-medium">DRE Completo</span>
        </Link>

        <Link
          href="/sales"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
        >
          <TrendingUp size={18} />
          <span className="text-sm font-medium">Performance de Vendas</span>
        </Link>

        <Link
          href="/media"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
        >
          <PieChart size={18} />
          <span className="text-sm font-medium">Performance de Mídia</span>
        </Link>

        <div className="pt-4 pb-2">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Administração
          </p>
        </div>

        <Link
          href="/import"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
        >
          <Upload size={18} />
          <span className="text-sm font-medium">Importar Dados</span>
        </Link>

        <Link
          href="/sanitization"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
        >
          <ShieldAlert size={18} />
          <span className="text-sm font-medium">Saneamento</span>
        </Link>

        <Link
          href="/cmv"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
        >
          <Settings size={18} />
          <span className="text-sm font-medium">Gestão de CMV</span>
        </Link>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button className="flex items-center gap-3 px-3 py-2 w-full rounded-md hover:bg-slate-800 transition-colors text-slate-300 hover:text-white">
          <LogOut size={18} />
          <span className="text-sm font-medium">Sair</span>
        </button>
      </div>
    </div>
  );
}
