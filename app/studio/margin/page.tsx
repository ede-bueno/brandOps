import type { Metadata } from "next";
import { ContributionMarginPageV3 } from "@/components/brandops-v3/ContributionMarginPageV3";

export const metadata: Metadata = {
  title: "BrandOps | Margem",
};

export default function StudioMarginPage() {
  return <ContributionMarginPageV3 />;
}
