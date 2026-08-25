import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  Plus,
  Trash2,
  X,
  Flag,
} from 'lucide-react';
import { api, type CreateRunRequest } from '../lib/api';

const COUNTRY_PRESETS = [
  {
    flag: '🇧🇷',
    name: 'Brazil (Portuguese / BRL)',
    locale: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL R$',
  },
  {
    flag: '🇩🇪',
    name: 'Germany (German / EUR)',
    locale: 'de-DE',
    timezone: 'Europe/Berlin',
    currency: 'EUR €',
  },
  {
    flag: '🇦🇪',
    name: 'UAE (Arabic / AED)',
    locale: 'ar-AE',
    timezone: 'Asia/Dubai',
    currency: 'AED د.إ',
  },
  {
    flag: '🇮🇳',
    name: 'India (English / INR)',
    locale: 'en-IN',
    timezone: 'Asia/Kolkata',
    currency: 'INR ₹',
  },
  {
    flag: '🇵🇰',
    name: 'Pakistan (Urdu / PKR)',
    locale: 'ur-PK',
    timezone: 'Asia/Karachi',
    currency: 'PKR ₨',
  },
  {
    flag: '🇬🇧',
    name: 'United Kingdom (GBP)',
    locale: 'en-GB',
    timezone: 'Europe/London',
    currency: 'GBP £',
  },
  {
    flag: '🇨🇦',
    name: 'Canada (CAD)',
    locale: 'en-CA',
    timezone: 'America/Toronto',
    currency: 'CAD $',
  },
  {
    flag: '🇰🇷',
    name: 'South Korea (KRW)',
    locale: 'ko-KR',
    timezone: 'Asia/Seoul',
    currency: 'KRW ₩',
  },
  {
    flag: '🇦🇺',
    name: 'Australia (AUD)',
    locale: 'en-AU',
    timezone: 'Australia/Sydney',
    currency: 'AUD $',
  },
  {
    flag: '🇸🇦',
    name: 'Saudi Arabia (SAR)',
    locale: 'ar-SA',
    timezone: 'Asia/Riyadh',
    currency: 'SAR ﷼',
  },
];

