import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';

interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  timestamp: string;
  remarks: string;
}

interface DetailData {
  taskId: string;
  buyerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  title: string;
  description: string;
  category: string;
  budgetPaise: number;
  addressText: string;
  landmark: string;
  lat: number;
  lng: number;
  status: string;
  createdAt: string;

  aiModel: string;
  aiStatus: string;
  confidence: number;
  riskScore: number;
  qualityScore: number;
  reasons: string[];
  flags: string[];
  rawAiResponse: string;
  reviewDurationMs: number;
  aiReviewedAt: string;

  auditHistory: AuditLog[];
}

export default function AiModerationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [remarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDetail = async () => {
    if (!id || !state.accessToken) return;
    setLoading(true);
    let res = await apiFetch<DetailData>(`/api/v1/admin/moderation/tasks/${id}`, undefined, state.accessToken);
    if (!res.ok) {
      res = await apiFetch<DetailData>(`/api/admin/moderation/tasks/${id}`, undefined, state.accessToken);
    }
    setLoading(false);
    if (res.ok && res.data) {
      setData(res.data);
    }
  };

  useEffect(() => {
    void fetchDetail();
  }, [id, state.accessToken]);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!id || !state.accessToken) return;
    setSubmitting(true);
    let res = await apiFetch(`/api/v1/admin/moderation/tasks/${id}/${action}`, {
      method: 'POST',
      body: JSON.stringify({ remarks })
    }, state.accessToken);
    if (!res.ok) {
      res = await apiFetch(`/api/admin/moderation/tasks/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ remarks })
      }, state.accessToken);
    }
    setSubmitting(false);
    if (res.ok) {
      void fetchDetail();
    } else {
      alert(`Action failed: ${res.error || 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-slate-950 text-slate-100">
        <Nav />
        <div className="py-20 text-center text-slate-400 animate-pulse">Loading task AI analysis...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-dvh bg-slate-950 text-slate-100">
        <Nav />
        <div className="py-20 text-center text-slate-400">Task details not found.</div>
      </div>
    );
  }

  const isHighRisk = data.riskScore >= 60;
  const isMedRisk = data.riskScore >= 30 && data.riskScore < 60;

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <Nav />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <button
          onClick={() => navigate('/moderation')}
          className="mb-6 flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"
        >
          ← Back to Moderation Queue
        </button>

        {/* Title Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white">{data.title}</h1>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-indigo-400">
                {data.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Task ID: {data.taskId}</p>
          </div>

          <div className="flex gap-3">
            <button
              disabled={submitting}
              onClick={() => handleAction('approve')}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-900/30"
            >
              ✅ Approve Task
            </button>
            <button
              disabled={submitting}
              onClick={() => handleAction('reject')}
              className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition shadow-lg shadow-red-900/30"
            >
              🚫 Reject Task
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left 2 Cols: Task & AI Breakdown */}
          <div className="space-y-6 lg:col-span-2">
            {/* AI Analysis Summary */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur shadow-xl">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <span>🤖</span> AI Moderation Analysis
              </h2>

              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="rounded-xl bg-slate-950/80 p-4 border border-slate-800/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Risk Score</span>
                  <div className="mt-1">
                    <span
                      className={`inline-block px-3 py-1 text-base font-black rounded-lg ${
                        isHighRisk
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : isMedRisk
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {data.riskScore} / 100
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950/80 p-4 border border-slate-800/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">AI Confidence</span>
                  <p className="mt-1 text-2xl font-black text-indigo-400">{data.confidence}%</p>
                </div>

                <div className="rounded-xl bg-slate-950/80 p-4 border border-slate-800/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Quality Score</span>
                  <p className="mt-1 text-2xl font-black text-emerald-400">{data.qualityScore} / 100</p>
                </div>
              </div>

              {/* Flags */}
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Detected Risk Flags</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.flags && data.flags.length > 0 ? (
                    data.flags.map((flag, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-red-950/80 px-3 py-1 text-xs font-bold text-red-300 border border-red-800/60"
                      >
                        ⚠️ {flag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">No risk flags detected</span>
                  )}
                </div>
              </div>

              {/* Reasons */}
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Evaluation Reasons</h3>
                <ul className="mt-2 space-y-1 text-xs text-slate-300">
                  {data.reasons && data.reasons.map((r, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-400">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Model Info */}
              <div className="mt-6 border-t border-slate-800/80 pt-4 text-xs text-slate-400 flex justify-between">
                <span>Model Executed: <code className="font-mono text-white">{data.aiModel}</code></span>
                <span>Latency: <code className="font-mono text-white">{data.reviewDurationMs}ms</code></span>
              </div>
            </div>

            {/* Original Task Info */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-base font-bold text-white">Original Task Content</h2>
              <div className="mt-4 space-y-3">
                <div>
                  <span className="text-xs font-semibold text-slate-400">Title</span>
                  <p className="mt-0.5 text-sm font-semibold text-white">{data.title}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400">Description</span>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-300">{data.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-400">Budget</span>
                    <p className="mt-0.5 text-sm font-bold text-emerald-400">₹{data.budgetPaise ? data.budgetPaise / 100 : 0}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400">Address</span>
                    <p className="mt-0.5 text-xs text-slate-300">{data.addressText || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Audit History */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-base font-bold text-white">Decision Audit Trail</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="py-2">Action</th>
                      <th className="py-2">Performed By</th>
                      <th className="py-2">Timestamp</th>
                      <th className="py-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    {data.auditHistory && data.auditHistory.map((log) => (
                      <tr key={log.id}>
                        <td className="py-2.5 font-bold text-white">{log.action}</td>
                        <td className="py-2.5 font-mono text-slate-400">{log.performedBy}</td>
                        <td className="py-2.5 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="py-2.5">{log.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Col: Customer & Raw JSON */}
          <div className="space-y-6">
            {/* Customer Details */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-base font-bold text-white">Customer Details</h2>
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <span className="text-slate-400">Name</span>
                  <p className="font-bold text-white text-sm">{data.customerName}</p>
                </div>
                <div>
                  <span className="text-slate-400">Phone Number</span>
                  <p className="font-mono text-indigo-300 text-sm font-semibold">{data.customerPhone}</p>
                </div>
                <div>
                  <span className="text-slate-400">Email</span>
                  <p className="text-slate-300">{data.customerEmail || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Created At</span>
                  <p className="text-slate-300">{new Date(data.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Raw Response Toggle */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="w-full text-left text-xs font-bold text-indigo-400 hover:underline flex justify-between"
              >
                <span>{showRaw ? 'Hide Raw LLM Response' : 'View Raw LLM Response'}</span>
                <span>{showRaw ? '▲' : '▼'}</span>
              </button>

              {showRaw && (
                <pre className="mt-4 max-h-60 overflow-y-auto rounded-xl bg-slate-950 p-3 font-mono text-[10px] text-slate-300 border border-slate-800">
                  {data.rawAiResponse}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
