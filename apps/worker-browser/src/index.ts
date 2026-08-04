export { BrowserManager } from './browser-manager.js';
export {
  applySecurityPolicy,
  isUrlAllowed,
  matchesPattern,
  validateUrlAgainstPolicy,
  PolicyViolationError,
} from './policy-enforcer.js';
export { StepExecutor } from './step-executor.js';
export {
  classifyError,
  calculateBackoffDelay,
  executeWithRetry,
  DEFAULT_RETRY_CONFIG,
} from './retry-handler.js';
export { JourneyRunner, type JourneyRunnerOptions, type PersonaJourneyResult } from './journey-runner.js';
export { WorkerPool, type MultiPersonaRunOptions, type MultiPersonaRunResult } from './worker-pool.js';

export const workerName = 'browser-worker';
