"use client";

import { useState } from "react";
import { Plus, Search, Calendar, DollarSign, History } from "lucide-react";

const MOCK_CMV = [
  {
    id: "1",
    sku: "TSHIRT-BLK-M",
    name: "Camiseta Básica Preta M",
    currentCmv: 35.5,
    validFrom: "01/01/2026",
    historyCount: 3,
  },
  {
    id: "2",
    sku: "HOODIE-GRY-L",
    name: "Moletom Cinza G",
    currentCmv: 85.0,
    validFrom: "15/02/2026",
    historyCount: 1,
  },
  {
    id: "3",
    sku: "MUG-WHT-01",
    name: "Caneca Branca 325ml",
    currentCmv: 12.9,
    validFrom: "01/03/2026",
    historyCount: 5,
  },
];

export default function CmvPage() {
  const [cmvs, setCmvs] = useState(MOCK_CMV);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Gestão de CMV
          </h1>
          <p className="text-slate-500 mt-1">
            Gerencie o Custo da Mercadoria Vendida por vigência. Alterações
            afetam apenas vendas futuras.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar SKU ou Produto..."
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Plus size={16} />
            Novo CMV
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-4">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
          <Calendar size={20} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-blue-900">
            Como funciona a Vigência?
          </h3>
          <p className="text-sm text-blue-800 mt-1">
            O sistema aplica o CMV com base na data da venda. Se você alterar o
            custo de um produto hoje, as vendas passadas manterão o custo
            antigo, garantindo a integridade do seu DRE histórico.
          </p>
        </div>
      </div>

      {/* CMV Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Produto / SKU</th>
                <th className="px-6 py-4">CMV Vigente</th>
                <th className="px-6 py-4">Válido Desde</th>
                <th className="px-6 py-4">Histórico</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {cmvs.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">
                      {item.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 font-mono">
                      {item.sku}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                      <DollarSign size={14} />
                      {item.currentCmv.toFixed(2).replace(".", ",")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{item.validFrom}</td>
                  <td className="px-6 py-4">
                    <button className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-medium text-xs">
                      <History size={14} />
                      {item.historyCount} alterações
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md text-xs font-medium transition-colors">
                      Atualizar Custo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
