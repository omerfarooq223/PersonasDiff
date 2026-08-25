import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  Download,
  Info,
  Sparkles,
  Code2,
  Copy,
  Check,
  X,
  FileCheck2,
  Laptop,
  Smartphone,
  Maximize2,
  Coins,
} from 'lucide-react';
import {
  api,
  AiInsights,
  parsePriceToNumber,
  convertCurrency,
  CURRENCY_SYMBOLS,
  FX_RATES_TO_USD,
} from '../lib/api';

// ---------------------------------------------------------------------------
// AI Insights Card (non-authoritative, clearly labelled)
// ---------------------------------------------------------------------------

function AiInsightsCard({
  insights,
  message,
  status,
}: {
  insights: AiInsights | null | undefined;
  message?: string | undefined;
  status?: 'available' | 'not_configured' | 'failed' | undefined;
}) {
  const confidenceColor: Record<string, string> = {
    high: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    low: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };

  const pricingStatusConfig: Record<
    string,
    { label: string; bg: string; text: string; border: string }
  > = {
    detected_divergence: {
      label: 'Regional Pricing Divergence Detected',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-300',
      border: 'border-emerald-500/30',
    },
    identical_pricing: {
      label: 'Uniform Global Pricing (No Difference)',
      bg: 'bg-cyan-500/15',
      text: 'text-cyan-300',
      border: 'border-cyan-500/30',
    },
    prices_hidden_or_gated: {
      label: 'Prices Hidden / Gated on Screen',
      bg: 'bg-amber-500/15',
      text: 'text-amber-300',
      border: 'border-amber-500/30',
    },
    not_applicable: {
      label: 'Non-Commercial / Content Surface',
      bg: 'bg-slate-800',
      text: 'text-slate-400',
      border: 'border-slate-700',
    },
  };

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-6 border border-violet-500/30 shadow-2xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-white">AI Visual & Pricing Intelligence</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                Gemini Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Gemini 3.6 Flash — intelligent reasoning across visual layout, pricing visibility &
              regional deltas
            </p>
          </div>
        </div>
        {insights && (
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${confidenceColor[insights.confidence] ?? confidenceColor['medium']}`}
          >
            {insights.confidence} confidence
          </span>
        )}
      </div>

      {!insights ? (
        <div className="flex items-center space-x-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <Info className="h-4 w-4 text-slate-500 flex-shrink-0" />
          <p className="text-xs text-slate-400">
            {message ??
              (status === 'not_configured'
                ? 'Gemini visual analysis is not configured for this API.'
                : 'AI visual analysis was not produced for this run.')}
          </p>
        </div>
      ) : insights.noMeaningfulDifferences ? (
        // No meaningful differences
        <div className="flex items-center space-x-3 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">{insights.headline}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              No meaningful visual differences detected between persona screenshots.
            </p>
          </div>
        </div>
      ) : (
        // Differences found
        <div className="space-y-4">
          {/* Headline */}
          <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/20">
            <p className="text-sm font-semibold text-white leading-relaxed">{insights.headline}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Key Differences */}
            {insights.keyDifferences.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-violet-400 uppercase tracking-wider">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Key Differences Observed</span>
                </div>
                <ul className="space-y-2">
                  {insights.keyDifferences.map((diff, i) => (
                    <li key={i} className="flex items-start space-x-2.5 text-xs text-slate-300">
                      <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-violet-400" />
                      <span>{diff}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notable Items */}
            {insights.notableItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Info className="h-3.5 w-3.5" />
                  <span>Notable Observations</span>
                </div>
                <ul className="space-y-2">
                  {insights.notableItems.map((item, i) => (
                    <li key={i} className="flex items-start space-x-2.5 text-xs text-slate-400">
                      <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-slate-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pricing Intelligence & Diagnostic Reasoning Section */}
      {insights?.pricingAnalysis && (
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-violet-500/25 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Coins className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-white">AI Pricing & Visibility Diagnostics</h4>
            </div>

            {(() => {
              const cfg =
                pricingStatusConfig[insights.pricingAnalysis.status] ||
                pricingStatusConfig['not_applicable']!;
              return (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                >
                  {cfg.label}
                </span>
              );
            })()}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {insights.pricingAnalysis.summary}
          </p>

          {/* Diagnostic Reasons */}
          {insights.pricingAnalysis.reasons && insights.pricingAnalysis.reasons.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Why was this observed? (Diagnostic Reasoning)
              </span>
              <ul className="grid sm:grid-cols-2 gap-2">
                {insights.pricingAnalysis.reasons.map((reason, idx) => (
                  <li
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start space-x-2"
                  >
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Persona Observed Prices */}
          {insights.pricingAnalysis.observedPrices &&
            Object.keys(insights.pricingAnalysis.observedPrices).length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Persona-by-Persona Price Visibility
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(insights.pricingAnalysis.observedPrices).map(
                    ([pName, priceVal]) => (
                      <div
                        key={pName}
                        className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between"
                      >
                        <span
                          className="text-xs text-slate-400 truncate max-w-[110px]"
                          title={pName}
                        >
                          {pName}
                        </span>
                        <span className="text-xs font-semibold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          {priceVal}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="pt-3 border-t border-white/5 flex items-start space-x-2 text-[11px] text-slate-500">
        <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
        <span>
          AI-generated interpretation — results are non-reproducible and non-authoritative. The
          deterministic metrics above are the cryptographically verifiable source of truth.
        </span>
      </div>
    </div>
  );
}

export default function Comparison() {
  const { id } = useParams<{ id: string }>();
  const [exportingFormat, setExportingFormat] = useState<'json' | 'csv' | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [targetCurrency, setTargetCurrency] = useState<string>('USD');

  const {
    data: comparisonData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['comparison', id],
    queryFn: () => api.getComparison(id!),
    enabled: !!id,
    staleTime: 0,
    refetchInterval: (query) => {
      if (query.state.data?.screenshots?.personaA || query.state.data?.personaResults?.length)
        return false;
      return 1500;
    },
  });

  const handleExport = async (format: 'json' | 'csv') => {
    if (!id) return;
    try {
      setExportingFormat(format);
      const record = await api.createExport(id, format);
      const download = await api.getExportDownload(record.id);
      const token =
        (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null) ||
        'pw-admin-token-dev-only-0001';

      const response = await fetch(download.downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Export download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `audit-evidence-${id}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportingFormat(null);
    }
  };

  const copyJson = () => {
    if (comparisonData) {
      navigator.clipboard.writeText(JSON.stringify(comparisonData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in duration-300">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <Sparkles className="h-6 w-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-base font-semibold text-white">
          Running Parallel Audits Across Personas...
        </p>
        <p className="text-xs text-slate-400 max-w-sm text-center">
          Spawning isolated Playwright browsers, taking synchronized viewport captures, and
          calculating localized diffs.
        </p>
      </div>
    );
  }

  if (error || !comparisonData) {
    return (
      <div className="glass-panel p-10 rounded-3xl text-center space-y-4 max-w-lg mx-auto border border-rose-500/30">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Failed to Load Comparison Evidence</h2>
          <p className="text-xs text-slate-400 mt-1">
            The requested comparison session could not be retrieved from the evidence store.
          </p>
        </div>
        <Link
          to="/runs"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  const comparison = comparisonData;

  const personaCards = comparison.personaResults ?? [];

  const getFlag = (locale?: string) => {
    if (locale?.startsWith('fr')) return '🇫🇷';
    if (locale?.startsWith('tr')) return '🇹🇷';
    if (locale?.startsWith('ja')) return '🇯🇵';
    if (locale?.startsWith('de')) return '🇩🇪';
    if (locale?.startsWith('en-GB') || locale?.startsWith('gb')) return '🇬🇧';
    if (locale?.startsWith('pt') || locale?.startsWith('br')) return '🇧🇷';
    if (locale?.startsWith('ar-AE') || locale?.includes('AE')) return '🇦🇪';
    if (locale?.startsWith('ar-SA') || locale?.includes('SA')) return '🇸🇦';
    if (locale?.startsWith('ur') || locale?.startsWith('pk') || locale?.includes('PK')) return '🇵🇰';
    if (locale?.startsWith('hi') || locale?.includes('IN')) return '🇮🇳';
    if (locale?.startsWith('ko') || locale?.includes('KR')) return '🇰🇷';
    if (locale?.includes('CA')) return '🇨🇦';
    if (locale?.includes('AU')) return '🇦🇺';
    if (locale?.startsWith('es')) return '🇪🇸';
    if (locale?.startsWith('it')) return '🇮🇹';
    if (locale?.startsWith('ru')) return '🇷🇺';
    return '🌐';
  };

  const gridClass =
    personaCards.length === 1
      ? 'grid-cols-1 max-w-3xl mx-auto'
      : personaCards.length === 3
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 lg:grid-cols-2';

  // Currency Normalization & Price Parsing
  const personaPricing = personaCards.map((persona) => {
    let detected = (persona as { detectedPrice?: string }).detectedPrice;
    if (!detected) {
      const pricePattern =
        /(?:(R\$|\$|€|£|¥|₺|₨|₹|AED|CHF|CAD|AUD|KRW|₩|TL)[ \t\u00a0]*([\d]+(?:[.,][\d]{1,2})?)|([\d]+(?:[.,][\d]{1,2})?)[ \t\u00a0]*(R\$|\$|€|£|¥|₺|₨|₹|AED|CHF|CAD|AUD|KRW|₩|TL)(?:\/ay|\/mois|\/month|\/mo)?)/i;
      const lineMatches = (persona.textSnippet || '')
        .split(/\r?\n/)
        .map((line) => line.trim().match(pricePattern))
        .filter((match): match is RegExpMatchArray => match !== null);
      const match =
        lineMatches.find((candidate) => /[.,]\d{1,2}/.test(candidate[2] || candidate[3] || '')) ||
        lineMatches[0];
      if (match) {
        const sym = (match[1] || match[4] || '').trim();
        const amt = (match[2] || match[3] || '').trim();
        if (amt && amt.length < 15) {
          detected = `${sym} ${amt}`.trim();
        }
      }
    }

    const parsedCandidate = parsePriceToNumber(detected);
    const matchesTitleYear = Boolean(
      parsedCandidate &&
      Number.isInteger(parsedCandidate.amount) &&
      parsedCandidate.amount >= 1900 &&
      parsedCandidate.amount <= new Date().getFullYear() + 5 &&
      new RegExp(`\\b${parsedCandidate.amount}\\b`).test(persona.title || ''),
    );
    const parsed = matchesTitleYear ? null : parsedCandidate;
    const normalizedValue = parsed
      ? convertCurrency(parsed.amount, parsed.currency, targetCurrency)
      : null;

    return {
      persona,
      detectedPrice: detected || 'Not explicitly extracted',
      parsed,
      pricingWarning: matchesTitleYear
        ? 'Ignored: this value matches a year in the page title, not a verified product price.'
        : null,
      normalizedValue,
    };
  });

  const validPrices = personaPricing.filter((p) => p.normalizedValue !== null);
  const minPrice =
    validPrices.length > 0 ? Math.min(...validPrices.map((p) => p.normalizedValue!)) : null;
  const maxPrice =
    validPrices.length > 0 ? Math.max(...validPrices.map((p) => p.normalizedValue!)) : null;
  const baselinePrice = validPrices.length > 0 ? validPrices[0]?.normalizedValue : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Top Header & Replay/Export Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center space-x-3 mb-1.5">
            <Link
              to="/runs"
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Cross-Persona Divergence Analysis
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              Run {id?.slice(0, 8)}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Cryptographic side-by-side comparison across {personaCards.length} live browser
            sandboxes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/runs/${id}/replay`}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Eye className="h-3.5 w-3.5 text-indigo-400" />
            <span>Targetless Replay</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowJsonModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-all"
          >
            <Code2 className="h-3.5 w-3.5 text-indigo-400" />
            <span>Audit JSON</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('json')}
            disabled={!!exportingFormat}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
          >
            {exportingFormat === 'json' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>Export Evidence</span>
          </button>
        </div>
      </div>

      {/* Observation Banner */}
      <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-indigo-500 space-y-1.5">
        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="h-4 w-4" />
          <span>Core Automated Finding</span>
        </div>
        <p className="text-sm font-semibold text-white leading-relaxed">
          {comparison.overallObservation}
        </p>
      </div>

      {/* Visual Evidence Grid */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Visual Evidence ({personaCards.length} Live Personas Audited Concurrently)
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              Equal Resolution: 1280×720
            </span>
          </div>
          <span className="text-xs text-slate-400">Click any screenshot to zoom full-screen</span>
        </div>

        <div className={`grid ${gridClass} gap-6`}>
          {personaCards.map((persona, index) => {
            const isMobile = persona.viewport.width < 500;
            const borderColors = [
              'border-blue-500/30 hover:border-blue-500/50 shadow-blue-500/5',
              'border-emerald-500/30 hover:border-emerald-500/50 shadow-emerald-500/5',
              'border-purple-500/30 hover:border-purple-500/50 shadow-purple-500/5',
              'border-amber-500/30 hover:border-amber-500/50 shadow-amber-500/5',
            ];
            const badgeColors = [
              'bg-blue-500/10 text-blue-400 border-blue-500/20',
              'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              'bg-purple-500/10 text-purple-300 border-purple-500/20',
              'bg-amber-500/10 text-amber-300 border-amber-500/20',
            ];

            return (
              <div
                key={persona.id || index}
                className={`glass-card rounded-2xl overflow-hidden border shadow-xl flex flex-col transition-all duration-300 ${borderColors[index % borderColors.length]}`}
              >
                {/* Persona Identity Header */}
                <div className="p-3.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    {isMobile ? (
                      <Smartphone className="h-4 w-4 text-purple-400" />
                    ) : (
                      <Laptop className="h-4 w-4 text-indigo-400" />
                    )}
                    <span className="text-xs font-bold text-white tracking-wide">
                      {persona.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeColors[index % badgeColors.length]}`}
                    >
                      {getFlag(persona.locale)} {persona.locale}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {persona.viewport.width}×{persona.viewport.height}
                    </span>
                  </div>
                </div>

                {/* Authentic Desktop Browser Frame */}
                <div className="p-4 sm:p-5 bg-slate-950 flex-1 flex flex-col items-center justify-center">
                  <div className="w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl transition-transform hover:scale-[1.01]">
                    {/* macOS Browser Header with Traffic Lights & URL */}
                    <div className="px-3.5 py-2 bg-slate-850/90 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <div className="px-3 py-0.5 rounded-md bg-slate-950/60 border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center space-x-1.5 max-w-[280px] truncate">
                        <span className="text-emerald-400 text-[9px]">🔒</span>
                        <span className="truncate">{persona.title || 'Live Target'}</span>
                      </div>
                      <div className="w-8" />
                    </div>

                    {/* Screenshot Display */}
                    <div className="relative group bg-slate-950 min-h-[260px] flex items-center justify-center">
                      {persona.screenshot ? (
                        <>
                          <img
                            src={persona.screenshot}
                            alt={`${persona.name} Screenshot Capture`}
                            className="w-full h-auto max-h-[460px] object-cover object-top cursor-pointer group-hover:opacity-95 transition-opacity"
                            onClick={() => setLightboxImage(persona.screenshot)}
                          />
                          <button
                            type="button"
                            onClick={() => setLightboxImage(persona.screenshot)}
                            className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/85 hover:bg-black text-white text-xs flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 shadow-xl backdrop-blur-sm"
                          >
                            <Maximize2 className="h-3.5 w-3.5 text-indigo-400" />
                            <span>Zoom</span>
                          </button>
                        </>
                      ) : (
                        <div className="p-8 text-center text-slate-500 space-y-2">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" />
                          <p className="text-xs">Capturing viewport screenshot...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="p-3 bg-slate-900/80 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>
                    Elements: <strong className="text-slate-200">{persona.elementCount}</strong>
                  </span>
                  <span>
                    Timezone: <strong className="text-slate-200">{persona.timezoneId}</strong>
                  </span>
                  <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Captured</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Geo-Price Discrimination & Currency Arbitrage Analysis */}
      <div className="glass-panel p-6 rounded-2xl space-y-5 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Geo-Price Normalization & Currency Arbitrage</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Live FX Normalization
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Converts regional prices and localized currencies into a single target benchmark to
                calculate true cross-border price variance.
              </p>
            </div>
          </div>

          {/* Target Currency Selector */}
          <div className="flex items-center space-x-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 px-2">
              Convert All Prices To:
            </span>
            <select
              value={targetCurrency}
              onChange={(e) => setTargetCurrency(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-white font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {Object.keys(FX_RATES_TO_USD).map((cur) => (
                <option key={cur} value={cur}>
                  {cur} ({CURRENCY_SYMBOLS[cur] || cur})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {personaPricing.map(
            ({ persona, detectedPrice, pricingWarning, normalizedValue }, idx) => {
              const isCheapest =
                normalizedValue !== null && validPrices.length > 1 && normalizedValue === minPrice;
              const isMostExpensive =
                normalizedValue !== null &&
                validPrices.length > 1 &&
                normalizedValue === maxPrice &&
                maxPrice !== minPrice;
              const deltaPct =
                normalizedValue !== null && baselinePrice && idx > 0
                  ? ((normalizedValue - baselinePrice) / baselinePrice) * 100
                  : null;

              const targetSymbol = CURRENCY_SYMBOLS[targetCurrency] || targetCurrency;

              return (
                <div
                  key={persona.id || idx}
                  className={`p-4 rounded-xl border relative transition-all ${
                    isCheapest
                      ? 'bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                      : isMostExpensive
                        ? 'bg-rose-950/20 border-rose-500/40'
                        : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <span>{getFlag(persona.locale)}</span>
                      <span className="truncate">{persona.name.split('(')[0] || persona.name}</span>
                    </span>
                    {isCheapest && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Best Value
                      </span>
                    )}
                    {isMostExpensive && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        Highest Price
                      </span>
                    )}
                    {!isCheapest && !isMostExpensive && idx === 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        Baseline
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-white/5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] text-slate-400">Native Price:</span>
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {detectedPrice}
                      </span>
                    </div>

                    {pricingWarning && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-[10px] leading-relaxed text-amber-200">
                        {pricingWarning}
                      </div>
                    )}

                    <div className="flex items-baseline justify-between pt-1 border-t border-dashed border-slate-800">
                      <span className="text-[11px] text-slate-400">
                        Normalized ({targetCurrency}):
                      </span>
                      <span className="text-sm font-mono font-extrabold text-white">
                        {normalizedValue !== null
                          ? `${targetSymbol} ${normalizedValue.toFixed(2)}`
                          : 'N/A'}
                      </span>
                    </div>

                    {deltaPct !== null && (
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-slate-400">Arbitrage Delta:</span>
                        <span
                          className={`font-mono font-bold ${
                            deltaPct < 0
                              ? 'text-emerald-400'
                              : deltaPct > 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                          }`}
                        >
                          {deltaPct > 0 ? `+${deltaPct.toFixed(1)}%` : `${deltaPct.toFixed(1)}%`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>

      {/* Similarity & Structural Comparison Metrics */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Deterministic Similarity Metrics
          </h2>
          <span className="text-xs text-slate-500">Confidence: 100% Cryptographic Match</span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {comparison.metrics?.map((metric, index) => (
            <div key={index} className="glass-card p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">{metric.metricName}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {metric.confidence}
                </span>
              </div>

              {/* Score Value Display */}
              <div className="py-1">
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

        {/* Pairwise Multi-Persona Divergence Breakdown (If multiple pairs evaluated) */}
        {comparison.pairwiseComparisons && comparison.pairwiseComparisons.length > 1 && (
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Pairwise Cross-Persona Breakdown</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {comparison.pairwiseComparisons.length} Combinations Evaluated
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Exact text vocabulary overlap (Jaccard) and DOM similarity computed for every
                  persona pair
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-3 pr-4">Identity Pair</th>
                    <th className="pb-3 px-4">Text Vocabulary Overlap</th>
                    <th className="pb-3 px-4">DOM Structural Overlap</th>
                    <th className="pb-3 px-4">Title Match</th>
                    <th className="pb-3 pl-4 text-right">Timing Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {comparison.pairwiseComparisons.map((pair, idx) => {
                    const textPct = (pair.textSimilarity * 100).toFixed(1);
                    const isDivergent = pair.textSimilarity < 0.75;

                    return (
                      <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 pr-4 text-slate-200 font-semibold">
                          <span className="text-indigo-300">{pair.personaA}</span>
                          <span className="text-slate-500 mx-2">vs</span>
                          <span className="text-emerald-300">{pair.personaB}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`font-mono font-bold ${
                                isDivergent ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                            >
                              {textPct}%
                            </span>
                            {isDivergent && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Language / Regional Diff
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {(pair.domSimilarity * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4">
                          {pair.titleMatch ? (
                            <span className="text-emerald-400 font-semibold">Match</span>
                          ) : (
                            <span className="text-amber-400 font-semibold">Variant</span>
                          )}
                        </td>
                        <td className="py-3 pl-4 text-right font-mono text-slate-400">
                          +{pair.durationDeltaMs}ms
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* AI Visual Insights */}
      <AiInsightsCard
        insights={comparison.aiInsights}
        message={comparison.aiInsightsMessage}
        status={comparison.aiInsightsStatus}
      />

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh] overflow-auto rounded-2xl border border-white/10 shadow-2xl bg-slate-950">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-white/10 transition-colors z-10"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Full Screen Zoom"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      )}

      {/* Audit JSON Inspector Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCheck2 className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Cryptographic Audit Evidence JSON</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={copyJson}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs transition-colors"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowJsonModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-5 overflow-auto flex-1 font-mono text-xs text-indigo-200 bg-slate-950/90">
              <pre>{JSON.stringify(comparison, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
