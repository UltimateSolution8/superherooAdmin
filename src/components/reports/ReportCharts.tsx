import React from 'react';

export interface TrendPoint {
  dateLabel: string;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  gmvPaise: number;
  revenuePaise: number;
}

interface ReportChartsProps {
  trends?: TrendPoint[];
  categoryData?: Record<string, number>;
  title?: string;
}

export const ReportCharts: React.FC<ReportChartsProps> = ({ trends = [], categoryData = {}, title = "Performance Trends" }) => {
  const maxBooking = Math.max(...trends.map((t) => t.totalBookings), 10);
  const categories = Object.entries(categoryData);
  const maxCatValue = Math.max(...categories.map((c) => c[1]), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* Time-Series Line Trend Chart */}
      <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{title} (Time-Series)</h4>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Bookings
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Revenue (₹)
            </span>
          </div>
        </div>

        {trends.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-slate-500 text-xs">No trend data available</div>
        ) : (
          <div className="h-56 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-800 relative">
            {trends.map((pt, idx) => {
              const heightPercent = Math.min(100, Math.max(12, (pt.totalBookings / maxBooking) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-12 bg-slate-950 border border-slate-700 text-slate-200 text-[10px] p-1.5 rounded shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    <p className="font-bold">{pt.dateLabel}</p>
                    <p className="text-emerald-400">{pt.totalBookings} Bookings</p>
                    <p className="text-cyan-400">₹{(pt.gmvPaise / 100).toLocaleString('en-IN')}</p>
                  </div>

                  {/* Bar Visualizer */}
                  <div className="w-full bg-slate-950/60 rounded-t-lg h-full flex items-end overflow-hidden p-0.5">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t transition-all duration-500 group-hover:from-emerald-500 group-hover:to-cyan-300"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono rotate-45 sm:rotate-0 origin-left">
                    {pt.dateLabel.slice(-5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Breakdown Bar Chart */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">Category Breakdown</h4>

        {categories.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-slate-500 text-xs">No category data</div>
        ) : (
          <div className="space-y-4 pt-2">
            {categories.slice(0, 5).map(([name, val], idx) => {
              const pct = Math.round((val / maxCatValue) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300 font-medium truncate max-w-[160px]">{name}</span>
                    <span className="text-slate-400 font-mono">₹{(val / 100).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
