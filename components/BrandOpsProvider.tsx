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
  fetchDashboardKpis,
  fetchBrandDataset,
  fetchUserProfile,
  importFilesToBrand,
  saveCmvRule,
  setCurrentCmv,
  setMediaSanitizationState,
  setOrderSanitizationState,
  updateBrandExpense, 
  fetchDreMonthly
} from "@/lib/brandops/database";
import {
  buildPeriodRange,
  computeBrandMetrics,
  filterBrandDatasetByRange,
  getLatestDatasetDate,
  mergeDashboardSummary,
  getPeriodLabel,
  type AnalysisDateRange,
} from "@/lib/brandops/metrics";
import type { BrandSummaryMetrics } from "@/lib/brandops/types";
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

type DreMonthlyDataset = Array<Record<string, unknown>>;

interface BrandOpsContextValue {
  session: Session | null;
  profile: UserProfile | null;
  brands: BrandOption[];
  activeBrandId: string | null;
  activeBrand: BrandDataset | null;
  filteredBrand: BrandDataset | null;
  periodRange: AnalysisDateRange | null;
  dashboardMetrics: BrandSummaryMetrics | null;
  isMetricsLoading: boolean;
  dreMonthly: DreMonthlyDataset | null;
  isDreLoading: boolean;
  isLoading: boolean;
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dreMonthly, setDreMonthly] = useState<DreMonthlyDataset | null>(null);
  const [isDreLoading, setIsDreLoading] = useState(false);
  const [backendKpis, setBackendKpis] = useState<Record<string, number | null> | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("30d");
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({
    from: "",
    to: "",
  });
  const sessionUserIdRef = useRef<string | null>(null);
  const userId = session?.user?.id ?? null;
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

  const refreshBrandResources = useCallback(async (brandId: string) => {
    const dataset = await fetchBrandDataset(brandId);
    setActiveBrand(dataset);
  }, []);

  const refreshSummaryResources = useCallback(
    async (brandId: string) => {
      const [kpis, dreData] = await Promise.all([
        fetchDashboardKpis(brandId, periodRange?.start ?? null, periodRange?.end ?? null).catch(
          (error) => {
            console.error("Failed to load dashboard KPIs from backend:", error);
            return null;
          },
        ),
        fetchDreMonthly(brandId).catch((error) => {
          console.error("Failed to load DRE monthly from backend:", error);
          return null;
        }),
      ]);

      setBackendKpis(kpis);
      setDreMonthly(dreData);
    },
    [periodRange?.end, periodRange?.start],
  );

  const dashboardMetrics = useMemo(() => {
    const fallbackMetrics = filteredBrand ? computeBrandMetrics(filteredBrand) : null;
    return mergeDashboardSummary(backendKpis, fallbackMetrics);
  }, [backendKpis, filteredBrand]);

  useEffect(() => {
    async function loadDashboardMetrics() {
      if (!activeBrandId) {
        setBackendKpis(null);
        setDreMonthly(null);
        setIsMetricsLoading(false);
        setIsDreLoading(false);
        return;
      }

      setIsMetricsLoading(true);
      setIsDreLoading(true);
      try {
        await refreshSummaryResources(activeBrandId);
      } catch (error) {
        console.error("Failed to load dashboard KPIs from backend:", error);
        setBackendKpis(null);
        setDreMonthly(null);
      } finally {
        setIsMetricsLoading(false);
        setIsDreLoading(false);
      }
    }

    void loadDashboardMetrics();
  }, [activeBrandId, refreshSummaryResources]);

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
        setBackendKpis(null);
        setDreMonthly(null);
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
        setBackendKpis(null);
        setDreMonthly(null);
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
      setBackendKpis(null);
      setDreMonthly(null);
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
        setActiveBrand(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        await refreshBrandResources(activeBrandId);
        setErrorMessage(null);
      } catch (error) {
        console.error("Failed to load active brand dataset:", error);
        setActiveBrand(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os dados da marca.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadBrand();
  }, [activeBrandId, refreshBrandResources, userId]);

  useEffect(() => {
    if (typeof document === "undefined" || !userId || !activeBrandId) {
      return;
    }

    const reloadVisibleBrand = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

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
      dashboardMetrics,
      isMetricsLoading,
      dreMonthly,
      isDreLoading,
      isLoading,
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
        await refreshBrandResources(brandId);
        await refreshSummaryResources(brandId);
        setErrorMessage(null);
      },
      saveCmvEntry: async (brandId, productId, _productName, unitCost) => {
        await setCurrentCmv(brandId, productId, unitCost);
        if (activeBrandId === brandId) {
          await refreshBrandResources(brandId);
          await refreshSummaryResources(brandId);
        }
        setErrorMessage(null);
      },
      saveCmvRule: async (brandId, matchType, matchValue, matchLabel, unitCost, validFrom) => {
        await saveCmvRule(brandId, matchType, matchValue, matchLabel, unitCost, validFrom);
        if (activeBrandId === brandId) {
          await refreshBrandResources(brandId);
          await refreshSummaryResources(brandId);
        }
        setErrorMessage(null);
      },
      applyCmvCheckpoint: async (brandId, note, createdAt) => {
        await applyCmvCheckpoint(brandId, note, createdAt);
        if (activeBrandId === brandId) {
          await refreshBrandResources(brandId);
          await refreshSummaryResources(brandId);
        }
        setErrorMessage(null);
      },
      ignoreMediaRow: async (mediaRowId, reason) => {
        await setMediaSanitizationState(mediaRowId, "IGNORED", reason);
        if (activeBrandId) {
          await refreshBrandResources(activeBrandId);
          await refreshSummaryResources(activeBrandId);
        }
        setErrorMessage(null);
      },
      keepMediaRow: async (mediaRowId, reason) => {
        await setMediaSanitizationState(mediaRowId, "KEPT", reason);
        if (activeBrandId) {
          await refreshBrandResources(activeBrandId);
          await refreshSummaryResources(activeBrandId);
        }
        setErrorMessage(null);
      },
      restoreMediaRow: async (mediaRowId) => {
        await setMediaSanitizationState(mediaRowId, "PENDING");
        if (activeBrandId) {
          await refreshBrandResources(activeBrandId);
          await refreshSummaryResources(activeBrandId);
        }
        setErrorMessage(null);
      },
      ignoreOrder: async (brandId, orderNumber, reason) => {
        await setOrderSanitizationState(brandId, orderNumber, "IGNORED", reason);
        if (activeBrandId === brandId) {
          await refreshBrandResources(brandId);
          await refreshSummaryResources(brandId);
        }
        setErrorMessage(null);
      },
      keepOrder: async (brandId, orderNumber, reason) => {
        await setOrderSanitizationState(brandId, orderNumber, "KEPT", reason);
        if (activeBrandId === brandId) {
          await refreshBrandResources(brandId);
          await refreshSummaryResources(brandId);
        }
        setErrorMessage(null);
      },
      restoreOrder: async (brandId, orderNumber) => {
        await setOrderSanitizationState(brandId, orderNumber, "PENDING");
        if (activeBrandId === brandId) {
          await refreshBrandResources(brandId);
          await refreshSummaryResources(brandId);
        }
        setErrorMessage(null);
      },
      createExpenseCategory: async (brandId, name, color) => {
        await createExpenseCategory(brandId, name, color);
        if (activeBrandId === brandId) {
          await refreshBrandResources(brandId);
          await refreshSummaryResources(brandId);
        }
        setErrorMessage(null);
      },
      createExpense: async (brandId, categoryId, description, amount, incurredOn) => {
        if (!userId) {
          throw new Error("Você precisa estar autenticado para lançar despesas.");
        }
        await createBrandExpense(brandId, categoryId, description, amount, incurredOn, userId);
        if (activeBrandId === brandId) {
          await refreshBrandResources(brandId);
          await refreshSummaryResources(brandId);
        }
        setErrorMessage(null);
      },
      updateExpense: async (brandId, expenseId, categoryId, description, amount, incurredOn) => {
        await updateBrandExpense(expenseId, categoryId, description, amount, incurredOn);
        if (activeBrandId === brandId) {
          await refreshBrandResources(brandId);
          await refreshSummaryResources(brandId);
        }
        setErrorMessage(null);
      },
      deleteExpense: async (brandId, expenseId) => {
        await deleteBrandExpense(expenseId);
        if (activeBrandId === brandId) {
          await refreshBrandResources(brandId);
          await refreshSummaryResources(brandId);
        }
        setErrorMessage(null);
      },
      refreshActiveBrand: async () => {
        if (!activeBrandId) {
          return;
        }
        try {
          await refreshBrandResources(activeBrandId);
          await refreshSummaryResources(activeBrandId);
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
      dashboardMetrics,
      isMetricsLoading,
      dreMonthly,
      isDreLoading,
      handleSetActiveBrandId,
      isLoading,
      profile,
      customDateRange,
      selectedPeriod,
      session,
      userId,
      refreshBrandResources,
      refreshSummaryResources,
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
