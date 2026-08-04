import type {
  RetryConfig,
  ExecutionErrorClassification,
} from '@ai-parallel-web/contracts';

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  backoffFactor: 2,
  jitter: true,
};

export function classifyError(error: unknown): ExecutionErrorClassification {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : '';

  if (
    message.includes('POLICY_VIOLATION') ||
    message.includes('blocked by security policy') ||
    message.includes('Assertion failed') ||
    message.includes('Unsupported DSL step type')
  ) {
    return {
      category: 'NON_RETRYABLE',
      code: 'NON_RETRYABLE_POLICY_OR_ASSERTION',
      message,
    };
  }

  if (
    name === 'TimeoutError' ||
    message.includes('Timeout') ||
    message.includes('net::ERR_CONNECTION_RESET') ||
    message.includes('net::ERR_CONNECTION_REFUSED') ||
    message.includes('net::ERR_INTERNET_DISCONNECTED') ||
    message.includes('HTTP 502') ||
    message.includes('HTTP 503') ||
    message.includes('HTTP 504')
  ) {
    return {
      category: 'RETRYABLE',
      code: 'TRANSIENT_NETWORK_OR_TIMEOUT',
      message,
    };
  }

  return {
    category: 'NON_RETRYABLE',
    code: 'GENERAL_EXECUTION_FAILURE',
    message,
  };
}

export function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const baseDelay = config.initialDelayMs * Math.pow(config.backoffFactor, attempt);
  const cappedDelay = Math.min(baseDelay, config.maxDelayMs);

  if (!config.jitter) {
    return cappedDelay;
  }

  const jitterMultiplier = 0.5 + Math.random();
  return Math.floor(cappedDelay * jitterMultiplier);
}

export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: ExecutionErrorClassification, delayMs: number) => void,
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (err) {
      const classification = classifyError(err);

      if (classification.category === 'NON_RETRYABLE' || attempt >= config.maxRetries) {
        throw err;
      }

      const delayMs = calculateBackoffDelay(attempt, config);
      if (onRetry) {
        onRetry(attempt + 1, classification, delayMs);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt++;
    }
  }
}
