"use client";

import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { currencyFormatter, formatLongDateTime } from "@/lib/brandops/format";

const COLORS = ["#7C8DB5", "#8B5CF6", "#2563EB", "#0F766E", "#B45309", "#DC2626"];

export default function CostCenterPage() {
  const { activeBrand, createExpense, createExpenseCategory } = useBrandOps();
  const [categoryName, setCategoryName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [expenseForm, setExpenseForm] = useState({
    categoryId: "",
    description: "",
    amount: "",
    incurredOn: new Date().toISOString().slice(0, 10),
  });

  if (!activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca em foco"
        description="Selecione uma marca para lançar despesas operacionais e alimentar o DRE."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Custos fixos e operacionais"
        title="Centro de custo"
        description="Lance aqui as despesas fora mídia: pró-labore, salários, IA, equipamentos, software e outras categorias que entram no DRE."
      />

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <SurfaceCard>
            <SectionHeading title="Nova categoria" description="Crie grupos para organizar despesas e análises futuras." />
            <div className="mt-5 space-y-4">
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Ex.: Contabilidade"
                className="soft-input"
              />
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`h-10 w-10 rounded-full border-2 ${
                      selectedColor === color ? "border-white" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={color}
                  />
                ))}
              </div>
              <button
                onClick={async () => {
                  if (!categoryName.trim()) return;
                  await createExpenseCategory(activeBrand.id, categoryName, selectedColor);
                  setCategoryName("");
                }}
                className="soft-button soft-button-primary"
              >
                Criar categoria
              </button>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading title="Nova despesa" description="Registre o lançamento já no período correto." />
            <div className="mt-5 space-y-4">
              <select
                value={expenseForm.categoryId}
                onChange={(event) =>
                  setExpenseForm((current) => ({ ...current, categoryId: event.target.value }))
                }
                className="soft-select"
              >
                <option value="">Selecione a categoria</option>
                {activeBrand.expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input
                value={expenseForm.description}
                onChange={(event) =>
                  setExpenseForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Descrição da despesa"
                className="soft-input"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={expenseForm.amount}
                  onChange={(event) =>
                    setExpenseForm((current) => ({ ...current, amount: event.target.value }))
                  }
                  placeholder="0,00"
                  className="soft-input"
                />
                <input
                  type="date"
                  value={expenseForm.incurredOn}
                  onChange={(event) =>
                    setExpenseForm((current) => ({ ...current, incurredOn: event.target.value }))
                  }
                  className="soft-input"
                />
              </div>
              <button
                onClick={async () => {
                  const amount = Number(
                    expenseForm.amount.trim().replace(/\./g, "").replace(",", "."),
                  );
                  if (!expenseForm.categoryId || !expenseForm.description.trim() || !Number.isFinite(amount)) {
                    return;
                  }
                  await createExpense(
                    activeBrand.id,
                    expenseForm.categoryId,
                    expenseForm.description,
                    amount,
                    expenseForm.incurredOn,
                  );
                  setExpenseForm((current) => ({
                    ...current,
                    description: "",
                    amount: "",
                  }));
                }}
                className="soft-button soft-button-primary"
              >
                Lançar despesa
              </button>
            </div>
          </SurfaceCard>
        </div>

        <SurfaceCard>
          <SectionHeading
            title="Últimos lançamentos"
            description="Histórico recente das despesas desta marca."
            aside={`Base atualizada em ${formatLongDateTime(activeBrand.updatedAt)}`}
          />
          <div className="mt-5 space-y-3">
            {activeBrand.expenses.length ? (
              activeBrand.expenses.map((expense) => (
                <article key={expense.id} className="panel-muted p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--color-ink-strong)]">{expense.description}</p>
                      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                        {expense.categoryName} • {expense.incurredOn}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[var(--color-ink-strong)]">
                        {currencyFormatter.format(expense.amount)}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-[var(--color-ink-soft)]">
                Nenhuma despesa lançada ainda para esta marca.
              </p>
            )}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
