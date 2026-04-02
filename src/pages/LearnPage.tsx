import { useCallback, useMemo, useState } from 'react';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';

type Material = {
  id: string;
  title: string;
  description?: string | null;
  contentType: 'VIDEO' | 'PDF' | 'AUDIO' | 'LINK';
  resourceUrl: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  active: boolean;
  totalLearners?: number | null;
  completedLearners?: number | null;
  createdAt: string;
};

type ProgressRow = {
  id: string;
  materialId: string;
  materialTitle?: string | null;
  helperId: string;
  helperName?: string | null;
  status: string;
  progressPercent: number;
  viewedSeconds: number;
  completedAt?: string | null;
  updatedAt: string;
};

type Assessment = {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  maxAttempts: number;
  timeLimitMinutes?: number | null;
  passPercentage: number;
  questionSchema: unknown;
  active: boolean;
  createdAt: string;
};

type Attempt = {
  id: string;
  assessmentId: string;
  assessmentTitle?: string | null;
  helperId: string;
  helperName?: string | null;
  attemptNo: number;
  status: string;
  scorePercentage?: number | null;
  correctCount?: number | null;
  totalCount?: number | null;
  submittedAt?: string | null;
  createdAt?: string | null;
};

const SAMPLE_SCHEMA = JSON.stringify(
  [
    {
      id: 'q1',
      type: 'single_choice',
      label: 'What is the safe first step before entering customer premises?',
      required: true,
      options: ['Verify task details in app', 'Call a friend', 'Skip safety checks'],
      correctAnswer: 'Verify task details in app',
      points: 2,
    },
    {
      id: 'q2',
      type: 'multiple_choice',
      label: 'Select mandatory safety actions',
      required: true,
      options: ['Wear ID card', 'Collect upfront cash without consent', 'Confirm OTP at correct stage'],
      correctAnswer: ['Wear ID card', 'Confirm OTP at correct stage'],
      points: 3,
    },
    {
      id: 'q3',
      type: 'boolean',
      label: 'Should helper share customer phone publicly?',
      required: true,
      correctAnswer: false,
      points: 1,
      dependsOnQuestionId: 'q2',
      dependsOnValue: ['Wear ID card'],
    },
  ],
  null,
  2,
);

type TabKey = 'materials' | 'progress' | 'assessments';

