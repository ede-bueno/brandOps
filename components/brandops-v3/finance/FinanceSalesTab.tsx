"use client";

import type { ReactNode } from "react";

export function FinanceSalesTab({
  sales,
  playbook,
}: {
  sales: ReactNode;
  playbook: ReactNode;
}) {
  return (
    <div className="v3-section-grid">
      {sales}
      {playbook}
    </div>
  );
}

