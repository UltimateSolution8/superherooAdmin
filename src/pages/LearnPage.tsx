import { useCallback, useMemo, useRef, useState } from 'react';
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

type HelperOption = {
  id: string;
  displayName?: string | null;
  phone?: string | null;
  status?: string | null;
};

type AssessmentAssignment = {
  assessmentId: string;
  assignAll: boolean;
  assignedCount: number;
  helperIds: string[];
};

type UploadedAsset = {
  url: string;
  contentType?: string | null;
  sizeBytes?: number | null;
  fileName?: string | null;
};

type BuilderQuestionType =
  | 'section'
  | 'single_choice'
  | 'multiple_choice'
  | 'boolean'
  | 'text'
  | 'long_text'
  | 'number'
  | 'email'
  | 'url'
  | 'rating';

type BuilderQuestion = {
  key: string;
  id: string;
  type: BuilderQuestionType;
  label: string;
  required: boolean;
  points: string;
  optionsText: string;
  correctAnswerText: string;
  dependsOnQuestionId: string;
  dependsOnValueText: string;
};

const QUESTION_TYPE_OPTIONS: Array<{ value: BuilderQuestionType; label: string }> = [
  { value: 'section', label: 'Section heading' },
  { value: 'single_choice', label: 'Single select (radio)' },
  { value: 'multiple_choice', label: 'Multi select (checkbox)' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'rating', label: 'Star rating (1-5)' },
];

function nextQuestionId(index: number) {
  return `q${index + 1}`;
}

function makeQuestion(index: number, type: BuilderQuestionType = 'single_choice'): BuilderQuestion {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    id: nextQuestionId(index),
    type,
    label: type === 'section' ? `Section ${index + 1}` : '',
    required: true,
    points: '1',
    optionsText: type === 'single_choice' || type === 'multiple_choice' ? 'Option 1\nOption 2' : '',
    correctAnswerText: '',
    dependsOnQuestionId: '',
    dependsOnValueText: '',
  };
}

function sampleQuestions(): BuilderQuestion[] {
  return [
    {
      ...makeQuestion(0, 'section'),
      label: 'Safety Basics',
      required: false,
      points: '0',
    },
    {
      ...makeQuestion(1, 'single_choice'),
      label: 'What is the safe first step before entering customer premises?',
      optionsText: 'Verify task details in app\nCall a friend\nSkip safety checks',
      correctAnswerText: 'Verify task details in app',
      points: '2',
    },
    {
      ...makeQuestion(2, 'multiple_choice'),
      label: 'Select mandatory safety actions',
      optionsText: 'Wear ID card\nCollect upfront cash without consent\nConfirm OTP at correct stage',
      correctAnswerText: 'Wear ID card, Confirm OTP at correct stage',
      points: '3',
    },
  ];
}

function normalizeBuilderType(raw: unknown): BuilderQuestionType {
  const t = String(raw || '').trim().toLowerCase();
  if (QUESTION_TYPE_OPTIONS.some((o) => o.value === t)) return t as BuilderQuestionType;
  if (t === 'radio') return 'single_choice';
  if (t === 'multiselect' || t === 'checkbox') return 'multiple_choice';
  if (t === 'numeric') return 'number';
  if (t === 'yes_no' || t === 'bool') return 'boolean';
  if (t === 'short_text') return 'text';
  return 'text';
}

function toOptionsText(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value
    .map((v) => {
      if (v && typeof v === 'object') {
        const option = v as Record<string, unknown>;
        return String(option.label ?? option.value ?? option.id ?? '').trim();
      }
      return String(v ?? '').trim();
    })
    .filter(Boolean)
    .join('\n');
}

function toAnswerText(value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => String(v ?? '').trim()).filter(Boolean).join(', ');
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value == null) return '';
  return String(value).trim();
}

function toDependsValueText(value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => String(v ?? '').trim()).filter(Boolean).join(', ');
  if (value == null) return '';
  return String(value).trim();
}

