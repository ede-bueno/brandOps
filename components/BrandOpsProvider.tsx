"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { mergeBrandDataset, parseUploadedCsv } from "@/lib/brandops/csv";
import type { BrandDataset, CmvEntry, WorkspaceState } from "@/lib/brandops/types";

const STORAGE_KEY = "brandops-workspace-v1";

interface BrandOpsContextValue {
  brands: BrandDataset[];
  activeBrandId: string | null;
  activeBrand: BrandDataset | null;
  setActiveBrandId: (brandId: string) => void;
  importFiles: (brandName: string, files: File[]) => Promise<void>;
  saveCmvEntry: (brandId: string, productId: string, productName: string, unitCost: number) => void;
  removeBrand: (brandId: string) => void;
}

const BrandOpsContext = createContext<BrandOpsContextValue | null>(null);

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function BrandOpsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<WorkspaceState>(() => {
    if (typeof window === "undefined") {
      return {
        brands: [],
        activeBrandId: null,
      };
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        brands: [],
        activeBrandId: null,
      };
    }

    try {
      return JSON.parse(raw) as WorkspaceState;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return {
        brands: [],
        activeBrandId: null,
      };
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const activeBrand =
    state.brands.find((brand) => brand.id === state.activeBrandId) ?? null;

  const value = useMemo<BrandOpsContextValue>(
    () => ({
      brands: state.brands,
      activeBrandId: state.activeBrandId,
      activeBrand,
      setActiveBrandId: (brandId) => {
        setState((current) => ({ ...current, activeBrandId: brandId }));
      },
      importFiles: async (brandName, files) => {
        const normalizedName = brandName.trim();
        if (!normalizedName) {
          throw new Error("Informe o nome da marca para importar os arquivos.");
        }

        const brandId = slugify(normalizedName);
        let nextBrand =
          state.brands.find((brand) => brand.id === brandId) ??
          ({
            id: brandId,
            name: normalizedName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            files: {},
            catalog: [],
            paidOrders: [],
            salesLines: [],
            orderItems: [],
            media: [],
            cmvEntries: [],
          } satisfies BrandDataset);

        for (const file of files) {
          const parsed = await parseUploadedCsv(file);
          nextBrand = mergeBrandDataset(
            nextBrand,
            brandId,
            normalizedName,
            parsed.fileInfo,
            parsed.payload,
          );
        }

        startTransition(() => {
          setState((current) => {
            const brands = current.brands.filter((brand) => brand.id !== brandId);
            return {
              brands: [...brands, nextBrand].sort((a, b) =>
                a.name.localeCompare(b.name),
              ),
              activeBrandId: brandId,
            };
          });
        });
      },
      saveCmvEntry: (brandId, productId, productName, unitCost) => {
        setState((current) => ({
          ...current,
          brands: current.brands.map((brand) => {
            if (brand.id !== brandId) {
              return brand;
            }

            const nextEntry: CmvEntry = {
              productId,
              productName,
              unitCost,
              updatedAt: new Date().toISOString(),
            };
            const remaining = brand.cmvEntries.filter(
              (entry) => entry.productId !== productId,
            );

            return {
              ...brand,
              updatedAt: new Date().toISOString(),
              cmvEntries: [...remaining, nextEntry].sort((a, b) =>
                a.productName.localeCompare(b.productName),
              ),
            };
          }),
        }));
      },
      removeBrand: (brandId) => {
        setState((current) => {
          const brands = current.brands.filter((brand) => brand.id !== brandId);
          return {
            brands,
            activeBrandId:
              current.activeBrandId === brandId
                ? brands[0]?.id ?? null
                : current.activeBrandId,
          };
        });
      },
    }),
    [activeBrand, state.activeBrandId, state.brands],
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
