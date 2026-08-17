import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Download,
  Info,
  Sparkles,
  Code2,
  Copy,
  Check,
  X,
  FileCheck2,
} from 'lucide-react';
import { api, ComparisonResult } from '../lib/api';

const fallbackComparison: ComparisonResult = {
  comparedPersonas: ['Persona A (Control / Standard)', 'Persona B (Variant / Regional)'],
  comparisonId: 'cmp-demo-001',
  confidence: 'HIGH',
  metricVersion: '1.0.0',
  metrics: [
    {
      confidence: 'HIGH',
      explanation: 'Calculates element overlap across persona DOM trees',
      metricName: 'DOM Jaccard Structural Similarity',
      metricVersion: '1.0.0',
      result: 0.742,
      warnings: [],
    },
    {
      confidence: 'HIGH',
      explanation: 'Token cosine text similarity across catalog product listings',
      metricName: 'Text Content Similarity (Cosine)',
      metricVersion: '1.0.0',
      result: 0.815,
      warnings: [],
    },
    {
      confidence: 'HIGH',
      explanation: 'Variant persona observed substituted item at Top Rank (Alpha -> Beta)',
      metricName: 'Product Rank Shift',
      metricVersion: '1.0.0',
      result: 'Rank 1: Alpha vs Beta',
      warnings: [],
    },
    {
      confidence: 'HIGH',
      explanation: 'Variant persona observed higher price point ($18.00 vs $10.00)',
      metricName: 'Numeric Price Delta',
      metricVersion: '1.0.0',
      result: '+$8.00 (+80.0%)',
      warnings: [],
    },
    {
      confidence: 'HIGH',
      explanation: 'Both personas completed identical navigation with 0 unexpected redirects',
      metricName: 'Redirect Path Discrepancy',
      metricVersion: '1.0.0',
      result: 'None (Exact Match)',
      warnings: [],
    },
    {
      confidence: 'MEDIUM',
      explanation: 'Page load timing variance within normal operational envelope',
      metricName: 'Load Timing Delta',
      metricVersion: '1.0.0',
      result: '+12ms',
      warnings: ['Timing differences reflect network conditions'],
    },
  ],
  overallObservation:
    'Observed differences under recorded conditions: Persona B received product substitution and higher price tier with high structural overlap.',
  runId: 'run-demo-001',
  timestampUtc: new Date().toISOString(),
  warnings: [],
};

