"use client";

import {
  PieChart,
  Activity,
  MousePointerClick,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const campaignData = [
  { name: "CBO - Topo Funil", spend: 12000, revenue: 28000, roas: 2.33 },
  { name: "Retargeting 7D", spend: 3500, revenue: 15400, roas: 4.4 },
  { name: "Lookalike 1%", spend: 8000, revenue: 19200, roas: 2.4 },
  { name: "Catálogo Advantage+", spend: 15000, revenue: 42000, roas: 2.8 },
];

export default function MediaPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Performance de Mídia
          </h1>
          <p className="text-slate-500 mt-1">
            Análise de campanhas da Meta Ads com foco em saúde financeira
            (AdCost e ROAS).
          </p>
        </div>
        <div className="flex gap-3">
          <select className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5">
            <option>Últimos 7 dias</option>
            <option>Últimos 30 dias</option>
            <option>Este Mês</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Investimento (AdCost)
            </p>
            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
              <Activity size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-900">R$ 38.500</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              ROAS Bruto (Meta)
            </p>
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-900">2.71x</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">CPA Médio</p>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <PieChart size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-900">R$ 45,20</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">CTR Médio</p>
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <MousePointerClick size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-900">1.84%</h3>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">
          Investimento vs Retorno por Campanha
        </h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={campaignData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$ ${value / 1000}k`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}x`}
              />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="spend"
                name="Investimento"
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
                barSize={40}
              />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                name="Receita (Meta)"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                barSize={40}
              />
              <Bar
                yAxisId="right"
                dataKey="roas"
                name="ROAS"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
