import { Bell, Search } from "lucide-react";

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-outline bg-surface px-6 text-on-surface">
      <div className="flex items-center gap-4 flex-1">
        <div className="brandops-input-with-icon w-64">
          <Search className="h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar..."
            className="brandops-input w-full text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface">
          <Bell size={20} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error"></span>
        </button>

        <div className="flex items-center gap-3 border-l border-outline pl-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-on-surface">Admin User</p>
            <p className="text-xs text-on-surface-variant">Super Admin</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container font-bold">
            A
          </div>
        </div>
      </div>
    </header>
  );
}
