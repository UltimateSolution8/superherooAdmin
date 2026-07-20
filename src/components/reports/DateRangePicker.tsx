import React, { useState } from 'react';

export interface DateRange {
  startDate: string; // ISO String
  endDate: string;   // ISO String
  preset: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange }) => {
  const [customStart, setCustomStart] = useState(value.startDate.split('T')[0] || '');
  const [customEnd, setCustomEnd] = useState(value.endDate.split('T')[0] || '');
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const setPreset = (presetKey: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (presetKey === 'TODAY') {
      start.setHours(0, 0, 0, 0);
    } else if (presetKey === 'YESTERDAY') {
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (presetKey === 'LAST_7_DAYS') {
      start.setDate(now.getDate() - 7);
    } else if (presetKey === 'LAST_30_DAYS') {
      start.setDate(now.getDate() - 30);
    } else if (presetKey === 'THIS_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (presetKey === 'LAST_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    }

    setIsCustomOpen(false);
    onChange({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      preset: presetKey,
    });
  };

  const handleCustomApply = () => {
    if (!customStart || !customEnd) return;
    const start = new Date(customStart);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);

    onChange({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      preset: 'CUSTOM',
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800 backdrop-blur-md">
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 border-r border-slate-800">
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Timeframe
      </div>

      {[
        { key: 'TODAY', label: 'Today' },
        { key: 'LAST_7_DAYS', label: 'Last 7 Days' },
        { key: 'LAST_30_DAYS', label: 'Last 30 Days' },
        { key: 'THIS_MONTH', label: 'This Month' },
        { key: 'LAST_MONTH', label: 'Last Month' },
      ].map((p) => (
        <button
          key={p.key}
          onClick={() => setPreset(p.key)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            value.preset === p.key
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 font-semibold'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          {p.label}
        </button>
      ))}

      <button
        onClick={() => setIsCustomOpen(!isCustomOpen)}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
          value.preset === 'CUSTOM' || isCustomOpen
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
      >
        Custom Range
      </button>

      {isCustomOpen && (
        <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-700 ml-auto animate-fade-in">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="bg-slate-900 text-slate-200 text-xs px-2.5 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
          />
          <span className="text-slate-500 text-xs">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="bg-slate-900 text-slate-200 text-xs px-2.5 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleCustomApply}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold px-3 py-1.5 rounded transition"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
};
