import type { BrowserContext, Page } from 'playwright';
import type {
  PersonaSettings,
  JourneyDefinition,
  StepResult,
  ProvenanceMetadata,
  RunProgressEvent,
  RetryConfig,
} from '@ai-parallel-web/contracts';
import { BrowserManager } from './browser-manager.js';
import { applySecurityPolicy } from './policy-enforcer.js';
import { StepExecutor } from './step-executor.js';
import { executeWithRetry, DEFAULT_RETRY_CONFIG } from './retry-handler.js';

export interface JourneyRunnerOptions {
  runId: string;
  persona: PersonaSettings;
  journey: JourneyDefinition;
  browserManager: BrowserManager;
  retryConfig?: RetryConfig | undefined;
  abortSignal?: AbortSignal | undefined;
  onProgress?: ((event: RunProgressEvent) => void) | undefined;
}

export interface PersonaJourneyResult {
  runId: string;
  personaId: string;
  success: boolean;
  provenance: ProvenanceMetadata;
  stepResults: StepResult[];
  totalDurationMs: number;
  error?: string | undefined;
}

export class JourneyRunner {
  private stepExecutor = new StepExecutor();

  async runJourney(options: JourneyRunnerOptions): Promise<PersonaJourneyResult> {
    const {
      runId,
      persona,
      journey,
      browserManager,
      retryConfig = DEFAULT_RETRY_CONFIG,
      abortSignal,
      onProgress,
    } = options;

    const startTime = Date.now();
    const stepResults: StepResult[] = [];
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let provenance: ProvenanceMetadata;

    const emitEvent = (
      stepIndex: number,
      stepType: StepResult['actionType'],
      status: RunProgressEvent['status'],
      durationMs?: number,
      error?: RunProgressEvent['error'],
    ) => {
      if (onProgress) {
        onProgress({
          runId,
          personaId: persona.id,
          stepIndex,
          stepType,
          status,
          ...(durationMs !== undefined && { durationMs }),
          ...(error !== undefined && { error }),
          timestampUtc: new Date().toISOString(),
        });
      }
    };

    try {
      context = await browserManager.createIsolatedContext(persona);
      page = await context.newPage();

      applySecurityPolicy(page, journey.policy);

      provenance = await browserManager.getProvenance(persona);

      for (let i = 0; i < journey.steps.length; i++) {
        const step = journey.steps[i];
        if (!step) continue;

        if (abortSignal?.aborted) {
          emitEvent(i, step.type, 'cancelled');
          throw new Error(`Journey execution aborted for persona ${persona.id} at step ${i}`);
        }

        emitEvent(i, step.type, 'started');

        const currentStep = step;

        const result = await executeWithRetry(
          async () => {
            if (!page) throw new Error('Browser page is null');
            const res = await this.stepExecutor.executeStep(
              page,
              currentStep,
              i,
              journey.policy,
              journey.stepTimeoutMs,
            );

            if (!res.success) {
              throw new Error(res.error?.message ?? 'Step failed');
            }
            return res;
          },
          retryConfig,
          (attempt, error, delayMs) => {
            emitEvent(i, currentStep.type, 'retrying', undefined, {
              message: `Attempt ${attempt} failed (${error.message}). Retrying in ${delayMs}ms...`,
              code: error.code,
              retryable: true,
            });
          },
        ).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            stepId: currentStep.id,
            stepIndex: i,
            actionType: currentStep.type,
            success: false,
            durationMs: 0,
            finalUrl: page?.url(),
            error: {
              message: msg,
              code: 'STEP_EXECUTION_FAILED',
              retryable: false,
            },
          } as StepResult;
        });

        stepResults.push(result);

        if (!result.success) {
          emitEvent(i, currentStep.type, 'failed', result.durationMs, result.error);
          return {
            runId,
            personaId: persona.id,
            success: false,
            provenance,
            stepResults,
            totalDurationMs: Date.now() - startTime,
            ...(result.error?.message !== undefined && { error: result.error.message }),
          };
        }

        emitEvent(i, currentStep.type, 'completed', result.durationMs);
      }

      return {
        runId,
        personaId: persona.id,
        success: true,
        provenance,
        stepResults,
        totalDurationMs: Date.now() - startTime,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      provenance = provenance! ?? {
        browserName: 'chromium',
        browserVersion: 'unknown',
        playwrightVersion: '1.50.0',
        nodeVersion: process.version,
        workerId: 'worker-1',
        effectivePersonaSettings: persona,
        timestampUtc: new Date().toISOString(),
      };

      return {
        runId,
        personaId: persona.id,
        success: false,
        provenance,
        stepResults,
        totalDurationMs: Date.now() - startTime,
        error: message,
      };
    } finally {
      await browserManager.disposeContext(context);
    }
  }
}
