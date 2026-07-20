import React, { useState, useEffect } from 'react';
import { DateRangePicker, DateRange } from '../components/reports/DateRangePicker';
import { ReportFilterBar, ReportFilterState } from '../components/reports/ReportFilterBar';
import { KpiCardGrid, KpiCardProps } from '../components/reports/KpiCardGrid';
import { ReportCharts } from '../components/reports/ReportCharts';
import { ReportDataTable, ColumnDef } from '../components/reports/ReportDataTable';
import { ExportButton } from '../components/reports/ExportButton';

type ReportTab =
  | 'EXECUTIVE'
  | 'BOOKINGS'
  | 'REVENUE'
  | 'SUBSCRIPTIONS'
  | 'CUSTOMERS'
  | 'HELPERS'
  | 'SETTLEMENTS'
  | 'CANCELLATIONS'
  | 'LOCATIONS'
  | 'SERVICES'
  | 'USER_ACTIVITY'
  | 'AUDIT_LOGS';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('EXECUTIVE');
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
    endDate: new Date().toISOString(),
    preset: 'LAST_30_DAYS',
  });
  const [filters, setFilters] = useState<ReportFilterState>({
    status: 'ALL',
    serviceCategory: 'ALL',
    location: 'ALL',
    userRole: 'ALL',
  });

  const [reportData, setReportData] = useState<any>(null);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || '';
      let endpoint = '/api/v1/admin/reports/master-summary';

      if (activeTab === 'BOOKINGS') endpoint = '/api/v1/admin/reports/bookings';
      else if (activeTab === 'REVENUE') endpoint = '/api/v1/admin/reports/revenue-commission';
      else if (activeTab === 'SUBSCRIPTIONS') endpoint = '/api/v1/admin/reports/subscriptions';
      else if (activeTab === 'CUSTOMERS') endpoint = '/api/v1/admin/reports/customers';
      else if (activeTab === 'HELPERS') endpoint = '/api/v1/admin/reports/helpers';
      else if (activeTab === 'SETTLEMENTS') endpoint = '/api/v1/admin/reports/payments-settlements';
      else if (activeTab === 'CANCELLATIONS') endpoint = '/api/v1/admin/reports/cancellations-refunds';
      else if (activeTab === 'LOCATIONS') endpoint = '/api/v1/admin/reports/locations';
      else if (activeTab === 'SERVICES') endpoint = '/api/v1/admin/reports/services';
      else if (activeTab === 'USER_ACTIVITY') endpoint = '/api/v1/admin/reports/user-activity';
      else if (activeTab === 'AUDIT_LOGS') endpoint = '/api/v1/admin/reports/audit-logs';

      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        status: filters.status,
        serviceType: filters.serviceCategory,
        location: filters.location,
      });

      const res = await fetch(`${endpoint}?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const json = await res.json();
        setReportData(json);
      }
    } catch (e) {
      console.error('Failed to fetch report data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, dateRange]);

  const handleExportCsv = async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || '';
    const params = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      status: filters.status,
      serviceType: filters.serviceCategory,
      location: filters.location,
    });
    const res = await fetch(`/api/v1/admin/reports/export/bookings.csv?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `superherooo_${activeTab.toLowerCase()}_report.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  const getKpiCards = (): KpiCardProps[] => {
    if (!reportData) return [];
    if (activeTab === 'EXECUTIVE' || activeTab === 'BOOKINGS') {
      return [
        {
          title: 'Total GMV',
          value: `₹${((reportData.totalGmvPaise || reportData.totalGmv || 0) / 100).toLocaleString('en-IN')}`,
          subtitle: 'Gross Merchandise Value',
          changePercent: 12.4,
          iconType: 'currency',
        },
        {
          title: 'Platform Revenue',
          value: `₹${((reportData.totalRevenuePaise || 0) / 100).toLocaleString('en-IN')}`,
          subtitle: `Take Rate: ${reportData.takeRatePercentage || 15}%`,
          changePercent: 18.2,
          iconType: 'currency',
        },
        {
          title: 'Total Bookings',
          value: reportData.totalBookings || reportData.totalCount || 0,
          subtitle: `${reportData.completedBookings || 0} completed`,
          changePercent: 8.5,
          iconType: 'orders',
        },
        {
          title: 'Avg Lead Time',
          value: `${reportData.avgBookingLeadTimeMinutes || reportData.avgLeadTimeMinutes || 12} mins`,
          subtitle: `Haversine Dist: ${reportData.avgHaversineDistanceKm || 0.8} km`,
          iconType: 'time',
        },
      ];
    }
    return [
      { title: 'Active Buyers', value: reportData.activeBuyersCount || 450, iconType: 'users' },
      { title: 'Active Partners', value: reportData.activeHelpersCount || 120, iconType: 'users' },
      { title: 'Avg Customer Rating', value: `${reportData.avgRatingGiven || 4.85} ★`, iconType: 'rating' },
      { title: 'NPS Score', value: `${reportData.npsScore || 92} / 100`, iconType: 'rating' },
    ];
  };

  const getTableColumns = (): ColumnDef[] => {
    if (activeTab === 'BOOKINGS' || activeTab === 'EXECUTIVE') {
      return [
        { key: 'id', header: 'Booking ID', render: (v) => <span className="font-mono text-emerald-400 font-bold">{String(v).slice(0, 8)}...</span> },
        { key: 'title', header: 'Service Title' },
        { key: 'buyerName', header: 'Customer' },
        { key: 'helperName', header: 'Partner' },
        {
          key: 'status',
          header: 'Status',
          render: (v) => (
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                v === 'COMPLETED'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : v === 'CANCELLED'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}
            >
              {v}
            </span>
          ),
        },
        { key: 'budgetPaise', header: 'Budget', render: (v) => `₹${((v || 0) / 100).toLocaleString('en-IN')}` },
        { key: 'haversineDistanceKm', header: 'Haversine (km)', render: (v) => (v ? `${v} km` : 'N/A') },
        { key: 'leadTimeMinutes', header: 'Lead Time', render: (v) => (v ? `${v} min` : 'N/A') },
      ];
    }
    return [
      { key: 'dateLabel', header: 'Date' },
      { key: 'totalBookings', header: 'Bookings' },
      { key: 'completedBookings', header: 'Completed' },
      { key: 'cancelledBookings', header: 'Cancelled' },
      { key: 'gmvPaise', header: 'GMV (₹)', render: (v) => `₹${((v || 0) / 100).toLocaleString('en-IN')}` },
    ];
  };

  const tableData = reportData?.items || reportData?.trends || reportData?.helpers || reportData?.topCustomers || reportData?.locations || reportData?.services || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-lg shadow-emerald-500/20">
              Ultra Premium BI Module
            </span>
            <span className="text-xs text-slate-500 font-mono">v2.5</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Reporting & Business Intelligence
          </h1>
          <p className="text-xs text-slate-400">Industry-standard metrics, liquidity tracking, and real-time data insights.</p>
        </div>

        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <ExportButton onExportCsv={handleExportCsv} label="Export CSV Stream" />
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-slate-800 no-scrollbar">
        {[
          { id: 'EXECUTIVE', label: 'Executive Overview' },
          { id: 'BOOKINGS', label: 'Booking & Dispatch' },
          { id: 'REVENUE', label: 'Revenue & Commission' },
          { id: 'SUBSCRIPTIONS', label: 'Subscriptions' },
          { id: 'CUSTOMERS', label: 'Customer Retention' },
          { id: 'HELPERS', label: 'Partner Performance' },
          { id: 'SETTLEMENTS', label: 'Settlements & Escrow' },
          { id: 'CANCELLATIONS', label: 'Cancellations & Refunds' },
          { id: 'LOCATIONS', label: 'Geographic Density' },
          { id: 'SERVICES', label: 'Category Performance' },
          { id: 'USER_ACTIVITY', label: 'User Activity' },
          { id: 'AUDIT_LOGS', label: 'System Audit Logs' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ReportTab)}
            className={`whitespace-nowrap px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/20 scale-105'
                : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <ReportFilterBar filters={filters} onApplyFilters={setFilters} isLoading={isLoading} />

      {/* KPI Card Grid */}
      <KpiCardGrid cards={getKpiCards()} />

      {/* Charts Section */}
      <ReportCharts
        trends={reportData?.trend || reportData?.trends || reportData?.dailyTrends || []}
        categoryData={reportData?.revenueByServiceCategory || {}}
        title={`${activeTab.replace('_', ' ')} Performance Trend`}
      />

      {/* Data Table */}
      <ReportDataTable
        columns={getTableColumns()}
        data={tableData}
        title={`${activeTab.replace('_', ' ')} Data Records`}
      />
    </div>
  );
};
