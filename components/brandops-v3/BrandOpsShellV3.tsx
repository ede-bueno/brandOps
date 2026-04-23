"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CalendarRange,
  Check,
  ChevronDown,
  Loader2,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  getStudioModule,
  getStudioNavItem,
  studioCommandItems,
  studioModuleSubnav,
  studioNavItems,
} from "@/lib/brandops-v3/view-models";
import type { CustomDateRange, PeriodFilter } from "@/lib/brandops/types";

const periodOptions: Array<{ value: PeriodFilter; label: string; shortLabel?: string }> = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "14d", label: "14 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Mês atual" },
  { value: "year", label: "Ano atual" },
  { value: "lastMonth", label: "Mês passado" },
  { value: "all", label: "Todo o período", shortLabel: "Tudo" },
  { value: "custom", label: "Período livre", shortLabel: "Livre" },
];

function BrandOpsGlyph() {
  return (
    <div className="v3-brand-glyph" aria-hidden="true">
      <span />
      <span />
    </div>
  );
}

function V3ThemeToggle() {
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const nextTheme = isDark ? "light" : "dark";
    const html = document.documentElement;
    html.classList.remove("light", "dark");
    html.classList.add(nextTheme);
    html.dataset.theme = nextTheme;
    localStorage.setItem("atlas.theme", nextTheme);
  };

  return (
    <button
      type="button"
      className="v3-icon-button"
      onClick={toggleTheme}
      aria-label="Alternar tema"
    >
      <Moon className="v3-theme-icon-light" size={17} />
      <Sun className="v3-theme-icon-dark" size={17} />
    </button>
  );
}

