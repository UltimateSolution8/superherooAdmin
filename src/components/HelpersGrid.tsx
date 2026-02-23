'use client';

import { useMemo } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { DataGrid } from '@/components/DataGrid';

type Helper = {
    id: string;
    role: string;
    status: string;
    phone: string | null;
    email: string | null;
    displayName: string | null;
    createdAt: string;
    helperKycStatus: string | null;
    helperKycFullName: string | null;
    helperKycIdNumber: string | null;
    helperKycDocFrontUrl: string | null;
    helperKycDocBackUrl: string | null;
    helperKycSelfieUrl: string | null;
    helperKycSubmittedAt: string | null;
};

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const KYC_COLORS: Record<string, string> = {
    APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function StatusRenderer(params: ICellRendererParams<Helper>) {
    const status = params.value as string;
    const cls = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
    return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>;
}

function KycRenderer(params: ICellRendererParams<Helper>) {
    const status = params.value as string;
    if (!status) return <span className="text-xs text-foreground/30">-</span>;
    const cls = KYC_COLORS[status] || 'bg-gray-100 text-gray-800';
    return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>;
}

function DocsRenderer(params: ICellRendererParams<Helper>) {
    const d = params.data;
    if (!d) return null;
    return (
        <div className="flex items-center gap-2">
            {d.helperKycDocFrontUrl ? (
                <a href={d.helperKycDocFrontUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline text-xs">Front</a>
            ) : <span className="text-foreground/30 text-xs">Front</span>}
            {d.helperKycDocBackUrl ? (
                <a href={d.helperKycDocBackUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline text-xs">Back</a>
            ) : <span className="text-foreground/30 text-xs">Back</span>}
            {d.helperKycSelfieUrl ? (
                <a href={d.helperKycSelfieUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline text-xs">Selfie</a>
            ) : <span className="text-foreground/30 text-xs">Selfie</span>}
        </div>
    );
}

function ActionRenderer(params: ICellRendererParams<Helper>) {
    const d = params.data;
    if (!d) return null;

    const handleDelete = async () => {
        if (!confirm(`Delete helper ${d.displayName || d.id}?`)) return;
        try {
            const res = await fetch('/api/admin/helpers/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ helperId: d.id }),
            });
            if (res.ok) window.location.reload();
        } catch {
            alert('Failed to delete helper');
        }
    };

    return (
        <button
            onClick={handleDelete}
            className="rounded-lg border border-red-400/30 px-3 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
            Delete
        </button>
    );
}

export function HelpersGrid({ helpers }: { helpers: Helper[] }) {
    const columnDefs = useMemo<ColDef<Helper>[]>(
        () => [
            {
                headerName: 'ID',
                field: 'id',
                width: 140,
                cellClass: 'font-mono text-xs',
                valueFormatter: (p) => p.value ? `${(p.value as string).substring(0, 8)}…` : '-',
            },
            { headerName: 'Display Name', field: 'displayName', flex: 1 },
            { headerName: 'Phone', field: 'phone', width: 140 },
            { headerName: 'Email', field: 'email', width: 180 },
            {
                headerName: 'Status',
                field: 'status',
                width: 120,
                cellRenderer: StatusRenderer,
            },
            {
                headerName: 'KYC',
                field: 'helperKycStatus',
                width: 120,
                cellRenderer: KycRenderer,
            },
            { headerName: 'KYC Name', field: 'helperKycFullName', width: 150 },
            {
                headerName: 'Documents',
                field: 'helperKycDocFrontUrl',
                cellRenderer: DocsRenderer,
                filter: false,
                sortable: false,
                width: 180,
            },
            {
                headerName: 'Created',
                field: 'createdAt',
                width: 160,
                valueFormatter: (p) => p.value ? new Date(p.value as string).toLocaleString() : '-',
                sort: 'desc',
            },
            {
                headerName: '',
                field: 'id',
                cellRenderer: ActionRenderer,
                filter: false,
                sortable: false,
                width: 90,
                pinned: 'right',
            },
        ],
        [],
    );

    return (
        <DataGrid<Helper>
            rowData={helpers}
            columnDefs={columnDefs}
            title="All Helpers"
            subtitle="Manage helper accounts, contact details, and KYC status."
            height={640}
        />
    );
}
