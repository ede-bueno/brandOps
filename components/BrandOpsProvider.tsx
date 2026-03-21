"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import {
  applyCmvCheckpoint,
  createBrandExpense,
  createExpenseCategory,
  createBrandIfNeeded,
  fetchAccessibleBrands,
  fetchBrandDataset,
  fetchUserProfile,
  importFilesToBrand,
  saveCmvRule,
  setCurrentCmv,
  setMediaIgnoreState,
  setOrderIgnoreState,
} from "@/lib/brandops/database";
import { filterBrandDatasetByPeriod, getPeriodLabel } from "@/lib/brandops/metrics";
import { supabase } from "@/lib/supabase";
import type { BrandDataset, CmvMatchType, PeriodFilter, UserProfile } from "@/lib/brandops/types";

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
  isLoading: boolean;
  errorMessage: string | null;
  selectedPeriod: PeriodFilter;
  selectedPeriodLabel: string;
  setActiveBrandId: (brandId: string) => void;
  setSelectedPeriod: (period: PeriodFilter) => void;
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
  applyCmvCheckpoint: (brandId: string, note?: string) => Promise<void>;
  ignoreMediaRow: (mediaRowId: string, reason?: string) => Promise<void>;
  restoreMediaRow: (mediaRowId: string) => Promise<void>;
  ignoreOrder: (brandId: string, orderNumber: string, reason?: string) => Promise<void>;
  restoreOrder: (brandId: string, orderNumber: string) => Promise<void>;
  createExpenseCategory: (brandId: string, name: string, color?: string) => Promise<void>;
  createExpense: (
    brandId: string,
    categoryId: string,
    description: string,
    amount: number,
    incurredOn: string,
  ) => Promise<void>;
  refreshActiveBrand: () => Promise<void>;
}

const BrandOpsContext = createContext<BrandOpsContextValue | null>(null);

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
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("30d");
  const userId = session?.user?.id ?? null;
  const filteredBrand = activeBrand
    ? filterBrandDatasetByPeriod(activeBrand, selectedPeriod)
    : null;

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }
      setSession(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
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
        setErrorMessage(null);
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
          if (current && nextBrands.some((brand) => brand.id === current)) {
            return current;
          }
          return nextBrands[0]?.id ?? null;
        });
        setErrorMessage(null);
      } catch (error) {
        setProfile(null);
        setBrands([]);
        setActiveBrandId(null);
        setActiveBrand(null);
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
    async function loadBrand() {
      if (!userId || !activeBrandId) {
        setActiveBrand(null);
        return;
      }

      setIsLoading(true);
      try {
        const dataset = await fetchBrandDataset(activeBrandId);
        setActiveBrand(dataset);
        setErrorMessage(null);
      } catch (error) {
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
  }, [activeBrandId, userId]);

  const value = useMemo<BrandOpsContextValue>(
    () => ({
      session,
      profile,
      brands,
      activeBrandId,
      activeBrand,
      filteredBrand,
      isLoading,
      errorMessage,
      selectedPeriod,
      selectedPeriodLabel: getPeriodLabel(selectedPeriod),
      setActiveBrandId,
      setSelectedPeriod,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }
      },
      signOut: async () => {
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
        setActiveBrand(await fetchBrandDataset(brandId));
        setErrorMessage(null);
      },
      saveCmvEntry: async (brandId, productId, _productName, unitCost) => {
        await setCurrentCmv(brandId, productId, unitCost);
        if (activeBrandId === brandId) {
          setActiveBrand(await fetchBrandDataset(brandId));
        }
        setErrorMessage(null);
      },
      saveCmvRule: async (brandId, matchType, matchValue, matchLabel, unitCost, validFrom) => {
        await saveCmvRule(brandId, matchType, matchValue, matchLabel, unitCost, validFrom);
        if (activeBrandId === brandId) {
          setActiveBrand(await fetchBrandDataset(brandId));
        }
        setErrorMessage(null);
      },
      applyCmvCheckpoint: async (brandId, note) => {
        await applyCmvCheckpoint(brandId, note);
        if (activeBrandId === brandId) {
          setActiveBrand(await fetchBrandDataset(brandId));
        }
        setErrorMessage(null);
      },
      ignoreMediaRow: async (mediaRowId, reason) => {
        await setMediaIgnoreState(mediaRowId, true, reason);
        if (activeBrandId) {
          setActiveBrand(await fetchBrandDataset(activeBrandId));
        }
        setErrorMessage(null);
      },
      restoreMediaRow: async (mediaRowId) => {
        await setMediaIgnoreState(mediaRowId, false);
        if (activeBrandId) {
          setActiveBrand(await fetchBrandDataset(activeBrandId));
        }
        setErrorMessage(null);
      },
      ignoreOrder: async (brandId, orderNumber, reason) => {
        await setOrderIgnoreState(brandId, orderNumber, true, reason);
        if (activeBrandId === brandId) {
          setActiveBrand(await fetchBrandDataset(brandId));
        }
        setErrorMessage(null);
      },
      restoreOrder: async (brandId, orderNumber) => {
        await setOrderIgnoreState(brandId, orderNumber, false);
        if (activeBrandId === brandId) {
          setActiveBrand(await fetchBrandDataset(brandId));
        }
        setErrorMessage(null);
      },
      createExpenseCategory: async (brandId, name, color) => {
        await createExpenseCategory(brandId, name, color);
        if (activeBrandId === brandId) {
          setActiveBrand(await fetchBrandDataset(brandId));
        }
        setErrorMessage(null);
      },
      createExpense: async (brandId, categoryId, description, amount, incurredOn) => {
        if (!userId) {
          throw new Error("Você precisa estar autenticado para lançar despesas.");
        }
        await createBrandExpense(brandId, categoryId, description, amount, incurredOn, userId);
        if (activeBrandId === brandId) {
          setActiveBrand(await fetchBrandDataset(brandId));
        }
        setErrorMessage(null);
      },
      refreshActiveBrand: async () => {
        if (!activeBrandId) {
          return;
        }
        try {
          setActiveBrand(await fetchBrandDataset(activeBrandId));
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
      isLoading,
      profile,
      selectedPeriod,
      session,
      userId,
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
