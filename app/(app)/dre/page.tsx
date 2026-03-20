"use client";

import { DollarSign, TrendingDown, TrendingUp, Download } from "lucide-react";

export default function DrePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            DRE Completo
          </h1>
          <p className="text-slate-500 mt-1">
            Demonstrativo do Resultado do Exercício consolidado.
          </p>
        </div>
        <div className="flex gap-3">
          <select className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5">
            <option>Março 2026</option>
            <option>Fevereiro 2026</option>
            <option>Janeiro 2026</option>
            <option>Ano 2026</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Download size={16} />
            Exportar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">
            Resultado do Período
          </h2>
          <div className="text-right">
            <p className="text-sm text-slate-500">Lucro Líquido</p>
            <p className="text-2xl font-bold text-emerald-600">R$ 38.450,00</p>
          </div>
        </div>

        <div className="p-0">
          <table className="w-full text-left text-sm text-slate-600">
            <tbody className="divide-y divide-slate-100">
              {/* Receita */}
              <tr className="bg-slate-50/50">
                <td className="px-6 py-4 font-bold text-slate-900">
                  1. Receita Bruta de Vendas
                </td>
                <td className="px-6 py-4 text-right font-bold text-slate-900">
                  R$ 150.000,00
                </td>
                <td className="px-6 py-4 text-right text-slate-400">100%</td>
              </tr>
              <tr>
                <td className="px-6 py-3 pl-10 text-slate-600">
                  (-) Descontos Concedidos
                </td>
                <td className="px-6 py-3 text-right text-rose-600">
                  - R$ 5.500,00
                </td>
                <td className="px-6 py-3 text-right text-slate-400">-3.6%</td>
              </tr>
              <tr>
                <td className="px-6 py-3 pl-10 text-slate-600">
                  (-) Devoluções / Chargebacks
                </td>
                <td className="px-6 py-3 text-right text-rose-600">
                  - R$ 2.000,00
                </td>
                <td className="px-6 py-3 text-right text-slate-400">-1.3%</td>
              </tr>

              <tr className="bg-indigo-50/30">
                <td className="px-6 py-4 font-bold text-indigo-900">
                  2. Receita Líquida
                </td>
                <td className="px-6 py-4 text-right font-bold text-indigo-900">
                  R$ 142.500,00
                </td>
                <td className="px-6 py-4 text-right text-indigo-400">95.0%</td>
              </tr>

              {/* Custos */}
              <tr>
                <td className="px-6 py-3 pl-10 text-slate-600">
                  (-) Custo da Mercadoria Vendida (CMV)
                </td>
                <td className="px-6 py-3 text-right text-rose-600">
                  - R$ 45.000,00
                </td>
                <td className="px-6 py-3 text-right text-slate-400">-30.0%</td>
              </tr>
              <tr>
                <td className="px-6 py-3 pl-10 text-slate-600">
                  (-) Fretes e Envios
                </td>
                <td className="px-6 py-3 text-right text-rose-600">
                  - R$ 12.000,00
                </td>
                <td className="px-6 py-3 text-right text-slate-400">-8.0%</td>
              </tr>

              <tr className="bg-emerald-50/30">
                <td className="px-6 py-4 font-bold text-emerald-900">
                  3. Margem Bruta (Lucro Bruto)
                </td>
                <td className="px-6 py-4 text-right font-bold text-emerald-900">
                  R$ 85.500,00
                </td>
                <td className="px-6 py-4 text-right text-emerald-600">57.0%</td>
              </tr>

              {/* Despesas Variáveis */}
              <tr>
                <td className="px-6 py-3 pl-10 text-slate-600">
                  (-) Investimento em Mídia (AdCost)
                </td>
                <td className="px-6 py-3 text-right text-rose-600">
                  - R$ 32.000,00
                </td>
                <td className="px-6 py-3 text-right text-slate-400">-21.3%</td>
              </tr>
              <tr>
                <td className="px-6 py-3 pl-10 text-slate-600">
                  (-) Taxas de Gateway / Cartão
                </td>
                <td className="px-6 py-3 text-right text-rose-600">
                  - R$ 6.500,00
                </td>
                <td className="px-6 py-3 text-right text-slate-400">-4.3%</td>
              </tr>
              <tr>
                <td className="px-6 py-3 pl-10 text-slate-600">
                  (-) Impostos sobre Vendas
                </td>
                <td className="px-6 py-3 text-right text-rose-600">
                  - R$ 8.550,00
                </td>
                <td className="px-6 py-3 text-right text-slate-400">-5.7%</td>
              </tr>

              <tr className="bg-blue-50/30">
                <td className="px-6 py-4 font-bold text-blue-900">
                  4. Margem de Contribuição
                </td>
                <td className="px-6 py-4 text-right font-bold text-blue-900">
                  R$ 38.450,00
                </td>
                <td className="px-6 py-4 text-right text-blue-600">25.6%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
