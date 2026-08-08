import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { api, type CreateRunRequest } from '../lib/api';
import { analytics } from '../lib/analytics';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CreateRun() {
  const navigate = useNavigate();
  const [surfaceId, setSurfaceId] = useState<string>('');
  const [journeyVersionId, setJourneyVersionId] = useState<string>('');
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);

  const { data: surfaces, isLoading: loadingSurfaces } = useQuery({
    queryKey: ['surfaces'],
    queryFn: () => api.getSurfaces(),
  });

  const { data: journeys, isLoading: loadingJourneys } = useQuery({
    queryKey: ['journeys'],
    queryFn: () => api.getJourneys(),
    enabled: !!surfaceId,
  });

  const { data: personas, isLoading: loadingPersonas } = useQuery({
    queryKey: ['personas'],
    queryFn: () => api.getPersonas(),
  });

  const createRunMutation = useMutation({
    mutationFn: (data: CreateRunRequest) => {
      const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return api.createRun(data, idempotencyKey);
    },
    onSuccess: (run) => {
      analytics.trackRunCreateCompleted(run.id, selectedPersonaIds.length);
      navigate(`/runs/${run.id}`);
    },
    onError: (error) => {
      analytics.trackRunCreateFailed(error instanceof Error ? error.message : 'Unknown error');
    },
  });

  const handlePersonaToggle = (personaId: string) => {
    setSelectedPersonaIds((prev) => {
      const isSelected = prev.includes(personaId);
      const newIds = isSelected ? prev.filter((id) => id !== personaId) : [...prev, personaId];

      // Track persona selection
      if (!isSelected && personas) {
        const persona = personas.find((p) => p.id === personaId);
        if (persona) {
          analytics.trackPersonaSelected(persona.id, persona.name);
        }
      }

      return newIds;
    });
  };

  const canSubmit = surfaceId && journeyVersionId && selectedPersonaIds.length >= 2;

  // Track surface selection
  useEffect(() => {
    if (surfaceId && surfaces) {
      const surface = surfaces.find((s) => s.id === surfaceId);
      if (surface) {
        analytics.trackSurfaceSelected(surface.id, surface.name);
      }
    }
  }, [surfaceId, surfaces]);

  // Track journey selection
  useEffect(() => {
    if (journeyVersionId && journeys) {
      const journey = journeys.find((j) => j.id === journeyVersionId);
      if (journey) {
        analytics.trackJourneySelected(journey.id, journey.name);
      }
    }
  }, [journeyVersionId, journeys]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      analytics.trackRunCreateStarted(surfaceId, journeyVersionId);
      createRunMutation.mutate({
        surfaceId,
        journeyVersionId,
        personaVersionIds: selectedPersonaIds,
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Run</h1>
        <p className="text-muted-foreground mt-2">
          Configure personas and journey to compare web experiences across controlled contexts.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Surface Selection */}
        <Card>
          <CardHeader>
            <CardTitle>1. Select Surface</CardTitle>
            <CardDescription>Choose the approved public surface to test against.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSurfaces ? (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading surfaces...</span>
              </div>
            ) : (
              <Select value={surfaceId} onValueChange={setSurfaceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a surface" />
                </SelectTrigger>
                <SelectContent>
                  {surfaces
                    ?.filter((s) => s.status === 'approved')
                    .map((surface) => (
                      <SelectItem key={surface.id} value={surface.id}>
                        {surface.name} ({surface.hostname})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Journey Selection */}
        <Card>
          <CardHeader>
            <CardTitle>2. Select Journey Version</CardTitle>
            <CardDescription>Choose the immutable journey definition to execute.</CardDescription>
          </CardHeader>
          <CardContent>
            {!surfaceId ? (
              <p className="text-sm text-muted-foreground">
                Select a surface first to load available journeys.
              </p>
            ) : loadingJourneys ? (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading journeys...</span>
              </div>
            ) : (
              <Select value={journeyVersionId} onValueChange={setJourneyVersionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a journey" />
                </SelectTrigger>
                <SelectContent>
                  {journeys
                    ?.filter((j) => j.surfaceId === surfaceId)
                    .map((journey) => (
                      <SelectItem key={journey.id} value={journey.id}>
                        {journey.name} v{journey.version} ({journey.steps.length} steps)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Persona Selection */}
        <Card>
          <CardHeader>
            <CardTitle>3. Select Personas</CardTitle>
            <CardDescription>
              Choose at least two personas to compare. Each persona runs in an isolated browser
              context.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPersonas ? (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading personas...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {personas?.map((persona) => (
                  <div
                    key={persona.id}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedPersonaIds.includes(persona.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handlePersonaToggle(persona.id)}
                    role="checkbox"
                    aria-checked={selectedPersonaIds.includes(persona.id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handlePersonaToggle(persona.id);
                      }
                    }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{persona.name}</h3>
                        <span className="text-xs text-muted-foreground">v{persona.version}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {persona.settings.locale} • {persona.settings.timezoneId} •{' '}
                        {persona.settings.viewport.width}x{persona.settings.viewport.height}
                      </div>
                    </div>
                    {selectedPersonaIds.includes(persona.id) && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                ))}
                {selectedPersonaIds.length > 0 && selectedPersonaIds.length < 2 && (
                  <div className="flex items-center space-x-2 text-sm text-amber-600 dark:text-amber-500">
                    <AlertCircle className="h-4 w-4" />
                    <span>Select at least one more persona to compare.</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/runs')}
            disabled={createRunMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit || createRunMutation.isPending}>
            {createRunMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Run...
              </>
            ) : (
              'Start Run'
            )}
          </Button>
        </div>

        {createRunMutation.isError && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">Failed to create run. Please try again.</p>
          </div>
        )}
      </form>
    </div>
  );
}
