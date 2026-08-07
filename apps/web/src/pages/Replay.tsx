import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { api, type StepEvidence } from '../lib/api';
import { analytics } from '../lib/analytics';
import { Loader2, ArrowLeft, Play, Pause, SkipBack, SkipForward, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const evidenceStateIcons = {
  PRESENT: CheckCircle,
  CENSOR_REDACTED: AlertCircle,
  BLOCKED: XCircle,
  MISSING_FAILURE: XCircle,
};

const evidenceStateColors = {
  PRESENT: 'text-green-500',
  CENSOR_REDACTED: 'text-amber-500',
  BLOCKED: 'text-red-500',
  MISSING_FAILURE: 'text-red-500',
};

export default function Replay() {
  const { id } = useParams<{ id: string }>();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const { data: replayData, isLoading, error } = useQuery({
    queryKey: ['replay', id],
    queryFn: () => api.getReplay(id!),
    enabled: !!id,
  });

  const steps = replayData?.steps || [];
  const currentStep = steps[currentStepIndex] as StepEvidence | undefined;

  // Track replay view
  useEffect(() => {
    if (id) {
      analytics.trackReplayViewed(id);
    }
  }, [id]);

  // Track step navigation
  useEffect(() => {
    if (id && steps.length > 0) {
      analytics.trackReplayStepNavigated(id, currentStepIndex, steps.length);
    }
  }, [currentStepIndex, steps.length, id]);

  const handlePrevious = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
  };

  const handleStepSelect = (index: number) => {
    setCurrentStepIndex(index);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !replayData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            Failed to load replay. Please try again.
          </p>
          <Link to={`/runs/${id}`}>
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Run
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (steps.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            No evidence available for replay.
          </p>
          <Link to={`/runs/${id}`}>
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Run
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!currentStep) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Step not available.
          </p>
          <Link to={`/runs/${id}`}>
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Run
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const StateIcon = evidenceStateIcons[currentStep.overallEvidenceState];
  const stateColor = evidenceStateColors[currentStep.overallEvidenceState];

  return (
    <div className="space-y-6">
      {/* Capture Time Banner */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-sm">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-blue-900 dark:text-blue-100">
            Historical Evidence
          </span>
          <span className="text-blue-700 dark:text-blue-300">
            — Captured on {new Date(currentStep.timestampUtc).toLocaleString()}
          </span>
        </div>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
          This is a replay of stored evidence, not a live representation of the target.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link to={`/runs/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Evidence Replay</h1>
        </div>
      </div>

      {/* Step Navigation Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Step Timeline</CardTitle>
          <CardDescription>
            Step {currentStepIndex + 1} of {steps.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {steps.map((step, idx) => {
              const StepStateIcon = evidenceStateIcons[step.overallEvidenceState];
              const stepStateColor = evidenceStateColors[step.overallEvidenceState];
              return (
                <button
                  key={idx}
                  onClick={() => handleStepSelect(idx)}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all ${
                    idx === currentStepIndex
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                  aria-current={idx === currentStepIndex ? 'step' : undefined}
                >
                  <StepStateIcon className={`h-4 w-4 ${stepStateColor}`} />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Playback Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
              aria-label="Previous step"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={currentStepIndex === steps.length - 1}
              aria-label="Next step"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Step Evidence */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Step {currentStepIndex + 1} Evidence</CardTitle>
            <div className="flex items-center space-x-2">
              <StateIcon className={`h-5 w-5 ${stateColor}`} />
              <span className={`text-sm font-medium ${stateColor}`}>
                {currentStep.overallEvidenceState.replace('_', ' ')}
              </span>
            </div>
          </div>
          <CardDescription>
            Persona: {currentStep.personaId.slice(0, 8)} • {new Date(currentStep.timestampUtc).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-1">Final URL</h4>
            <p className="text-sm text-muted-foreground break-all">{currentStep.finalUrl}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1">HTTP Status</h4>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium ${currentStep.httpOutcome.ok ? 'text-green-500' : 'text-red-500'}`}>
                {currentStep.httpOutcome.statusCode}
              </span>
              <span className="text-sm text-muted-foreground">
                {currentStep.httpOutcome.ok ? 'OK' : 'Error'}
              </span>
            </div>
          </div>
          {currentStep.httpOutcome.redirectChain.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-1">Redirect Chain</h4>
              <div className="space-y-1">
                {currentStep.httpOutcome.redirectChain.map((url, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground break-all">
                    → {url}
                  </p>
                ))}
              </div>
            </div>
          )}
          <div>
            <h4 className="text-sm font-medium mb-2">Artifacts</h4>
            <div className="space-y-2">
              {currentStep.artifacts.map((artifact, idx) => {
                const ArtifactStateIcon = evidenceStateIcons[artifact.state];
                const artifactStateColor = evidenceStateColors[artifact.state];
                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex items-center space-x-3">
                      <ArtifactStateIcon className={`h-4 w-4 ${artifactStateColor}`} />
                      <div>
                        <p className="text-sm font-medium capitalize">{artifact.artifactType.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          SHA-256: {artifact.sha256.slice(0, 16)}...
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium ${artifactStateColor}`}>
                      {artifact.state.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end space-x-4">
        <Link to={`/runs/${id}/comparison`}>
          <Button variant="outline">
            View Comparison
          </Button>
        </Link>
      </div>
    </div>
  );
}
