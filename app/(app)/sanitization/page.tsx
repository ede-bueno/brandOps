"use client";

import { useState } from "react";
import {
  ShieldAlert,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

const MOCK_ANOMALIES = [
  {
    id: "1",
    date: "05/03/2026",
    campaign: "Black Friday Antecipada",
    adset: "Lookalike 1%",
    ad: "Video_01",
    metric: "Conversão",
    value: "R$ 22.500,00",
    reason: "Valor de conversão atípico (> 10x ticket médio)",
    status: "pending",
  },
  {
    id: "2",
    date: "05/03/2026",
    campaign: "Retargeting",
    adset: "Carrinho Abandonado",
    ad: "Carrossel_02",
    metric: "Conversão",
    value: "R$ 38.120,00",
    reason: "Valor de conversão atípico (> 10x ticket médio)",
    status: "pending",
  },
  {
    id: "3",
    date: "02/03/2026",
    campaign: "Topo de Funil",
    adset: "Interesses Amplos",
    ad: "Imagem_03",
    metric: "Cliques",
    value: "15.000",
    reason: "Pico de cliques sem impressões proporcionais (Bot traffic?)",
    status: "ignored",
  },
];

export default function SanitizationPage() {
  const [anomalies, setAnomalies] = useState(MOCK_ANOMALIES);

  const handleIgnore = (id: string) => {
    setAnomalies((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "ignored" } : a)),
    );
  };

  const handleKeep = (id: string) => {
    setAnomalies((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "kept" } : a)),
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Saneamento de Dados
          </h1>
          <p className="text-slate-500 mt-1">
            Detecte e trate anomalias nos dados importados (ex: conversões
            falsas da Meta).
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Filter size={16} />
            Filtros
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar campanha..."
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Anomalias Pendentes
            </p>
            <h3 className="text-2xl font-bold text-slate-900">2</h3>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-lg">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Linhas Ignoradas
            </p>
            <h3 className="text-2xl font-bold text-slate-900">1</h3>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Falsos Positivos (Mantidos)
            </p>
            <h3 className="text-2xl font-bold text-slate-900">0</h3>
          </div>
        </div>
      </div>

      {/* Anomalies Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Campanha / Conjunto / Anúncio</th>
                <th className="px-6 py-4">Métrica Afetada</th>
                <th className="px-6 py-4">Motivo da Anomalia</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {anomalies.map((anomaly) => (
                <tr
                  key={anomaly.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                    {anomaly.date}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">
                      {anomaly.campaign}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {anomaly.adset} &bull; {anomaly.ad}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                      {anomaly.metric}:{" "}
                      <span className="text-rose-600">{anomaly.value}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-amber-700 text-xs">
                    {anomaly.reason}
                  </td>
                  <td className="px-6 py-4">
                    {anomaly.status === "pending" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Pendente
                      </span>
                    )}
                    {anomaly.status === "ignored" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold">
                        <XCircle size={12} />
                        Ignorado
                      </span>
                    )}
                    {anomaly.status === "kept" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                        <CheckCircle size={12} />
                        Mantido
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {anomaly.status === "pending" ? (
                      <>
                        <button
                          onClick={() => handleIgnore(anomaly.id)}
                          className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-md text-xs font-medium transition-colors"
                        >
                          Ignorar Linha
                        </button>
                        <button
                          onClick={() => handleKeep(anomaly.id)}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md text-xs font-medium transition-colors"
                        >
                          Manter
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() =>
                          setAnomalies((prev) =>
                            prev.map((a) =>
                              a.id === anomaly.id
                                ? { ...a, status: "pending" }
                                : a,
                            ),
                          )
                        }
                        className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md text-xs font-medium transition-colors"
                      >
                        Desfazer
                      </button>
                    )}
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
