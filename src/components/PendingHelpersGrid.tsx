'use client';

import { useMemo } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { DataGrid } from '@/components/DataGrid';

type PendingHelper = {
    helperId: string;
    phone: string | null;
    kycStatus: string;
    kycFullName: string | null;
    kycIdNumber: string | null;
    kycDocFrontUrl: string | null;
    kycDocBackUrl: string | null;
    kycSelfieUrl: string | null;
    kycSubmittedAt: string | null;
    createdAt: string;
};

function DocsCellRenderer(params: ICellRendererParams<PendingHelper>) {
    const data = params.data;
    if (!data) return null;
    return (
        <div className="flex items-center gap-2">
            {data.kycDocFrontUrl ? (
                <a href={data.kycDocFrontUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline text-xs">Front</a>
            ) : (
                <span className="text-foreground/30 text-xs">Front</span>
            )}
            {data.kycDocBackUrl ? (
                <a href={data.kycDocBackUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline text-xs">Back</a>
            ) : (
                <span className="text-foreground/30 text-xs">Back</span>
            )}
            {data.kycSelfieUrl ? (
                <a href={data.kycSelfieUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline text-xs">Selfie</a>
            ) : (
                <span className="text-foreground/30 text-xs">Selfie</span>
            )}
        </div>
    );
}

function ActionsCellRenderer(params: ICellRendererParams<PendingHelper>) {
    const data = params.data;
    if (!data) return null;

    const handleApprove = async () => {
        try {
            const res = await fetch('/api/admin/helpers/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ helperId: data.helperId }),
            });
            if (res.ok) {
                window.location.reload();
            }
        } catch {
            alert('Failed to approve helper');
        }
    };

    const handleReject = async () => {
        const reason = prompt('Rejection reason:', 'Rejected by admin');
        if (reason === null) return;
        try {
            const res = await fetch('/api/admin/helpers/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ helperId: data.helperId, reason }),
            });
            if (res.ok) {
                window.location.reload();
            }
        } catch {
            alert('Failed to reject helper');
        }
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleApprove}
                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
            >
                Approve
            </button>
            <button
                onClick={handleReject}
                className="rounded-lg border border-red-400/30 px-3 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
                Reject
            </button>
        </div>
    );
}

export function PendingHelpersGrid({ helpers }: { helpers: PendingHelper[] }) {
    const columnDefs = useMemo<ColDef<PendingHelper>[]>(
        () => [
            {
                headerName: 'Helper ID',
                field: 'helperId',
                width: 140,
                cellClass: 'font-mono text-xs',
                valueFormatter: (p) => p.value ? `${(p.value as string).substring(0, 8)}…` : '-',
            },
            { headerName: 'Full Name', field: 'kycFullName', flex: 1 },
            { headerName: 'Phone', field: 'phone', width: 140 },
            { headerName: 'ID Number', field: 'kycIdNumber', width: 140 },
            {
                headerName: 'Documents',
                field: 'kycDocFrontUrl',
                cellRenderer: DocsCellRenderer,
                filter: false,
                sortable: false,
                width: 180,
            },
            {
                headerName: 'Submitted',
                field: 'kycSubmittedAt',
                width: 160,
                valueFormatter: (p) => p.value ? new Date(p.value as string).toLocaleString() : '-',
            },
            {
                headerName: 'Created',
                field: 'createdAt',
                width: 160,
                valueFormatter: (p) => p.value ? new Date(p.value as string).toLocaleString() : '-',
                sort: 'desc',
            },
            {
                headerName: 'Actions',
                field: 'helperId',
                cellRenderer: ActionsCellRenderer,
                filter: false,
                sortable: false,
                width: 200,
                pinned: 'right',
            },
        ],
        [],
    );

    return (
        <DataGrid<PendingHelper>
            rowData={helpers}
            columnDefs={columnDefs}
            title="Pending Helpers"
            subtitle="Review and approve helper KYC applications."
            height={600}
        />
    );
}
