import { useCallback, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridReadyEvent, GridApi } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { saveAs } from 'file-saver';

ModuleRegistry.registerModules([AllCommunityModule]);

const customTheme = themeQuartz.withParams({
  accentColor: '#6366f1',
  backgroundColor: 'var(--background)',
  foregroundColor: 'var(--foreground)',
  borderColor: 'rgba(128,128,128,0.15)',
  headerBackgroundColor: 'rgba(128,128,128,0.06)',
  headerFontSize: 13,
  fontSize: 13,
  rowBorder: { color: 'rgba(128,128,128,0.1)' },
  headerFontWeight: 600,
  borderRadius: 12,
  wrapperBorderRadius: 12,
  spacing: 6,
  rowHeight: 44,
  headerHeight: 46,
});

type Props<T> = {
  rowData: T[];
  columnDefs: ColDef<T>[];
  title?: string;
  subtitle?: string;
  height?: number | string;
  quickFilter?: boolean;
  pagination?: boolean;
  pageSize?: number;
  onGridReady?: (api: GridApi<T>) => void;
  domLayout?: 'normal' | 'autoHeight';
  extraContent?: React.ReactNode;
  dateField?: keyof T;
  exportFileName?: string;
  onCellValueChanged?: (event: any) => void;
};

export function DataGrid<T>({
  rowData,
  columnDefs,
  title,
  subtitle,
  height = 520,
  quickFilter = true,
  pagination = true,
  pageSize = 25,
  onGridReady,
  domLayout = 'normal',
  extraContent,
  dateField,
  exportFileName,
  onCellValueChanged,
}: Props<T>) {
  const gridRef = useRef<AgGridReact<T>>(null);
  const [filterText, setFilterText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [gridApi, setGridApi] = useState<GridApi<T> | null>(null);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      floatingFilter: true,
      minWidth: 100,
    }),
    [],
  );

  const handleGridReady = useCallback(
    (event: GridReadyEvent<T>) => {
      event.api.sizeColumnsToFit();
      setGridApi(event.api);
      onGridReady?.(event.api);
    },
    [onGridReady],
  );

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value);
  }, []);

  const filteredRowData = useMemo(() => {
    if (!dateField || (!dateFrom && !dateTo)) return rowData;
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
    return rowData.filter((row) => {
      const raw = row[dateField];
      if (!raw) return false;
      const ts = new Date(raw as any).getTime();
      if (!Number.isFinite(ts)) return false;
      if (fromTs != null && ts < fromTs) return false;
      if (toTs != null && ts > toTs) return false;
      return true;
    });
  }, [dateField, dateFrom, dateTo, rowData]);

  const handleExport = useCallback(() => {
    const rows: T[] = [];
    if (gridApi) {
      gridApi.forEachNodeAfterFilterAndSort((node) => {
        if (node.data) rows.push(node.data);
      });
    } else {
      rows.push(...filteredRowData);
    }
    if (rows.length === 0) return;
    const headers = Array.from(
      rows.reduce<Set<string>>((keys, row) => {
        Object.keys(row as Record<string, unknown>).forEach((key) => keys.add(key));
        return keys;
      }, new Set()),
    );
    const escapeCsvCell = (value: unknown) => {
      let text = value == null
        ? ''
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);
      // Prevent spreadsheet formula injection when an operator opens the CSV.
      if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const csv = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map((row) =>
        headers
          .map((header) => escapeCsvCell((row as Record<string, unknown>)[header]))
          .join(','),
      ),
    ].join('\r\n');
    const requestedName = exportFileName || `${title || 'export'}.csv`;
    const name = requestedName.replace(/\.xlsx?$/i, '.csv');
    saveAs(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), name);
  }, [exportFileName, filteredRowData, gridApi, title]);

  const showToolbar = Boolean(title || subtitle || quickFilter || dateField || exportFileName || extraContent);

  return (
    <div className="space-y-4">
      {showToolbar ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-1">
            {title && <h2 className="text-lg font-semibold tracking-tight">{title}</h2>}
            {subtitle && <p className="text-sm text-foreground/60">{subtitle}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3 justify-start lg:justify-end">
            {extraContent}
            {dateField && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-lg border border-foreground/15 bg-background px-2 py-2 text-xs"
                />
                <span className="text-foreground/40">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-lg border border-foreground/15 bg-background px-2 py-2 text-xs"
                />
              </div>
            )}
            <button
              type="button"
              onClick={handleExport}
              className="rounded-lg border border-foreground/15 bg-foreground/5 px-3 py-2 text-xs font-semibold hover:bg-foreground/10 disabled:opacity-50"
              disabled={filteredRowData.length === 0}
            >
              Export CSV
            </button>
            {quickFilter && (
              <input
                type="text"
                value={filterText}
                onChange={handleFilterChange}
                placeholder="Search…"
                className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm
                placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40
                w-56 transition-shadow"
              />
            )}
          </div>
        </div>
      ) : null}

      <div
        style={domLayout === 'normal' ? { height: typeof height === 'number' ? `${height}px` : height } : undefined}
        className="rounded-2xl border border-foreground/10 bg-card/60 overflow-hidden"
      >
        <AgGridReact<T>
          ref={gridRef}
          theme={customTheme}
          rowData={filteredRowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={filterText}
          pagination={pagination}
          paginationPageSize={pageSize}
          paginationPageSizeSelector={[10, 25, 50, 100]}
          onGridReady={handleGridReady}
          onCellValueChanged={onCellValueChanged}
          animateRows={true}
          domLayout={domLayout}
          suppressCellFocus={true}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          rowClassRules={{
            'ag-row-alt': (params) => (params.node.rowIndex ?? 0) % 2 === 1,
          }}
          noRowsOverlayComponent={() => (
            <div className="text-sm text-foreground/60 py-10">No data to display.</div>
          )}
        />
      </div>
    </div>
  );
}
