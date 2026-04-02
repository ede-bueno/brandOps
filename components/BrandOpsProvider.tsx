"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import {
  applyCmvCheckpoint,
  createBrandExpense,
  createExpenseCategory,
  createBrandIfNeeded,
  deleteBrandExpense,
  fetchAccessibleBrands,
  fetchBrandDataset,
  fetchFinancialReport,
  fetchUserProfile,
  importFilesToBrand,
  saveCmvRule,
  setCurrentCmv,
  setMediaSanitizationState,
  setOrderSanitizationState,
  updateExpenseCategory as updateExpenseCategoryRecord,
  updateBrandExpense,
} from "@/lib/brandops/database";
import {
  buildPeriodRange,
  filterBrandDatasetByRange,
  getLatestDatasetDate,
  getPeriodLabel,
  type AnalysisDateRange,
} from "@/lib/brandops/metrics";
import type { AnnualDreReport } from "@/lib/brandops/types";
import { supabase } from "@/lib/supabase";
import type {
  BrandDataset,
  CmvMatchType,
  CustomDateRange,
  PeriodFilter,
  UserProfile,
} from "@/lib/brandops/types";

type BrandOption = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

interface BrandOpsContextValue {
  session: Session | null;
  profile: UserProfile | null;
  brands: BrandOption[];
  activeBrandId: string | null;
  activeBrand: BrandDataset | null;
  filteredBrand: BrandDataset | null;
  periodRange: AnalysisDateRange | null;
  financialReportFiltered: AnnualDreReport | null;
  financialReportHistorical: AnnualDreReport | null;
  isMetricsLoading: boolean;
  isDreLoading: boolean;
  isLoading: boolean;
  isBrandHydrating: boolean;
  errorMessage: string | null;
  selectedPeriod: PeriodFilter;
  selectedPeriodLabel: string;
  customDateRange: CustomDateRange;
  setActiveBrandId: (brandId: string) => void;
  setSelectedPeriod: (period: PeriodFilter) => void;
  setCustomDateRange: (range: CustomDateRange) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  importFiles: (brandName: string, files: File[]) => Promise<void>;
  saveCmvEntry: (brandId: string, productId: string, productName: string, unitCost: number) => Promise<void>;
  saveCmvRule: (
    brandId: string,
    matchType: CmvMatchType,
    matchValue: string,
    matchLabel: string,
    unitCost: number,
    validFrom?: string,
  ) => Promise<void>;
  applyCmvCheckpoint: (brandId: string, note?: string, createdAt?: string) => Promise<void>;

  ignoreMediaRow: (mediaRowId: string, reason?: string) => Promise<void>;
  keepMediaRow: (mediaRowId: string, reason?: string) => Promise<void>;
  restoreMediaRow: (mediaRowId: string) => Promise<void>;
  ignoreOrder: (brandId: string, orderNumber: string, reason?: string) => Promise<void>;
  keepOrder: (brandId: string, orderNumber: string, reason?: string) => Promise<void>;
  restoreOrder: (brandId: string, orderNumber: string) => Promise<void>;
  createExpenseCategory: (brandId: string, name: string, color?: string) => Promise<void>;
  updateExpenseCategory: (
    brandId: string,
    categoryId: string,
    name: string,
    color: string,
  ) => Promise<void>;
  createExpense: (
    brandId: string,
    categoryId: string,
    description: string,
    amount: number,
    incurredOn: string,
  ) => Promise<void>;
  updateExpense: (
    brandId: string,
    expenseId: string,
    categoryId: string,
    description: string,
    amount: number,
    incurredOn: string,
  ) => Promise<void>;
  deleteExpense: (brandId: string, expenseId: string) => Promise<void>;
  refreshActiveBrand: () => Promise<void>;
}

const BrandOpsContext = createContext<BrandOpsContextValue | null>(null);

function getBrandContextStorageKey(userId: string) {
  return `brandops.active-brand.${userId}`;
}