function schemaToBuilder(schema: unknown): BuilderQuestion[] {
  if (!Array.isArray(schema) || !schema.length) return sampleQuestions();
  const mapped = schema
    .map((q, idx) => {
      if (!q || typeof q !== 'object') return null;
      const node = q as Record<string, unknown>;
      const type = normalizeBuilderType(node.type);
      return {
        key: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        id: String(node.id ?? nextQuestionId(idx)).trim() || nextQuestionId(idx),
        type,
        label: String(node.label ?? '').trim(),
        required: type === 'section' ? false : Boolean(node.required ?? true),
        points: String(typeof node.points === 'number' ? node.points : 1),
        optionsText: toOptionsText(node.options),
        correctAnswerText: toAnswerText(node.correctAnswer),
        dependsOnQuestionId: String(node.dependsOnQuestionId ?? '').trim(),
        dependsOnValueText: toDependsValueText(node.dependsOnValue),
      } satisfies BuilderQuestion;
    })
    .filter(Boolean) as BuilderQuestion[];
  return mapped.length ? mapped : sampleQuestions();
}

function parseOptions(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseCsv(text: string): string[] {
  return text
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

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
  const materialFileRef = useRef<HTMLInputElement | null>(null);

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
  const [aQuestions, setAQuestions] = useState<BuilderQuestion[]>(sampleQuestions);
  const [aActive, setAActive] = useState(true);
  const [attemptRows, setAttemptRows] = useState<Attempt[]>([]);
  const [attemptAssessmentTitle, setAttemptAssessmentTitle] = useState<string | null>(null);
  const [helperOptions, setHelperOptions] = useState<HelperOption[]>([]);
  const [assignmentAssessmentId, setAssignmentAssessmentId] = useState<string | null>(null);
  const [assignmentAssessmentTitle, setAssignmentAssessmentTitle] = useState<string | null>(null);
  const [assignmentAll, setAssignmentAll] = useState(true);
  const [assignmentHelperIds, setAssignmentHelperIds] = useState<string[]>([]);

  const clearAlerts = () => {
    setError(null);
    setNotice(null);
  };

  const helperLabel = useCallback((helper: HelperOption) => {
    const name = helper.displayName?.trim();
    const phone = helper.phone?.trim();
    if (name && phone) return `${name} (${phone})`;
    if (name) return name;
    if (phone) return phone;
    return helper.id;
  }, []);

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
    setAQuestions(sampleQuestions());
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

  const uploadMaterialFile = useCallback(async (file: File) => {
    clearAlerts();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiFetch<UploadedAsset>(
        '/api/v1/admin/learn/materials/upload',
        { method: 'POST', body: fd },
        token,
      );
      if (!res.ok) {
        setError(res.errorText);
        return;
      }
      const uploadedType = (res.data.contentType || '').toLowerCase();
      if (uploadedType.startsWith('video/')) setMType('VIDEO');
      else if (uploadedType.startsWith('audio/')) setMType('AUDIO');
      else if (uploadedType.includes('pdf')) setMType('PDF');
      else setMType('LINK');
      setMUrl(res.data.url || '');
      setNotice(`Uploaded ${res.data.fileName || 'file'} successfully.`);
    } finally {
      setBusy(false);
    }
  }, [token]);

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

  const loadHelperOptions = useCallback(async () => {
    const res = await apiFetch<HelperOption[]>('/api/v1/admin/helpers', undefined, token);
    if (!res.ok) {
      setError(res.errorText);
      return;
    }
    const activeHelpers = (res.data ?? [])
      .filter((helper) => String(helper.status || '').toUpperCase() === 'ACTIVE')
      .sort((a, b) => helperLabel(a).localeCompare(helperLabel(b)));
    setHelperOptions(activeHelpers);
  }, [helperLabel, token]);

  const openAssignmentEditor = useCallback(async (assessment: Assessment) => {
    clearAlerts();
    setBusy(true);
    try {
      if (!helperOptions.length) {
        await loadHelperOptions();
      }
      const res = await apiFetch<AssessmentAssignment>(
        `/api/v1/admin/learn/assessments/${assessment.id}/assignments`,
        undefined,
        token,
      );
      if (!res.ok) {
        setError(res.errorText);
        return;
      }
      setAssignmentAssessmentId(assessment.id);
      setAssignmentAssessmentTitle(assessment.title);
      setAssignmentAll(Boolean(res.data.assignAll));
      setAssignmentHelperIds(Array.isArray(res.data.helperIds) ? res.data.helperIds : []);
      setNotice(Boolean(res.data.assignAll)
        ? `"${assessment.title}" is assigned to all helpers.`
        : `"${assessment.title}" is assigned to ${res.data.assignedCount} helper(s).`);
    } finally {
      setBusy(false);
    }
  }, [helperOptions.length, loadHelperOptions, token]);

  const saveAssignments = useCallback(async () => {
    if (!assignmentAssessmentId) return;
    if (!assignmentAll && assignmentHelperIds.length === 0) {
      setError('Select at least one helper or choose "Assign to all helpers".');
      return;
    }
    clearAlerts();
    setBusy(true);
    try {
      const payload = {
        assignAll: assignmentAll,
        helperIds: assignmentAll ? [] : assignmentHelperIds,
      };
      const res = await apiFetch<AssessmentAssignment>(
        `/api/v1/admin/learn/assessments/${assignmentAssessmentId}/assignments`,
        { method: 'POST', body: JSON.stringify(payload) },
        token,
      );
      if (!res.ok) {
        setError(res.errorText);
        return;
      }
      setAssignmentAll(Boolean(res.data.assignAll));
      setAssignmentHelperIds(Array.isArray(res.data.helperIds) ? res.data.helperIds : []);
      setNotice(Boolean(res.data.assignAll)
        ? 'Assessment is now assigned to all helpers.'
        : `Assessment assigned to ${res.data.assignedCount} selected helper(s).`);
    } finally {
      setBusy(false);
    }
  }, [assignmentAll, assignmentAssessmentId, assignmentHelperIds, token]);

  const addQuestion = useCallback((type: BuilderQuestionType = 'single_choice') => {
    setAQuestions((prev) => [...prev, makeQuestion(prev.length, type)]);
  }, []);

  const updateQuestion = useCallback((key: string, patch: Partial<BuilderQuestion>) => {
    setAQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }, []);

  const removeQuestion = useCallback((key: string) => {
    setAQuestions((prev) => {
      const next = prev.filter((q) => q.key !== key);
      return next.length ? next : [makeQuestion(0, 'single_choice')];
    });
  }, []);

  const saveAssessment = useCallback(async () => {
    clearAlerts();
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

    const schema: Record<string, unknown>[] = [];
    let evaluableQuestions = 0;
    for (let i = 0; i < aQuestions.length; i += 1) {
      const q = aQuestions[i];
      const id = q.id.trim() || nextQuestionId(i);
      const label = q.label.trim();
      if (!label) {
        setError(`Question ${i + 1} label is required.`);
        return;
      }
      const node: Record<string, unknown> = {
        id,
        type: q.type,
        label,
      };
      if (q.type !== 'section') {
        node.required = q.required;
        const pts = Number(q.points || '1');
        node.points = Number.isFinite(pts) ? Math.max(0, Math.round(pts)) : 1;
      } else {
        node.required = false;
        node.points = 0;
      }

      if (q.dependsOnQuestionId.trim()) {
        node.dependsOnQuestionId = q.dependsOnQuestionId.trim();
        const depValues = parseCsv(q.dependsOnValueText);
        if (depValues.length === 1) {
          node.dependsOnValue = depValues[0];
        } else if (depValues.length > 1) {
          node.dependsOnValue = depValues;
        }
      }

      if (q.type === 'single_choice' || q.type === 'multiple_choice') {
        const options = parseOptions(q.optionsText);
        if (options.length < 2) {
          setError(`Question ${i + 1} needs at least 2 options.`);
          return;
        }
        node.options = options;
      }

      const answerText = q.correctAnswerText.trim();
      if (q.type === 'multiple_choice') {
        const answers = parseCsv(answerText);
        if (answers.length) node.correctAnswer = answers;
      } else if (q.type === 'boolean') {
        if (answerText) node.correctAnswer = answerText.toLowerCase() === 'true' || answerText.toLowerCase() === 'yes';
      } else if (q.type === 'number' || q.type === 'rating') {
        if (answerText) {
          const num = Number(answerText);
          if (Number.isFinite(num)) node.correctAnswer = num;
        }
      } else if (q.type === 'section') {
        node.correctAnswer = null;
      } else if (answerText) {
        node.correctAnswer = answerText;
      }

      if (q.type !== 'section') evaluableQuestions += 1;
      schema.push(node);
    }

    if (!schema.length || evaluableQuestions === 0) {
      setError('Add at least one question (not just section headings).');
      return;
    }

    const payload = {
      title: aTitle.trim(),
      description: aDescription.trim() || null,
      instructions: aInstructions.trim() || null,
      maxAttempts: Math.round(maxAttempts),
      timeLimitMinutes: timeLimitMinutes == null ? null : Math.round(timeLimitMinutes),
      passPercentage: Math.round(passPercentage),
      questionSchema: schema,
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
  }, [aActive, aDescription, aInstructions, aMaxAttempts, aPassPercentage, aQuestions, aTimeLimit, aTitle, editingAssessmentId, loadAssessments, token]);

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
                onClick={() => {
                  setTab(k);
                  if (k === 'assessments') {
                    void loadHelperOptions();
                  }
                }}
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
              <div className="rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-foreground/75">Upload video/audio/pdf or keep external URL above.</span>
                  <button
                    type="button"
                    className="rounded-md border border-foreground/20 px-2.5 py-1 text-xs font-semibold hover:bg-foreground/5"
                    onClick={() => materialFileRef.current?.click()}
                    disabled={busy}
                  >
                    Upload File
                  </button>
                </div>
                <input
                  ref={materialFileRef}
                  type="file"
                  className="hidden"
                  accept="video/*,audio/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void uploadMaterialFile(file);
                    }
                    e.currentTarget.value = '';
                  }}
                />
              </div>
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
              <div className="rounded-xl border border-foreground/10 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/70">Questions</h3>
                  <div className="flex gap-2">
                    <button type="button" className="rounded-lg border border-foreground/20 px-2.5 py-1 text-xs font-semibold" onClick={() => addQuestion('section')}>
                      + Section
                    </button>
                    <button type="button" className="rounded-lg border border-foreground/20 px-2.5 py-1 text-xs font-semibold" onClick={() => addQuestion('single_choice')}>
                      + Question
                    </button>
                  </div>
                </div>
                <p className="text-xs text-foreground/60">
                  Build assessments like Google Forms. Add section headings, required questions, scoring, and dependency rules.
                </p>
                <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
                  {aQuestions.map((q, idx) => {
                    const dependencyChoices = aQuestions
                      .slice(0, idx)
                      .filter((item) => item.type !== 'section')
                      .map((item) => ({ id: item.id, label: item.label || item.id }));
                    return (
                      <div key={q.key} className="rounded-xl border border-foreground/15 bg-foreground/[0.02] p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-foreground/10 px-2 py-1 text-[11px] font-semibold">#{idx + 1}</span>
                          <input
                            className="w-24 rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-xs"
                            value={q.id}
                            onChange={(e) => updateQuestion(q.key, { id: e.target.value })}
                            placeholder={`q${idx + 1}`}
                          />
                          <select
                            className="flex-1 rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-xs"
                            value={q.type}
                            onChange={(e) => {
                              const nextType = e.target.value as BuilderQuestionType;
                              updateQuestion(q.key, {
                                type: nextType,
                                required: nextType === 'section' ? false : q.required,
                                points: nextType === 'section' ? '0' : q.points || '1',
                              });
                            }}
                          >
                            {QUESTION_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="rounded-md border border-red-400/40 px-2 py-1 text-xs font-semibold text-red-300"
                            onClick={() => removeQuestion(q.key)}
                          >
                            Remove
                          </button>
                        </div>

                        <input
                          className="w-full rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-xs"
                          value={q.label}
                          onChange={(e) => updateQuestion(q.key, { label: e.target.value })}
                          placeholder={q.type === 'section' ? 'Section title' : 'Question text'}
                        />

                        {q.type !== 'section' ? (
                          <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center gap-2 text-xs text-foreground/70">
                              <input
                                type="checkbox"
                                checked={q.required}
                                onChange={(e) => updateQuestion(q.key, { required: e.target.checked })}
                              />
                              Required
                            </label>
                            <input
                              className="rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-xs"
                              value={q.points}
                              onChange={(e) => updateQuestion(q.key, { points: e.target.value })}
                              placeholder="Points"
                            />
                          </div>
                        ) : null}

                        {(q.type === 'single_choice' || q.type === 'multiple_choice') ? (
                          <textarea
                            className="w-full rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-xs min-h-20"
                            value={q.optionsText}
                            onChange={(e) => updateQuestion(q.key, { optionsText: e.target.value })}
                            placeholder="One option per line"
                          />
                        ) : null}

                        {q.type !== 'section' ? (
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              className="rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-xs"
                              value={q.dependsOnQuestionId}
                              onChange={(e) => updateQuestion(q.key, { dependsOnQuestionId: e.target.value })}
                            >
                              <option value="">No dependency</option>
                              {dependencyChoices.map((dep) => (
                                <option key={dep.id} value={dep.id}>
                                  {dep.id} · {dep.label}
                                </option>
                              ))}
                            </select>
                            <input
                              className="rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-xs"
                              value={q.dependsOnValueText}
                              onChange={(e) => updateQuestion(q.key, { dependsOnValueText: e.target.value })}
                              placeholder="Show when value (comma separated)"
                              disabled={!q.dependsOnQuestionId}
                            />
                          </div>
                        ) : null}

                        {q.type !== 'section' ? (
                          q.type === 'boolean' ? (
                            <select
                              className="w-full rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-xs"
                              value={q.correctAnswerText}
                              onChange={(e) => updateQuestion(q.key, { correctAnswerText: e.target.value })}
                            >
                              <option value="">No auto-evaluation answer</option>
                              <option value="true">true / yes</option>
                              <option value="false">false / no</option>
                            </select>
                          ) : (
                            <input
                              className="w-full rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-xs"
                              value={q.correctAnswerText}
                              onChange={(e) => updateQuestion(q.key, { correctAnswerText: e.target.value })}
                              placeholder={q.type === 'multiple_choice' ? 'Correct answers (comma separated)' : 'Correct answer (optional)'}
                            />
                          )
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
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
                                  setAQuestions(schemaToBuilder(a.questionSchema));
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
                              <button
                                type="button"
                                className="rounded-md border border-sky-500/30 px-2 py-1 text-sky-300"
                                onClick={() => void openAssignmentEditor(a)}
                              >
                                Assign
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

              {assignmentAssessmentId ? (
                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold">
                      Assignment • {assignmentAssessmentTitle || assignmentAssessmentId}
                    </h2>
                    <button
                      type="button"
                      className="ml-auto rounded-lg border border-foreground/20 px-3 py-1 text-xs"
                      onClick={() => {
                        setAssignmentAssessmentId(null);
                        setAssignmentAssessmentTitle(null);
                        setAssignmentAll(true);
                        setAssignmentHelperIds([]);
                      }}
                    >
                      Close
                    </button>
                  </div>

                  <p className="text-xs text-foreground/70">
                    Choose exactly who should receive this assessment in the partner app. If you keep
                    "Assign to all helpers" enabled, every active helper can access it.
                  </p>

                  <label className="flex items-center gap-2 text-xs text-foreground/80">
                    <input
                      type="checkbox"
                      checked={assignmentAll}
                      onChange={(e) => setAssignmentAll(e.target.checked)}
                    />
                    Assign to all helpers
                  </label>

                  {!assignmentAll ? (
                    <div className="rounded-xl border border-foreground/10 bg-background p-3">
                      <div className="mb-2 text-xs text-foreground/65">
                        Selected: {assignmentHelperIds.length}
                      </div>
                      <div className="max-h-48 overflow-auto space-y-1 pr-1">
                        {helperOptions.map((helper) => {
                          const checked = assignmentHelperIds.includes(helper.id);
                          return (
                            <label key={helper.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-foreground/5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setAssignmentHelperIds((prev) => {
                                    if (e.target.checked) {
                                      return Array.from(new Set([...prev, helper.id]));
                                    }
                                    return prev.filter((id) => id !== helper.id);
                                  });
                                }}
                              />
                              <span>{helperLabel(helper)}</span>
                            </label>
                          );
                        })}
                        {!helperOptions.length ? (
                          <p className="py-4 text-center text-xs text-foreground/60">No active helpers found.</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      onClick={() => void saveAssignments()}
                      disabled={busy}
                    >
                      Save Assignment
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-foreground/20 px-3 py-2 text-xs font-semibold"
                      onClick={() => void loadHelperOptions()}
                    >
                      Refresh Helpers
                    </button>
                  </div>
                </div>
              ) : null}

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
