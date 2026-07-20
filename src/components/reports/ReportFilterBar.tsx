import React, { useState } from 'react';

export interface ReportFilterState {
  status: string;
  serviceCategory: string;
  location: string;
  userRole: string;
}

interface ReportFilterBarProps {
  filters: ReportFilterState;
  onApplyFilters: (newFilters: ReportFilterState) => void;
  isLoading?: boolean;
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({ filters, onApplyFilters, isLoading }) => {
  const [localFilters, setLocalFilters] = useState<ReportFilterState>(filters);

  const handleApply = () => {
    onApplyFilters(localFilters);
  };

  const handleReset = () => {
    const reset = { status: 'ALL', serviceCategory: 'ALL', location: 'ALL', userRole: 'ALL' };
    setLocalFilters(reset);
    onApplyFilters(reset);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 mb-6 backdrop-blur-md shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <h3 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">Report Controls & Filters</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <label className="text-xs font-medium text-slate-400">Status:</label>
            <select
              value={localFilters.status}
              onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value })}
              className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Statuses</option>
              <option value="COMPLETED" className="bg-slate-900">Completed</option>
              <option value="SEARCHING" className="bg-slate-900">Searching</option>
              <option value="ASSIGNED" className="bg-slate-900">Assigned / In Progress</option>
              <option value="CANCELLED" className="bg-slate-900">Cancelled</option>
            </select>
          </div>

          {/* Service Category */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <label className="text-xs font-medium text-slate-400">Service:</label>
            <select
              value={localFilters.serviceCategory}
              onChange={(e) => setLocalFilters({ ...localFilters, serviceCategory: e.target.value })}
              className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Services</option>
              <option value="Household" className="bg-slate-900">Household Help</option>
              <option value="Cleaning" className="bg-slate-900">Deep Cleaning</option>
              <option value="Delivery" className="bg-slate-900">Delivery & Logistics</option>
              <option value="Repair" className="bg-slate-900">Appliance Repair</option>
              <option value="Bulk" className="bg-slate-900">Bulk Crew Booking</option>
            </select>
          </div>

          {/* Location Filter */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <label className="text-xs font-medium text-slate-400">Region:</label>
            <select
              value={localFilters.location}
              onChange={(e) => setLocalFilters({ ...localFilters, location: e.target.value })}
              className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All India Regions</option>
              <option value="Hyderabad" className="bg-slate-900">Hyderabad Metro</option>
              <option value="Telangana" className="bg-slate-900">Telangana State</option>
              <option value="Bangalore" className="bg-slate-900">Bengaluru Tech Hub</option>
            </select>
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleApply}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            )}
            Apply Filters
          </button>

          <button
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-slate-200 underline px-2 transition"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
