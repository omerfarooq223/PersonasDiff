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
  Smartphone,
  Sparkles,
  Link2,
} from 'lucide-react';
import { api, type CreateRunRequest } from '../lib/api';

export default function CreateRun() {
  const navigate = useNavigate();
  const [surfaceId, setSurfaceId] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
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
    if (journeys && journeys.length > 0 && surfaceId) {
      const matchingJourney = journeys.find(
        (j) => (j as { surfaceId?: string }).surfaceId === surfaceId,
      );
      if (matchingJourney) {
        setJourneyVersionId(matchingJourney.id);
      } else if (!journeyVersionId && journeys[0]) {
        setJourneyVersionId(journeys[0].id);
      }
    }
  }, [journeys, surfaceId, journeyVersionId]);

  useEffect(() => {
    if (personas && personas.length >= 2 && selectedPersonaIds.length === 0) {
      setSelectedPersonaIds(personas.slice(0, 2).map((p) => p.id));
    }
  }, [personas, selectedPersonaIds]);

  const createRunMutation = useMutation({
    mutationFn: (data: CreateRunRequest) => {
      const idempotencyKey = `live-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      return api.createRun(data, idempotencyKey);
    },
    onSuccess: (run) => {
      navigate(`/runs/${run.id}/comparison`);
    },
  });

  const handlePersonaToggle = (personaId: string) => {
    setSelectedPersonaIds((prev) => {
      const isSelected = prev.includes(personaId);
      return isSelected ? prev.filter((id) => id !== personaId) : [...prev, personaId];
    });
  };

  const canSubmit =
    (surfaceId || (isCustomMode && customUrl.startsWith('http'))) && selectedPersonaIds.length >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      const payload: CreateRunRequest = {
        journeyVersionId: journeyVersionId || '00000000-0000-4000-8000-000000000020',
        personaVersionIds: selectedPersonaIds,
        surfaceId: isCustomMode ? '00000000-0000-4000-8000-000000000011' : surfaceId,
      };
      if (isCustomMode && customUrl.trim().length > 0) {
        payload.customSurfaceUrl = customUrl.trim();
      }
      createRunMutation.mutate(payload);
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
              Launch Live Audit Run
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center space-x-1">
              <Sparkles className="h-3 w-3" />
              <span>Real Playwright Browser</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Pick a website URL, choose two visitor devices (Personas), and PersonaDiff will launch
            real parallel browsers to find differences.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Surface Selection */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>Target Website (Surface)</span>
                  <Globe className="h-4 w-4 text-cyan-400" />
                </h2>
                <p className="text-xs text-slate-400">
                  The website you want to test and compare across visitor profiles
                </p>
              </div>
            </div>

            {/* Custom URL vs Preset Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  !isCustomMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Presets
              </button>
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  isCustomMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Custom URL
              </button>
            </div>
          </div>

          {/* Custom URL Input Field */}
          {isCustomMode ? (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/40 space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Enter Any Real Public Website URL:
              </label>
              <div className="relative">
                <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                <input
                  type="url"
                  placeholder="https://news.ycombinator.com or https://example.com"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Playwright will open this URL concurrently in both visitor browser profiles.
              </p>
            </div>
          ) : (
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
                      hostname: 'news.ycombinator.com',
                      id: '00000000-0000-4000-8000-000000000011',
                      name: 'Hacker News (Live Public Surface)',
                      origin: 'https://news.ycombinator.com',
                      status: 'approved' as const,
                    },
                    {
                      hostname: 'en.wikipedia.org',
                      id: '00000000-0000-4000-8000-000000000012',
                      name: 'Wikipedia Portal (Live Public Surface)',
                      origin: 'https://en.wikipedia.org',
                      status: 'approved' as const,
                    },
                    {
                      hostname: 'localhost:4300',
                      id: '00000000-0000-4000-8000-000000000010',
                      name: 'Local Deterministic Fixture (Test Catalog)',
                      origin: 'http://localhost:4300',
                      status: 'approved' as const,
                    },
                  ]
                ).map((s) => {
                  const isLive = s.hostname !== 'localhost:4300';
                  const surfaceOrigin =
                    (s as { origin?: string }).origin || `https://${s.hostname}`;

                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSurfaceId(s.id);
                        if (journeys) {
                          const match = journeys.find(
                            (j) => (j as { surfaceId?: string }).surfaceId === s.id,
                          );
                          if (match) setJourneyVersionId(match.id);
                        }
                      }}
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
                              {surfaceOrigin}
                            </p>
                          </div>
                        </div>
                        {surfaceId === s.id && <CheckCircle2 className="h-4 w-4 text-indigo-400" />}
                      </div>
                      <div className="mt-3 flex items-center space-x-2 text-[11px] font-medium">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-cyan-400' : 'bg-emerald-400'}`}
                        />
                        <span className={isLive ? 'text-cyan-400' : 'text-emerald-400'}>
                          {isLive
                            ? 'Live Real Website (Audited via Playwright)'
                            : 'Local Sandbox Catalog'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Step 2: Journey Workflow Selection */}
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
              <p className="text-xs text-slate-400">
                The automated sequence of actions the browser will execute on the page
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-white flex items-center space-x-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Full Audit Sequence:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-indigo-400 font-bold block">STEP 1</span>
                <span className="text-slate-200 font-medium">Navigate</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-indigo-400 font-bold block">STEP 2</span>
                <span className="text-slate-200 font-medium">Wait for Load</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-indigo-400 font-bold block">STEP 3</span>
                <span className="text-slate-200 font-medium">Take Screenshot</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-indigo-400 font-bold block">STEP 4</span>
                <span className="text-slate-200 font-medium">Extract & Diff</span>
              </div>
            </div>
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
                  <span>Select 2 Comparison Personas (Device Identities)</span>
                  <Users2 className="h-4 w-4 text-cyan-400" />
                </h2>
                <p className="text-xs text-slate-400">
                  Different device and location profiles being sent to the website in parallel
                </p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            {(
              personas || [
                {
                  id: '00000000-0000-4000-8000-000000000030',
                  name: 'Persona A (Desktop / US Chrome)',
                  settings: {
                    locale: 'en-US',
                    timezoneId: 'America/New_York',
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
                    viewport: { height: 720, width: 1280 },
                  },
                  version: '1.0.0',
                },
                {
                  id: '00000000-0000-4000-8000-000000000031',
                  name: 'Persona B (Mobile / UK Safari)',
                  settings: {
                    locale: 'en-GB',
                    timezoneId: 'Europe/London',
                    userAgent:
                      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/605.1.15',
                    viewport: { height: 844, width: 390 },
                  },
                  version: '1.0.0',
                },
              ]
            ).map((p) => {
              const isSelected = selectedPersonaIds.includes(p.id);
              const isMobile = p.settings.viewport.width < 500;

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
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                        {isMobile ? (
                          <Smartphone className="h-4 w-4 text-purple-400" />
                        ) : (
                          <Laptop className="h-4 w-4 text-indigo-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                        <p className="text-xs text-slate-400">
                          {p.settings.viewport.width}×{p.settings.viewport.height} •{' '}
                          {p.settings.locale}
                        </p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-indigo-400" />}
                  </div>

                  <div className="mt-3 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 font-mono text-[11px] text-slate-400 break-all">
                    {p.settings.userAgent}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Isolation Guarantee Banner */}
        <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-start space-x-3 text-xs text-slate-300">
          <ShieldCheck className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block mb-0.5">
              100% Zero-Contamination Guarantee
            </span>
            <span>
              Persona A and Persona B execute in separate Playwright sandboxes. Cookies, cache, and
              session data never leak between personas.
            </span>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-white/5">
          <Link
            to="/runs"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canSubmit || createRunMutation.isPending}
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {createRunMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Launching Real Playwright Browsers...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Start Live Audit</span>
              </>
            )}
          </button>
        </div>

        {createRunMutation.isError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Failed to launch comparison run. Please try again.</span>
          </div>
        )}
      </form>
    </div>
  );
}
