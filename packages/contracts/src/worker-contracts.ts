export interface ViewportSize {
  width: number;
  height: number;
}

export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number | undefined;
}

export interface PersonaSettings {
  id: string;
  name: string;
  viewport: ViewportSize;
  locale: string;
  timezoneId: string;
  userAgent: string;
  colorScheme: 'light' | 'dark' | 'no-preference';
  reducedMotion: 'reduce' | 'no-preference';
  geolocation?: GeolocationCoordinates | undefined;
  permissions?: string[] | undefined;
  extraHttpHeaders?: Record<string, string> | undefined;
}

export type StepDSLActionType =
  | 'navigate'
  | 'wait'
  | 'click'
  | 'type'
  | 'extract'
  | 'screenshot'
  | 'assert';

export interface BaseStepAction {
  id: string;
  type: StepDSLActionType;
  description?: string | undefined;
  timeoutMs?: number | undefined;
}

export interface NavigateStepAction extends BaseStepAction {
  type: 'navigate';
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | undefined;
}

export interface WaitStepAction extends BaseStepAction {
  type: 'wait';
  selector?: string | undefined;
  state?: 'attached' | 'detached' | 'visible' | 'hidden' | undefined;
  durationMs?: number | undefined;
}

export interface ClickStepAction extends BaseStepAction {
  type: 'click';
  selector: string;
  force?: boolean | undefined;
}

export interface TypeStepAction extends BaseStepAction {
  type: 'type';
  selector: string;
  value: string;
  clearFirst?: boolean | undefined;
  delayMs?: number | undefined;
}

export interface ExtractStepAction extends BaseStepAction {
  type: 'extract';
  selector: string;
  extractName: string;
  target?: 'text' | 'attribute' | 'html' | undefined;
  attributeName?: string | undefined;
}

export interface ScreenshotStepAction extends BaseStepAction {
  type: 'screenshot';
  name: string;
  fullPage?: boolean | undefined;
}

export interface AssertStepAction extends BaseStepAction {
  type: 'assert';
  selector: string;
  condition: 'equals' | 'contains' | 'visible' | 'matches';
  expectedValue?: string | undefined;
}

export type StepDSLAction =
  | NavigateStepAction
  | WaitStepAction
  | ClickStepAction
  | TypeStepAction
  | ExtractStepAction
  | ScreenshotStepAction
  | AssertStepAction;

export interface PolicyConfig {
  allowedUrlPatterns: string[];
  blockDownloads?: boolean | undefined;
  blockPopups?: boolean | undefined;
  blockExternalRequests?: boolean | undefined;
  allowedResourceTypes?: string[] | undefined;
}

export interface JourneyDefinition {
  id: string;
  version: string;
  name: string;
  policy: PolicyConfig;
  steps: StepDSLAction[];
  globalTimeoutMs?: number | undefined;
  stepTimeoutMs?: number | undefined;
}

export interface AssertionResult {
  passed: boolean;
  condition: string;
  actualValue?: string | undefined;
  expectedValue?: string | undefined;
  error?: string | undefined;
}

export interface StepResult {
  stepId: string;
  stepIndex: number;
  actionType: StepDSLActionType;
  success: boolean;
  durationMs: number;
  finalUrl?: string | undefined;
  screenshotBuffer?: Buffer | undefined;
  extractedData?: Record<string, string> | undefined;
  assertionResult?: AssertionResult | undefined;
  error?: {
    message: string;
    code: string;
    retryable: boolean;
  } | undefined;
}

export interface ProvenanceMetadata {
  browserName: string;
  browserVersion: string;
  playwrightVersion: string;
  nodeVersion: string;
  workerId: string;
  effectivePersonaSettings: PersonaSettings;
  timestampUtc: string;
}

export type ProgressEventStatus =
  | 'started'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'cancelled';

export interface RunProgressEvent {
  runId: string;
  personaId: string;
  stepIndex: number;
  stepType: StepDSLActionType;
  status: ProgressEventStatus;
  durationMs?: number | undefined;
  error?: {
    message: string;
    code: string;
    retryable: boolean;
  } | undefined;
  timestampUtc: string;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  jitter: boolean;
}

export type ErrorCategory = 'RETRYABLE' | 'NON_RETRYABLE';

export interface ExecutionErrorClassification {
  category: ErrorCategory;
  code: string;
  message: string;
}
