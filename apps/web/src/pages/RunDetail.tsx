import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Split, Eye, ArrowLeft, ShieldCheck, Copy, Check, Sparkles, Download } from 'lucide-react';
import { api } from '../lib/api';

export default function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const [exportingFormat, setExportingFormat] = useState<'json' | 'csv' | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    data: run,
    isError: runError,
    isLoading,
  } = useQuery({
    queryKey: ['run', id],
    queryFn: () => api.getRun(id!),
    enabled: !!id,
  });

  const { data: comparison } = useQuery({
    queryKey: ['comparison', id],
    queryFn: () => api.getComparison(id!),
    enabled: !!id && Boolean(run),
  });

  const copyRunId = () => {
    if (id) {
      navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    if (!id) return;
    try {
      setExportingFormat(format);
      const record = await api.createExport(id, format);
      const download = await api.getExportDownload(record.id);

      const link = document.createElement('a');
      link.href = download.downloadUrl || '#';
      link.download = `personadiff_export_${id.slice(0, 8)}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportingFormat(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading run details...</p>
      </div>
    );
  }

  if (runError || !run) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3 text-center">
        <h2 className="text-lg font-bold text-white">Run unavailable</h2>
        <p className="text-sm text-slate-400">The backend did not return a run for this ID.</p>
        <Link to="/runs" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300">
          Back to runs
        </Link>
      </div>
    );
  }

  const runData = run;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <Link
            to="/runs"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Runs Dashboard</span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Run <span className="font-mono text-indigo-400">{runData.id.slice(0, 8)}</span>
            </h1>

            <button
              type="button"
              onClick={copyRunId}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center space-x-1.5 transition-colors"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              <span>{copied ? 'Copied' : runData.id.slice(0, 13) + '...'}</span>
            </button>

            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="capitalize">{runData.status}</span>
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-1">
            Executed on {new Date(runData.createdAt).toLocaleString()} • Isolated Playwright
            Chromium
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/runs/${runData.id}/comparison`}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-colors"
          >
            <Eye className="h-4 w-4" />
            <span>View Live Comparison</span>
          </Link>

          <Link
            to={`/runs/${runData.id}/replay`}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            <Split className="h-4 w-4 text-purple-400" />
            <span>Step Replay</span>
          </Link>

          <button
            type="button"
            onClick={() => handleExport('json')}
            disabled={exportingFormat !== null}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl space-y-3 overflow-hidden">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Target Surface
          </span>
          <div className="overflow-hidden">
            <h3 className="text-sm font-bold text-white truncate">
              {comparison?.domSummary?.personaATitle ?? 'Title not recorded'}
            </h3>
            <p className="text-xs text-indigo-400 font-mono mt-0.5 truncate break-all">
              {runData.targetUrl ?? 'URL not recorded'}
            </p>
          </div>
          <div className="pt-2 border-t border-white/5 text-[11px] text-emerald-400 flex items-center space-x-1.5 truncate">
            <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">Audited Live via Playwright Chromium</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Audited Personas (
            {comparison?.comparedPersonas?.length ?? runData.personaVersionIds?.length ?? 0})
          </span>
          <div className="space-y-1.5">
            {(comparison?.personaResults || []).map((p, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-white font-medium truncate max-w-[170px]">{p.name}</span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {p.viewport.width}x{p.viewport.height} • {p.locale}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-white/5 text-[11px] text-purple-400 flex items-center space-x-1.5">
            <Split className="h-3.5 w-3.5" />
            <span>Isolated Contexts • Distinct Fingerprints</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Live Comparison Summary
          </span>
          <div className="space-y-1.5 text-xs">
            {comparison?.metrics?.slice(0, 3).map((m, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-slate-300 font-medium truncate max-w-[150px]">
                  {m.metricName}
                </span>
                <span className="text-emerald-400 font-mono font-semibold">
                  {typeof m.result === 'number'
                    ? `${(m.result * 100).toFixed(1)}%`
                    : String(m.result)}
                </span>
              </div>
            )) || <p className="text-slate-400">Computing live metrics across personas...</p>}
          </div>
          <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 flex items-center space-x-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Non-Causal Evidence Recorded</span>
          </div>
        </div>
      </div>
    </div>
  );
}
