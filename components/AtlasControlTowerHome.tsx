"use client";

import { useBrandOps } from "./BrandOpsProvider";
import { AtlasAnalystPanel } from "./AtlasAnalystPanel";

export function AtlasControlTowerHome() {
  const { activeBrand } = useBrandOps();

  const geminiIntegration =
    activeBrand?.integrations.find((integration) => integration.provider === "gemini") ?? null;
  const isAtlasAiEnabled = geminiIntegration?.mode === "api";
  const canUseAtlasCommandCenter =
    activeBrand?.governance.featureFlags.atlasCommandCenter ?? false;

  if (!activeBrand || !isAtlasAiEnabled || !canUseAtlasCommandCenter) {
    return null;
  }

  return (
    <section id="atlas-ai-home" className="atlas-entity-stage">
      <div className="atlas-entity-stack">
        <AtlasAnalystPanel variant="command-center" />
      </div>
    </section>
  );
}
