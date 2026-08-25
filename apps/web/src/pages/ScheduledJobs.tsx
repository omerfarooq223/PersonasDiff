import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Clock,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Globe,
  Users2,
  ArrowRight,
  X,
  Activity,
  Sparkles,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  api,
  type ScheduledJob,
  type PersonaVersion,
  type Surface,
  type JourneyVersion,
} from '../lib/api';

// ---------------------------------------------------------------------------
// Countdown helper
// ---------------------------------------------------------------------------
function useCountdown(targetIso: string | null) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!targetIso) return;
    const tick = () => {
      const diff = new Date(targetIso).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('Due now');
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setRemaining(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return remaining;
}

// ---------------------------------------------------------------------------
// Job Card
// ---------------------------------------------------------------------------
function JobCard({
  job,
  onToggle,
  onDelete,
}: {
  job: ScheduledJob;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const countdown = useCountdown(job.enabled ? job.nextRunAt : null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className={`glass-card rounded-2xl overflow-hidden border transition-all duration-300 ${job.enabled ? 'border-indigo-500/25 hover:border-indigo-500/40' : 'border-slate-800 opacity-60'}`}
    >
      <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div
            className={`p-2 rounded-lg ${job.enabled ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}
          >
            <Calendar className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">{job.name}</h3>
            <p className="text-[11px] text-slate-400 truncate font-mono">{job.targetUrl}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            type="button"
            id={`toggle-job-${job.id}`}
            onClick={() => onToggle(job.id)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${job.enabled ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}
          >
            {job.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{job.enabled ? 'Active' : 'Paused'}</span>
          </button>
          {confirmDelete ? (
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => onDelete(job.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 transition-all"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              id={`delete-job-${job.id}`}
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-800">
        <div className="p-3.5 space-y-0.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Interval
          </p>
          <p className="text-xs font-bold text-white">{job.intervalLabel}</p>
        </div>
        <div className="p-3.5 space-y-0.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Next Run
          </p>
          <p className={`text-xs font-bold ${job.enabled ? 'text-indigo-400' : 'text-slate-500'}`}>
            {job.enabled ? countdown || '...' : '—'}
          </p>
        </div>
        <div className="p-3.5 space-y-0.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Runs Total
          </p>
          <p className="text-xs font-bold text-white">{job.runCount}</p>
        </div>
        <div className="p-3.5 space-y-0.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Last Run
          </p>
          {job.lastRunId ? (
            <Link
              to={`/runs/${job.lastRunId}/comparison`}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 transition-colors"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>View</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          ) : (
            <p className="text-xs text-slate-500">Not yet run</p>
          )}
        </div>
      </div>
      <div className="px-4 py-3 border-t border-slate-800 flex items-center space-x-2">
        <Users2 className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
        <span className="text-[11px] text-slate-500">
          {job.personaIds.length} personas monitored
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Interval options
// ---------------------------------------------------------------------------
const INTERVAL_OPTIONS = [
  { label: 'Every 15 min', minutes: 15 },
  { label: 'Every 30 min', minutes: 30 },
  { label: 'Every hour', minutes: 60 },
  { label: 'Every 6 hours', minutes: 360 },
  { label: 'Every 12 hours', minutes: 720 },
  { label: 'Daily', minutes: 1440 },
  { label: 'Weekly', minutes: 10080 },
];

// ---------------------------------------------------------------------------
// Create Modal
// ---------------------------------------------------------------------------
function CreateJobModal({
  onClose,
  onCreated,
  personas,
  surfaces,
  journeys,
}: {
  onClose: () => void;
  onCreated: () => void;
  personas: PersonaVersion[];
  surfaces: Surface[];
  journeys: JourneyVersion[];
}) {
  const [name, setName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const availablePersonas = personas;
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>(
    availablePersonas.slice(0, 2).map((p) => p.id),
  );
  const [intervalMinutes, setIntervalMinutes] = useState(360);
  const [surfaceId, setSurfaceId] = useState(surfaces[0]?.id ?? '');
  const matchingJourney = journeys.find((j) => j.surfaceId === surfaceId) ?? journeys[0];
  const [journeyVersionId, setJourneyVersionId] = useState(matchingJourney?.id ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sync journey when surface changes
  const handleSurfaceChange = (newSurfaceId: string) => {
    setSurfaceId(newSurfaceId);
    const newMatchingJourney = journeys.find((j) => j.surfaceId === newSurfaceId) ?? journeys[0];
    if (newMatchingJourney) {
      setJourneyVersionId(newMatchingJourney.id);
    }
  };

  const togglePersona = (id: string) =>
    setSelectedPersonaIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Monitor name is required.');
      return;
    }
    if (!customUrl.trim()) {
      setError('Target URL is required.');
      return;
    }
    if (selectedPersonaIds.length < 2) {
      setError('Select at least 2 personas.');
      return;
    }
    const finalSurfaceId = surfaceId || surfaces[0]?.id;
    const finalJourneyId = journeyVersionId || matchingJourney?.id || journeys[0]?.id;
    if (!finalSurfaceId || !finalJourneyId) {
      setError('A backend surface and journey are required.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      await api.createScheduledJob({
        intervalMinutes,
        journeyVersionId: finalJourneyId,
        name: name.trim(),
        personaIds: selectedPersonaIds,
        surfaceId: finalSurfaceId,
        targetUrl: customUrl.trim(),
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'detail' in err
          ? (err as { detail: string }).detail
          : 'Failed to create monitor. Please check your inputs.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <RefreshCw className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-bold text-white">New Scheduled Monitor</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Monitor Name
            </label>
            <input
              type="text"
              id="monitor-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cyberpunk 2077 Regional Pricing Monitor"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Globe className="h-3.5 w-3.5 text-indigo-400" />
              <span>Target URL</span>
            </label>
            <input
              type="url"
              id="monitor-url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://store.steampowered.com/app/..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Clock className="h-3.5 w-3.5 text-indigo-400" />
              <span>Run Interval</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {INTERVAL_OPTIONS.map((opt) => (
                <button
                  key={opt.minutes}
                  type="button"
                  onClick={() => setIntervalMinutes(opt.minutes)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${intervalMinutes === opt.minutes ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-indigo-500/50'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Users2 className="h-3.5 w-3.5 text-indigo-400" />
              <span>Personas (select ≥2)</span>
            </label>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {availablePersonas.map((p) => {
                const selected = selectedPersonaIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePersona(p.id)}
                    className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs transition-all ${selected ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-300' : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-600'}`}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span
                      className={`h-4 w-4 rounded flex items-center justify-center border ${selected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}
                    >
                      {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {surfaces.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Surface
              </label>
              <select
                value={surfaceId}
                onChange={(e) => handleSurfaceChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {surfaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            id="create-monitor-submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            <span>{submitting ? 'Creating…' : 'Create Monitor'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function ScheduledJobs() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['scheduled-jobs'],
    queryFn: () => api.getScheduledJobs(),
    refetchInterval: 30_000,
  });

  const { data: personas = [] } = useQuery({
    queryKey: ['personas'],
    queryFn: () => api.getPersonas(),
  });
  const { data: surfaces = [] } = useQuery({
    queryKey: ['surfaces'],
    queryFn: () => api.getSurfaces(),
  });
  const { data: journeys = [] } = useQuery({
    queryKey: ['journeys'],
    queryFn: () => api.getJourneys(),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.toggleScheduledJob(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteScheduledJob(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] }),
  });

  const activeCount = jobs.filter((j) => j.enabled).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <RefreshCw className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Scheduled Monitors
            </h1>
          </div>
          <p className="text-xs text-slate-400 ml-[52px]">
            Automatically re-run persona comparisons on a schedule to detect content and pricing
            drift over time.
          </p>
        </div>
        <button
          type="button"
          id="new-monitor-btn"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>New Monitor</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Monitors', value: jobs.length, icon: Calendar, color: 'text-indigo-400' },
          { label: 'Active', value: activeCount, icon: Activity, color: 'text-emerald-400' },
          {
            label: 'Total Auto-Runs',
            value: jobs.reduce((s, j) => s + j.runCount, 0),
            icon: Sparkles,
            color: 'text-violet-400',
          },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 rounded-2xl flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl bg-slate-800 ${stat.color}`}>
              <stat.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-white">{stat.value}</p>
              <p className="text-[11px] text-slate-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Loading monitors…</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center space-y-5 border border-dashed border-slate-700">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
            <RefreshCw className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">No Scheduled Monitors Yet</h2>
            <p className="text-sm text-slate-400 mt-1.5 max-w-sm mx-auto">
              Create a monitor to automatically track content and pricing drift across personas over
              time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-all mx-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create Your First Monitor</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onToggle={(id) => toggleMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      <div className="glass-panel p-4 rounded-2xl flex items-start space-x-3 border border-slate-800">
        <Info className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          The scheduler checks for due monitors every 60 seconds. Each triggered run captures live
          screenshots across all selected personas and appears in{' '}
          <Link to="/runs" className="text-indigo-400 hover:underline">
            Runs Dashboard
          </Link>
          . AI insights are generated automatically if a{' '}
          <code className="text-violet-400 font-mono">GEMINI_API_KEY</code> is configured.
        </p>
      </div>

      {showCreateModal && (
        <CreateJobModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] })}
          personas={personas}
          surfaces={surfaces}
          journeys={journeys}
        />
      )}
    </div>
  );
}
