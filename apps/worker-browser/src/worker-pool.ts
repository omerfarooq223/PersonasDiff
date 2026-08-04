import type {
  PersonaSettings,
  JourneyDefinition,
  RunProgressEvent,
  RetryConfig,
} from '@ai-parallel-web/contracts';
import { BrowserManager } from './browser-manager.js';
import { JourneyRunner, type PersonaJourneyResult } from './journey-runner.js';

export interface MultiPersonaRunOptions {
  runId: string;
  personas: PersonaSettings[];
  journey: JourneyDefinition;
  retryConfig?: RetryConfig | undefined;
  abortSignal?: AbortSignal | undefined;
  onProgress?: ((event: RunProgressEvent) => void) | undefined;
}

export interface MultiPersonaRunResult {
  runId: string;
  success: boolean;
  personaResults: Record<string, PersonaJourneyResult>;
  totalDurationMs: number;
}

export class WorkerPool {
  public browserManager: BrowserManager;
  public journeyRunner: JourneyRunner;
  private maxConcurrency: number;

  constructor(maxConcurrency = 4) {
    this.maxConcurrency = maxConcurrency;
    this.browserManager = new BrowserManager();
    this.journeyRunner = new JourneyRunner();
  }

  async runMultiPersonaJourney(
    options: MultiPersonaRunOptions,
  ): Promise<MultiPersonaRunResult> {
    const { runId, personas, journey, retryConfig, abortSignal, onProgress } = options;
    const startTime = Date.now();
    const personaResults: Record<string, PersonaJourneyResult> = {};

    const executing: Promise<void>[] = [];

    for (const persona of personas) {
      const task = (async () => {
        const result = await this.journeyRunner.runJourney({
          runId,
          persona,
          journey,
          browserManager: this.browserManager,
          ...(retryConfig !== undefined && { retryConfig }),
          ...(abortSignal !== undefined && { abortSignal }),
          ...(onProgress !== undefined && { onProgress }),
        });
        personaResults[persona.id] = result;
      })();

      executing.push(task);

      if (executing.length >= this.maxConcurrency) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);

    const allSuccessful = Object.values(personaResults).every((r) => r.success);

    return {
      runId,
      success: allSuccessful,
      personaResults,
      totalDurationMs: Date.now() - startTime,
    };
  }

  async shutdown(): Promise<void> {
    await this.browserManager.closeBrowser();
  }
}
