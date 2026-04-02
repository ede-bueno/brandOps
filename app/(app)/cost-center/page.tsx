"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  Landmark,
  Palette,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  ActionToast,
  PageHeader,
  ProcessingOverlay,
  SectionHeading,
  SurfaceCard,
} from "@/components/ui-shell";
import { currencyFormatter, integerFormatter } from "@/lib/brandops/format";

type CostCenterTab = "launches" | "categories";

function CostCenterModal({
  open,
  title,
  description,
  onClose,
  children,
  mode = "side",
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  mode?: "side" | "center";
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[85] bg-surface/70 backdrop-blur-sm">
      <div
        className={`flex h-full ${
          mode === "side" ? "justify-end" : "items-center justify-center p-4"
        }`}
      >
        <div
          className={`brandops-panel border-outline shadow-2xl ${
            mode === "side"
              ? "h-full w-full max-w-xl overflow-y-auto rounded-none border-l p-6"
              : "w-full max-w-lg p-6"
          }`}
        >
          <div className="flex items-start justify-between gap-4 border-b border-outline pb-4">
            <div>
              <h2 className="font-headline text-xl font-semibold tracking-tight text-on-surface">
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-sm leading-6 text-on-surface-variant">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline text-on-surface-variant transition hover:bg-surface-container"
              onClick={onClose}
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
          <div className="pt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function normalizeMonthToDate(value: string) {
  if (!value) {
    return "";
  }
  return `${value}-01`;
}

function formatCompetencyLabel(value: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function CostCenterPage() {
  const {
    activeBrand,
    activeBrandId,
    brands,
    isLoading,
    isBrandHydrating,
    selectedPeriodLabel,
    createExpenseCategory,
    updateExpenseCategory,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useBrandOps();

  const [activeTab, setActiveTab] = useState<CostCenterTab>("launches");
  const [launchView, setLaunchView] = useState<"overview" | "ledger">("overview");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [bookSearch, setBookSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const [expenseForm, setExpenseForm] = useState({
    categoryId: "",
    description: "",
    amount: "",
    month: "",
  });
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    color: "#0ea5e9",
  });

  const selectedBrandName =
    activeBrand?.name ?? brands.find((brand) => brand.id === activeBrandId)?.name ?? "Loja";

  const expenseCategories = useMemo(() => {
    return [...(activeBrand?.expenseCategories ?? [])].sort((left, right) => {
      if (left.isSystem !== right.isSystem) {
        return left.isSystem ? 1 : -1;
      }
      return left.name.localeCompare(right.name, "pt-BR");
    });
  }, [activeBrand?.expenseCategories]);

  const expenses = useMemo(() => {
    return [...(activeBrand?.expenses ?? [])].sort((left, right) =>
      right.incurredOn.localeCompare(left.incurredOn),
    );
  }, [activeBrand?.expenses]);

  const launchableCategories = expenseCategories.filter((category) => category.isActive);

  const defaultMonth = useMemo(() => {
    if (expenses[0]?.incurredOn) {
      return expenses[0].incurredOn.slice(0, 7);
    }
    return new Date().toISOString().slice(0, 7);
  }, [expenses]);

  const bookEntries = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesCategory =
        categoryFilter === "all" ? true : expense.categoryId === categoryFilter;
      const search = bookSearch.trim().toLowerCase();
      const matchesSearch = search
        ? expense.description.toLowerCase().includes(search) ||
          expense.categoryName.toLowerCase().includes(search)
        : true;

      return matchesCategory && matchesSearch;
    });
  }, [bookSearch, categoryFilter, expenses]);

  const monthlyLedger = useMemo(() => {
    const byMonth = new Map<
      string,
      {
        month: string;
        total: number;
        entries: number;
        categories: Set<string>;
      }
    >();

    expenses.forEach((expense) => {
      const month = expense.incurredOn.slice(0, 7);
      const current = byMonth.get(month) ?? {
        month,
        total: 0,
        entries: 0,
        categories: new Set<string>(),
      };

      current.total += expense.amount;
      current.entries += 1;
      current.categories.add(expense.categoryName);
      byMonth.set(month, current);
    });

    return [...byMonth.values()]
      .sort((left, right) => right.month.localeCompare(left.month))
      .map((row) => ({
        month: row.month,
        total: row.total,
        entries: row.entries,
        categories: row.categories.size,
      }));
  }, [expenses]);

  const categorySummary = useMemo(() => {
    const totals = new Map<string, { categoryId: string; categoryName: string; total: number; entries: number }>();

    expenses.forEach((expense) => {
      const current = totals.get(expense.categoryId) ?? {
        categoryId: expense.categoryId,
        categoryName: expense.categoryName,
        total: 0,
        entries: 0,
      };

      current.total += expense.amount;
      current.entries += 1;
      totals.set(expense.categoryId, current);
    });

    return [...totals.values()].sort((left, right) => right.total - left.total);
  }, [expenses]);

  const totalExpenses = useMemo(
    () => expenses.reduce((accumulator, expense) => accumulator + expense.amount, 0),
    [expenses],
  );

  const currentMonthTotal = useMemo(() => {
    return expenses
      .filter((expense) => expense.incurredOn.startsWith(defaultMonth))
      .reduce((accumulator, expense) => accumulator + expense.amount, 0);
  }, [defaultMonth, expenses]);

  const activeMonthEntries = useMemo(
    () => expenses.filter((expense) => expense.incurredOn.startsWith(defaultMonth)).length,
    [defaultMonth, expenses],
  );

  const activeMonthCategories = useMemo(
    () =>
      new Set(
        expenses
          .filter((expense) => expense.incurredOn.startsWith(defaultMonth))
          .map((expense) => expense.categoryId),
      ).size,
    [defaultMonth, expenses],
  );

  const resetExpenseForm = () => {
    setExpenseForm({
      categoryId: launchableCategories[0]?.id ?? "",
      description: "",
      amount: "",
      month: defaultMonth,
    });
    setEditingExpenseId(null);
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: "",
      color: "#0ea5e9",
    });
    setEditingCategoryId(null);
  };

  const openNewExpenseModal = () => {
    resetExpenseForm();
    setIsExpenseModalOpen(true);
  };

  const openEditExpenseModal = (expenseId: string) => {
    const expense = expenses.find((entry) => entry.id === expenseId);
    if (!expense) {
      return;
    }

    setEditingExpenseId(expense.id);
    setExpenseForm({
      categoryId: expense.categoryId,
      description: expense.description,
      amount: String(expense.amount),
      month: expense.incurredOn.slice(0, 7),
    });
    setIsExpenseModalOpen(true);
  };

  const openNewCategoryModal = () => {
    resetCategoryForm();
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (categoryId: string) => {
    const category = expenseCategories.find((entry) => entry.id === categoryId);
    if (!category) {
      return;
    }

    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      color: category.color,
    });
    setIsCategoryModalOpen(true);
  };

  const handleExpenseSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeBrandId) {
      return;
    }

    if (!expenseForm.categoryId || !expenseForm.description.trim() || !expenseForm.amount || !expenseForm.month) {
      setToast({
        tone: "error",
        message: "Preencha categoria, descrição, valor e competência.",
      });
      return;
    }

    const parsedAmount = Number(expenseForm.amount.replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setToast({
        tone: "error",
        message: "Informe um valor válido para o lançamento.",
      });
      return;
    }

    try {
      setProcessingMessage(
        editingExpenseId ? "Atualizando lançamento no DRE..." : "Registrando lançamento no DRE...",
      );

      if (editingExpenseId) {
        await updateExpense(
          activeBrandId,
          editingExpenseId,
          expenseForm.categoryId,
          expenseForm.description.trim(),
          parsedAmount,
          normalizeMonthToDate(expenseForm.month),
        );
      } else {
        await createExpense(
          activeBrandId,
          expenseForm.categoryId,
          expenseForm.description.trim(),
          parsedAmount,
          normalizeMonthToDate(expenseForm.month),
        );
      }

      setIsExpenseModalOpen(false);
      resetExpenseForm();
      setToast({
        tone: "success",
        message: editingExpenseId
          ? "Lançamento atualizado com sucesso."
          : "Lançamento criado com sucesso.",
      });
    } catch (error) {
      setToast({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o lançamento agora.",
      });
    } finally {
      setProcessingMessage(null);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!activeBrandId) {
      return;
    }

    try {
      setProcessingMessage("Removendo lançamento...");
      await deleteExpense(activeBrandId, expenseId);
      setToast({
        tone: "success",
        message: "Lançamento removido com sucesso.",
      });
    } catch (error) {
      setToast({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível remover o lançamento.",
      });
    } finally {
      setProcessingMessage(null);
    }
  };

  const handleCategorySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeBrandId) {
      return;
    }

    if (!categoryForm.name.trim()) {
      setToast({
        tone: "error",
        message: "Informe um nome para a categoria.",
      });
      return;
    }

    try {
      setProcessingMessage(
        editingCategoryId ? "Atualizando categoria..." : "Criando categoria...",
      );

      if (editingCategoryId) {
        await updateExpenseCategory(
          activeBrandId,
          editingCategoryId,
          categoryForm.name.trim(),
          categoryForm.color,
        );
      } else {
        await createExpenseCategory(
          activeBrandId,
          categoryForm.name.trim(),
          categoryForm.color,
        );
      }

      setIsCategoryModalOpen(false);
      resetCategoryForm();
      setToast({
        tone: "success",
        message: editingCategoryId
          ? "Categoria atualizada com sucesso."
          : "Categoria criada com sucesso.",
      });
    } catch (error) {
      setToast({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar a categoria.",
      });
    } finally {
      setProcessingMessage(null);
    }
  };

  if (!activeBrandId) {
    return (
      <EmptyState
        title="Nenhuma marca em foco"
        description="Selecione uma marca para organizar os lançamentos do DRE."
      />
    );
  }

  if ((isLoading || isBrandHydrating) && !activeBrand) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Fluxo financeiro"
          title="Lançamentos DRE"
          description={`Carregando os lançamentos da loja ${selectedBrandName}.`}
          badge={`Período ativo: ${selectedPeriodLabel}`}
        />
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr] animate-pulse">
          <div className="brandops-panel h-[360px]" />
          <div className="brandops-panel h-[360px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fluxo financeiro"
        title="Lançamentos DRE"
        description="Cadastre categorias, lance despesas por competência e revise o histórico mensal da operação."
        badge={`Loja ativa: ${selectedBrandName}`}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link href="/dre" className="brandops-button brandops-button-secondary">
              Abrir DRE
            </Link>
            <button
              type="button"
              className="brandops-button brandops-button-ghost"
              onClick={openNewCategoryModal}
            >
              <Tags size={15} />
              Nova categoria
            </button>
            <button
              type="button"
              className="brandops-button brandops-button-primary"
              onClick={openNewExpenseModal}
            >
              <Plus size={15} />
              Novo lançamento
            </button>
          </div>
        }
      />

      <SurfaceCard>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <SectionHeading
              title="Escolha o fluxo"
              description="Separe a gestão das categorias da operação de lançamento. Isso deixa a rotina financeira mais objetiva."
            />
          </div>
          <div className="brandops-tabs">
            <button
              type="button"
              className="brandops-tab"
              data-active={activeTab === "launches"}
              onClick={() => setActiveTab("launches")}
            >
              Lançamentos
            </button>
            <button
              type="button"
              className="brandops-tab"
              data-active={activeTab === "categories"}
              onClick={() => setActiveTab("categories")}
            >
              Categorias
            </button>
          </div>
        </div>
      </SurfaceCard>

      {activeTab === "launches" ? (
        <div className="space-y-6">
          <SurfaceCard>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <SectionHeading
                title="Operação de lançamentos"
                description="Separe a leitura consolidada do livro operacional para manter a tela mais objetiva."
              />
              <div className="brandops-subtabs">
                <button
                  type="button"
                  className="brandops-subtab"
                  data-active={launchView === "overview"}
                  onClick={() => setLaunchView("overview")}
                >
                  Resumo do mês
                </button>
                <button
                  type="button"
                  className="brandops-subtab"
                  data-active={launchView === "ledger"}
                  onClick={() => setLaunchView("ledger")}
                >
                  Livro de lançamentos
                </button>
              </div>
            </div>
          </SurfaceCard>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Competência em foco"
              value={formatCompetencyLabel(`${defaultMonth}-01`)}
              help="Mês padrão usado para leitura rápida e novos lançamentos."
              icon={Landmark}
            />
            <MetricCard
              label="Total no mês"
              value={currencyFormatter.format(currentMonthTotal)}
              help="Soma de despesas lançadas na competência em foco."
              icon={ReceiptText}
            />
            <MetricCard
              label="Lançamentos no mês"
              value={integerFormatter.format(activeMonthEntries)}
              help="Quantidade de movimentos lançados na competência ativa."
              icon={ReceiptText}
            />
            <MetricCard
              label="Categorias usadas"
              value={integerFormatter.format(activeMonthCategories)}
              help="Categorias que já apareceram na competência em foco."
              icon={Tags}
            />
          </section>

          {launchView === "overview" ? (
            <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
              <SurfaceCard>
                <div className="space-y-4">
                  <SectionHeading
                    title="Tabela mensal de despesas"
                    description="Visão consolidada por competência para entender rapidamente o peso das despesas no DRE."
                    aside={`${monthlyLedger.length} competências registradas`}
                  />
                  {monthlyLedger.length ? (
                    <div className="brandops-table-container">
                      <table className="brandops-table-compact">
                        <thead>
                          <tr>
                            <th>Mês</th>
                            <th className="text-right">Lançamentos</th>
                            <th className="text-right">Categorias</th>
                            <th className="text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyLedger.map((row) => (
                            <tr key={row.month}>
                              <td className="font-medium text-on-surface">
                                {formatCompetencyLabel(`${row.month}-01`)}
                              </td>
                              <td className="text-right">{integerFormatter.format(row.entries)}</td>
                              <td className="text-right">
                                {integerFormatter.format(row.categories)}
                              </td>
                              <td className="text-right font-semibold text-on-surface">
                                {currencyFormatter.format(row.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      title="Nenhuma despesa lançada"
                      description="Crie o primeiro lançamento para começar a montar o DRE operacional."
                      ctaLabel="Novo lançamento"
                      ctaHref="/cost-center"
                    />
                  )}
                </div>
              </SurfaceCard>

              <SurfaceCard>
                <div className="space-y-4">
                  <SectionHeading
                    title="Leitura por categoria"
                    description="Distribuição acumulada das despesas por categoria para apoiar análise e revisão."
                  />
                  {categorySummary.length ? (
                    <div className="space-y-3">
                      {categorySummary.slice(0, 8).map((row) => (
                        <div
                          key={row.categoryId}
                          className="rounded-xl border border-outline bg-surface-container-low p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-on-surface">
                                {row.categoryName}
                              </p>
                              <p className="text-xs text-on-surface-variant">
                                {integerFormatter.format(row.entries)} lançamentos
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-on-surface">
                              {currencyFormatter.format(row.total)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-outline p-4 text-sm text-on-surface-variant">
                      As categorias começam a aparecer aqui conforme os lançamentos são feitos.
                    </div>
                  )}
                </div>
              </SurfaceCard>
            </div>
          ) : (
            <SurfaceCard>
              <div className="space-y-4">
                <SectionHeading
                  title="Livro de lançamentos"
                  description="Histórico operacional para editar, revisar ou excluir movimentos do DRE."
                />

                <div className="brandops-toolbar-panel">
                  <div className="brandops-toolbar-grid xl:grid-cols-[minmax(0,1fr)_260px_200px_auto]">
                  <label className="brandops-field-stack">
                    <span className="brandops-field-label">Buscar</span>
                    <div className="brandops-input-shell">
                      <Search size={15} className="brandops-input-icon" />
                      <input
                        value={bookSearch}
                        onChange={(event) => setBookSearch(event.target.value)}
                        placeholder="Descrição ou categoria"
                        className="brandops-input brandops-input-leading"
                      />
                    </div>
                  </label>

                  <label className="brandops-field-stack">
                    <span className="brandops-field-label">Categoria</span>
                    <select
                      value={categoryFilter}
                      onChange={(event) => setCategoryFilter(event.target.value)}
                      className="brandops-input"
                    >
                      <option value="all">Todas as categorias</option>
                      {expenseCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="panel-muted px-4 py-3">
                    <p className="brandops-field-label">Total filtrado</p>
                    <p className="mt-1 text-sm font-semibold text-on-surface">
                      {currencyFormatter.format(
                        bookEntries.reduce((accumulator, expense) => accumulator + expense.amount, 0),
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="brandops-button brandops-button-primary h-[2.85rem] self-end"
                    onClick={openNewExpenseModal}
                  >
                    <Plus size={15} />
                    Lançar despesa
                  </button>
                  </div>
                </div>

                <div className="brandops-table-container">
                  <table className="brandops-table-compact">
                    <thead>
                      <tr>
                        <th>Competência</th>
                        <th>Categoria</th>
                        <th>Descrição</th>
                        <th className="text-right">Valor</th>
                        <th className="text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookEntries.length ? (
                        bookEntries.map((expense) => (
                          <tr key={expense.id}>
                            <td>{formatCompetencyLabel(expense.incurredOn)}</td>
                            <td>{expense.categoryName}</td>
                            <td className="text-on-surface">{expense.description}</td>
                            <td className="text-right font-semibold text-on-surface">
                              {currencyFormatter.format(expense.amount)}
                            </td>
                            <td>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  className="brandops-button brandops-button-ghost !px-3 !py-2"
                                  onClick={() => openEditExpenseModal(expense.id)}
                                >
                                  <Pencil size={14} />
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="brandops-button brandops-button-danger !px-3 !py-2"
                                  onClick={() => handleDeleteExpense(expense.id)}
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
                          <td colSpan={5}>
                            <div className="py-10 text-center text-sm text-on-surface-variant">
                              Nenhum lançamento encontrado para os filtros atuais.
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </SurfaceCard>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Categorias totais"
              value={integerFormatter.format(expenseCategories.length)}
              help="Categorias disponíveis para alimentar o DRE."
              icon={Tags}
            />
            <MetricCard
              label="Categorias customizadas"
              value={integerFormatter.format(expenseCategories.filter((category) => !category.isSystem).length)}
              help="Categorias que podem ser editadas pela operação."
              icon={Palette}
            />
            <MetricCard
              label="Despesas lançadas"
              value={currencyFormatter.format(totalExpenses)}
              help="Acumulado de despesas registradas na marca."
              icon={Landmark}
            />
          </div>

          <SurfaceCard>
            <div className="space-y-4">
              <SectionHeading
                title="Gestão de categorias"
                description="Cadastre novas categorias e ajuste as categorias customizadas existentes. Categorias de sistema permanecem protegidas."
                aside={
                  <button
                    type="button"
                    className="brandops-button brandops-button-primary"
                    onClick={openNewCategoryModal}
                  >
                    <Plus size={15} />
                    Nova categoria
                  </button>
                }
              />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {expenseCategories.map((category) => (
                  <div
                    key={category.id}
                    className="rounded-2xl border border-outline bg-surface p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-1 h-3 w-3 rounded-full border border-white/60 shadow-sm"
                          style={{ backgroundColor: category.color }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{category.name}</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span className="status-chip">
                              {category.isSystem ? "Sistema" : "Customizada"}
                            </span>
                            <span className="status-chip">{category.isActive ? "Ativa" : "Inativa"}</span>
                          </div>
                        </div>
                      </div>
                      {!category.isSystem ? (
                        <button
                          type="button"
                          className="brandops-button brandops-button-ghost !px-3 !py-2"
                          onClick={() => openEditCategoryModal(category.id)}
                        >
                          <Pencil size={14} />
                          Editar
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SurfaceCard>
        </div>
      )}

      <CostCenterModal
        open={isExpenseModalOpen}
        title={editingExpenseId ? "Editar lançamento" : "Novo lançamento"}
        description="Preencha a competência mensal, a categoria e a descrição. O valor alimenta diretamente o DRE."
        onClose={() => {
          setIsExpenseModalOpen(false);
          resetExpenseForm();
        }}
        mode="side"
      >
        <form className="space-y-5" onSubmit={handleExpenseSubmit}>
          <div className="grid gap-4">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Categoria
              </span>
              <select
                value={expenseForm.categoryId}
                onChange={(event) =>
                  setExpenseForm((current) => ({ ...current, categoryId: event.target.value }))
                }
                className="brandops-input w-full"
              >
                <option value="">Selecione uma categoria</option>
                {launchableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Descrição
              </span>
              <input
                value={expenseForm.description}
                onChange={(event) =>
                  setExpenseForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Ex.: Plataforma, frete administrativo, ferramenta"
                className="brandops-input w-full"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Valor
                </span>
                <input
                  value={expenseForm.amount}
                  onChange={(event) =>
                    setExpenseForm((current) => ({ ...current, amount: event.target.value }))
                  }
                  inputMode="decimal"
                  placeholder="0,00"
                  className="brandops-input w-full"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Competência
                </span>
                <input
                  type="month"
                  value={expenseForm.month}
                  onChange={(event) =>
                    setExpenseForm((current) => ({ ...current, month: event.target.value }))
                  }
                  className="brandops-input w-full"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-outline bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
            Esse lançamento entra na competência do mês escolhido e aparece no DRE consolidado.
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-outline pt-4">
            <button
              type="button"
              className="brandops-button brandops-button-ghost"
              onClick={() => {
                setIsExpenseModalOpen(false);
                resetExpenseForm();
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="brandops-button brandops-button-primary">
              {editingExpenseId ? "Salvar alterações" : "Criar lançamento"}
            </button>
          </div>
        </form>
      </CostCenterModal>

      <CostCenterModal
        open={isCategoryModalOpen}
        title={editingCategoryId ? "Editar categoria" : "Nova categoria"}
        description="Use categorias curtas e claras para facilitar leitura mensal do DRE."
        onClose={() => {
          setIsCategoryModalOpen(false);
          resetCategoryForm();
        }}
        mode="center"
      >
        <form className="space-y-5" onSubmit={handleCategorySubmit}>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Nome da categoria
            </span>
            <input
              value={categoryForm.name}
              onChange={(event) =>
                setCategoryForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Ex.: Ferramentas, Operação, Software"
              className="brandops-input w-full"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Cor de apoio
            </span>
            <div className="flex items-center gap-3 rounded-xl border border-outline px-3 py-2">
              <input
                type="color"
                value={categoryForm.color}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, color: event.target.value }))
                }
                className="h-10 w-14 cursor-pointer rounded border border-outline bg-transparent"
              />
              <span className="text-sm text-on-surface-variant">{categoryForm.color}</span>
            </div>
          </label>

          <div className="flex flex-wrap justify-end gap-2 border-t border-outline pt-4">
            <button
              type="button"
              className="brandops-button brandops-button-ghost"
              onClick={() => {
                setIsCategoryModalOpen(false);
                resetCategoryForm();
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="brandops-button brandops-button-primary">
              {editingCategoryId ? "Salvar categoria" : "Criar categoria"}
            </button>
          </div>
        </form>
      </CostCenterModal>

      <ProcessingOverlay
        open={Boolean(processingMessage)}
        title="Atualizando lançamentos"
        description={processingMessage ?? "Aguarde enquanto processamos a solicitação."}
      />
      <ActionToast message={toast?.message ?? null} tone={toast?.tone ?? "success"} />
    </div>
  );
}
