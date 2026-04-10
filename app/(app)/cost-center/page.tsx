"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Tags,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  ActionToast,
  AtlasModal,
  EntityChip,
  FormField,
  InlineNotice,
  OperationalMetric,
  OperationalMetricStrip,
  PageHeader,
  ProcessingOverlay,
  SectionHeading,
  StackItem,
  SurfaceCard,
  WorkspaceTabs,
} from "@/components/ui-shell";
import { currencyFormatter, integerFormatter } from "@/lib/brandops/format";

type CostCenterTab = "launches" | "categories";
const BOOK_PAGE_SIZE = 25;

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
    createExpenseCategory,
    updateExpenseCategory,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useBrandOps();

  const [activeTab, setActiveTab] = useState<CostCenterTab>("launches");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [bookSearch, setBookSearch] = useState("");
  const [bookMonthFilter, setBookMonthFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentBookPage, setCurrentBookPage] = useState(1);
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
      const matchesMonth =
        bookMonthFilter === "all" ? true : expense.incurredOn.startsWith(bookMonthFilter);
      const matchesCategory =
        categoryFilter === "all" ? true : expense.categoryId === categoryFilter;
      const search = bookSearch.trim().toLowerCase();
      const matchesSearch = search
        ? expense.description.toLowerCase().includes(search) ||
          expense.categoryName.toLowerCase().includes(search)
        : true;

      return matchesMonth && matchesCategory && matchesSearch;
    });
  }, [bookMonthFilter, bookSearch, categoryFilter, expenses]);

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

  const totalBookPages = Math.max(1, Math.ceil(bookEntries.length / BOOK_PAGE_SIZE));
  const paginatedBookEntries = useMemo(() => {
    const start = (currentBookPage - 1) * BOOK_PAGE_SIZE;
    return bookEntries.slice(start, start + BOOK_PAGE_SIZE);
  }, [bookEntries, currentBookPage]);
  const filteredBookTotal = useMemo(
    () => bookEntries.reduce((accumulator, expense) => accumulator + expense.amount, 0),
    [bookEntries],
  );
  const pageStartEntry = bookEntries.length ? (currentBookPage - 1) * BOOK_PAGE_SIZE + 1 : 0;
  const pageEndEntry = Math.min(currentBookPage * BOOK_PAGE_SIZE, bookEntries.length);

  useEffect(() => {
    setCurrentBookPage(1);
  }, [activeTab, bookMonthFilter, bookSearch, categoryFilter]);

  useEffect(() => {
    if (currentBookPage > totalBookPages) {
      setCurrentBookPage(totalBookPages);
    }
  }, [currentBookPage, totalBookPages]);

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
      <div className="atlas-page-stack">
        <PageHeader
          eyebrow="Fluxo financeiro"
          title="Lançamentos DRE"
          description={`Carregando os lançamentos da loja ${selectedBrandName}.`}
        />
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr] animate-pulse">
          <div className="brandops-panel h-[360px]" />
          <div className="brandops-panel h-[360px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="atlas-page-stack-compact">
      <PageHeader
        eyebrow="Financeiro"
        title="Livro de lançamentos"
        description={
          activeTab === "launches"
            ? "Registre, filtre e revise despesas por competência antes de refletir no DRE mensal."
            : "Mantenha o catálogo de categorias claro para sustentar um DRE consistente."
        }
        actions={
          <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <WorkspaceTabs
              items={[
                {
                  key: "cost-center-launches",
                  label: "Lançamentos",
                  active: activeTab === "launches",
                  onClick: () => setActiveTab("launches"),
                },
                {
                  key: "cost-center-categories",
                  label: "Categorias",
                  active: activeTab === "categories",
                  onClick: () => setActiveTab("categories"),
                },
              ]}
            />
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
            </div>
          </div>
        }
      />

      {activeTab === "launches" ? (
        <SurfaceCard>
          <div className="atlas-component-stack">
            <SectionHeading
              title="Livro de lançamentos"
              description="Histórico operacional paginado para editar, revisar ou excluir movimentos do DRE."
              aside={
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="atlas-inline-metric">
                    {integerFormatter.format(bookEntries.length)} lançamento(s)
                  </span>
                  <span className="atlas-inline-metric">
                    {currencyFormatter.format(filteredBookTotal)}
                  </span>
                </div>
              }
            />

            <div className="atlas-ledger-layout">
              <div className="atlas-ledger-main">
                <div className="brandops-table-container atlas-ledger-table-shell">
                  <table className="brandops-table-compact">
                    <thead>
                      <tr>
                        <th>Competência</th>
                        <th>Lançamento</th>
                        <th className="text-right">Valor</th>
                        <th className="text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedBookEntries.length ? (
                        paginatedBookEntries.map((expense) => (
                          <tr key={expense.id}>
                            <td>
                              <div className="atlas-ledger-month-cell">
                                <span className="atlas-ledger-month-value">{formatCompetencyLabel(expense.incurredOn)}</span>
                                <span className="atlas-ledger-month-meta">{expense.incurredOn.slice(0, 7)}</span>
                              </div>
                            </td>
                            <td>
                              <div className="atlas-ledger-entry-cell">
                                <span className="atlas-ledger-category-chip">{expense.categoryName}</span>
                                <p className="atlas-ledger-entry-title">{expense.description}</p>
                              </div>
                            </td>
                            <td className="text-right font-semibold text-on-surface atlas-ledger-value-cell">
                              {currencyFormatter.format(expense.amount)}
                            </td>
                            <td>
                              <div className="atlas-ledger-actions">
                                <button
                                  type="button"
                                  className="brandops-button brandops-button-ghost"
                                  onClick={() => openEditExpenseModal(expense.id)}
                                >
                                  <Pencil size={14} />
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="brandops-button brandops-button-danger"
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

              <aside className="atlas-ledger-sidebar">
                <div className="atlas-ledger-sidebar-inner">
                  <button
                    type="button"
                    className="brandops-button brandops-button-primary w-full"
                    onClick={openNewExpenseModal}
                  >
                    <Plus size={15} />
                    Novo lançamento
                  </button>

                  <div className="atlas-ledger-summary-strip atlas-ledger-summary-strip-vertical">
                    <div className="atlas-ledger-summary-item">
                      <span className="atlas-ledger-summary-label">Competência ativa</span>
                      <strong className="atlas-ledger-summary-value">{formatCompetencyLabel(`${defaultMonth}-01`)}</strong>
                      <span className="atlas-ledger-summary-help">Base padrão para novos lançamentos e leitura rápida.</span>
                    </div>
                    <div className="atlas-ledger-summary-item">
                      <span className="atlas-ledger-summary-label">Total no mês</span>
                      <strong className="atlas-ledger-summary-value">{currencyFormatter.format(currentMonthTotal)}</strong>
                      <span className="atlas-ledger-summary-help">{integerFormatter.format(activeMonthEntries)} lançamento(s) na competência ativa.</span>
                    </div>
                    <div className="atlas-ledger-summary-item">
                      <span className="atlas-ledger-summary-label">Categorias em uso</span>
                      <strong className="atlas-ledger-summary-value">{integerFormatter.format(activeMonthCategories)}</strong>
                      <span className="atlas-ledger-summary-help">Categorias que já movimentaram o mês atual.</span>
                    </div>
                  </div>

                  <div className="brandops-toolbar-panel atlas-ledger-toolbar atlas-ledger-toolbar-vertical" data-compact="true">
                    <div className="atlas-component-stack-tight">
                      <FormField label="Buscar">
                        <div className="brandops-input-shell">
                          <Search size={15} className="brandops-input-icon" />
                          <input
                            value={bookSearch}
                            onChange={(event) => setBookSearch(event.target.value)}
                            placeholder="Descrição ou categoria"
                            className="brandops-input brandops-input-leading"
                          />
                        </div>
                      </FormField>

                      <FormField label="Competência">
                        <select
                          value={bookMonthFilter}
                          onChange={(event) => setBookMonthFilter(event.target.value)}
                          className="brandops-input"
                        >
                          <option value="all">Todas as competências</option>
                          {monthlyLedger.map((row) => (
                            <option key={row.month} value={row.month}>
                              {formatCompetencyLabel(`${row.month}-01`)}
                            </option>
                          ))}
                        </select>
                      </FormField>

                      <FormField label="Categoria">
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
                      </FormField>

                      <StackItem
                        className="px-4 py-3 atlas-ledger-filter-card"
                        title="Recorte atual"
                        description={`${integerFormatter.format(bookEntries.length)} lançamento(s) no filtro.`}
                        aside={currencyFormatter.format(filteredBookTotal)}
                      />
                    </div>
                  </div>

                  <div className="atlas-ledger-pagination-card">
                    <p className="text-[11px] leading-[1.4rem] text-on-surface-variant">
                      {bookEntries.length
                        ? `Mostrando ${pageStartEntry}-${pageEndEntry} de ${integerFormatter.format(bookEntries.length)} lançamentos.`
                        : "Nenhum lançamento encontrado para os filtros atuais."}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="brandops-button brandops-button-ghost flex-1"
                        onClick={() => setCurrentBookPage((current) => Math.max(1, current - 1))}
                        disabled={currentBookPage === 1}
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        className="brandops-button brandops-button-ghost flex-1"
                        onClick={() => setCurrentBookPage((current) => Math.min(totalBookPages, current + 1))}
                        disabled={currentBookPage === totalBookPages}
                      >
                        Próxima
                      </button>
                    </div>
                    <span className="atlas-inline-metric w-full justify-center">
                      Página {currentBookPage} de {totalBookPages}
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </SurfaceCard>
      ) : (
        <div className="atlas-component-stack">
          <SurfaceCard>
            <div className="atlas-component-stack">
              <SectionHeading
                title="Catálogo de categorias"
                description="Cadastre novas categorias e ajuste o catálogo que sustenta a leitura do DRE."
                aside={
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="atlas-inline-metric">
                      {integerFormatter.format(expenseCategories.length)} categoria(s)
                    </span>
                    <button
                      type="button"
                      className="brandops-button brandops-button-primary"
                      onClick={openNewCategoryModal}
                    >
                      <Plus size={15} />
                      Nova categoria
                    </button>
                  </div>
                }
              />

              <OperationalMetricStrip baseColumns={1} desktopColumns={3}>
                <OperationalMetric
                  label="Categorias totais"
                  value={integerFormatter.format(expenseCategories.length)}
                  helper="Categorias disponíveis para alimentar o DRE."
                />
                <OperationalMetric
                  label="Ativas"
                  value={integerFormatter.format(expenseCategories.filter((category) => category.isActive).length)}
                  helper="Categorias disponíveis para novos lançamentos."
                  tone="positive"
                />
                <OperationalMetric
                  label="Categorias com uso"
                  value={integerFormatter.format(categorySummary.length)}
                  helper="Grupos que já apareceram em lançamentos."
                  tone="info"
                />
              </OperationalMetricStrip>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {expenseCategories.map((category) => (
                  <div
                    key={category.id}
                    className="atlas-list-row"
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
                            <EntityChip text={category.isActive ? "Ativa" : "Inativa"} />
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="brandops-button brandops-button-ghost"
                        onClick={() => openEditCategoryModal(category.id)}
                      >
                        <Pencil size={14} />
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SurfaceCard>
        </div>
      )}

      <AtlasModal
        open={isExpenseModalOpen}
        title={editingExpenseId ? "Editar lançamento" : "Novo lançamento"}
        description="Preencha a competência mensal, a categoria e a descrição. O valor alimenta diretamente o DRE."
        onClose={() => {
          setIsExpenseModalOpen(false);
          resetExpenseForm();
        }}
        mode="side"
      >
<form className="atlas-component-stack" onSubmit={handleExpenseSubmit}>
          <div className="grid gap-4">
            <FormField label="Categoria">
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
            </FormField>

            <FormField label="Descrição">
              <input
                value={expenseForm.description}
                onChange={(event) =>
                  setExpenseForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Ex.: Plataforma, frete administrativo, ferramenta"
                className="brandops-input w-full"
              />
            </FormField>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Valor">
                <input
                  value={expenseForm.amount}
                  onChange={(event) =>
                    setExpenseForm((current) => ({ ...current, amount: event.target.value }))
                  }
                  inputMode="decimal"
                  placeholder="0,00"
                  className="brandops-input w-full"
                />
              </FormField>

              <FormField label="Competência">
                <input
                  type="month"
                  value={expenseForm.month}
                  onChange={(event) =>
                    setExpenseForm((current) => ({ ...current, month: event.target.value }))
                  }
                  className="brandops-input w-full"
                />
              </FormField>
            </div>
          </div>

          <InlineNotice tone="info" className="text-sm text-on-surface-variant">
            Esse lançamento entra na competência do mês escolhido e aparece no DRE consolidado.
          </InlineNotice>

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
      </AtlasModal>

      <AtlasModal
        open={isCategoryModalOpen}
        title={editingCategoryId ? "Editar categoria" : "Nova categoria"}
        description="Use categorias curtas e claras para facilitar leitura mensal do DRE."
        onClose={() => {
          setIsCategoryModalOpen(false);
          resetCategoryForm();
        }}
        mode="center"
      >
<form className="atlas-component-stack" onSubmit={handleCategorySubmit}>
          <FormField label="Nome da categoria">
            <input
              value={categoryForm.name}
              onChange={(event) =>
                setCategoryForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Ex.: Ferramentas, Operação, Software"
              className="brandops-input w-full"
            />
          </FormField>

          <FormField label="Cor de apoio" hint="Usada como sinal visual auxiliar no catálogo de categorias.">
            <div className="atlas-list-row flex items-center gap-3 px-3 py-2">
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
          </FormField>

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
      </AtlasModal>

      <ProcessingOverlay
        open={Boolean(processingMessage)}
        title="Atualizando lançamentos"
        description={processingMessage ?? "Aguarde enquanto processamos a solicitação."}
      />
      <ActionToast message={toast?.message ?? null} tone={toast?.tone ?? "success"} />
    </div>
  );
}
