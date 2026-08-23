import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  Split,
  Eye,
  FileCheck2,
  Sparkles,
  Layers,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
  const activeCount = runs.filter((r) => r.status === 'running' || r.status === 'queued').length;
  const failedCount = runs.filter((r) => r.status === 'failed').length;

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
          <Link
            to="/runs/new"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all active:scale-95"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Launch Live Audit</span>
          </Link>
        </div>
      </div>

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
            <span className="text-3xl font-bold text-white tracking-tight">{runs.length}</span>
            <span className="text-xs text-slate-400 font-medium">From backend</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Total audit sessions launched</p>
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
            <span className="text-3xl font-bold text-white tracking-tight">{completedCount}</span>
            <span className="text-xs text-slate-400 font-medium">
              {completedCount > 0 ? 'Ready for Replay' : 'None yet'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Runs reported as completed</p>
        </div>

        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-purple-500 to-pink-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Runs
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Loader2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white tracking-tight">{activeCount}</span>
            <span className="text-xs text-purple-400 font-medium">Queued or running</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Runs currently in progress</p>
        </div>

        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-cyan-500 to-blue-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Failed Runs
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white tracking-tight">{failedCount}</span>
            <span className="text-xs text-slate-400 font-medium">From backend</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Runs reported as failed</p>
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
            className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['all', 'completed', 'running', 'failed'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              {st}
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
            const cfg = statusConfig[run.status as keyof typeof statusConfig] || statusConfig.draft;
            const StatusIcon = cfg.icon;

            return (
              <div
                key={run.id}
                className="glass-card p-5 rounded-2xl group transition-all relative overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Info */}
                  <div className="flex items-start space-x-4 min-w-0 flex-1">
                    <div className={`p-3 rounded-xl border mt-0.5 flex-shrink-0 ${cfg.color}`}>
                      <StatusIcon
                        className={`h-5 w-5 ${run.status === 'running' ? 'animate-spin' : ''}`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-3">
                        <Link
                          to={`/runs/${run.id}`}
                          className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors flex items-center space-x-2 truncate"
                        >
                          <span>Run {run.id.slice(0, 8)}</span>
                          <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-indigo-400" />
                        </Link>

                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0 ${cfg.color}`}
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
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center space-x-1.5 flex-shrink-0">
                          <Split className="h-3 w-3 text-purple-400" />
                          <span>{run.personaVersionIds?.length ?? 0} Personas</span>
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 max-w-full sm:max-w-md truncate">
                          Target:{' '}
                          <span className="text-indigo-300 font-mono truncate">
                            {run.targetUrl ?? 'Not recorded'}
                          </span>
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium flex-shrink-0">
                          Status: {cfg.label}
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
