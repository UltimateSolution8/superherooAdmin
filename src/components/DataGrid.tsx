'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridReadyEvent, GridApi } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

const customTheme = themeQuartz
    .withParams({
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
}: Props<T>) {
    const gridRef = useRef<AgGridReact<T>>(null);
    const [filterText, setFilterText] = useState('');

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
            onGridReady?.(event.api);
        },
        [onGridReady],
    );

    const handleFilterChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setFilterText(value);
        },
        [],
    );

    return (
        <div className="space-y-4">
            {(title || subtitle || quickFilter) && (
                <div className="flex items-end justify-between gap-4">
                    <div className="space-y-1">
                        {title && <h2 className="text-lg font-semibold tracking-tight">{title}</h2>}
                        {subtitle && <p className="text-sm text-foreground/60">{subtitle}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                        {extraContent}
                        {quickFilter && (
                            <input
                                type="text"
                                value={filterText}
                                onChange={handleFilterChange}
                                placeholder="Quick search…"
                                className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm
                  placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40
                  w-64 transition-shadow"
                            />
                        )}
                    </div>
                </div>
            )}

            <div
                style={domLayout === 'normal' ? { height: typeof height === 'number' ? `${height}px` : height } : undefined}
                className="rounded-xl border border-foreground/10 overflow-hidden"
            >
                <AgGridReact<T>
                    ref={gridRef}
                    theme={customTheme}
                    rowData={rowData}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    quickFilterText={filterText}
                    pagination={pagination}
                    paginationPageSize={pageSize}
                    paginationPageSizeSelector={[10, 25, 50, 100]}
                    onGridReady={handleGridReady}
                    animateRows={true}
                    domLayout={domLayout}
                    suppressCellFocus={true}
                    rowSelection="multiple"
                    suppressRowClickSelection={true}
                    noRowsOverlayComponent={() => (
                        <div className="text-sm text-foreground/60 py-10">No data to display.</div>
                    )}
                />
            </div>
        </div>
    );
}
