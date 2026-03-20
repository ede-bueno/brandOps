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
  createBrandIfNeeded,
  fetchAccessibleBrands,
  fetchBrandDataset,
  fetchUserProfile,
  importFilesToBrand,
  setCurrentCmv,
} from "@/lib/brandops/database";
import { supabase } from "@/lib/supabase";
import type { BrandDataset, UserProfile } from "@/lib/brandops/types";

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
  isLoading: boolean;
  setActiveBrandId: (brandId: string) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  importFiles: (brandName: string, files: File[]) => Promise<void>;
  saveCmvEntry: (brandId: string, productId: string, productName: string, unitCost: number) => Promise<void>;
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
  const userId = session?.user?.id ?? null;

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
      isLoading,
      setActiveBrandId,
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
      },
      saveCmvEntry: async (brandId, productId, _productName, unitCost) => {
        await setCurrentCmv(brandId, productId, unitCost);
        if (activeBrandId === brandId) {
          setActiveBrand(await fetchBrandDataset(brandId));
        }
      },
      refreshActiveBrand: async () => {
        if (!activeBrandId) {
          return;
        }
        setActiveBrand(await fetchBrandDataset(activeBrandId));
      },
    }),
    [activeBrand, activeBrandId, brands, isLoading, profile, session, userId],
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
