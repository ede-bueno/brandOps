"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { currencyFormatter } from "@/lib/brandops/format";

const COLORS = ["#0F9D73", "#2563EB", "#7C3AED", "#D97706", "#DC2626", "#475569"];

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

function toCompetencyDate(value: string) {
  return `${value}-01`;
}

function parseCurrencyInput(value: string) {
  return Number(value.trim().replace(/\./g, "").replace(",", "."));
}

function formatCompetency(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}-01T00:00:00`));
}

export default function CostCenterPage() {
  const {
    activeBrand,
    createExpense,
    createExpenseCategory,
    updateExpense,
    deleteExpense,
  } = useBrandOps();
  const [categoryName, setCategoryName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    categoryId: "",
    description: "",
    amount: "",
    competency: currentMonthValue(),
  });

  const expenseCategories = useMemo(
    () => activeBrand?.expenseCategories ?? [],
    [activeBrand],
  );
  const expenses = useMemo(
    () =>
      activeBrand
        ? [...activeBrand.expenses].sort((left, right) =>
            right.incurredOn.localeCompare(left.incurredOn),
          )
        : [],
    [activeBrand],
  );

  const monthlyLedger = useMemo(() => {
    const usedCategoryMap = new Map(
      expenseCategories.map((category) => [category.id, category.name]),
    );
    const months = new Map<
      string,
      {
        monthKey: string;
        total: number;
        byCategory: Record<string, number>;
      }
    >();

    expenses.forEach((expense) => {
      const monthKey = expense.incurredOn.slice(0, 7);
      const current = months.get(monthKey) ?? {
        monthKey,
        total: 0,
        byCategory: {},
      };
      current.total += expense.amount;
      current.byCategory[expense.categoryId] = (current.byCategory[expense.categoryId] ?? 0) + expense.amount;
      months.set(monthKey, current);
      usedCategoryMap.set(expense.categoryId, expense.categoryName);
    });

    const categories = [...usedCategoryMap.entries()].map(([id, name]) => ({ id, name }));
    const rows = [...months.values()].sort((left, right) =>
      right.monthKey.localeCompare(left.monthKey),
    );

    return { categories, rows };
  }, [expenseCategories, expenses]);

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  if (!activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca em foco"
        description="Selecione uma marca para lançar despesas operacionais e alimentar o DRE."
      />
    );
  }

  const resetForm = () => {
    setEditingExpenseId(null);
    setExpenseForm({
      categoryId: "",
      description: "",
      amount: "",
      competency: currentMonthValue(),
    });
  };

  const submitExpense = async () => {
    const amount = parseCurrencyInput(expenseForm.amount);
    if (!expenseForm.categoryId || !expenseForm.description.trim() || !Number.isFinite(amount)) {
      return;
    }

    const incurredOn = toCompetencyDate(expenseForm.competency);
    if (editingExpenseId) {
      await updateExpense(
        activeBrand.id,
        editingExpenseId,
        expenseForm.categoryId,
        expenseForm.description,
        amount,
        incurredOn,
      );
    } else {
      await createExpense(
        activeBrand.id,
        expenseForm.categoryId,
        expenseForm.description,
        amount,
        incurredOn,
      );
    }

    resetForm();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Centro de custo"
        title="Despesas operacionais"
        description="Lance os custos fora mídia por competência mensal. Cada lançamento é registrado no dia 1º do mês para alimentar o DRE sem distorção."
      />

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6">
          <SurfaceCard>
            <SectionHeading
              title="Nova categoria"
              description="Use categorias simples para manter o DRE legível."
            />
            <div className="mt-5 space-y-4">
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Ex.: Assinaturas de IA"
                className="brandops-input w-full px-3 py-2.5"
              />
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`h-10 w-10 rounded-full border-2 transition-all ${
                      selectedColor === color ? "border-on-surface scale-105" : "border-transparent"
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
                className="brandops-button brandops-button-secondary"
              >
                Criar categoria
              </button>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              title={editingExpenseId ? "Editar lançamento" : "Novo lançamento"}
              description="A competência sempre é gravada no dia 1º do mês selecionado."
            />
            <div className="mt-5 grid gap-4">
              <select
                value={expenseForm.categoryId}
                onChange={(event) =>
                  setExpenseForm((current) => ({ ...current, categoryId: event.target.value }))
                }
                className="brandops-input w-full px-3 py-2.5"
              >
                <option value="">Selecione a categoria</option>
                {expenseCategories.map((category) => (
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
                placeholder="Descrição do lançamento"
                className="brandops-input w-full px-3 py-2.5"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  value={expenseForm.amount}
                  onChange={(event) =>
                    setExpenseForm((current) => ({ ...current, amount: event.target.value }))
                  }
                  placeholder="0,00"
                  className="brandops-input w-full px-3 py-2.5"
                />
                <input
                  type="month"
                  value={expenseForm.competency}
                  onChange={(event) =>
                    setExpenseForm((current) => ({ ...current, competency: event.target.value }))
                  }
                  className="brandops-input w-full px-3 py-2.5"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void submitExpense()}
                  className="brandops-button brandops-button-primary"
                >
                  {editingExpenseId ? "Salvar alteração" : "Lançar despesa"}
                </button>
                {editingExpenseId ? (
                  <button
                    onClick={resetForm}
                    className="brandops-button brandops-button-ghost"
                  >
                    Cancelar edição
                  </button>
                ) : null}
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              title="Resumo rápido"
              description="Visão curta para bater volume e cobertura da base."
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="panel-muted p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Total lançado
                </p>
                <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
                  {currencyFormatter.format(totalExpenses)}
                </p>
              </div>
              <div className="panel-muted p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Competências
                </p>
                <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
                  {monthlyLedger.rows.length}
                </p>
              </div>
              <div className="panel-muted p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Categorias
                </p>
                <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
                  {expenseCategories.length}
                </p>
              </div>
            </div>
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          <SurfaceCard className="p-0 overflow-hidden">
            <div className="border-b border-outline p-5">
              <SectionHeading
                title="Tabela mensal de despesas"
                description="Consolidação por competência mensal usando o dia 1º como referência contábil."
              />
            </div>
            <div className="brandops-table-container rounded-none border-0">
              <table className="brandops-table-compact min-w-[760px] w-full">
                <thead>
                  <tr>
                    <th>Competência</th>
                    {monthlyLedger.categories.map((category) => (
                      <th key={category.id} className="text-right">
                        {category.name}
                      </th>
                    ))}
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyLedger.rows.length ? (
                    monthlyLedger.rows.map((row) => (
                      <tr key={row.monthKey}>
                        <td className="font-semibold text-on-surface">
                          {formatCompetency(row.monthKey)}
                        </td>
                        {monthlyLedger.categories.map((category) => (
                          <td key={category.id} className="text-right">
                            {currencyFormatter.format(row.byCategory[category.id] ?? 0)}
                          </td>
                        ))}
                        <td className="text-right font-semibold text-on-surface">
                          {currencyFormatter.format(row.total)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={monthlyLedger.categories.length + 2} className="py-8 text-center text-sm text-on-surface-variant">
                        Nenhuma despesa lançada ainda para esta marca.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-0 overflow-hidden">
            <div className="border-b border-outline p-5">
              <SectionHeading
                title="Livro de lançamentos"
                description="Cada linha pode ser editada ou excluída sem sair da tela."
              />
            </div>
            <div className="brandops-table-container rounded-none border-0">
              <table className="brandops-table-compact min-w-[760px] w-full">
                <thead>
                  <tr>
                    <th>Competência</th>
                    <th>Categoria</th>
                    <th>Descrição</th>
                    <th className="text-right">Valor</th>
                    <th className="text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length ? (
                    expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>{formatCompetency(expense.incurredOn.slice(0, 7))}</td>
                        <td>{expense.categoryName}</td>
                        <td className="max-w-[320px] truncate">{expense.description}</td>
                        <td className="text-right font-semibold text-on-surface">
                          {currencyFormatter.format(expense.amount)}
                        </td>
                        <td>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingExpenseId(expense.id);
                                setExpenseForm({
                                  categoryId: expense.categoryId,
                                  description: expense.description,
                                  amount: expense.amount.toFixed(2).replace(".", ","),
                                  competency: expense.incurredOn.slice(0, 7),
                                });
                              }}
                              className="brandops-button brandops-button-ghost px-3 py-1.5 text-xs"
                            >
                              <Pencil size={14} />
                              Editar
                            </button>
                            <button
                              onClick={async () => {
                                if (!window.confirm("Deseja excluir este lançamento?")) {
                                  return;
                                }
                                await deleteExpense(activeBrand.id, expense.id);
                                if (editingExpenseId === expense.id) {
                                  resetForm();
                                }
                              }}
                              className="brandops-button brandops-button-ghost px-3 py-1.5 text-xs text-error"
                            >
                              <Trash2 size={14} />
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-on-surface-variant">
                        Nenhum lançamento registrado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SurfaceCard>
        </div>
      </section>
    </div>
  );
}
