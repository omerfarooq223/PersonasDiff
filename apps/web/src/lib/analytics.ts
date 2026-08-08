// User funnel instrumentation for tracking operator behavior
// This helps understand how operators use the system and identify friction points

type FunnelEvent =
  | 'run_create_started'
  | 'run_create_completed'
  | 'run_create_failed'
  | 'run_create_cancelled'
  | 'run_viewed'
  | 'run_cancelled'
  | 'comparison_viewed'
  | 'replay_viewed'
  | 'replay_step_navigated'
  | 'persona_selected'
  | 'journey_selected'
  | 'surface_selected';

interface AnalyticsEvent {
  event: FunnelEvent;
  timestamp: string;
  runId: string | undefined;
  metadata: Record<string, unknown> | undefined;
}

class Analytics {
  private events: AnalyticsEvent[] = [];

  track(
    event: FunnelEvent,
    metadata: Record<string, unknown> | undefined,
    runId: string | undefined,
  ) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      timestamp: new Date().toISOString(),
      runId: runId ?? undefined,
      metadata: metadata ?? undefined,
    };

    this.events.push(analyticsEvent);

    // In production, this would send to an analytics service
    // For now, we log to console for debugging
    console.log('[Analytics]', analyticsEvent);
  }

  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  clear() {
    this.events = [];
  }

  // Funnel-specific methods
  trackRunCreateStarted(surfaceId: string, journeyId: string) {
    this.track('run_create_started', { surfaceId, journeyId }, undefined);
  }

  trackRunCreateCompleted(runId: string, personaCount: number) {
    this.track('run_create_completed', { personaCount }, runId);
  }

  trackRunCreateFailed(error: string) {
    this.track('run_create_failed', { error }, undefined);
  }

  trackRunViewed(runId: string) {
    this.track('run_viewed', undefined, runId);
  }

  trackRunCancelled(runId: string) {
    this.track('run_cancelled', undefined, runId);
  }

  trackComparisonViewed(runId: string) {
    this.track('comparison_viewed', undefined, runId);
  }

  trackReplayViewed(runId: string) {
    this.track('replay_viewed', undefined, runId);
  }

  trackReplayStepNavigated(runId: string, stepIndex: number, totalSteps: number) {
    this.track('replay_step_navigated', { stepIndex, totalSteps }, runId);
  }

  trackPersonaSelected(personaId: string, personaName: string) {
    this.track('persona_selected', { personaId, personaName }, undefined);
  }

  trackJourneySelected(journeyId: string, journeyName: string) {
    this.track('journey_selected', { journeyId, journeyName }, undefined);
  }

  trackSurfaceSelected(surfaceId: string, surfaceName: string) {
    this.track('surface_selected', { surfaceId, surfaceName }, undefined);
  }
}

export const analytics = new Analytics();
