export default function DashboardPage() {
  return (
    <>
      {/* Dashboard Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <div className="flex items-center gap-2 text-on-surface-variant mb-1">
            <span className="label-sm uppercase font-bold tracking-[0.2em] text-[10px]">Super Admin View</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="label-sm uppercase font-bold tracking-[0.2em] text-[10px] text-secondary">Aura POD Global</span>
          </div>
          <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface">Executive Overview</h2>
        </div>
        <div className="flex gap-3">
          <div className="bg-surface-container flex items-center p-1 rounded-sm border border-outline-variant/10">
            <button className="px-4 py-1.5 text-xs font-bold bg-surface-container-high text-on-surface rounded-sm">30 Days</button>
            <button className="px-4 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface">Quarter</button>
            <button className="px-4 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface">Year</button>
          </div>
          <button className="bg-primary text-on-primary text-xs font-bold px-4 py-2 flex items-center gap-2 rounded-sm hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-sm">cloud_upload</span>
            Import New Data
          </button>
        </div>
      </div>

      {/* Primary KPI Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-10">
        {/* Gross Revenue */}
        <div className="bg-surface-container p-6 rounded shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-4xl">payments</span>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Gross Revenue</p>
          <div className="flex items-baseline gap-2">
            <h3 className="font-headline text-2xl font-bold tabular-nums">$1,248,390</h3>
          </div>
          <div className="flex items-center gap-1 mt-2 text-secondary">
            <span className="material-symbols-outlined text-xs">trending_up</span>
            <span className="text-[11px] font-bold">12.4%</span>
          </div>
        </div>

        {/* Net Revenue */}
        <div className="bg-surface-container p-6 rounded shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Net Revenue</p>
          <h3 className="font-headline text-2xl font-bold tabular-nums">$982,140</h3>
          <div className="flex items-center gap-1 mt-2 text-secondary">
            <span className="material-symbols-outlined text-xs">trending_up</span>
            <span className="text-[11px] font-bold">8.2%</span>
          </div>
        </div>

        {/* Total CMV */}
        <div className="bg-surface-container p-6 rounded shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total CMV</p>
          <h3 className="font-headline text-2xl font-bold tabular-nums">$412,800</h3>
          <div className="flex items-center gap-1 mt-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-xs">horizontal_rule</span>
            <span className="text-[11px] font-bold">0.4%</span>
          </div>
        </div>

        {/* Media Spend */}
        <div className="bg-surface-container p-6 rounded shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Media Spend</p>
          <h3 className="font-headline text-2xl font-bold tabular-nums">$284,500</h3>
          <div className="flex items-center gap-1 mt-2 text-tertiary">
            <span className="material-symbols-outlined text-xs">trending_up</span>
            <span className="text-[11px] font-bold">15.1%</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-surface-container p-6 border-l-2 border-secondary rounded shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Net Profit</p>
          <h3 className="font-headline text-2xl font-bold tabular-nums">$284,840</h3>
          <div className="flex items-center gap-1 mt-2 text-secondary">
            <span className="material-symbols-outlined text-xs">trending_up</span>
            <span className="text-[11px] font-bold">4.2%</span>
          </div>
        </div>

        {/* Net Margin % */}
        <div className="bg-surface-container p-6 rounded shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Net Margin %</p>
          <h3 className="font-headline text-2xl font-bold tabular-nums">22.8%</h3>
          <div className="flex items-center gap-1 mt-2 text-error">
            <span className="material-symbols-outlined text-xs">trending_down</span>
            <span className="text-[11px] font-bold">1.2%</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Trend Chart: Revenue vs Spend */}
        <div className="lg:col-span-2 bg-surface-container p-8 rounded relative">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h4 className="font-headline text-lg font-semibold text-on-surface">Revenue vs. Media Spend</h4>
              <p className="text-xs text-on-surface-variant">Daily performance tracking over the last 30 business days</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary"></div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Gross Rev</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-outline"></div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Ad Spend</span>
              </div>
            </div>
          </div>
          
          {/* Mock Chart Area */}
          <div className="h-64 flex items-end gap-1.5 w-full relative group">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="border-b border-outline-variant/10 w-full h-0"></div>
              <div className="border-b border-outline-variant/10 w-full h-0"></div>
              <div className="border-b border-outline-variant/10 w-full h-0"></div>
              <div className="border-b border-outline-variant/10 w-full h-0"></div>
              <div className="border-b border-outline-variant/5 w-full h-0"></div>
            </div>
            
            {/* Bars */}
            {[60, 75, 65, 90, 100, 85, 70, 80, 60, 75, 95, 82].map((height, i) => (
              <div key={i} className="flex-1 bg-secondary/20 relative group/bar" style={{ height: `${height}%` }}>
                <div className="absolute bottom-0 w-full bg-secondary" style={{ height: `${height * 0.5}%` }}></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[10px] font-bold text-on-surface-variant/50 uppercase">
            <span>Oct 01</span>
            <span>Oct 08</span>
            <span>Oct 15</span>
            <span>Oct 22</span>
            <span>Oct 30</span>
          </div>
        </div>

        {/* Efficiency Ratio Grid */}
        <div className="bg-surface-container-high p-8 rounded border border-outline-variant/10">
          <h4 className="font-headline text-lg font-semibold text-on-surface mb-6">Efficiency Indices</h4>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Gross ROAS</span>
                <span className="text-xl font-headline font-bold text-on-surface">4.38x</span>
              </div>
              <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-secondary w-[85%] shadow-[0_0_8px_rgba(78,222,163,0.4)]"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Net ROAS</span>
                <span className="text-xl font-headline font-bold text-on-surface">3.45x</span>
              </div>
              <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-secondary w-[65%]"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant/15">
              <div className="bg-surface-container p-4 rounded-sm">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">CPA (Blended)</p>
                <p className="text-lg font-bold tabular-nums">$18.42</p>
              </div>
              <div className="bg-surface-container p-4 rounded-sm">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">CAC (New)</p>
                <p className="text-lg font-bold tabular-nums">$24.90</p>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-sm bg-primary-container/30 border border-primary/10">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary text-sm mt-0.5">lightbulb</span>
                <p className="text-[11px] leading-relaxed text-on-surface-variant">
                  Efficiency is <span className="text-secondary font-bold">14% higher</span> than the POD industry benchmark for Q4. Scale potential remains high for "Autumn Collection".
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* High-level Brand Switcher / Global Table */}
      <div className="bg-surface-container rounded overflow-hidden">
        <div className="px-8 py-5 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-high/40">
          <h4 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant">Brand Portfolio Performance</h4>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-on-surface-variant">DISPLAYING 5 BRANDS</span>
            <button className="material-symbols-outlined text-lg text-on-surface-variant">filter_list</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-8 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Brand Name</th>
                <th className="px-8 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Status</th>
                <th className="px-8 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Gross Sales</th>
                <th className="px-8 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Spend</th>
                <th className="px-8 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Net Margin</th>
                <th className="px-8 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              <tr className="hover:bg-surface-container-high transition-colors cursor-pointer group">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-secondary"></div>
                    <span className="text-sm font-bold text-on-surface">Aura POD Global</span>
                  </div>
                </td>
                <td className="px-8 py-4 text-right">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-secondary-container/20 text-secondary border border-secondary/20">SCALING</span>
                </td>
                <td className="px-8 py-4 text-right font-medium tabular-nums text-sm">$842.1k</td>
                <td className="px-8 py-4 text-right font-medium tabular-nums text-sm">$192.4k</td>
                <td className="px-8 py-4 text-right font-bold tabular-nums text-sm text-secondary">24.2%</td>
                <td className="px-8 py-4 text-right">
                  <span className="material-symbols-outlined text-secondary">show_chart</span>
                </td>
              </tr>
              <tr className="bg-surface-container-low/30 hover:bg-surface-container-high transition-colors cursor-pointer">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-secondary"></div>
                    <span className="text-sm font-bold text-on-surface">Vivid Canvas Co</span>
                  </div>
                </td>
                <td className="px-8 py-4 text-right">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-secondary-container/20 text-secondary border border-secondary/20">STABLE</span>
                </td>
                <td className="px-8 py-4 text-right font-medium tabular-nums text-sm">$210.5k</td>
                <td className="px-8 py-4 text-right font-medium tabular-nums text-sm">$54.2k</td>
                <td className="px-8 py-4 text-right font-bold tabular-nums text-sm text-secondary">19.8%</td>
                <td className="px-8 py-4 text-right">
                  <span className="material-symbols-outlined text-secondary">show_chart</span>
                </td>
              </tr>
              <tr className="hover:bg-surface-container-high transition-colors cursor-pointer">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-tertiary"></div>
                    <span className="text-sm font-bold text-on-surface">Legacy Apparel</span>
                  </div>
                </td>
                <td className="px-8 py-4 text-right">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-tertiary-container/40 text-tertiary border border-tertiary/20">AT RISK</span>
                </td>
                <td className="px-8 py-4 text-right font-medium tabular-nums text-sm">$94.2k</td>
                <td className="px-8 py-4 text-right font-medium tabular-nums text-sm">$32.1k</td>
                <td className="px-8 py-4 text-right font-bold tabular-nums text-sm text-tertiary">11.4%</td>
                <td className="px-8 py-4 text-right">
                  <span className="material-symbols-outlined text-tertiary">trending_down</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="px-8 py-4 border-t border-outline-variant/10 flex justify-center">
          <button className="text-[10px] font-bold text-on-surface-variant hover:text-on-surface transition-colors uppercase tracking-[0.2em]">View All Portfolio Assets</button>
        </div>
      </div>

      {/* Contextual Pulse Metric Overlay (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="flex items-center gap-4 bg-surface-container-high p-4 rounded shadow-2xl border border-outline-variant/20 metallic-sheen">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">Real-time Attribution</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_#4edea3] animate-pulse"></div>
              <span className="text-xs font-bold tabular-nums">Syncing: 98.4% Accuracy</span>
            </div>
          </div>
          <div className="h-8 w-px bg-outline-variant/30"></div>
          <button className="text-xs font-bold text-secondary hover:underline">View Log</button>
        </div>
      </div>
    </>
  );
}