export default function CreateRun() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [surfaceId, setSurfaceId] = useState<string>('');
  const [targetUrl, setTargetUrl] = useState<string>(
    'https://store.steampowered.com/app/1091500/Cyberpunk_2077/',
  );
  const [showSavedSurfaces, setShowSavedSurfaces] = useState<boolean>(false);
  const [journeyVersionId, setJourneyVersionId] = useState<string>('');
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);

  // Custom Persona Creation State
  const [showAddPersonaModal, setShowAddPersonaModal] = useState<boolean>(false);
  const [newPersonaName, setNewPersonaName] = useState<string>('');
  const [newPersonaLocale, setNewPersonaLocale] = useState<string>('pt-BR');
  const [newPersonaTimezone, setNewPersonaTimezone] = useState<string>('America/Sao_Paulo');
  const [newPersonaDevice, setNewPersonaDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isSubmittingPersona, setIsSubmittingPersona] = useState<boolean>(false);
  const [personaSubmitError, setPersonaSubmitError] = useState<string>('');

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

  const handleApplyPreset = (preset: (typeof COUNTRY_PRESETS)[0]) => {
    setNewPersonaName(`Persona (${preset.name})`);
    setNewPersonaLocale(preset.locale);
    setNewPersonaTimezone(preset.timezone);
  };

  const handleCreateCustomPersona = async () => {
    if (!newPersonaName.trim() || !newPersonaLocale.trim()) return;

    setPersonaSubmitError('');
    setIsSubmittingPersona(true);
    try {
      const viewport =
        newPersonaDevice === 'mobile' ? { width: 390, height: 844 } : { width: 1280, height: 720 };
      const userAgent =
        newPersonaDevice === 'mobile'
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

      const created = await api.createPersona({
        name: newPersonaName.trim(),
        settings: {
          locale: newPersonaLocale.trim(),
          timezoneId: newPersonaTimezone.trim() || 'UTC',
          userAgent,
          viewport,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ['personas'] });
      setSelectedPersonaIds((prev) => [...prev, created.id]);
      setShowAddPersonaModal(false);
      setNewPersonaName('');
    } catch (err) {
      console.error('Failed to create persona:', err);
      setPersonaSubmitError(
        err instanceof Error ? err.message : 'Failed to save persona. Please try again.',
      );
    } finally {
      setIsSubmittingPersona(false);
    }
  };

  const handleDeletePersona = async (e: React.MouseEvent, personaId: string) => {
    e.stopPropagation();
    setPersonaSubmitError('');
    try {
      await api.deletePersona(personaId);
      await queryClient.invalidateQueries({ queryKey: ['personas'] });
      setSelectedPersonaIds((prev) => prev.filter((id) => id !== personaId));
    } catch (err) {
      console.error('Failed to delete persona:', err);
      setPersonaSubmitError(
        err instanceof Error ? err.message : 'Failed to delete persona. Please try again.',
      );
    }
  };

  const TARGET_PRESETS = [
    {
      id: 'steam',
      label: 'Steam Store',
      icon: '🎮',
      url: 'https://store.steampowered.com/app/1091500/Cyberpunk_2077/',
    },
    { id: 'spotify', label: 'Spotify Premium', icon: '🎵', url: 'https://www.spotify.com/premium' },
    {
      id: 'apple',
      label: 'Apple Store',
      icon: '💻',
      url: 'https://www.apple.com/shop/buy-mac/macbook-air',
    },
    { id: 'github', label: 'GitHub Pricing', icon: '🐙', url: 'https://github.com/pricing' },
    { id: 'hn', label: 'Hacker News', icon: '📰', url: 'https://news.ycombinator.com' },
  ];

  const matchedPreset = TARGET_PRESETS.find((p) => p.url === targetUrl);
  const isCustomUrl = !matchedPreset;

  const canSubmit = targetUrl.trim().startsWith('http') && selectedPersonaIds.length >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      const payload: CreateRunRequest = {
        personaVersionIds: selectedPersonaIds,
        customSurfaceUrl: targetUrl.trim(),
        ...(matchedPreset?.label ? { customSurfaceName: matchedPreset.label } : {}),
      };
      createRunMutation.mutate(payload);
    }
  };

  const displayPersonas = personas ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/runs"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Launch Live Multi-Persona Audit
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Audit websites across different international markets and custom visitor profiles
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Target Website URL */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>Target Website URL</span>
                  <Globe className="h-4 w-4 text-indigo-400" />
                </h2>
                <p className="text-xs text-slate-400">
                  Enter any live website URL or click a quick benchmark preset to audit
                </p>
              </div>
            </div>

            {surfaces && surfaces.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSavedSurfaces(!showSavedSurfaces)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                {showSavedSurfaces
                  ? 'Hide saved surfaces'
                  : `Or saved surfaces (${surfaces.length})`}
              </button>
            )}
          </div>

          <div className="space-y-3 pt-1">
            {/* Input Bar */}
            <div className="space-y-1.5">
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="url"
                  placeholder="https://your-website.com or https://store.steampowered.com/..."
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  required
                  className="w-full pl-10 pr-24 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
                {targetUrl && (
                  <button
                    type="button"
                    onClick={() => setTargetUrl('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Quick URL & Custom URL Pills */}
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              {/* Custom URL Pill */}
              <button
                type="button"
                onClick={() => {
                  if (!isCustomUrl) setTargetUrl('');
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isCustomUrl
                    ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/60 shadow-sm shadow-indigo-500/20'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>Custom URL {isCustomUrl && targetUrl ? '✓' : ''}</span>
              </button>

              {/* Preset Quick Loads */}
              {TARGET_PRESETS.map((preset) => {
                const isSelected = targetUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setTargetUrl(preset.url)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/60 shadow-sm shadow-indigo-500/20'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Saved Workspace Surfaces Dropdown */}
            {showSavedSurfaces && surfaces && surfaces.length > 0 && (
              <div className="pt-3 border-t border-white/5 space-y-2 animate-in fade-in duration-200">
                <p className="text-xs font-semibold text-slate-300">Saved Workspace Surfaces:</p>
                <div className="grid gap-2">
                  {loadingSurfaces ? (
                    <div className="flex items-center justify-center p-4 space-x-2 text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                      <span className="text-xs">Loading surfaces...</span>
                    </div>
                  ) : (
                    surfaces.map((s) => {
                      const surfaceOrigin = (s as { origin?: string }).origin;
                      const isSelected = Boolean(surfaceOrigin) && targetUrl === surfaceOrigin;
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSurfaceId(s.id);
                            if (surfaceOrigin) setTargetUrl(surfaceOrigin);
                            setShowSavedSurfaces(false);
                          }}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-600/15'
                              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-xs font-semibold text-white truncate">
                                {s.name}
                              </h3>
                              <p className="text-[11px] text-indigo-300/80 font-mono truncate">
                                {surfaceOrigin}
                              </p>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Journey Workflow Selection */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Audit Journey Script</span>
                <Compass className="h-4 w-4 text-emerald-400" />
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>Select Comparison Personas</span>
                  <Users2 className="h-4 w-4 text-cyan-400" />
                </h2>
                <p className="text-xs text-slate-400">
                  Select 2, 3, or more identities or define custom countries to visit simultaneously
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setPersonaSubmitError('');
                  setShowAddPersonaModal(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Custom Persona</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const allIds = displayPersonas.map((p) => p.id);
                  setSelectedPersonaIds(allIds);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors"
              >
                Select All ({displayPersonas.length})
              </button>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {selectedPersonaIds.length} Selected
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            {displayPersonas.map((p) => {
              const isSelected = selectedPersonaIds.includes(p.id);
              const isMobile = p.settings.viewport.width < 500;

              return (
                <div
                  key={p.id}
                  onClick={() => handlePersonaToggle(p.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all relative group ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-600/15 shadow-lg shadow-indigo-600/15'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 flex-shrink-0">
                        {isMobile ? (
                          <Smartphone className="h-4 w-4 text-purple-400" />
                        ) : (
                          <Laptop className="h-4 w-4 text-indigo-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-white truncate">{p.name}</h3>
                        <p className="text-xs text-slate-400">
                          {p.settings.viewport.width}×{p.settings.viewport.height} •{' '}
                          <span className="font-mono text-indigo-300">{p.settings.locale}</span> •{' '}
                          {p.settings.timezoneId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleDeletePersona(e, p.id)}
                        className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete Persona"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-indigo-400" />}
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 font-mono text-[11px] text-slate-400 truncate">
                    {p.settings.userAgent}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal: Add Custom Persona */}
        {showAddPersonaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="glass-panel w-full max-w-lg p-6 rounded-3xl space-y-5 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Flag className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-white">Add Custom Market Persona</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddPersonaModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Quick Country Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Quick Country Presets (1-Click Fill)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COUNTRY_PRESETS.map((preset) => (
                    <button
                      key={preset.locale}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="p-2 rounded-xl bg-slate-900/80 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/40 text-left transition-all text-xs flex items-center space-x-2"
                    >
                      <span className="text-base">{preset.flag}</span>
                      <span className="text-slate-200 font-medium truncate">{preset.locale}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Persona Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Persona (Brazil / Portuguese)"
                    value={newPersonaName}
                    onChange={(e) => setNewPersonaName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Locale Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. pt-BR, de-DE, ar-AE, ur-PK"
                      value={newPersonaLocale}
                      onChange={(e) => setNewPersonaLocale(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Timezone ID</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. America/Sao_Paulo"
                      value={newPersonaTimezone}
                      onChange={(e) => setNewPersonaTimezone(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Device Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewPersonaDevice('desktop')}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center space-x-2 transition-all ${
                        newPersonaDevice === 'desktop'
                          ? 'border-indigo-500 bg-indigo-600/20 text-white'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Laptop className="h-3.5 w-3.5" />
                      <span>Desktop (1280×720)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewPersonaDevice('mobile')}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center space-x-2 transition-all ${
                        newPersonaDevice === 'mobile'
                          ? 'border-indigo-500 bg-indigo-600/20 text-white'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      <span>Mobile (390×844)</span>
                    </button>
                  </div>
                </div>

                {personaSubmitError && (
                  <div className="flex items-start space-x-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <span>{personaSubmitError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowAddPersonaModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCustomPersona}
                    disabled={isSubmittingPersona || !newPersonaName.trim()}
                    className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                  >
                    {isSubmittingPersona ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    <span>Save & Select Persona</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Isolation Guarantee Banner */}
        <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-start space-x-3 text-xs text-slate-300">
          <ShieldCheck className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block mb-0.5">
              100% Zero-Contamination Isolation
            </span>
            <span>
              All selected personas execute in separate isolated Playwright Chromium sandboxes with
              localized browser headers, regional timezones, and zero cookie/storage contamination.
            </span>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-wrap items-center justify-end gap-4 pt-4 border-t border-white/5">
          {selectedPersonaIds.length < 2 && (
            <div className="mr-auto flex items-center space-x-2 text-xs text-amber-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                {displayPersonas.length < 2
                  ? 'Add at least one more persona, then select two personas to compare.'
                  : `Select ${2 - selectedPersonaIds.length} more persona${selectedPersonaIds.length === 1 ? '' : 's'} to continue.`}
              </span>
            </div>
          )}
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
                <span>Launching {selectedPersonaIds.length} Parallel Browsers...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>
                  {selectedPersonaIds.length < 2
                    ? `Select 2 Personas (${selectedPersonaIds.length}/2)`
                    : `Start Live Audit (${selectedPersonaIds.length} Personas)`}
                </span>
              </>
            )}
          </button>
        </div>

        {createRunMutation.isError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              {createRunMutation.error instanceof Error
                ? createRunMutation.error.message
                : 'Failed to launch comparison run. Please try again.'}
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
