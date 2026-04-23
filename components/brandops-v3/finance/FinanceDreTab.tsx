"use client";

import type { ReactNode } from "react";

export function FinanceDreTab({
  ledger,
  queue,
}: {
  ledger: ReactNode;
  queue: ReactNode;
}) {
  return (
    <div className="v3-section-grid">
      <div className="v3-panel-shell">{ledger}</div>
      <div className="v3-section-stack">{queue}</div>
    </div>
  );
}

