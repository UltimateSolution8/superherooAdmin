import React, { useState } from 'react';
import { PhotoLightboxModal } from './PhotoLightboxModal';

export interface ColumnDef {
  key: string;
  header: string;
  render?: (val: any, row: any) => React.ReactNode;
}

interface ReportDataTableProps {
  columns: ColumnDef[];
  data: any[];
  title?: string;
  emptyMessage?: string;
}

export const ReportDataTable: React.FC<ReportDataTableProps> = ({
  columns,
  data,
  title = "Report Data Logs",
  emptyMessage = "No records found for the selected filter timeframe.",
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPhotoRow, setSelectedPhotoRow] = useState<any | null>(null);
  const pageSize = 15;

  const filteredData = data.filter((row) => {
    if (!searchTerm) return true;
    const str = JSON.stringify(row).toLowerCase();
    return str.includes(searchTerm.toLowerCase());
  });

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden mb-6">
      {/* Table Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-slate-800 bg-slate-950/40">
        <div>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">{title}</h3>
          <p className="text-xs text-slate-400">Showing {filteredData.length} records</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search report records..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 text-xs text-slate-200 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 focus:outline-none focus:border-emerald-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              {columns.map((col) => (
                <th key={col.key} className="p-3.5 whitespace-nowrap">
                  {col.header}
                </th>
              ))}
              <th className="p-3.5 text-right">Selfies / Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-8 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition">
                  {columns.map((col) => (
                    <td key={col.key} className="p-3.5 whitespace-nowrap">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] !== null && row[col.key] !== undefined ? String(row[col.key]) : 'N/A')}
                    </td>
                  ))}
                  <td className="p-3.5 text-right">
                    {(row.arrivalSelfieUrl || row.completionSelfieUrl) ? (
                      <button
                        onClick={() => setSelectedPhotoRow(row)}
                        className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-md transition font-semibold"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        View Photos
                      </button>
                    ) : (
                      <span className="text-slate-600 text-[11px]">No Photo</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between p-3.5 border-t border-slate-800 bg-slate-950/40 text-xs">
        <span className="text-slate-400">
          Page <strong className="text-slate-200">{currentPage}</strong> of <strong className="text-slate-200">{totalPages}</strong>
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition"
          >
            Next
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedPhotoRow && (
        <PhotoLightboxModal
          isOpen={!!selectedPhotoRow}
          onClose={() => setSelectedPhotoRow(null)}
          title={`Booking ID: ${selectedPhotoRow.id || selectedPhotoRow.title || ''}`}
          arrivalUrl={selectedPhotoRow.arrivalSelfieUrl}
          completionUrl={selectedPhotoRow.completionSelfieUrl}
        />
      )}
    </div>
  );
};