export function BrandOpsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<BrandDataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBrandHydrating, setIsBrandHydrating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [financialReportHistorical, setFinancialReportHistorical] = useState<AnnualDreReport | null>(null);
  const [financialReportFiltered, setFinancialReportFiltered] = useState<AnnualDreReport | null>(null);
  const [isFinancialReportLoading, setIsFinancialReportLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("30d");
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({
    from: "",
    to: "",
  });
  const sessionUserIdRef = useRef<string | null>(null);
  const activeBrandIdRef = useRef<string | null>(null);
  const brandLoadRequestRef = useRef(0);
  const summaryLoadRequestRef = useRef(0);
  const dreLoadRequestRef = useRef(0);
  const lastVisibleRefreshRef = useRef(0);
  const fullHydrationTimerRef = useRef<number | null>(null);
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    activeBrandIdRef.current = activeBrandId;
  }, [activeBrandId]);

  const periodReferenceDate = useMemo(() => {
    if (!activeBrand) {
      return null;
    }

    if (selectedPeriod === "all") {
      return null;
    }

    if (selectedPeriod === "custom") {
      return getLatestDatasetDate(activeBrand) ?? new Date();
    }

    return new Date();
  }, [activeBrand, selectedPeriod]);

  const periodRange = useMemo(
    () =>
      periodReferenceDate
        ? buildPeriodRange(periodReferenceDate, selectedPeriod, customDateRange)
        : null,
    [customDateRange, periodReferenceDate, selectedPeriod],
  );

  const filteredBrand = useMemo(
    () => (activeBrand ? filterBrandDatasetByRange(activeBrand, periodRange) : null),
    [activeBrand, periodRange],
  );

  const refreshBrandResources = useCallback(async (
    brandId: string,
    scope: "core" | "full" = "core",
  ) => {
    const dataset = await fetchBrandDataset(brandId, { scope });
    if (activeBrandIdRef.current === brandId) {
      setActiveBrand(dataset);
    }
    return dataset;
  }, []);

  const cancelScheduledFullHydration = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (fullHydrationTimerRef.current !== null) {
      window.clearTimeout(fullHydrationTimerRef.current);
      fullHydrationTimerRef.current = null;
    }
  }, []);

  const scheduleFullHydration = useCallback(
    (brandId: string, requestId: number) => {
      if (typeof window === "undefined") {
        return;
      }

      cancelScheduledFullHydration();
      fullHydrationTimerRef.current = window.setTimeout(async () => {
        try {
          await refreshBrandResources(brandId, "full");
        } catch (error) {
          console.error("Failed to hydrate auxiliary brand dataset:", error);
        } finally {
          if (brandLoadRequestRef.current === requestId) {
            setIsBrandHydrating(false);
          }
          fullHydrationTimerRef.current = null;
        }
      }, 250);
    },
    [cancelScheduledFullHydration, refreshBrandResources],
  );

  const refreshFilteredFinancialReport = useCallback(
    async (brandId: string) => {
      const report = await fetchFinancialReport(
        brandId,
        periodRange?.start ?? null,
        periodRange?.end ?? null,
      ).catch((error) => {
        console.error("Failed to load filtered financial report from backend:", error);
        return null;
      });

      if (activeBrandIdRef.current === brandId) {
        setFinancialReportFiltered(report);
      }
    },
    [periodRange?.end, periodRange?.start],
  );

  const refreshHistoricalFinancialReport = useCallback(async (brandId: string) => {
    const report = await fetchFinancialReport(brandId).catch((error) => {
      console.error("Failed to load historical financial report from backend:", error);
      return null;
    });

    if (activeBrandIdRef.current === brandId) {
      setFinancialReportHistorical(report);
    }
  }, []);

  const refreshSummaryResources = useCallback(
    async (brandId: string, options?: { includeHistorical?: boolean }) => {
      await refreshFilteredFinancialReport(brandId);
      if (options?.includeHistorical) {
        await refreshHistoricalFinancialReport(brandId);
      }
    },
    [refreshFilteredFinancialReport, refreshHistoricalFinancialReport],
  );

  const applyOptimisticSanitizationDecision = useCallback(
    (
      target: "MEDIA" | "ORDER",
      targetId: string,
      status: "PENDING" | "KEPT" | "IGNORED",
      note?: string,
    ) => {
      const reviewedAt = new Date().toISOString();
      const sanitizedAt = status === "PENDING" ? null : reviewedAt;
      const nextNote = status === "PENDING" ? null : note?.trim() || null;

      setActiveBrand((current) => {
        if (!current) {
          return current;
        }

        const currentMediaRow = current.media.find((row) => row.id === targetId);
        const currentOrder = current.paidOrders.find(
          (order) => order.id === targetId || order.orderNumber === targetId,
        );

        const media =
          target === "MEDIA"
            ? current.media.map((row) => {
                if (row.id !== targetId) {
                  return row;
                }

                return {
                  ...row,
                  isIgnored: status === "IGNORED",
                  ignoreReason: status === "IGNORED" ? nextNote : null,
                  sanitizationStatus: status,
                  sanitizationNote: nextNote,
                  sanitizedAt,
                  sanitizedBy: status === "PENDING" ? null : userId,
                };
              })
            : current.media;

        const paidOrders =
          target === "ORDER"
            ? current.paidOrders.map((order) => {
                if (order.id !== targetId && order.orderNumber !== targetId) {
                  return order;
                }

                return {
                  ...order,
                  isIgnored: status === "IGNORED",
                  ignoreReason: status === "IGNORED" ? nextNote : null,
                  sanitizationStatus: status,
                  sanitizationNote: nextNote,
                  sanitizedAt,
                  sanitizedBy: status === "PENDING" ? null : userId,
                };
              })
            : current.paidOrders;

        const orderItems =
          target === "ORDER"
            ? current.orderItems.map((item) =>
                item.orderNumber === (currentOrder?.orderNumber ?? targetId)
                  ? {
                      ...item,
                      isIgnored: status === "IGNORED",
                      ignoreReason: status === "IGNORED" ? nextNote : null,
                    }
                  : item,
              )
            : current.orderItems;

        const salesLines =
          target === "ORDER"
            ? current.salesLines.map((line) =>
                line.orderNumber === (currentOrder?.orderNumber ?? targetId)
                  ? {
                      ...line,
                      isIgnored: status === "IGNORED",
                      ignoreReason: status === "IGNORED" ? nextNote : null,
                    }
                  : line,
              )
            : current.salesLines;

        const sourceTable = target === "MEDIA" ? "media_performance" : "orders";
        const sourceKey =
          target === "MEDIA"
            ? currentMediaRow?.rowHash ?? null
            : currentOrder?.orderNumber ?? null;
        const sourceRowId =
          target === "MEDIA" ? currentMediaRow?.id ?? targetId : currentOrder?.id ?? targetId;

        return {
          ...current,
          media,
          paidOrders,
          orderItems,
          salesLines,
          sanitizationReviews: [
            {
              id: `optimistic-${target.toLowerCase()}-${sourceRowId}-${Date.now()}`,
              sourceTable,
              sourceRowId,
              sourceKey,
              anomalyType: "sanitization_state",
              action: status,
              reason: nextNote,
              reviewedBy: userId,
              reviewedAt,
            },
            ...current.sanitizationReviews.filter(
              (review) =>
                !(
                  review.id.startsWith("optimistic-") &&
                  review.sourceTable === sourceTable &&
                  (review.sourceRowId === sourceRowId ||
                    (sourceKey !== null && review.sourceKey === sourceKey))
                ),
            ),
          ],
        };
      });
    },
    [userId],
  );

  const refreshAfterMutation = useCallback(
    (brandId: string, includeDataset = true, includeHistorical = true) => {
      void (async () => {
        try {
          if (includeDataset) {
            await refreshBrandResources(brandId);
          }

          await refreshSummaryResources(brandId, { includeHistorical });
          setErrorMessage(null);
        } catch (error) {
          console.error("Failed to refresh brand data after mutation:", error);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível atualizar os dados da marca.",
          );
        }
      })();
    },
    [refreshBrandResources, refreshSummaryResources],
  );

  const isMetricsLoading = isFinancialReportLoading;
  const isDreLoading = isFinancialReportLoading;

  useEffect(() => {
    async function loadFilteredFinancialReport() {
      if (!activeBrandId) {
        setFinancialReportFiltered(null);
        setIsFinancialReportLoading(false);
        return;
      }

      const requestId = ++summaryLoadRequestRef.current;
      setIsFinancialReportLoading(true);
      try {
        await refreshFilteredFinancialReport(activeBrandId);
      } catch (error) {
        console.error("Failed to load filtered financial report from backend:", error);
        if (summaryLoadRequestRef.current === requestId) {
          setFinancialReportFiltered(null);
        }
      } finally {
        if (summaryLoadRequestRef.current === requestId) {
          setIsFinancialReportLoading(false);
        }
      }
    }

    void loadFilteredFinancialReport();
  }, [activeBrandId, refreshFilteredFinancialReport]);

  useEffect(() => {
    async function loadHistoricalFinancialReport() {
      if (!activeBrandId) {
        setFinancialReportHistorical(null);
        return;
      }

      const requestId = ++dreLoadRequestRef.current;
      try {
        await refreshHistoricalFinancialReport(activeBrandId);
      } catch (error) {
        console.error("Failed to load historical financial report from backend:", error);
        if (dreLoadRequestRef.current === requestId) {
          setFinancialReportHistorical(null);
        }
      }
    }

    void loadHistoricalFinancialReport();
  }, [activeBrandId, refreshHistoricalFinancialReport]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }
      sessionUserIdRef.current = data.session?.user?.id ?? null;
      setSession(data.session);
      setIsLoading(Boolean(data.session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const previousUserId = sessionUserIdRef.current;
      const nextUserId = nextSession?.user?.id ?? null;
      sessionUserIdRef.current = nextUserId;
      setSession(nextSession);

      if (!nextSession) {
        setIsLoading(false);
        return;
      }

      if (previousUserId !== nextUserId) {
        setIsLoading(true);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function loadWorkspace() {
      if (!userId) {
        setProfile(null);
        setBrands([]);
        setActiveBrandId(null);
        setActiveBrand(null);
        setIsBrandHydrating(false);
        setFinancialReportFiltered(null);
        setFinancialReportHistorical(null);
        setErrorMessage(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [nextProfile, nextBrands] = await Promise.all([
          fetchUserProfile(userId),
          fetchAccessibleBrands(),
        ]);

        setProfile(nextProfile);
        setBrands(nextBrands);
        setActiveBrandId((current) => {
          const storedBrandId =
            typeof window !== "undefined" && userId
              ? window.localStorage.getItem(getBrandContextStorageKey(userId))
              : null;

          if (current && nextBrands.some((brand) => brand.id === current)) {
            return current;
          }
          if (storedBrandId && nextBrands.some((brand) => brand.id === storedBrandId)) {
            return storedBrandId;
          }
          if (nextProfile.role === "SUPER_ADMIN") {
            return null;
          }
          return nextBrands[0]?.id ?? null;
        });

        setErrorMessage(null);
      } catch (error) {
        console.error("Failed to load workspace:", error);
        setProfile(null);
        setBrands([]);
        setActiveBrandId(null);
        setActiveBrand(null);
        setFinancialReportFiltered(null);
        setFinancialReportHistorical(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o workspace.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadWorkspace();
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined" || !userId) {
      return;
    }

    if (activeBrandId) {
      window.localStorage.setItem(getBrandContextStorageKey(userId), activeBrandId);
    }
  }, [activeBrandId, userId]);

  const handleSetActiveBrandId = useCallback(
    (brandId: string) => {
      setIsLoading(true);
      setActiveBrand(null);
      setIsBrandHydrating(true);
      setFinancialReportFiltered(null);
      setFinancialReportHistorical(null);
      setActiveBrandId(brandId);
      if (typeof window !== "undefined" && userId) {
        window.localStorage.setItem(getBrandContextStorageKey(userId), brandId);
      }
    },
    [userId],
  );

  useEffect(() => {
      async function loadBrand() {
        if (!userId || !activeBrandId) {
          cancelScheduledFullHydration();
          setActiveBrand(null);
          setIsBrandHydrating(false);
          setIsLoading(false);
        return;
      }

        const requestId = ++brandLoadRequestRef.current;
        cancelScheduledFullHydration();
        setIsLoading(true);
        setIsBrandHydrating(true);
        try {
          if (brandLoadRequestRef.current === requestId) {
            await refreshBrandResources(activeBrandId, "core");
            setErrorMessage(null);
            setIsLoading(false);
          }

          scheduleFullHydration(activeBrandId, requestId);
        } catch (error) {
          console.error("Failed to load active brand dataset:", error);
          if (brandLoadRequestRef.current === requestId) {
          setActiveBrand(null);
          setIsBrandHydrating(false);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os dados da marca.",
          );
        }
      } finally {
        if (brandLoadRequestRef.current === requestId && !activeBrandIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    void loadBrand();
    }, [activeBrandId, cancelScheduledFullHydration, refreshBrandResources, scheduleFullHydration, userId]);

  useEffect(() => {
    return () => {
      cancelScheduledFullHydration();
    };
  }, [cancelScheduledFullHydration]);

  useEffect(() => {
    if (typeof document === "undefined" || !userId || !activeBrandId) {
      return;
    }

    const reloadVisibleBrand = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      const now = Date.now();
      if (now - lastVisibleRefreshRef.current < 45_000) {
        return;
      }
      lastVisibleRefreshRef.current = now;

      void refreshSummaryResources(activeBrandId)
        .then(() => {
          setErrorMessage(null);
        })
        .catch((error) => {
          console.error("Failed to refresh visible brand summaries:", error);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível atualizar os dados da marca.",
          );
        });
    };

    document.addEventListener("visibilitychange", reloadVisibleBrand);
    window.addEventListener("focus", reloadVisibleBrand);

    return () => {
      document.removeEventListener("visibilitychange", reloadVisibleBrand);
      window.removeEventListener("focus", reloadVisibleBrand);
    };
  }, [activeBrandId, refreshSummaryResources, userId]);

  const value = useMemo<BrandOpsContextValue>(
    () => ({
      session,
      profile,
      brands,
      activeBrandId,
      activeBrand,
      filteredBrand,
      periodRange,
      financialReportFiltered,
      financialReportHistorical,
      isMetricsLoading,
      isDreLoading,
      isLoading,
      isBrandHydrating,
      errorMessage,
      selectedPeriod,
      selectedPeriodLabel: getPeriodLabel(selectedPeriod, customDateRange),
      customDateRange,
      setActiveBrandId: handleSetActiveBrandId,
      setSelectedPeriod,
      setCustomDateRange,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }
      },
      signOut: async () => {
        if (typeof window !== "undefined" && userId) {
          window.localStorage.removeItem(getBrandContextStorageKey(userId));
        }
        const { error } = await supabase.auth.signOut();
        if (error) {
          throw error;
        }
      },
      importFiles: async (brandName, files) => {
        if (!userId) {
          throw new Error("Você precisa estar autenticado para importar.");
        }

        const brandId = await createBrandIfNeeded(brandName, brands);
        await importFilesToBrand(brandId, files, userId);
        const refreshedBrands = await fetchAccessibleBrands();
        setBrands(refreshedBrands);
        setActiveBrandId(brandId);
        await refreshBrandResources(brandId, "full");
        await refreshSummaryResources(brandId, { includeHistorical: true });
        setErrorMessage(null);
      },
      saveCmvEntry: async (brandId, productId, _productName, unitCost) => {
        await setCurrentCmv(brandId, productId, unitCost);
        if (activeBrandId === brandId) {
          await refreshBrandResources(brandId, "full");
          await refreshSummaryResources(brandId, { includeHistorical: true });
        }
        setErrorMessage(null);
      },
      saveCmvRule: async (brandId, matchType, matchValue, matchLabel, unitCost, validFrom) => {
        await saveCmvRule(brandId, matchType, matchValue, matchLabel, unitCost, validFrom);
        if (activeBrandId === brandId) {
          await refreshBrandResources(brandId, "full");
          await refreshSummaryResources(brandId, { includeHistorical: true });
        }
        setErrorMessage(null);
      },
      applyCmvCheckpoint: async (brandId, note, createdAt) => {
        await applyCmvCheckpoint(brandId, note, createdAt);
        if (activeBrandId === brandId) {
          await refreshBrandResources(brandId, "full");
          await refreshSummaryResources(brandId, { includeHistorical: true });
        }
        setErrorMessage(null);
      },
      ignoreMediaRow: async (mediaRowId, reason) => {
        await setMediaSanitizationState(mediaRowId, "IGNORED", reason);
        if (activeBrandId) {
          applyOptimisticSanitizationDecision("MEDIA", mediaRowId, "IGNORED", reason);
          refreshAfterMutation(activeBrandId);
        }
        setErrorMessage(null);
      },
      keepMediaRow: async (mediaRowId, reason) => {
        await setMediaSanitizationState(mediaRowId, "KEPT", reason);
        if (activeBrandId) {
          applyOptimisticSanitizationDecision("MEDIA", mediaRowId, "KEPT", reason);
          refreshAfterMutation(activeBrandId);
        }
        setErrorMessage(null);
      },
      restoreMediaRow: async (mediaRowId) => {
        await setMediaSanitizationState(mediaRowId, "PENDING");
        if (activeBrandId) {
          applyOptimisticSanitizationDecision("MEDIA", mediaRowId, "PENDING");
          refreshAfterMutation(activeBrandId);
        }
        setErrorMessage(null);
      },
      ignoreOrder: async (brandId, orderNumber, reason) => {
        await setOrderSanitizationState(brandId, orderNumber, "IGNORED", reason);
        if (activeBrandId === brandId) {
          applyOptimisticSanitizationDecision("ORDER", orderNumber, "IGNORED", reason);
          refreshAfterMutation(brandId);
        }
        setErrorMessage(null);
      },
      keepOrder: async (brandId, orderNumber, reason) => {
        await setOrderSanitizationState(brandId, orderNumber, "KEPT", reason);
        if (activeBrandId === brandId) {
          applyOptimisticSanitizationDecision("ORDER", orderNumber, "KEPT", reason);
          refreshAfterMutation(brandId);
        }
        setErrorMessage(null);
      },
      restoreOrder: async (brandId, orderNumber) => {
        await setOrderSanitizationState(brandId, orderNumber, "PENDING");
        if (activeBrandId === brandId) {
          applyOptimisticSanitizationDecision("ORDER", orderNumber, "PENDING");
          refreshAfterMutation(brandId);
        }
        setErrorMessage(null);
      },
      createExpenseCategory: async (brandId, name, color) => {
        await createExpenseCategory(brandId, name, color);
        if (activeBrandId === brandId) {
          await refreshBrandResources(brandId, "core");
          await refreshSummaryResources(brandId, { includeHistorical: true });
        }
        setErrorMessage(null);
      },
      updateExpenseCategory: async (brandId, categoryId, name, color) => {
        await updateExpenseCategoryRecord(categoryId, name, color);
        if (activeBrandId === brandId) {
          await refreshBrandResources(brandId, "core");
        }
        setErrorMessage(null);
      },
      createExpense: async (brandId, categoryId, description, amount, incurredOn) => {
        if (!userId) {
          throw new Error("Você precisa estar autenticado para lançar despesas.");
        }
        await createBrandExpense(brandId, categoryId, description, amount, incurredOn, userId);
        if (activeBrandId === brandId) {
          await refreshBrandResources(brandId, "core");
          await refreshSummaryResources(brandId, { includeHistorical: true });
        }
        setErrorMessage(null);
      },
      updateExpense: async (brandId, expenseId, categoryId, description, amount, incurredOn) => {
        await updateBrandExpense(expenseId, categoryId, description, amount, incurredOn);
        if (activeBrandId === brandId) {
          await refreshBrandResources(brandId, "core");
          await refreshSummaryResources(brandId, { includeHistorical: true });
        }
        setErrorMessage(null);
      },
      deleteExpense: async (brandId, expenseId) => {
        await deleteBrandExpense(expenseId);
        if (activeBrandId === brandId) {
          await refreshBrandResources(brandId, "core");
          await refreshSummaryResources(brandId, { includeHistorical: true });
        }
        setErrorMessage(null);
      },
      refreshActiveBrand: async () => {
        if (!activeBrandId) {
          return;
        }
        try {
          await refreshBrandResources(activeBrandId, "full");
          await refreshSummaryResources(activeBrandId, { includeHistorical: true });
          setErrorMessage(null);
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível atualizar os dados da marca.",
          );
        }
      },
    }),
    [
      activeBrand,
      activeBrandId,
      brands,
      errorMessage,
      filteredBrand,
      periodRange,
      financialReportFiltered,
      financialReportHistorical,
      isMetricsLoading,
      isDreLoading,
      handleSetActiveBrandId,
      isBrandHydrating,
      isLoading,
      profile,
      customDateRange,
      selectedPeriod,
      session,
      userId,
      refreshBrandResources,
      refreshSummaryResources,
      applyOptimisticSanitizationDecision,
      refreshAfterMutation,
    ],
  );

  return (
    <BrandOpsContext.Provider value={value}>{children}</BrandOpsContext.Provider>
  );
}

export function useBrandOps() {
  const context = useContext(BrandOpsContext);
  if (!context) {
    throw new Error("useBrandOps deve ser usado dentro de BrandOpsProvider.");
  }
  return context;
}
