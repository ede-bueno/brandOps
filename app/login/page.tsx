import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#070d1f] flex flex-col items-center justify-center relative overflow-hidden font-body selection:bg-secondary selection:text-on-secondary">
      {/* Background Textures */}
      <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #191f31 1px, transparent 1px)", backgroundSize: "24px 24px" }}></div>
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-secondary/5 blur-[120px] z-0"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-tertiary/5 blur-[120px] z-0"></div>
      
      {/* Main Login Container */}
      <div className="z-10 w-full max-w-md px-6">
        <div className="mb-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shadow-[0_0_20px_rgba(78,222,163,0.3)]">
              <span className="material-symbols-outlined text-on-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#bcc7de] font-headline mb-2">Vault Ledger</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant font-bold">Financial Intelligence</p>
        </div>

        <div className="glass-panel p-8 rounded-xl relative overflow-hidden">
          {/* Subtle top border highlight */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-secondary/50 to-transparent"></div>
          
          <form className="space-y-6">
            <div>
              <label htmlFor="brandId" className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Brand Identifier</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">storefront</span>
                <input 
                  type="text" 
                  id="brandId" 
                  className="w-full bg-[#0c1324] border border-outline-variant/30 rounded-md py-3 pl-10 pr-4 text-sm text-on-surface focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/50 transition-all placeholder:text-on-surface-variant/30"
                  placeholder="e.g. AURA-POD"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Executive Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">mail</span>
                <input 
                  type="email" 
                  id="email" 
                  className="w-full bg-[#0c1324] border border-outline-variant/30 rounded-md py-3 pl-10 pr-4 text-sm text-on-surface focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/50 transition-all placeholder:text-on-surface-variant/30"
                  placeholder="executive@brand.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="accessKey" className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Access Key</label>
                <Link href="#" className="text-[10px] font-bold text-secondary hover:underline">Recover Key</Link>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">key</span>
                <input 
                  type="password" 
                  id="accessKey" 
                  className="w-full bg-[#0c1324] border border-outline-variant/30 rounded-md py-3 pl-10 pr-4 text-sm text-on-surface focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/50 transition-all placeholder:text-on-surface-variant/30 font-mono tracking-widest"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-secondary text-on-secondary font-bold py-3.5 rounded-md mt-8 hover:bg-secondary/90 transition-all active:scale-[0.98] shadow-[0_0_15px_rgba(78,222,163,0.2)] flex justify-center items-center gap-2"
            >
              Authenticate
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-outline-variant/20 text-center">
            <p className="text-xs text-on-surface-variant">
              New to the platform? <Link href="#" className="text-secondary font-bold hover:underline">Request Brand Access</Link>
            </p>
          </div>
        </div>

        {/* Footer Trust Indicators */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-on-surface-variant/50">
            <span className="material-symbols-outlined text-sm">lock</span>
            <span className="text-[10px] uppercase tracking-widest font-bold">End-to-End Encrypted</span>
          </div>
          <div className="flex gap-6 text-[10px] text-on-surface-variant/40 uppercase tracking-wider font-bold">
            <Link href="#" className="hover:text-on-surface-variant transition-colors">Terms</Link>
            <Link href="#" className="hover:text-on-surface-variant transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-on-surface-variant transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
