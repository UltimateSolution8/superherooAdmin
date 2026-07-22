import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';

export interface ModerationTask {
  taskId: string;
  buyerId: string;
  customerName: string;
  customerPhone: string;
  title: string;
  description: string;
  category: string;
  budgetPaise: number;
  addressText: string;
  status: string;
  aiStatus: string;
  riskScore: number;
  confidence: number;
  qualityScore: number;
  flags: string[];
  reasons: string[];
  modelUsed: string;
  createdAt: string;
}

interface PageResponse {
  content: ModerationTask[];
  totalPages: number;
  totalElements: number;
  number: number;
}

export default function AiModerationQueuePage() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ModerationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ADMIN_REVIEW');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedTask, setSelectedTask] = useState<ModerationTask | null>(null);
  const [modalType, setModalType] = useState<'approve' | 'reject' | 'edit' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchQueue = async () => {
    if (!state.accessToken) return;
    setLoading(true);
    const res = await apiFetch<PageResponse>(
      `/api/v1/admin/moderation/queue?status=${statusFilter}&page=${page}&size=20`,
      undefined,
      state.accessToken
    );
    setLoading(false);
    if (res.ok && res.data) {
      setTasks(res.data.content || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalElements(res.data.totalElements || 0);
    }
  };

  useEffect(() => {
    void fetchQueue();
  }, [state.accessToken, statusFilter, page]);

  const handleAction = async (action: 'approve' | 'reject' | 'edit-approve') => {
    if (!selectedTask || !state.accessToken) return;
    setSubmitting(true);
    let url = `/api/v1/admin/moderation/tasks/${selectedTask.taskId}/${action}`;
    let method = 'POST';
    let body: any = { remarks };

    if (action === 'edit-approve') {
      url = `/api/v1/admin/moderation/tasks/${selectedTask.taskId}/edit-approve`;
      method = 'PUT';
      body = { title: editTitle, description: editDesc, remarks };
    }

    const res = await apiFetch(url, { method, body: JSON.stringify(body) }, state.accessToken);
    setSubmitting(false);
    if (res.ok) {
      setModalType(null);
      setSelectedTask(null);
      setRemarks('');
      void fetchQueue();
    } else {
      alert(`Action failed: ${res.error || 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <Nav />
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-extrabold text-white">
              <span>🤖</span> AI Moderation & Review Queue
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Enterprise AI Safety Agent (`z-ai/glm-4.7-flash-free` primary, `moonshotai/kimi-k3-free` fallback)
            </p>
          </div>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-inner focus:border-indigo-500 focus:outline-none"
            >
              <option value="ADMIN_REVIEW">⚠️ Needs Admin Review (Queue)</option>
              <option value="AI_PENDING">⏳ AI Moderation Pending</option>
              <option value="AI_APPROVED">✅ AI Auto-Approved</option>
              <option value="ADMIN_APPROVED">🛡️ Admin Approved</option>
              <option value="ADMIN_REJECTED">🚫 Admin Rejected</option>
              <option value="ALL">🌐 All Tasks</option>
            </select>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Pending Review</span>
            <p className="mt-2 text-3xl font-black text-white">{totalElements}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Primary AI Model</span>
            <p className="mt-2 text-xl font-bold text-slate-200">z-ai/glm-4.7-flash-free</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Fallback AI Model</span>
            <p className="mt-2 text-xl font-bold text-slate-200">moonshotai/kimi-k3-free</p>
          </div>
        </div>

        {/* Queue Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 shadow-2xl">
          {loading ? (
            <div className="py-20 text-center text-slate-400 animate-pulse">Loading moderation queue...</div>
          ) : tasks.length === 0 ? (
            <div className="py-20 text-center">
              <span className="text-4xl">🎉</span>
              <p className="mt-2 font-medium text-slate-300">No tasks in this queue!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Task / Customer</th>
                    <th className="px-6 py-4">Risk & Confidence</th>
                    <th className="px-6 py-4">Flags / Reasons</th>
                    <th className="px-6 py-4">AI Model</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tasks.map((task) => {
                    const isHighRisk = task.riskScore >= 60;
                    const isMedRisk = task.riskScore >= 30 && task.riskScore < 60;

                    return (
                      <tr key={task.taskId} className="transition-colors hover:bg-slate-800/40">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">{task.title}</div>
                          <div className="mt-1 line-clamp-1 text-xs text-slate-400">{task.description}</div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                            <span className="font-medium text-indigo-400">{task.customerName}</span>
                            <span>•</span>
                            <span>{task.customerPhone}</span>
                            <span>•</span>
                            <span className="text-slate-500">₹{task.budgetPaise ? task.budgetPaise / 100 : 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block px-2.5 py-1 text-xs font-extrabold rounded-lg ${
                                isHighRisk
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : isMedRisk
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              Risk: {task.riskScore}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">
                              Conf: {task.confidence}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {task.flags && task.flags.length > 0 ? (
                              task.flags.map((flag, idx) => (
                                <span key={idx} className="rounded bg-red-950/80 px-2 py-0.5 text-[11px] font-semibold text-red-300 border border-red-800/50">
                                  {flag}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-500 italic">No risk flags</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-400">
                          {task.modelUsed}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-block rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                            {task.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/moderation/${task.taskId}`)}
                              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 transition"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setModalType('approve');
                              }}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setEditTitle(task.title);
                                setEditDesc(task.description);
                                setModalType('edit');
                              }}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setModalType('reject');
                              }}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4">
            <span className="text-xs text-slate-400">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {modalType && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white">
              {modalType === 'approve' && '✅ Approve Task'}
              {modalType === 'reject' && '🚫 Reject Task'}
              {modalType === 'edit' && '✏️ Edit & Approve Task'}
            </h3>
            <p className="mt-1 text-xs text-slate-400">Task ID: {selectedTask.taskId}</p>

            {modalType === 'edit' && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Description</label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-400">Admin Remarks</label>
              <textarea
                rows={2}
                placeholder="Enter remarks for audit trail..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModalType(null)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={() =>
                  handleAction(
                    modalType === 'approve' ? 'approve' : modalType === 'reject' ? 'reject' : 'edit-approve'
                  )
                }
                className={`rounded-xl px-5 py-2 text-xs font-bold text-white transition ${
                  modalType === 'reject'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {submitting ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
