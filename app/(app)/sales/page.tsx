"use client";

import { TrendingUp, ShoppingCart, Package, Users } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const dailySales = [
  { date: "01/03", orders: 120, revenue: 15000, items: 150 },
  { date: "02/03", orders: 98, revenue: 12500, items: 110 },
  { date: "03/03", orders: 145, revenue: 18200, items: 180 },
  { date: "04/03", orders: 110, revenue: 13800, items: 135 },
  { date: "05/03", orders: 160, revenue: 21000, items: 200 },
  { date: "06/03", orders: 135, revenue: 17500, items: 165 },
  { date: "07/03", orders: 180, revenue: 24000, items: 230 },
];

const topProducts = [
  { name: "Camiseta Básica Preta", revenue: 45000, units: 1200 },
  { name: "Moletom Cinza Mescla", revenue: 32000, units: 450 },
  { name: "Caneca Dev Life", revenue: 12000, units: 850 },
  { name: "Poster Minimalista", revenue: 8500, units: 320 },
  { name: "Boné Dad Hat", revenue: 6200, units: 210 },
];

export default function SalesPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Performance de Vendas
          </h1>
          <p className="text-slate-500 mt-1">
            Análise detalhada de pedidos, faturamento e produtos mais vendidos.
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
            <p className="text-sm font-medium text-slate-500">Receita Total</p>
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-900">R$ 122.000</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Pedidos</p>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <ShoppingCart size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-900">948</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Peças Vendidas</p>
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Package size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-900">1.170</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Ticket Médio</p>
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-900">R$ 128,69</h3>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">
            Evolução de Receita e Pedidos
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dailySales}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$ ${value / 1000}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  name="Receita"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  name="Pedidos"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">
            Top Produtos (Receita)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  type="number"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$ ${value / 1000}k`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#475569"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={120}
                />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: any) => [`R$ ${value}`, "Receita"]}
                />
                <Bar
                  dataKey="revenue"
                  fill="#6366f1"
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
