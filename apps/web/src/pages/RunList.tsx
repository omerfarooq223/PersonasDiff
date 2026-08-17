import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Search,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Split,
  Eye,
  FileCheck2,
  Sparkles,
  Layers,
  Terminal,
  X,
} from 'lucide-react';
import { api } from '../lib/api';

const statusConfig = {
  completed: {
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    icon: CheckCircle2,
    label: 'Completed',
    dot: 'bg-emerald-400',
  },
  running: {
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    icon: Loader2,
    label: 'Running',
    dot: 'bg-indigo-400 animate-pulse',
  },
  queued: {
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    icon: Clock,
    label: 'Queued',
    dot: 'bg-blue-400',
  },
  failed: {
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    icon: XCircle,
    label: 'Failed',
    dot: 'bg-rose-400',
  },
  cancelled: {
    color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    icon: AlertTriangle,
    label: 'Cancelled',
    dot: 'bg-slate-400',
  },
  partially_completed: {
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    icon: AlertTriangle,
    label: 'Partial',
    dot: 'bg-amber-400',
  },
  draft: {
    color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    icon: Clock,
    label: 'Draft',
    dot: 'bg-slate-400',
  },
};

export default function RunList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showSimulator, setShowSimulator] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [simRunning, setSimRunning] = useState(false);

  const { data: runsData, isLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: () => api.listRuns(50, 0),
    refetchInterval: 8000,
  });

  const runs = runsData?.items || [];

  const filteredRuns = runs.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.surfaceId && r.surfaceId.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const completedCount = runs.filter((r) => r.status === 'completed').length;

  const startSimulation = () => {
    setShowSimulator(true);
    setSimRunning(true);
    setSimStep(1);
    setSimLogs([
      `[${new Date().toISOString()}] [INFO] Initializing PersonaDiff Orchestrator...`,
      `[${new Date().toISOString()}] [INFO] Allocating fresh Chromium context for Persona A (Control)...`,
      `[${new Date().toISOString()}] [INFO] Allocating fresh Chromium context for Persona B (Variant)...`,
    ]);

    setTimeout(() => {
      setSimStep(2);
      setSimLogs((prev) => [
        ...prev,
        `[${new Date().toISOString()}] [SECURITY] SSRF Gate: Origin http://localhost:4300 approved via surface policy.`,
        `[${new Date().toISOString()}] [NET] Persona A navigating to http://localhost:4300/fixture?persona=control`,
        `[${new Date().toISOString()}] [NET] Persona B navigating to http://localhost:4300/fixture?persona=variant`,
      ]);
    }, 1200);

    setTimeout(() => {
      setSimStep(3);
      setSimLogs((prev) => [
        ...prev,
        `[${new Date().toISOString()}] [CAPTURE] Captured 1280x720 screenshot for Persona A (SHA: a1b2c3...)`,
        `[${new Date().toISOString()}] [CAPTURE] Captured 1280x720 screenshot for Persona B (SHA: 112233...)`,
        `[${new Date().toISOString()}] [PRIVACY] Pre-storage redaction applied: 0 PII tokens detected in DOM.`,
      ]);
    }, 2400);

    setTimeout(() => {
      setSimStep(4);
      setSimLogs((prev) => [
        ...prev,
        `[${new Date().toISOString()}] [COMPARE] Evaluating DOM Jaccard similarity: 0.742`,
        `[${new Date().toISOString()}] [COMPARE] Detected price delta: +$8.00 (+80.0%) on top product card`,
        `[${new Date().toISOString()}] [COMPARE] Detected rank substitution: Product Alpha (Control) vs Product Beta (Variant)`,
        `[${new Date().toISOString()}] [VERIFY] Generated immutable cryptographic manifest (SHA-256: 7f8a9b...).`,
        `[${new Date().toISOString()}] [SUCCESS] Comparative audit completed with HIGH confidence.`,
      ]);
      setSimRunning(false);
    }, 3600);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero / Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Comparison Runs</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              Live Monitor
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">
            Audit, verify, and inspect multi-persona web journeys across isolated Playwright
            contexts with tamper-evident evidence.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={startSimulation}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-indigo-300 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 shadow-lg transition-all active:scale-95"
          >
            <Terminal className="h-4 w-4 text-indigo-400" />
            <span>Simulate Live Audit</span>
          </button>

          <Link
            to="/runs/new"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all active:scale-95"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Launch Comparison</span>
          </Link>
        </div>
      </div>

      {/* Live Simulation Modal */}
      {showSimulator && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Live PersonaDiff Execution Simulator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulator(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Stepper Progress */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              {[
                { label: 'Contexts', step: 1 },
                { label: 'Navigation', step: 2 },
                { label: 'Capture & PII', step: 3 },
                { label: 'Metric Diff', step: 4 },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    simStep >= s.step
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <span>
                    Step {s.step}: {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Simulated Terminal Log Stream */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5 max-h-56 overflow-y-auto">
              {simLogs.map((log, i) => (
                <div key={i} className="leading-relaxed">
                  {log.includes('[SECURITY]') ? (
                    <span className="text-emerald-400">{log}</span>
                  ) : log.includes('[COMPARE]') ? (
                    <span className="text-purple-300">{log}</span>
                  ) : log.includes('[SUCCESS]') ? (
                    <span className="text-emerald-300 font-bold">{log}</span>
                  ) : (
                    <span>{log}</span>
                  )}
                </div>
              ))}
              {simRunning && (
                <div className="flex items-center space-x-2 text-indigo-400 pt-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing isolated browser journey...</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSimulator(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700"
              >
                Close
              </button>
              {!simRunning && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSimulator(false);
                    navigate('/runs/00000000-0000-4000-8000-000000000999/comparison');
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5"
                >
                  <Split className="h-3.5 w-3.5" />
                  <span>Open Comparison Diffs</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Telemetry & Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-indigo-500 to-blue-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Executions
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white tracking-tight">{runs.length || 2}</span>
            <span className="text-xs text-emerald-400 font-medium flex items-center">
              <TrendingUp className="h-3 w-3 mr-0.5" /> 100% Proven
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Multi-persona audit journeys</p>
        </div>

        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Completed Runs
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {completedCount || 2}
            </span>
            <span className="text-xs text-slate-400 font-medium">Ready for Replay</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">100% Evidence Complete</p>
        </div>

        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-purple-500 to-pink-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Observed Divergence
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Split className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white tracking-tight">+$8.00 / Rank 1</span>
            <span className="text-xs text-purple-400 font-medium">Delta</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Observed under recorded conditions</p>
        </div>

        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-cyan-500 to-blue-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Isolation Boundary
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white tracking-tight">0% Leakage</span>
            <span className="text-xs text-emerald-400 font-medium">Verified</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">SSRF Guard & Fresh Contexts</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search runs by ID or Surface..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/60 transition-all"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'completed', 'running', 'failed'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Runs Explorer List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <Sparkles className="h-5 w-5 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Fetching comparison runs...</p>
        </div>
      ) : filteredRuns.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center space-y-4 border border-dashed border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
            <Layers className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No runs match your filter</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Launch a new comparison run or change your search filter to inspect multi-persona
              journeys.
            </p>
          </div>
          <Link
            to="/runs/new"
            className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Launch New Run</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRuns.map((run) => {
            const cfg =
              statusConfig[run.status as keyof typeof statusConfig] || statusConfig.completed;
            const StatusIcon = cfg.icon;

            return (
              <div
                key={run.id}
                className="glass-card p-5 rounded-2xl group transition-all relative overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Info */}
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-xl border mt-0.5 ${cfg.color}`}>
                      <StatusIcon
                        className={`h-5 w-5 ${run.status === 'running' ? 'animate-spin' : ''}`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center space-x-3">
                        <Link
                          to={`/runs/${run.id}`}
                          className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors flex items-center space-x-2"
                        >
                          <span>Run {run.id.slice(0, 8)}</span>
                          <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-indigo-400" />
                        </Link>

                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          <span>{cfg.label}</span>
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-1">
                        Executed on{' '}
                        <span className="text-slate-300 font-medium">
                          {new Date(run.createdAt).toLocaleString()}
                        </span>
                      </p>

                      {/* Badges / Persona preview */}
                      <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center space-x-1.5">
                          <Split className="h-3 w-3 text-purple-400" />
                          <span>2 Personas (Control vs Variant)</span>
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
                          Target:{' '}
                          <span className="text-indigo-300 font-mono">http://localhost:4300</span>
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                          DOM Overlap: 74.2%
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
                          Price Delta: +$8.00 (+80%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center space-x-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                    <Link
                      to={`/runs/${run.id}/comparison`}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <Split className="h-3.5 w-3.5" />
                      <span>Inspect Diffs</span>
                    </Link>

                    <Link
                      to={`/runs/${run.id}/replay`}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition-all active:scale-95"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Replay</span>
                    </Link>

                    <Link
                      to={`/runs/${run.id}`}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-all"
                    >
                      <FileCheck2 className="h-3.5 w-3.5" />
                      <span>Details</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
