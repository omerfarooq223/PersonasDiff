import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  Globe,
  Compass,
  Users2,
  ShieldCheck,
  ArrowLeft,
  Laptop,
} from 'lucide-react';
import { api, type CreateRunRequest } from '../lib/api';

export default function CreateRun() {
  const navigate = useNavigate();
  const [surfaceId, setSurfaceId] = useState<string>('');
  const [journeyVersionId, setJourneyVersionId] = useState<string>('');
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);

  const { data: surfaces, isLoading: loadingSurfaces } = useQuery({
    queryKey: ['surfaces'],
    queryFn: () => api.getSurfaces(),
  });

  const { data: journeys } = useQuery({
    queryKey: ['journeys'],
    queryFn: () => api.getJourneys(),
  });

  const { data: personas } = useQuery({
    queryKey: ['personas'],
    queryFn: () => api.getPersonas(),
  });

  // Auto select default surface & journey if available
  useEffect(() => {
    if (surfaces && surfaces.length > 0 && !surfaceId && surfaces[0]) {
      setSurfaceId(surfaces[0].id);
    }
  }, [surfaces, surfaceId]);

  useEffect(() => {
    if (journeys && journeys.length > 0 && !journeyVersionId && journeys[0]) {
      setJourneyVersionId(journeys[0].id);
    }
  }, [journeys, journeyVersionId]);

  useEffect(() => {
    if (personas && personas.length >= 2 && selectedPersonaIds.length === 0) {
      setSelectedPersonaIds(personas.slice(0, 2).map((p) => p.id));
    }
  }, [personas, selectedPersonaIds]);

  const createRunMutation = useMutation({
    mutationFn: (data: CreateRunRequest) => {
      const idempotencyKey = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      return api.createRun(data, idempotencyKey);
    },
    onSuccess: (run) => {
      navigate(`/runs/${run.id}`);
    },
  });

  const handlePersonaToggle = (personaId: string) => {
    setSelectedPersonaIds((prev) => {
      const isSelected = prev.includes(personaId);
      return isSelected ? prev.filter((id) => id !== personaId) : [...prev, personaId];
    });
  };

  const canSubmit = surfaceId && journeyVersionId && selectedPersonaIds.length >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      createRunMutation.mutate({
        journeyVersionId,
        personaVersionIds: selectedPersonaIds,
        surfaceId,
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Navigation Breadcrumb & Title */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <Link
            to="/runs"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Runs Dashboard</span>
          </Link>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Configure Comparison Run
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
              Isolated Execution
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Define target surface, journey sequence, and isolated personas for side-by-side audit.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Surface Selection */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Approved Target Surface</span>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </h2>
              <p className="text-xs text-slate-400">Strict SSRF allowlist boundary enforced</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            {loadingSurfaces ? (
              <div className="col-span-2 py-4 flex items-center justify-center text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin mr-2 text-indigo-400" /> Loading
                surfaces...
              </div>
            ) : (
              (
                surfaces || [
                  {
                    hostname: 'localhost:4300',
                    id: '00000000-0000-4000-8000-000000000010',
                    name: 'Local Deterministic Fixture Surface',
                    status: 'approved' as const,
                  },
                ]
              ).map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSurfaceId(s.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    surfaceId === s.id
                      ? 'border-indigo-500 bg-indigo-600/15 shadow-lg shadow-indigo-600/15'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <Globe className="h-4 w-4 text-indigo-400" />
                      <div>
                        <h3 className="text-sm font-semibold text-white">{s.name}</h3>
                        <p className="text-xs text-indigo-300/80 font-mono mt-0.5">
                          http://{s.hostname}
                        </p>
                      </div>
                    </div>
                    {surfaceId === s.id && <CheckCircle2 className="h-4 w-4 text-indigo-400" />}
                  </div>
                  <div className="mt-3 flex items-center space-x-2 text-[11px] text-emerald-400 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Pre-Approved for Zero-Consent Local Auditing</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Step 2: Journey Version Selection */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Journey Workflow</span>
                <Compass className="h-4 w-4 text-purple-400" />
              </h2>
              <p className="text-xs text-slate-400">Deterministic sequence of browser actions</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-1 gap-3 pt-2">
            {(
              journeys || [
                {
                  id: '00000000-0000-4000-8000-000000000020',
                  name: 'Product Catalog & Pricing Audit Journey',
                  steps: [
                    { action: 'navigate', description: 'Navigate to fixture catalog', id: '1' },
                    { action: 'wait', description: 'Wait for DOM networkidle', id: '2' },
                    { action: 'screenshot', description: 'Capture viewport screenshot', id: '3' },
                    {
                      action: 'extract',
                      description: 'Extract product listing & price data',
                      id: '4',
                    },
                  ],
                  version: '1.0.0',
                },
              ]
            ).map((j) => (
              <div
                key={j.id}
                onClick={() => setJourneyVersionId(j.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  journeyVersionId === j.id
                    ? 'border-indigo-500 bg-indigo-600/15 shadow-lg shadow-indigo-600/15'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{j.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Immutable Journey Version {j.version}
                    </p>
                  </div>
                  {journeyVersionId === j.id && (
                    <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {j.steps.map((st, idx) => {
                    const stepType =
                      'action' in st && typeof st.action === 'string'
                        ? st.action
                        : 'type' in st && typeof st.type === 'string'
                          ? st.type
                          : 'step';
                    return (
                      <span
                        key={st.id || idx}
                        className="px-2 py-1 rounded-md bg-slate-950/60 border border-slate-800 text-slate-300 font-mono text-[11px]"
                      >
                        Step {idx + 1}: {stepType}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3: Persona Selection */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>Select Isolated Personas</span>
                  <Users2 className="h-4 w-4 text-cyan-400" />
                </h2>
                <p className="text-xs text-slate-400">
                  Choose at least 2 personas to evaluate concurrently
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300">
              {selectedPersonaIds.length} Selected
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            {(
              personas || [
                {
                  id: '00000000-0000-4000-8000-000000000030',
                  name: 'Persona A (Control / Standard)',
                  settings: {
                    locale: 'en-US',
                    timezoneId: 'UTC',
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PersonaDiff/Control',
                    viewport: { height: 720, width: 1280 },
                  },
                  version: '1.0.0',
                },
                {
                  id: '00000000-0000-4000-8000-000000000031',
                  name: 'Persona B (Variant / Regional)',
                  settings: {
                    locale: 'en-US',
                    timezoneId: 'UTC',
                    userAgent:
                      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) PersonaDiff/Variant',
                    viewport: { height: 720, width: 1280 },
                  },
                  version: '1.0.0',
                },
              ]
            ).map((p) => {
              const isSelected = selectedPersonaIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => handlePersonaToggle(p.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-600/15 shadow-lg shadow-indigo-600/15'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                      <p className="text-xs text-slate-400">Version {p.version}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border-slate-700'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center space-x-2">
                      <Laptop className="h-3 w-3 text-slate-400" />
                      <span>
                        Viewport: {p.settings.viewport.width} × {p.settings.viewport.height}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Globe className="h-3 w-3 text-slate-400" />
                      <span>
                        {p.settings.locale} • {p.settings.timezoneId}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedPersonaIds.length < 2 && (
            <div className="flex items-center space-x-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Select at least two personas to execute a comparative audit.</span>
            </div>
          )}
        </div>

        {/* Security / Isolation Guarantee Banner */}
        <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-center space-x-3 text-xs text-indigo-300">
          <ShieldCheck className="h-5 w-5 text-indigo-400 shrink-0" />
          <span>
            <strong>Zero State Contamination:</strong> Each persona runs in an isolated, newly
            instantiated Playwright context with pre-storage PII redaction and SSRF egress blocking.
          </span>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <Link
            to="/runs"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canSubmit || createRunMutation.isPending}
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all active:scale-95"
          >
            {createRunMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                <span>Dispatching Workers...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current mr-1.5" />
                <span>Start Comparative Audit</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
