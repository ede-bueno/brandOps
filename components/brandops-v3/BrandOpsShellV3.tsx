"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Menu, Sparkles } from "lucide-react";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  getStudioModule,
  getStudioNavItem,
} from "@/lib/brandops-v3/view-models";
import {
  BrandOpsGlyph,
  CommandPalette,
  StudioInspector,
  StudioLoading,
  StudioMobileNav,
  StudioModuleSubnavBar,
  StudioRail,
  StudioTopbar,
} from "./shell/BrandOpsShellParts";

export function BrandOpsShellV3({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/studio";
  const searchParams = useSearchParams();
  const { isLoading, session } = useBrandOps();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [isInspectorOpen, setIsInspectorOpen] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem("brandops.v3.inspector") === "open";
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRailCollapsed, setIsRailCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem("brandops.v3.rail") === "collapsed";
  });

  const activeModule = getStudioModule(pathname);
  const activeNav = useMemo(() => getStudioNavItem(activeModule), [activeModule]);
  const currentSearch = searchParams?.toString() ?? "";

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, router, session]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandQuery("");
        setIsCommandOpen(true);
        return;
      }

      if (event.key === "Escape") {
        setCommandQuery("");
        setIsCommandOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "brandops.v3.rail",
      isRailCollapsed ? "collapsed" : "expanded",
    );
  }, [isRailCollapsed]);

  useEffect(() => {
    window.localStorage.setItem(
      "brandops.v3.inspector",
      isInspectorOpen ? "open" : "closed",
    );
  }, [isInspectorOpen]);

  if (isLoading && !session) {
    return <StudioLoading />;
  }

  if (!session) {
    return null;
  }

  const openCommand = () => {
    setCommandQuery("");
    setIsCommandOpen(true);
  };

  const closeCommand = () => {
    setCommandQuery("");
    setIsCommandOpen(false);
  };

  return (
    <div
      className="brandops-v3"
      data-module={activeModule}
      data-accent={activeNav.accent}
      data-rail={isRailCollapsed ? "collapsed" : "expanded"}
    >
      <StudioRail
        pathname={pathname}
        isCollapsed={isRailCollapsed}
        onToggleCollapse={() => setIsRailCollapsed((current) => !current)}
      />
      <div className="v3-app-frame">
        <StudioTopbar
          onOpenCommand={openCommand}
          onOpenAtlas={() => setIsInspectorOpen(true)}
        />
        {activeModule !== "command" ? (
          <StudioModuleSubnavBar
            module={activeModule}
            pathname={pathname}
            currentSearch={currentSearch}
          />
        ) : null}
        <main className="v3-workspace">
          <div className="v3-mobile-heading">
            <button
              type="button"
              className="v3-icon-button"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              aria-label="Abrir navegação"
            >
              <Menu size={18} />
            </button>
            <span>{activeNav.label}</span>
            <button type="button" className="v3-atlas-button" onClick={() => setIsInspectorOpen(true)}>
              <Sparkles size={15} />
              Atlas
            </button>
          </div>
          {isMobileMenuOpen ? <StudioMobileNav pathname={pathname} /> : null}
          {children}
        </main>
      </div>
      <StudioInspector isOpen={isInspectorOpen} onClose={() => setIsInspectorOpen(false)} />
      <StudioMobileNav pathname={pathname} />
      <CommandPalette
        isOpen={isCommandOpen}
        query={commandQuery}
        onQueryChange={setCommandQuery}
        onClose={closeCommand}
        onOpenAtlas={() => setIsInspectorOpen(true)}
      />
    </div>
  );
}

export function V3ModuleChrome({
  eyebrow,
  title,
  description,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="v3-module-shell">
      <section className="v3-module-heading">
        <div>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {aside ? <div className="v3-module-aside">{aside}</div> : null}
      </section>
      {children}
    </div>
  );
}

export function V3EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="v3-empty-state">
      <BrandOpsGlyph />
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
