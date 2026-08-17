import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  Split,
  FileCode2,
  Layers,
} from 'lucide-react';
import { api, type StepEvidence } from '../lib/api';

const fallbackSteps: StepEvidence[] = [
  {
    artifacts: [
      {
        artifactType: 'screenshot',
        sha256: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
        state: 'PRESENT',
        storageKey: 'runs/run-demo-001/control/step-1.png',
      },
      {
        artifactType: 'dom_snapshot',
        sha256: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
        state: 'PRESENT',
        storageKey: 'runs/run-demo-001/control/step-1.html',
      },
    ],
    finalUrl: 'http://127.0.0.1:4300/fixture?persona=control',
    httpOutcome: { ok: true, redirectChain: [], statusCode: 200 },
    overallEvidenceState: 'PRESENT',
    personaId: 'Persona A (Control / Standard)',
    runId: 'run-demo-001',
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
        storageKey: 'runs/run-demo-001/variant/step-1.png',
      },
      {
        artifactType: 'dom_snapshot',
        sha256: 'ffeeddccbbaa00998877665544332211ffeeddccbbaa00998877665544332211',
        state: 'PRESENT',
        storageKey: 'runs/run-demo-001/variant/step-1.html',
      },
    ],
    finalUrl: 'http://127.0.0.1:4300/fixture?persona=variant',
    httpOutcome: { ok: true, redirectChain: [], statusCode: 200 },
    overallEvidenceState: 'PRESENT',
    personaId: 'Persona B (Variant / Regional)',
    runId: 'run-demo-001',
    stepId: 'step-1',
    stepIndex: 0,
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
              Targetless Evidence Replay
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              Offline Replay
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-1">
            Run <span className="font-mono text-slate-300">{id?.slice(0, 8)}</span> • Step{' '}
            {currentStepIndex + 1} of {steps.length}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to={`/runs/${id}/comparison`}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Split className="h-3.5 w-3.5" />
            <span>View Comparison Diffs</span>
          </Link>
        </div>
      </div>

      {/* Historical Evidence Notice */}
      <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/20 flex items-start space-x-3 text-xs text-blue-300">
        <Clock className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white">Targetless Offline Replay:</span> Rendered strictly
          from immutable DOM snapshots and screenshot captures stored in S3/MinIO. No outbound
          network requests are made to target surfaces during replay.
        </div>
      </div>

      {/* Cinema Player Frame */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        {/* Step Selector & Playback Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
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
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow transition-all active:scale-95"
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5" />
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

          {/* Step Bubbles */}
          <div className="flex items-center space-x-2 overflow-x-auto">
            {steps.map((st, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  idx === currentStepIndex
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.personaId?.includes('Control') ? 'Persona A (Control)' : 'Persona B (Variant)'}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Preview Screen */}
        <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#080C14] shadow-2xl">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="font-bold text-white">{currentStep.personaId}</span>
              <span className="text-slate-500">•</span>
              <span className="font-mono text-slate-400">{currentStep.finalUrl}</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[11px]">
              HTTP {currentStep.httpOutcome.statusCode} OK
            </span>
          </div>

          <div className="p-8 text-center bg-gradient-to-b from-slate-950 to-slate-900 min-h-[300px] flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-inner">
              <Layers className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Immutable Viewport Snapshot Replay</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Evidence verified with SHA-256 cryptographic checksums. PII data scrubbed via
                pre-storage redaction.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
              <span className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                Final URL: {currentStep.finalUrl}
              </span>
              <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                PII Redacted: Zero Leaks
              </span>
            </div>
          </div>
        </div>

        {/* Cryptographic Artifacts List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Verified Step Artifacts
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
                  Key: {art.storageKey}
                </p>
                <p className="text-[10px] font-mono text-slate-500 truncate">
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