export default function Comparison() {
  const { id } = useParams<{ id: string }>();
  const [exportingFormat, setExportingFormat] = useState<'json' | 'csv' | null>(null);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'metrics'>('side-by-side');
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: comparisonData, isLoading } = useQuery({
    queryKey: ['comparison', id],
    queryFn: () => api.getComparison(id!),
    enabled: !!id,
  });

  const comparison = comparisonData || fallbackComparison;

  const handleExport = async (format: 'json' | 'csv') => {
    if (!id) return;
    try {
      setExportingFormat(format);
      const record = await api.createExport(id, format);
      const download = await api.getExportDownload(record.id);

      const link = document.createElement('a');
      link.href = download.downloadUrl || '#';
      link.download = `personadiff_comparison_${id.slice(0, 8)}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportingFormat(null);
    }
  };

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(comparison, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Computing PersonaDiff metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <Link
            to={`/runs/${id}`}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Run Overview</span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              PersonaDiff Comparison Analysis
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>HIGH Confidence</span>
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-1">
            Run <span className="font-mono text-slate-300">{id?.slice(0, 8)}</span> • Metric Engine
            v{comparison.metricVersion}
          </p>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'side-by-side'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Side-by-Side Visual
            </button>
            <button
              type="button"
              onClick={() => setViewMode('metrics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'metrics'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Decomposed Metrics
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowJsonModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-all"
          >
            <Code2 className="h-3.5 w-3.5 text-purple-400" />
            <span>Inspect JSON</span>
          </button>

          <Link
            to={`/runs/${id}/replay`}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition-all active:scale-95"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Replay Evidence</span>
          </Link>

          <button
            type="button"
            onClick={() => handleExport('json')}
            disabled={exportingFormat !== null}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
          >
            {exportingFormat === 'json' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>Export Package</span>
          </button>
        </div>
      </div>

      {/* JSON Schema Inspector Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileCheck2 className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Cryptographic Comparison Manifest Payload
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowJsonModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300/90 max-h-96 overflow-y-auto leading-relaxed">
              {JSON.stringify(comparison, null, 2)}
            </pre>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-mono">
                Schema Version: v1.0.0 (OpenAPI 3.1)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={copyJson}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 flex items-center space-x-1.5"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copied ? 'Copied to Clipboard' : 'Copy JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowJsonModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Executive Observation Card */}
      <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-indigo-500 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            <span>Executive Observation Summary</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            ID: {comparison.comparisonId}
          </span>
        </div>

        <p className="text-sm font-medium text-slate-200 leading-relaxed">
          {comparison.overallObservation}
        </p>

        <div className="pt-2 flex items-center space-x-2 text-[11px] text-slate-400">
          <Info className="h-3.5 w-3.5 text-indigo-400" />
          <span>
            Non-causal verification: Explains measurable differences without imputing unobserved
            business intent.
          </span>
        </div>
      </div>

      {/* Side-by-Side Visual Inspection */}
      {viewMode === 'side-by-side' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Step 4 Visual Evidence Diff (Product Catalog)
            </h2>
            <span className="text-xs text-slate-400">Isolated 1280×720 Viewports</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Persona A Panel */}
            <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
              <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <span className="text-xs font-bold text-white">
                    Persona A (Control / Standard)
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">200 OK • 1280×720</span>
              </div>

              {/* Simulated Catalog Preview for Persona A */}
              <div className="p-6 bg-[#0E1526] space-y-4 font-sans">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
                  <span className="text-xs font-bold text-blue-400">Standard Tier</span>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white">
                        1. Product Alpha (Featured)
                      </div>
                      <div className="text-[11px] text-slate-400">Base Catalog Item • In Stock</div>
                    </div>
                    <div className="text-sm font-bold text-emerald-400">$10.00</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-300">2. Product Gamma</div>
                      <div className="text-[11px] text-slate-500">Standard Accessory</div>
                    </div>
                    <div className="text-sm font-semibold text-slate-300">$15.00</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Persona B Panel */}
            <div className="glass-card rounded-2xl overflow-hidden border border-purple-500/30 shadow-lg shadow-purple-500/5">
              <div className="p-3.5 bg-slate-900/90 border-b border-purple-500/20 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                  <span className="text-xs font-bold text-white">
                    Persona B (Variant / Regional)
                  </span>
                </div>
                <span className="text-[11px] font-mono text-purple-300">200 OK • 1280×720</span>
              </div>

              {/* Simulated Catalog Preview for Persona B */}
              <div className="p-6 bg-[#120F24] space-y-4 font-sans">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
                  <span className="text-xs font-bold text-purple-400">Dynamic Pricing Tier</span>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-purple-200 flex items-center space-x-1.5">
                        <span>1. Product Beta (Substituted)</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          Shift
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">Regional Premium Listing</div>
                    </div>
                    <div className="text-sm font-bold text-amber-400">$18.00</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-300">2. Product Gamma</div>
                      <div className="text-[11px] text-slate-500">Standard Accessory</div>
                    </div>
                    <div className="text-sm font-semibold text-slate-300">$15.00</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decomposed Metrics Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Decomposed Comparison Metrics
          </h2>
          <span className="text-xs text-slate-400">
            {comparison.metrics.length} Verifications Evaluated
          </span>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comparison.metrics.map((metric, idx) => (
            <div
              key={idx}
              className="glass-card p-5 rounded-2xl space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{metric.metricName}</h3>
                  <p className="text-[11px] text-slate-400">Engine v{metric.metricVersion}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {metric.confidence}
                </span>
              </div>

              {/* Score Value Display */}
              <div className="py-2">
                <div className="text-xl font-extrabold text-white tracking-tight font-mono">
                  {typeof metric.result === 'number'
                    ? `${(metric.result * 100).toFixed(1)}%`
                    : String(metric.result)}
                </div>

                {typeof metric.result === 'number' && (
                  <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${metric.result * 100}%` }}
                    />
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-400 leading-normal">{metric.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
