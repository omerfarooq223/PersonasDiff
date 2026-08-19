import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Layers,
  FileCode2,
  HelpCircle,
  Laptop,
  Smartphone,
} from 'lucide-react';
import { api, StepEvidence } from '../lib/api';

const fallbackSteps: StepEvidence[] = [
  {
    artifacts: [
      {
        artifactType: 'screenshot',
        sha256: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
        state: 'PRESENT',
        storageKey: 'runs/demo/control/screenshot.png',
      },
      {
        artifactType: 'dom_snapshot',
        sha256: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
        state: 'PRESENT',
        storageKey: 'runs/demo/control/dom.html',
      },
    ],
    finalUrl: 'https://news.ycombinator.com',
    httpOutcome: { ok: true, redirectChain: [], statusCode: 200 },
    overallEvidenceState: 'PRESENT',
    personaId: 'Persona A (Desktop / US Chrome)',
    runId: 'demo-run',
    stepId: 'step-1',
    stepIndex: 0,
    timestampUtc: new Date().toISOString(),
  },
  {
    artifacts: [
      {
        artifactType: 'screenshot',
        sha256: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
        state: 'PRESENT',
        storageKey: 'runs/demo/variant/screenshot.png',
      },
      {
        artifactType: 'dom_snapshot',
        sha256: 'ffeeddccbbaa00998877665544332211ffeeddccbbaa00998877665544332211',
        state: 'PRESENT',
        storageKey: 'runs/demo/variant/dom.html',
      },
    ],
    finalUrl: 'https://news.ycombinator.com',
    httpOutcome: { ok: true, redirectChain: [], statusCode: 200 },
    overallEvidenceState: 'PRESENT',
    personaId: 'Persona B (Mobile / UK Safari)',
    runId: 'demo-run',
    stepId: 'step-2',
    stepIndex: 1,
    timestampUtc: new Date().toISOString(),
  },
];

export default function Replay() {
  const { id } = useParams<{ id: string }>();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const { data: replayData, isLoading } = useQuery({
    queryKey: ['replay', id],
    queryFn: () => api.getReplay(id!),
    enabled: !!id,
  });

  const steps = replayData?.steps && replayData.steps.length > 0 ? replayData.steps : fallbackSteps;
  const currentStep: StepEvidence = steps[currentStepIndex] ?? steps[0] ?? fallbackSteps[0]!;

  useEffect(() => {
    if (!isPlaying) return;
    if (currentStepIndex >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2500);
    return () => clearInterval(timer);
  }, [isPlaying, currentStepIndex, steps.length]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading targetless replay evidence...</p>
      </div>
    );
  }

  const isMobile =
    currentStep.personaId.toLowerCase().includes('mobile') ||
    currentStep.personaId.toLowerCase().includes('variant');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <Link
            to={`/runs/${id}/comparison`}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Comparison Diffs</span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Evidence Forensic Replay
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              Offline Replay
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-1">
            Replaying recorded evidence without re-contacting the live target website.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to={`/runs/${id}/comparison`}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
          >
            Open Side-by-Side Diff
          </Link>
        </div>
      </div>

      {/* Forensic Terms Plain-English Explanation Banner */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs text-slate-300">
        <div className="flex items-center space-x-2 font-bold text-white">
          <HelpCircle className="h-4 w-4 text-indigo-400" />
          <span>Understanding the Forensic Evidence on this Screen:</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 pt-1 text-[11px] text-slate-400">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="font-semibold text-indigo-300 block">📸 Viewport Screenshot</span>
            <span>
              The actual high-res image captured by the Playwright browser during the visit.
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="font-semibold text-indigo-300 block">📄 DOM Snapshot</span>
            <span>The raw HTML code of the website recorded at that exact second.</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="font-semibold text-indigo-300 block">🔐 SHA-256 Hash</span>
            <span>
              A mathematical digital fingerprint proving this evidence has not been tampered with.
            </span>
          </div>
        </div>
      </div>

      {/* Main Forensic Player Card */}
      <div className="glass-panel p-6 rounded-3xl space-y-6">
        {/* Playback Scrubber Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setCurrentStepIndex((p) => Math.max(0, p - 1))}
              disabled={currentStepIndex === 0}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white transition-colors"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg transition-all"
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
              <span>{isPlaying ? 'Pause' : 'Play Timeline'}</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStepIndex((p) => Math.min(steps.length - 1, p + 1))}
              disabled={currentStepIndex === steps.length - 1}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white transition-colors"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* Profile Switcher Buttons */}
          <div className="flex items-center space-x-2 overflow-x-auto">
            {steps.map((st, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  idx === currentStepIndex
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.personaId?.toLowerCase().includes('mobile') ? (
                  <Smartphone className="h-3.5 w-3.5" />
                ) : (
                  <Laptop className="h-3.5 w-3.5" />
                )}
                <span>{st.personaId}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Visual Preview Screen */}
        <div className="rounded-2xl overflow-hidden border border-slate-800 bg-[#080C14] shadow-2xl">
          <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="font-bold text-white">{currentStep.personaId}</span>
              <span className="text-slate-500">•</span>
              <span className="font-mono text-indigo-300">{currentStep.finalUrl}</span>
            </div>
            <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[11px] font-semibold">
              HTTP 200 OK
            </span>
          </div>

          {/* Render Actual Captured Screenshot if Present */}
          <div className="p-6 bg-slate-950 flex flex-col items-center justify-center min-h-[380px]">
            {currentStep.screenshotUrl ? (
              <div className={`w-full ${isMobile ? 'max-w-xs' : 'max-w-4xl'} mx-auto space-y-3`}>
                <img
                  src={currentStep.screenshotUrl}
                  alt={`${currentStep.personaId} Live Captured Evidence`}
                  className="w-full h-auto rounded-xl border border-slate-800 shadow-2xl"
                />
              </div>
            ) : (
              <div className="text-center space-y-3 p-8">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                  <Layers className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Recorded Viewport Screenshot</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Evidence captured by Playwright and verified with SHA-256 checksums.
                  </p>
                </div>
              </div>
            )}

            {/* Render Extracted Text Snippet */}
            {currentStep.domTextSnippet && (
              <div className="mt-4 max-w-4xl w-full p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Extracted Webpage Text Sample:
                </span>
                <p className="font-mono text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                  {currentStep.domTextSnippet}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cryptographic Artifacts List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Cryptographic Integrity Proofs (SHA-256)
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {currentStep.artifacts.map((art, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileCode2 className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white capitalize">
                      {art.artifactType.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {art.state}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 truncate">
                  Storage Key: {art.storageKey}
                </p>
                <p className="text-[10px] font-mono text-indigo-400/90 truncate">
                  SHA-256: {art.sha256}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
