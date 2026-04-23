"use client";

import type { ReactNode } from "react";
import type { ManagementEvidenceLink, ManagementSourceHealthItem } from "@/lib/brandops/types";
import { EvidenceList, SourceHealth } from "../StudioPrimitives";

export function StudioEvidenceSection({
  queue,
  sources,
  links,
}: {
  queue?: ReactNode;
  sources: ManagementSourceHealthItem[];
  links: ManagementEvidenceLink[];
}) {
  return (
    <div className="v3-section-stack">
      {queue}
      <SourceHealth sources={sources} />
      <EvidenceList links={links} />
    </div>
  );
}

