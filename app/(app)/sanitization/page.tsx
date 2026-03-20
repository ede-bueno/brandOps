"use client";

import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { buildMediaAnomalies } from "@/lib/brandops/metrics";

export default function SanitizationPage() {
  const { activeBrand } = useBrandOps();

  if (!activeBrand || !activeBrand.media.length) {
    return (
      <EmptyState
        title="Ainda não há dados de mídia para saneamento"
        description="Assim que o Meta Export.csv for importado, o BrandOps gera uma fila inicial de anomalias para revisão."
      />
    );
  }

  const anomalies = buildMediaAnomalies(activeBrand);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-on-surface">Saneamento</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-on-surface-variant">
          Lista inicial de anomalias geradas automaticamente a partir do export da
          Meta. O objetivo aqui é destacar linhas com sinais fortes de atribuição
          inconsistente.
        </p>
      </section>

      {anomalies.length === 0 ? (
        <div className="rounded-3xl border border-outline bg-surface-container p-8 text-on-surface">
          Nenhuma anomalia relevante foi encontrada na importação atual.
        </div>
      ) : (
        <div className="rounded-3xl border border-outline bg-surface-container p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-on-surface">
                Anomalias sugeridas
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                {anomalies.length} ocorrência(s) sinalizadas automaticamente.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                <tr>
                  <th className="pb-3">Data</th>
                  <th className="pb-3">Campanha</th>
                  <th className="pb-3">Métrica</th>
                  <th className="pb-3">Motivo</th>
                  <th className="pb-3 text-right">Severidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {anomalies.map((anomaly) => (
                  <tr key={anomaly.id}>
                    <td className="py-4 text-on-surface">{anomaly.date}</td>
                    <td className="py-4">
                      <p className="font-semibold text-on-surface">
                        {anomaly.campaignName}
                      </p>
                      <p className="mt-1 text-on-surface-variant">
                        {anomaly.adsetName} • {anomaly.adName}
                      </p>
                    </td>
                    <td className="py-4 text-on-surface">
                      {anomaly.metric}: {anomaly.value}
                    </td>
                    <td className="py-4 text-on-surface-variant">{anomaly.reason}</td>
                    <td className="py-4 text-right">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          anomaly.severity === "high"
                            ? "bg-tertiary/15 text-tertiary"
                            : "bg-secondary/15 text-secondary"
                        }`}
                      >
                        {anomaly.severity === "high" ? "Alta" : "Média"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