export default function LearnPage() {
  const { state } = useAuth();
  const token = state.accessToken;

  const [tab, setTab] = useState<TabKey>('materials');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [mTitle, setMTitle] = useState('');
  const [mDescription, setMDescription] = useState('');
  const [mType, setMType] = useState<Material['contentType']>('VIDEO');
  const [mUrl, setMUrl] = useState('');
  const [mThumbnail, setMThumbnail] = useState('');
  const [mDuration, setMDuration] = useState('');
  const [mActive, setMActive] = useState(true);

  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [progressMaterialId, setProgressMaterialId] = useState('');
  const [progressHelperId, setProgressHelperId] = useState('');

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);
  const [aTitle, setATitle] = useState('');
  const [aDescription, setADescription] = useState('');
  const [aInstructions, setAInstructions] = useState('');
  const [aMaxAttempts, setAMaxAttempts] = useState('1');
  const [aTimeLimit, setATimeLimit] = useState('30');
  const [aPassPercentage, setAPassPercentage] = useState('60');
  const [aSchema, setASchema] = useState(SAMPLE_SCHEMA);
  const [aActive, setAActive] = useState(true);
  const [attemptRows, setAttemptRows] = useState<Attempt[]>([]);
  const [attemptAssessmentTitle, setAttemptAssessmentTitle] = useState<string | null>(null);

  const clearAlerts = () => {
    setError(null);
    setNotice(null);
  };

  const resetMaterialForm = () => {
    setEditingMaterialId(null);
    setMTitle('');
    setMDescription('');
    setMType('VIDEO');
    setMUrl('');
    setMThumbnail('');
    setMDuration('');
    setMActive(true);
  };

  const resetAssessmentForm = () => {
    setEditingAssessmentId(null);
    setATitle('');
    setADescription('');
    setAInstructions('');
    setAMaxAttempts('1');
    setATimeLimit('30');
    setAPassPercentage('60');
    setASchema(SAMPLE_SCHEMA);
    setAActive(true);
  };

  const loadMaterials = useCallback(async () => {
    setBusy(true);
    clearAlerts();
    try {
      const res = await apiFetch<Material[]>('/api/v1/admin/learn/materials', undefined, token);
      if (!res.ok) {
        setError(res.errorText);
        return;
      }
      setMaterials(res.data ?? []);
      setNotice(`Loaded ${res.data?.length ?? 0} training material(s).`);
    } finally {
      setBusy(false);
    }
  }, [token]);

  const saveMaterial = useCallback(async () => {
    clearAlerts();
    if (!mTitle.trim() || !mUrl.trim()) {
      setError('Title and URL are required.');
      return;
    }
    const duration = mDuration.trim() ? Number(mDuration.trim()) : null;
    if (duration != null && (!Number.isFinite(duration) || duration < 0)) {
      setError('Duration must be zero or more.');
      return;
    }
    const payload = {
      title: mTitle.trim(),
      description: mDescription.trim() || null,
      contentType: mType,
      resourceUrl: mUrl.trim(),
      thumbnailUrl: mThumbnail.trim() || null,
      durationSeconds: duration == null ? null : Math.round(duration),
      active: mActive,
    };
    setBusy(true);
    try {
      const path = editingMaterialId
        ? `/api/v1/admin/learn/materials/${editingMaterialId}`
        : '/api/v1/admin/learn/materials';
      const method = editingMaterialId ? 'PUT' : 'POST';
      const res = await apiFetch<Material>(
        path,
        { method, body: JSON.stringify(payload) },
        token,
      );
      if (!res.ok) {
        setError(res.errorText);
        return;
      }
      setNotice(editingMaterialId ? 'Material updated.' : 'Material created.');
      resetMaterialForm();
      await loadMaterials();
    } finally {
      setBusy(false);
    }
  }, [editingMaterialId, loadMaterials, mActive, mDescription, mDuration, mThumbnail, mTitle, mType, mUrl, token]);

  const loadProgress = useCallback(async () => {
    setBusy(true);
    clearAlerts();
    try {
      const qs = new URLSearchParams();
      if (progressMaterialId.trim()) qs.set('materialId', progressMaterialId.trim());
      if (progressHelperId.trim()) qs.set('helperId', progressHelperId.trim());
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      const res = await apiFetch<ProgressRow[]>(`/api/v1/admin/learn/progress${suffix}`, undefined, token);
      if (!res.ok) {
        setError(res.errorText);
        return;
      }
      setProgressRows(res.data ?? []);
      setNotice(`Loaded ${res.data?.length ?? 0} progress record(s).`);
    } finally {
      setBusy(false);
    }
  }, [progressHelperId, progressMaterialId, token]);

  const loadAssessments = useCallback(async () => {
    setBusy(true);
    clearAlerts();
    try {
      const res = await apiFetch<Assessment[]>('/api/v1/admin/learn/assessments', undefined, token);
      if (!res.ok) {
        setError(res.errorText);
        return;
      }
      setAssessments(res.data ?? []);
      setNotice(`Loaded ${res.data?.length ?? 0} assessment(s).`);
    } finally {
      setBusy(false);
    }
  }, [token]);

  const saveAssessment = useCallback(async () => {
    clearAlerts();
    let parsedSchema: unknown;
    try {
      parsedSchema = JSON.parse(aSchema);
    } catch {
      setError('Question schema JSON is invalid.');
      return;
    }
    const maxAttempts = Number(aMaxAttempts);
    const passPercentage = Number(aPassPercentage);
    const timeLimitMinutes = aTimeLimit.trim() ? Number(aTimeLimit) : null;
    if (!aTitle.trim()) {
      setError('Assessment title is required.');
      return;
    }
    if (!Number.isFinite(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) {
      setError('Max attempts must be between 1 and 20.');
      return;
    }
    if (!Number.isFinite(passPercentage) || passPercentage < 0 || passPercentage > 100) {
      setError('Pass percentage must be between 0 and 100.');
      return;
    }
    if (timeLimitMinutes != null && (!Number.isFinite(timeLimitMinutes) || timeLimitMinutes < 1 || timeLimitMinutes > 240)) {
      setError('Time limit must be between 1 and 240 minutes.');
      return;
    }

    const payload = {
      title: aTitle.trim(),
      description: aDescription.trim() || null,
      instructions: aInstructions.trim() || null,
      maxAttempts: Math.round(maxAttempts),
      timeLimitMinutes: timeLimitMinutes == null ? null : Math.round(timeLimitMinutes),
      passPercentage: Math.round(passPercentage),
      questionSchema: parsedSchema,
      active: aActive,
    };
    setBusy(true);
    try {
      const path = editingAssessmentId
        ? `/api/v1/admin/learn/assessments/${editingAssessmentId}`
        : '/api/v1/admin/learn/assessments';
      const method = editingAssessmentId ? 'PUT' : 'POST';
      const res = await apiFetch<Assessment>(
        path,
        { method, body: JSON.stringify(payload) },
        token,
      );
      if (!res.ok) {
        setError(res.errorText);
        return;
      }
      setNotice(editingAssessmentId ? 'Assessment updated.' : 'Assessment created.');
      resetAssessmentForm();
      await loadAssessments();
    } finally {
      setBusy(false);
    }
  }, [aActive, aDescription, aInstructions, aMaxAttempts, aPassPercentage, aSchema, aTimeLimit, aTitle, editingAssessmentId, loadAssessments, token]);

  const loadAttempts = useCallback(async (assessment: Assessment) => {
    setBusy(true);
    clearAlerts();
    try {
      const res = await apiFetch<Attempt[]>(
        `/api/v1/admin/learn/assessments/${assessment.id}/attempts`,
        undefined,
        token,
      );
      if (!res.ok) {
        setError(res.errorText);
        return;
      }
      setAttemptRows(res.data ?? []);
      setAttemptAssessmentTitle(assessment.title);
      setNotice(`Loaded ${res.data?.length ?? 0} attempt(s) for "${assessment.title}".`);
    } finally {
      setBusy(false);
    }
  }, [token]);

  const completionRate = useMemo(() => {
    const total = materials.reduce((acc, m) => acc + (m.totalLearners ?? 0), 0);
    const completed = materials.reduce((acc, m) => acc + (m.completedLearners ?? 0), 0);
    if (total <= 0) return 0;
    return Math.round((completed * 100) / total);
  }, [materials]);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Learn & Assessment</h1>
          <p className="text-sm text-foreground/70">
            Upload training content, monitor helper completion, and run scored assessments.
          </p>
        </header>

        {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}
        {notice ? <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p> : null}

        <section className="rounded-2xl border border-foreground/10 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['materials', 'progress', 'assessments'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  tab === k
                    ? 'bg-foreground/10 text-foreground'
                    : 'bg-background text-foreground/70 hover:bg-foreground/5'
                }`}
              >
                {k === 'materials' ? 'Training Materials' : k === 'progress' ? 'Learning Progress' : 'Assessments'}
              </button>
            ))}
            <span className="ml-auto text-xs text-foreground/60">
              Completion rate: {completionRate}%
            </span>
          </div>
        </section>

        {tab === 'materials' ? (
          <section className="grid gap-4 lg:grid-cols-[380px,1fr]">
            <div className="rounded-2xl border border-foreground/10 p-4 space-y-3">
              <h2 className="text-sm font-semibold">{editingMaterialId ? 'Edit Material' : 'New Material'}</h2>
              <input className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm" value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder="Title" />
              <textarea className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm min-h-20" value={mDescription} onChange={(e) => setMDescription(e.target.value)} placeholder="Description" />
              <div className="grid grid-cols-2 gap-2">
                <select className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm" value={mType} onChange={(e) => setMType(e.target.value as Material['contentType'])}>
                  <option value="VIDEO">VIDEO</option>
                  <option value="PDF">PDF</option>
                  <option value="AUDIO">AUDIO</option>
                  <option value="LINK">LINK</option>
                </select>
                <input className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm" value={mDuration} onChange={(e) => setMDuration(e.target.value)} placeholder="Duration (sec)" />
              </div>
              <input className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm" value={mUrl} onChange={(e) => setMUrl(e.target.value)} placeholder="Resource URL" />
              <input className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm" value={mThumbnail} onChange={(e) => setMThumbnail(e.target.value)} placeholder="Thumbnail URL (optional)" />
              <label className="flex items-center gap-2 text-xs text-foreground/80">
                <input type="checkbox" checked={mActive} onChange={(e) => setMActive(e.target.checked)} />
                Active
              </label>
              <div className="flex gap-2">
                <button type="button" className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" onClick={() => void saveMaterial()} disabled={busy}>
                  {editingMaterialId ? 'Update' : 'Create'}
                </button>
                <button type="button" className="rounded-lg border border-foreground/15 px-3 py-2 text-xs font-semibold" onClick={resetMaterialForm}>
                  Reset
                </button>
                <button type="button" className="ml-auto rounded-lg border border-foreground/15 px-3 py-2 text-xs font-semibold" onClick={() => void loadMaterials()}>
                  Refresh
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-foreground/10 p-4 space-y-3">
              <h2 className="text-sm font-semibold">Materials</h2>
              <div className="overflow-auto">
                <table className="w-full min-w-[740px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-foreground/10 text-foreground/60">
                      <th className="py-2 pr-3">Title</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Learners</th>
                      <th className="py-2 pr-3">Completed</th>
                      <th className="py-2 pr-3">Created</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m) => (
                      <tr key={m.id} className="border-b border-foreground/5">
                        <td className="py-2 pr-3">
                          <div className="font-semibold">{m.title}</div>
                          <div className="text-foreground/60 truncate max-w-[280px]">{m.resourceUrl}</div>
                        </td>
                        <td className="py-2 pr-3">{m.contentType}</td>
                        <td className="py-2 pr-3">{m.active ? 'ACTIVE' : 'INACTIVE'}</td>
                        <td className="py-2 pr-3">{m.totalLearners ?? 0}</td>
                        <td className="py-2 pr-3">{m.completedLearners ?? 0}</td>
                        <td className="py-2 pr-3">{new Date(m.createdAt).toLocaleString()}</td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            className="rounded-md border border-foreground/20 px-2 py-1"
                            onClick={() => {
                              setEditingMaterialId(m.id);
                              setMTitle(m.title);
                              setMDescription(m.description || '');
                              setMType(m.contentType);
                              setMUrl(m.resourceUrl);
                              setMThumbnail(m.thumbnailUrl || '');
                              setMDuration(m.durationSeconds == null ? '' : String(m.durationSeconds));
                              setMActive(Boolean(m.active));
                            }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!materials.length ? <p className="py-6 text-sm text-foreground/60">No training material found.</p> : null}
              </div>
            </div>
          </section>
        ) : null}

        {tab === 'progress' ? (
          <section className="rounded-2xl border border-foreground/10 p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <input className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm" value={progressMaterialId} onChange={(e) => setProgressMaterialId(e.target.value)} placeholder="Filter by Material UUID (optional)" />
              <input className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm" value={progressHelperId} onChange={(e) => setProgressHelperId(e.target.value)} placeholder="Filter by Helper UUID (optional)" />
              <button type="button" className="rounded-lg border border-foreground/15 px-3 py-2 text-xs font-semibold" onClick={() => void loadProgress()}>
                Load Progress
              </button>
            </div>
            <div className="overflow-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead>
                  <tr className="border-b border-foreground/10 text-foreground/60">
                    <th className="py-2 pr-3">Material</th>
                    <th className="py-2 pr-3">Helper</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Progress</th>
                    <th className="py-2 pr-3">Viewed (sec)</th>
                    <th className="py-2 pr-3">Completed At</th>
                    <th className="py-2 pr-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {progressRows.map((p) => (
                    <tr key={p.id} className="border-b border-foreground/5">
                      <td className="py-2 pr-3">{p.materialTitle || p.materialId}</td>
                      <td className="py-2 pr-3">{p.helperName || p.helperId}</td>
                      <td className="py-2 pr-3">{p.status}</td>
                      <td className="py-2 pr-3">{p.progressPercent}%</td>
                      <td className="py-2 pr-3">{p.viewedSeconds}</td>
                      <td className="py-2 pr-3">{p.completedAt ? new Date(p.completedAt).toLocaleString() : '-'}</td>
                      <td className="py-2 pr-3">{new Date(p.updatedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!progressRows.length ? <p className="py-6 text-sm text-foreground/60">No progress found for selected filters.</p> : null}
            </div>
          </section>
        ) : null}

        {tab === 'assessments' ? (
          <section className="grid gap-4 lg:grid-cols-[420px,1fr]">
            <div className="rounded-2xl border border-foreground/10 p-4 space-y-3">
              <h2 className="text-sm font-semibold">{editingAssessmentId ? 'Edit Assessment' : 'New Assessment'}</h2>
              <input className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm" value={aTitle} onChange={(e) => setATitle(e.target.value)} placeholder="Title" />
              <textarea className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm min-h-20" value={aDescription} onChange={(e) => setADescription(e.target.value)} placeholder="Description" />
              <textarea className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm min-h-24" value={aInstructions} onChange={(e) => setAInstructions(e.target.value)} placeholder="Instructions" />
              <div className="grid grid-cols-3 gap-2">
                <input className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm" value={aMaxAttempts} onChange={(e) => setAMaxAttempts(e.target.value)} placeholder="Max attempts" />
                <input className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm" value={aTimeLimit} onChange={(e) => setATimeLimit(e.target.value)} placeholder="Time (min)" />
                <input className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm" value={aPassPercentage} onChange={(e) => setAPassPercentage(e.target.value)} placeholder="Pass %" />
              </div>
              <textarea className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-xs min-h-48 font-mono" value={aSchema} onChange={(e) => setASchema(e.target.value)} />
              <label className="flex items-center gap-2 text-xs text-foreground/80">
                <input type="checkbox" checked={aActive} onChange={(e) => setAActive(e.target.checked)} />
                Active
              </label>
              <div className="flex gap-2">
                <button type="button" className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" onClick={() => void saveAssessment()} disabled={busy}>
                  {editingAssessmentId ? 'Update' : 'Create'}
                </button>
                <button type="button" className="rounded-lg border border-foreground/15 px-3 py-2 text-xs font-semibold" onClick={resetAssessmentForm}>
                  Reset
                </button>
                <button type="button" className="ml-auto rounded-lg border border-foreground/15 px-3 py-2 text-xs font-semibold" onClick={() => void loadAssessments()}>
                  Refresh
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-foreground/10 p-4 space-y-3">
                <h2 className="text-sm font-semibold">Assessments</h2>
                <div className="overflow-auto">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-foreground/10 text-foreground/60">
                        <th className="py-2 pr-3">Title</th>
                        <th className="py-2 pr-3">Attempts</th>
                        <th className="py-2 pr-3">Time</th>
                        <th className="py-2 pr-3">Pass</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessments.map((a) => (
                        <tr key={a.id} className="border-b border-foreground/5">
                          <td className="py-2 pr-3">{a.title}</td>
                          <td className="py-2 pr-3">{a.maxAttempts}</td>
                          <td className="py-2 pr-3">{a.timeLimitMinutes ?? '-'} min</td>
                          <td className="py-2 pr-3">{a.passPercentage}%</td>
                          <td className="py-2 pr-3">{a.active ? 'ACTIVE' : 'INACTIVE'}</td>
                          <td className="py-2 text-right">
                            <div className="inline-flex gap-2">
                              <button
                                type="button"
                                className="rounded-md border border-foreground/20 px-2 py-1"
                                onClick={() => {
                                  setEditingAssessmentId(a.id);
                                  setATitle(a.title);
                                  setADescription(a.description || '');
                                  setAInstructions(a.instructions || '');
                                  setAMaxAttempts(String(a.maxAttempts));
                                  setATimeLimit(a.timeLimitMinutes == null ? '' : String(a.timeLimitMinutes));
                                  setAPassPercentage(String(a.passPercentage));
                                  setASchema(JSON.stringify(a.questionSchema, null, 2));
                                  setAActive(Boolean(a.active));
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="rounded-md border border-foreground/20 px-2 py-1"
                                onClick={() => void loadAttempts(a)}
                              >
                                Attempts
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!assessments.length ? <p className="py-6 text-sm text-foreground/60">No assessments found.</p> : null}
                </div>
              </div>

              <div className="rounded-2xl border border-foreground/10 p-4 space-y-3">
                <h2 className="text-sm font-semibold">
                  Attempts {attemptAssessmentTitle ? `• ${attemptAssessmentTitle}` : ''}
                </h2>
                <div className="overflow-auto">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-foreground/10 text-foreground/60">
                        <th className="py-2 pr-3">Helper</th>
                        <th className="py-2 pr-3">Attempt</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 pr-3">Score</th>
                        <th className="py-2 pr-3">Correct</th>
                        <th className="py-2 pr-3">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attemptRows.map((r) => (
                        <tr key={r.id} className="border-b border-foreground/5">
                          <td className="py-2 pr-3">{r.helperName || r.helperId}</td>
                          <td className="py-2 pr-3">#{r.attemptNo}</td>
                          <td className="py-2 pr-3">{r.status}</td>
                          <td className="py-2 pr-3">{r.scorePercentage ?? '-'}%</td>
                          <td className="py-2 pr-3">
                            {r.correctCount ?? '-'} / {r.totalCount ?? '-'}
                          </td>
                          <td className="py-2 pr-3">{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!attemptRows.length ? <p className="py-6 text-sm text-foreground/60">No attempts loaded.</p> : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
