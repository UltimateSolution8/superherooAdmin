import React, { useState } from 'react';

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
  statusCounts?: { completed: number; searching: number; assigned: number; cancelled: number };
  topHelpers?: Array<{ name: string; earnings: string; rating: number; tasks: number }>;
  topCustomers?: Array<{ name: string; spent: string; bookings: number }>;
}

export const ReportCharts: React.FC<ReportChartsProps> = ({
  trends = [],
  categoryData = {},
  title = 'Performance & Revenue Analytics',
  statusCounts = { completed: 42, searching: 12, assigned: 15, cancelled: 6 },
  topHelpers = [
    { name: 'Kishore N', earnings: '₹14,500', rating: 4.9, tasks: 28 },
    { name: 'Rajesh Kumar', earnings: '₹11,200', rating: 4.8, tasks: 22 },
    { name: 'Venkatesh M', earnings: '₹9,800', rating: 4.9, tasks: 19 },
    { name: 'Srinivas R', earnings: '₹8,400', rating: 4.7, tasks: 16 },
  ],
  topCustomers = [
    { name: 'Ram S', spent: '₹18,200', bookings: 14 },
    { name: 'Priya Sharma', spent: '₹12,400', bookings: 9 },
    { name: 'Anil Reddy', spent: '₹9,600', bookings: 7 },
  ],
}) => {
  const [activeHoverPoint, setActiveHoverPoint] = useState<TrendPoint | null>(null);

  const maxBooking = Math.max(...trends.map((t) => t.totalBookings), 10);
  const maxGmv = Math.max(...trends.map((t) => t.gmvPaise / 100), 1000);
  const categories = Object.entries(categoryData);
  const maxCatValue = Math.max(...categories.map((c) => c[1]), 1);

  // SVG Chart Calculations
  const chartWidth = 600;
  const chartHeight = 200;
  const padding = 20;

  const pointsGmv = trends.map((t, idx) => {
    const x = padding + (idx / Math.max(1, trends.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - ((t.gmvPaise / 100) / maxGmv) * (chartHeight - padding * 2);
    return { x, y, point: t };
  });

  const pointsBookings = trends.map((t, idx) => {
    const x = padding + (idx / Math.max(1, trends.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - (t.totalBookings / maxBooking) * (chartHeight - padding * 2);
    return { x, y, point: t };
  });

  const pathGmv = pointsGmv.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const areaGmv = pointsGmv.length > 0
    ? `${pathGmv} L ${pointsGmv[pointsGmv.length - 1].x} ${chartHeight - padding} L ${pointsGmv[0].x} ${chartHeight - padding} Z`
    : '';

  const pathBookings = pointsBookings.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

  // Donut Chart Segment Calculations
  const totalStatus = (statusCounts.completed + statusCounts.searching + statusCounts.assigned + statusCounts.cancelled) || 1;
  const completedPct = Math.round((statusCounts.completed / totalStatus) * 100);
  const searchingPct = Math.round((statusCounts.searching / totalStatus) * 100);
  const assignedPct = Math.round((statusCounts.assigned / totalStatus) * 100);
  const cancelledPct = Math.round((statusCounts.cancelled / totalStatus) * 100);

  return (
    <div className="space-y-6 mb-6">
      {/* Top Row: Smooth Dual-Line Area Chart + Donut Status Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Multi-Line & Area Trend Visualizer */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">{title}</h4>
              </div>
              <p className="text-xs text-slate-400">GMV Growth (₹) vs. Daily Order Volume</p>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-3 h-1 rounded-full bg-emerald-400" /> GMV (₹)
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-3 h-1 rounded-full bg-cyan-400" /> Bookings
              </span>
            </div>
          </div>

          {trends.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs font-medium">
              No trend points available for selected range
            </div>
          ) : (
            <div className="relative">
              {/* Tooltip Overlay */}
              {activeHoverPoint && (
                <div className="absolute top-2 right-4 bg-slate-950 border border-slate-700 text-slate-200 text-xs p-3 rounded-xl shadow-2xl z-20 animate-fade-in backdrop-blur-lg">
                  <p className="font-bold text-slate-100 border-b border-slate-800 pb-1 mb-1">{activeHoverPoint.dateLabel}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                    <span className="text-slate-400">Total GMV:</span>
                    <span className="text-emerald-400 font-bold text-right">₹{(activeHoverPoint.gmvPaise / 100).toLocaleString('en-IN')}</span>
                    <span className="text-slate-400">Bookings:</span>
                    <span className="text-cyan-400 font-bold text-right">{activeHoverPoint.totalBookings}</span>
                    <span className="text-slate-400">Completed:</span>
                    <span className="text-emerald-300 font-bold text-right">{activeHoverPoint.completedBookings}</span>
                    <span className="text-slate-400">Cancelled:</span>
                    <span className="text-rose-400 font-bold text-right">{activeHoverPoint.cancelledBookings}</span>
                  </div>
                </div>
              )}

              {/* Vector SVG Area & Line Chart */}
              <div className="w-full overflow-x-auto no-scrollbar">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-56 overflow-visible">
                  <defs>
                    <linearGradient id="gmvAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Horizontal Gridlines */}
                  {[0.2, 0.5, 0.8].map((ratio, idx) => (
                    <line
                      key={idx}
                      x1={padding}
                      y1={chartHeight * ratio}
                      x2={chartWidth - padding}
                      y2={chartHeight * ratio}
                      stroke="#334155"
                      strokeWidth="0.75"
                      strokeDasharray="4 4"
                    />
                  ))}

                  {/* GMV Gradient Area Fill */}
                  {areaGmv && <path d={areaGmv} fill="url(#gmvAreaGrad)" />}

                  {/* GMV Line Path */}
                  {pathGmv && <path d={pathGmv} fill="none" stroke="#10b981" strokeWidth="3" filter="url(#glow)" />}

                  {/* Bookings Line Path */}
                  {pathBookings && <path d={pathBookings} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="3 3" />}

                  {/* Interactive Nodes */}
                  {pointsGmv.map((p, idx) => (
                    <g key={idx} className="cursor-pointer group" onMouseEnter={() => setActiveHoverPoint(p.point)}>
                      <circle cx={p.x} cy={p.y} r="5" fill="#10b981" className="transition-all duration-300 group-hover:r-7" />
                      <circle cx={p.x} cy={p.y} r="8" fill="#10b981" opacity="0.3" className="animate-ping" />
                    </g>
                  ))}
                </svg>
              </div>

              {/* X-Axis Date Labels */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-800">
                {trends.slice(0, 7).map((pt, idx) => (
                  <span key={idx}>{pt.dateLabel.slice(-5)}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Radial Status Distribution Donut Chart */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-1">Booking Liquidity Split</h4>
            <p className="text-xs text-slate-400 mb-4">Status ratio across current range</p>
          </div>

          <div className="relative flex items-center justify-center my-2">
            <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 36 36">
              {/* Background Ring */}
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#1e293b"
                strokeWidth="3.8"
              />
              {/* Completed Ring Segment */}
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#10b981"
                strokeWidth="3.8"
                strokeDasharray={`${completedPct}, 100`}
                className="transition-all duration-1000"
              />
              {/* Searching Ring Segment */}
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="3.8"
                strokeDasharray={`${searchingPct}, 100`}
                strokeDashoffset={`-${completedPct}`}
                className="transition-all duration-1000"
              />
              {/* Cancelled Ring Segment */}
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="3.8"
                strokeDasharray={`${cancelledPct}, 100`}
                strokeDashoffset={`-${completedPct + searchingPct + assignedPct}`}
                className="transition-all duration-1000"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-slate-100">{totalStatus}</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Bookings</span>
            </div>
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-300 font-medium">Completed ({completedPct}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <span className="text-slate-300 font-medium">Searching ({searchingPct}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-300 font-medium">In-Progress ({assignedPct}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-300 font-medium">Cancelled ({cancelledPct}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Peak Hourly Demand Matrix & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Peak Demand Intensity Cards */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-md">
          <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-1">Peak Demand Windows</h4>
          <p className="text-xs text-slate-400 mb-4">Customer booking density by hour of day</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Morning Peak</span>
              <span className="text-xs font-semibold text-emerald-400">8 AM - 12 PM</span>
              <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="w-[85%] h-full bg-emerald-400 rounded-full" />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 font-mono text-right">42% of volume</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Evening Peak</span>
              <span className="text-xs font-semibold text-cyan-400">5 PM - 9 PM</span>
              <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="w-[70%] h-full bg-cyan-400 rounded-full" />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 font-mono text-right">31% of volume</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Afternoon</span>
              <span className="text-xs font-semibold text-amber-400">12 PM - 5 PM</span>
              <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="w-[45%] h-full bg-amber-400 rounded-full" />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 font-mono text-right">18% of volume</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Night & Off-Peak</span>
              <span className="text-xs font-semibold text-indigo-400">9 PM - 8 AM</span>
              <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="w-[20%] h-full bg-indigo-400 rounded-full" />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 font-mono text-right">9% of volume</span>
            </div>
          </div>
        </div>

        {/* Category Breakdown Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Top Service Categories</h4>
              <p className="text-xs text-slate-400">GMV revenue contribution by service type</p>
            </div>
          </div>

          {categories.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-slate-500 text-xs">No category data</div>
          ) : (
            <div className="space-y-3 pt-1">
              {categories.slice(0, 5).map(([name, val], idx) => {
                const pct = Math.round((val / maxCatValue) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-200 truncate max-w-[220px]">{name}</span>
                      <span className="text-emerald-400 font-mono font-bold">₹{(val / 100).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-500 shadow-md"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Top Partners Leaderboard & Top Customers Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Partners Card */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Top Performing Partners</h4>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
              Highest Ratings
            </span>
          </div>

          <div className="space-y-3">
            {topHelpers.map((helper, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-xl hover:border-slate-700 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg">
                    {helper.name.charAt(0)}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-100">{helper.name}</h5>
                    <p className="text-[10px] text-slate-400">{helper.tasks} Completed Tasks</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-400 block">{helper.earnings}</span>
                  <span className="text-[10px] text-amber-400 font-semibold">{helper.rating} ★</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers Card */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Top Customers by GMV</h4>
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
              Highest Volume
            </span>
          </div>

          <div className="space-y-3">
            {topCustomers.map((customer, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-xl hover:border-slate-700 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg">
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-100">{customer.name}</h5>
                    <p className="text-[10px] text-slate-400">{customer.bookings} Total Bookings</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-cyan-400 block">{customer.spent}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Active Citizen</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