function V3PeriodMenu({
  open,
  selectedPeriod,
  selectedPeriodLabel,
  customDateRange,
  onToggle,
  onClose,
  onSelectPeriod,
  onChangeCustomDateRange,
}: {
  open: boolean;
  selectedPeriod: PeriodFilter;
  selectedPeriodLabel: string;
  customDateRange: CustomDateRange;
  onToggle: () => void;
  onClose: () => void;
  onSelectPeriod: (period: PeriodFilter) => void;
  onChangeCustomDateRange: (next: CustomDateRange) => void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  return (
    <div ref={menuRef} className="v3-period-shell">
      <button
        type="button"
        className="v3-period-trigger"
        onClick={onToggle}
        aria-expanded={open}
        aria-label="Abrir filtro de recorte"
      >
        <CalendarRange size={14} />
        <span>
          <small>Recorte</small>
          <strong>{selectedPeriodLabel}</strong>
        </span>
        <ChevronDown size={14} />
      </button>

      {open ? (
        <div className="v3-period-menu">
          <div className="v3-period-menu-head">
            <div>
              <span>Recorte</span>
              <strong>{selectedPeriodLabel}</strong>
            </div>
            <CalendarRange size={14} />
          </div>
          <div className="v3-period-grid">
            {periodOptions.map((option) => {
              const isActive = selectedPeriod === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className="v3-period-option"
                  data-active={isActive}
                  onClick={() => {
                    onSelectPeriod(option.value);
                    if (option.value !== "custom") {
                      onClose();
                    }
                  }}
                >
                  <span>
                    <strong>{option.shortLabel ?? option.label}</strong>
                    <small>{option.value === "custom" ? "manual" : "preset"}</small>
                  </span>
                  {isActive ? <Check size={14} /> : null}
                </button>
              );
            })}
          </div>
          {selectedPeriod === "custom" ? (
            <div className="v3-period-range">
              <label>
                <span>De</span>
                <input
                  type="date"
                  value={customDateRange.from}
                  onChange={(event) =>
                    onChangeCustomDateRange({
                      ...customDateRange,
                      from: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                <span>Até</span>
                <input
                  type="date"
                  value={customDateRange.to}
                  onChange={(event) =>
                    onChangeCustomDateRange({
                      ...customDateRange,
                      to: event.target.value,
                    })
                  }
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CommandPalette({
  isOpen,
  query,
  onQueryChange,
  onClose,
  onOpenAtlas,
}: {
  isOpen: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onOpenAtlas: () => void;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = normalizedQuery
    ? studioCommandItems.filter((item) => {
        const haystack = `${item.label} ${item.description}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : studioCommandItems;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="v3-command-backdrop" role="presentation" onClick={onClose}>
      <div
        className="v3-command-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Comando global"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="v3-command-input">
          <Search size={18} />
          <input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar tela, ação ou pedir contexto ao Atlas"
          />
          <span>Ctrl K</span>
        </div>
        <div className="v3-command-list">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            if (item.href === "#atlas") {
              return (
                <button
                  key={item.label}
                  type="button"
                  className="v3-command-row"
                  onClick={() => {
                    onOpenAtlas();
                    onClose();
                  }}
                >
                  <Icon size={17} />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                </button>
              );
            }

            return (
              <Link key={item.label} href={item.href} className="v3-command-row" onClick={onClose}>
                <Icon size={17} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </Link>
            );
          })}
          {!visibleItems.length ? (
            <div className="v3-command-row">
              <Search size={17} />
              <span>
                <strong>Nada encontrado</strong>
                <small>Tente buscar por módulo, ação ou Atlas.</small>
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StudioRail({
  pathname,
  isCollapsed,
  onToggleCollapse,
}: {
  pathname: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const activeModule = getStudioModule(pathname);
  const activeItem = getStudioNavItem(activeModule);

  return (
    <aside className="v3-rail" aria-label="Navegação BrandOps V3">
      <Link href="/studio" className="v3-rail-brand" aria-label="BrandOps Studio">
        <BrandOpsGlyph />
        <div>
          <strong>BrandOps</strong>
          <span>Camada Atlas</span>
        </div>
      </Link>
        <div className="v3-rail-current">
          <span>Painel ativo</span>
          <strong>{activeItem.label}</strong>
          <small>{activeItem.description}</small>
        </div>
      <nav className="v3-rail-nav">
        {studioNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              className="v3-rail-item"
              data-active={isActive}
              data-accent={item.accent}
              title={isCollapsed ? item.label : undefined}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="v3-rail-icon">
                <Icon size={18} />
              </div>
              <div className="v3-rail-copy">
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="v3-rail-footer">
        <button
          type="button"
          className="v3-rail-toggle"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Expandir menu lateral" : "Colapsar menu lateral"}
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          <span>{isCollapsed ? "Expandir" : "Colapsar"}</span>
        </button>
        <span>Atlas</span>
        <p>Explicação contextual e fila executiva sob demanda.</p>
      </div>
    </aside>
  );
}

function StudioMobileNav({ pathname }: { pathname: string }) {
  const activeModule = getStudioModule(pathname);

  return (
    <nav className="v3-mobile-nav" aria-label="Navegação mobile BrandOps V3">
      {studioNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeModule === item.key;
        return (
          <Link key={item.key} href={item.href} data-active={isActive}>
            <Icon size={18} />
            <span>{item.shortLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function StudioTopbar({
  onOpenCommand,
  onOpenAtlas,
}: {
  onOpenCommand: () => void;
  onOpenAtlas: () => void;
}) {
  const {
    activeBrandId,
    brands,
    customDateRange,
    selectedPeriod,
    selectedPeriodLabel,
    setCustomDateRange,
    setActiveBrandId,
    setSelectedPeriod,
    signOut,
  } = useBrandOps();
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  return (
    <header className="v3-topbar">
      <button type="button" className="v3-command-trigger" onClick={onOpenCommand}>
        <Search size={16} />
        <span>Comando, navegação ou pergunta</span>
        <kbd>Ctrl K</kbd>
      </button>

      <div className="v3-topbar-controls">
        <label className="v3-select-shell">
          <span>Marca</span>
          <select
            value={activeBrandId ?? ""}
            onChange={(event) => setActiveBrandId(event.target.value)}
            aria-label="Selecionar marca"
          >
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
        <V3PeriodMenu
          open={isPeriodMenuOpen}
          selectedPeriod={selectedPeriod}
          selectedPeriodLabel={selectedPeriodLabel}
          customDateRange={customDateRange}
          onToggle={() => setIsPeriodMenuOpen((current) => !current)}
          onClose={() => setIsPeriodMenuOpen(false)}
          onSelectPeriod={setSelectedPeriod}
          onChangeCustomDateRange={setCustomDateRange}
        />
        <button type="button" className="v3-atlas-button" onClick={onOpenAtlas}>
          <Sparkles size={16} />
          Atlas
        </button>
        <V3ThemeToggle />
        <button
          type="button"
          className="v3-icon-button"
          aria-label="Sair"
          onClick={() => void signOut()}
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}

function isSubnavLinkActive(pathname: string, currentSearch: string, href: string) {
  const [hrefPath, hrefQuery = ""] = href.split("?");

  if (pathname !== hrefPath && !pathname.startsWith(`${hrefPath}/`)) {
    return false;
  }

  const currentParams = new URLSearchParams(currentSearch);
  const hrefParams = new URLSearchParams(hrefQuery);

  if (![...hrefParams.keys()].length) {
    return ![...currentParams.keys()].length;
  }

  return [...hrefParams.entries()].every(
    ([key, value]) => currentParams.get(key) === value,
  );
}

function StudioModuleSubnavBar({
  module,
  pathname,
  currentSearch,
}: {
  module: ReturnType<typeof getStudioModule>;
  pathname: string;
  currentSearch: string;
}) {
  const items = studioModuleSubnav[module];

  return (
    <nav className="v3-subnav" aria-label={`Atalhos de ${getStudioNavItem(module).label}`}>
      {items.map((item) => (
        <Link
          key={`${module}-${item.href}`}
          href={item.href}
          className="v3-subnav-link"
          data-active={isSubnavLinkActive(pathname, currentSearch, item.href)}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function StudioInspector({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <aside className="v3-inspector" data-open={isOpen}>
      <div className="v3-inspector-header">
        <div>
          <span>Atlas</span>
          <strong>Inteligência contextual</strong>
        </div>
        <button type="button" className="v3-icon-button" onClick={onClose} aria-label="Fechar Atlas">
          <X size={16} />
        </button>
      </div>
      <div className="v3-inspector-body">
        {children ?? (
          <>
            <section className="v3-atlas-brief">
              <span>Modo de leitura</span>
              <p>
                Atlas acompanha o módulo atual e transforma dados em explicação, evidência e
                próxima ação quando você pedir contexto.
              </p>
            </section>
            <section className="v3-atlas-brief">
              <span>Comando</span>
              <p>Use o comando global para navegar, localizar uma ação ou abrir uma investigação.</p>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}

function StudioLoading() {
  return (
    <div className="brandops-v3 v3-loading-screen">
      <BrandOpsGlyph />
      <div>
            <strong>BrandOps</strong>
            <span>Preparando a operação da marca.</span>
      </div>
      <Loader2 className="animate-spin" size={18} />
    </div>
  );
}

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
        <StudioModuleSubnavBar
          module={activeModule}
          pathname={pathname}
          currentSearch={currentSearch}
        />
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
