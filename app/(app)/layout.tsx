import Link from "next/link";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background text-on-surface font-body selection:bg-secondary selection:text-on-secondary min-h-screen flex">
      {/* SideNavBar */}
      <aside className="h-screen w-64 fixed left-0 top-0 border-r border-outline-variant/15 bg-[#0c1324] font-headline antialiased flex flex-col py-6 z-50">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#bcc7de]">Vault Ledger</h1>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Financial Intelligence</p>
            </div>
          </div>
          <button className="w-full py-2.5 px-4 bg-secondary text-on-secondary font-bold text-sm rounded flex items-center justify-center gap-2 transition-transform active:scale-[0.98]">
            <span className="material-symbols-outlined text-sm">add</span>
            New Analysis
          </button>
        </div>
        
        <nav className="flex-1 space-y-1 px-3">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-[#4edea3] bg-[#191f31] border-r-2 border-[#4edea3] transition-colors duration-200">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-sm font-medium">Dashboard</span>
          </Link>
          <Link href="/dre" className="flex items-center gap-3 px-3 py-2 text-[#bcc7de]/60 hover:text-[#bcc7de] hover:bg-[#23293c] transition-colors duration-200">
            <span className="material-symbols-outlined">analytics</span>
            <span className="text-sm font-medium">DRE</span>
          </Link>
          <Link href="/media" className="flex items-center gap-3 px-3 py-2 text-[#bcc7de]/60 hover:text-[#bcc7de] hover:bg-[#23293c] transition-colors duration-200">
            <span className="material-symbols-outlined">query_stats</span>
            <span className="text-sm font-medium">Performance</span>
          </Link>
          <Link href="/import" className="flex items-center gap-3 px-3 py-2 text-[#bcc7de]/60 hover:text-[#bcc7de] hover:bg-[#23293c] transition-colors duration-200">
            <span className="material-symbols-outlined">upload_file</span>
            <span className="text-sm font-medium">Imports</span>
          </Link>
          <Link href="/sanitization" className="flex items-center gap-3 px-3 py-2 text-[#bcc7de]/60 hover:text-[#bcc7de] hover:bg-[#23293c] transition-colors duration-200">
            <span className="material-symbols-outlined">cleaning_services</span>
            <span className="text-sm font-medium">Sanitization</span>
          </Link>
          <Link href="/cmv" className="flex items-center gap-3 px-3 py-2 text-[#bcc7de]/60 hover:text-[#bcc7de] hover:bg-[#23293c] transition-colors duration-200">
            <span className="material-symbols-outlined">monitoring</span>
            <span className="text-sm font-medium">CMV</span>
          </Link>
        </nav>
        
        <div className="mt-auto px-3 border-t border-outline-variant/10 pt-4">
          <Link href="/help" className="flex items-center gap-3 px-3 py-2 text-[#bcc7de]/60 hover:text-[#bcc7de] hover:bg-[#23293c] transition-colors duration-200">
            <span className="material-symbols-outlined">help</span>
            <span className="text-sm font-medium">Help Center</span>
          </Link>
          <div className="flex items-center gap-3 px-3 py-4 mt-2">
            <img alt="Executive User Profile" className="w-8 h-8 rounded-full border border-outline-variant/30" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB76_8nQ7AoJ-oBGf7BdhcHPydGOZyxXrzP5afo1FBoz3XSDX-lwZZ7ZtfTjbMIUhmkrn7jSRQrNBAJ13Hshaxz_kw5QrOHbajaTYwAHvNtJYnSALFYGUHmFEs8kWeqERFP-r6Rw5DYSDr_BmrXEK5_8lT69C9brx-A3sHqn4paP-0kN4cUQA41MAbewWkEYRAeMHrISKqXpysuLa88BgD9m7LJnHp24ykqtH0qQ3JDDoL2unfEQCxPDsw5ce_vh7AsSXRFqUQVmfKH" />
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-on-surface truncate">Senior Analyst</p>
              <p className="text-[10px] text-on-surface-variant truncate">Global Operations</p>
            </div>
          </div>
        </div>
      </aside>

      {/* TopNavBar */}
      <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 border-b border-outline-variant/15 bg-[#0c1324]/60 backdrop-blur-xl z-40 flex justify-between items-center px-8 shadow-2xl shadow-[#070d1f]/50">
        <div className="flex items-center gap-8">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
            <input className="bg-surface-container-low border-none rounded-sm pl-10 pr-4 py-1.5 text-xs w-64 focus:ring-1 focus:ring-secondary/50 placeholder:text-on-surface-variant/50 text-on-surface" placeholder="Search parameters..." type="text" />
          </div>
          <nav className="flex gap-6">
            <Link href="#" className="text-[#4edea3] border-b-2 border-[#4edea3] pb-1 font-medium text-sm">Global View</Link>
            <Link href="#" className="text-[#bcc7de]/70 hover:text-[#4edea3] transition-all font-medium text-sm">Portfolio</Link>
            <Link href="#" className="text-[#bcc7de]/70 hover:text-[#4edea3] transition-all font-medium text-sm">Risk</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-sm border border-outline-variant/20">
            <span className="text-[10px] font-bold text-secondary uppercase tracking-tighter">Live Status</span>
            <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_#4edea3]"></div>
          </div>
          <div className="flex gap-2">
            <button className="p-2 text-[#bcc7de]/70 hover:text-[#4edea3] transition-all">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-2 text-[#bcc7de]/70 hover:text-[#4edea3] transition-all">
              <span className="material-symbols-outlined">apps</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-64 pt-24 pb-12 px-8 min-h-screen w-full">
        {children}
      </main>
    </div>
  );
}
