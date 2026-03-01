'use client';

import { useMemo } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { DataGrid } from '@/components/DataGrid';

type Task = {
    id: string;
    buyerId: string;
    title: string;
    description: string;
    urgency: string;
    timeMinutes: number;
    budgetPaise: number;
    lat: number;
    lng: number;
    addressText: string | null;
    status: string;
    assignedHelperId: string | null;
    createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
    SEARCHING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    ASSIGNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    ARRIVED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    STARTED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function StatusRenderer(params: ICellRendererParams<Task>) {
    const status = params.value as string;
    const cls = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
    return (
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
            {status}
        </span>
    );
}

function ActionRenderer(params: ICellRendererParams<Task>) {
    const data = params.data;
    if (!data) return null;
    return (
        <a
            href={`/tasks/${encodeURIComponent(data.id)}`}
            className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
        >
            Details
        </a>
    );
}

export function TasksGrid({ tasks }: { tasks: Task[] }) {
    const columnDefs = useMemo<ColDef<Task>[]>(
        () => [
            {
                headerName: 'Task ID',
                field: 'id',
                width: 140,
                cellClass: 'font-mono text-xs',
                valueFormatter: (p) => p.value ? `${(p.value as string).substring(0, 8)}…` : '-',
            },
            { headerName: 'Title', field: 'title', flex: 1, minWidth: 180 },
            {
                headerName: 'Status',
                field: 'status',
                width: 130,
                cellRenderer: StatusRenderer,
            },
            { headerName: 'Urgency', field: 'urgency', width: 110 },
            {
                headerName: 'Budget (₹)',
                field: 'budgetPaise',
                width: 120,
                valueFormatter: (p) => p.value != null ? `₹${(Number(p.value) / 100).toFixed(0)}` : '-',
            },
            {
                headerName: 'Time (min)',
                field: 'timeMinutes',
                width: 110,
            },
            {
                headerName: 'Buyer ID',
                field: 'buyerId',
                width: 140,
                cellClass: 'font-mono text-xs',
                valueFormatter: (p) => p.value ? `${(p.value as string).substring(0, 8)}…` : '-',
            },
            {
                headerName: 'Helper ID',
                field: 'assignedHelperId',
                width: 140,
                cellClass: 'font-mono text-xs',
                valueFormatter: (p) => p.value ? `${(p.value as string).substring(0, 8)}…` : '-',
            },
            {
                headerName: 'Created',
                field: 'createdAt',
                width: 170,
                valueFormatter: (p) => p.value ? new Date(p.value as string).toLocaleString() : '-',
                sort: 'desc',
            },
            {
                headerName: '',
                field: 'id',
                cellRenderer: ActionRenderer,
                filter: false,
                sortable: false,
                width: 100,
                pinned: 'right',
            },
        ],
        [],
    );

    return (
        <DataGrid<Task>
            rowData={tasks}
            columnDefs={columnDefs}
            title="Tasks"
            subtitle="View and manage all tasks across the platform."
            height={640}
        />
    );
}
