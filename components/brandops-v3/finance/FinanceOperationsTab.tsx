"use client";

import type { ReactNode } from "react";

export function FinanceOperationsTab({
  primary,
  secondary,
}: {
  primary: ReactNode;
  secondary: ReactNode;
}) {
  return (
    <div className="v3-section-grid">
      {primary}
      {secondary}
    </div>
  );
}

