export type EvidenceState = 'PRESENT' | 'CENSOR_REDACTED' | 'BLOCKED' | 'MISSING_FAILURE';

export const EVIDENCE_STATES: EvidenceState[] = [
  'PRESENT',
  'CENSOR_REDACTED',
  'BLOCKED',
  'MISSING_FAILURE',
];

export interface NavigationTiming {
  startTimeUtc: string;
  fetchStartMs: number;
  domainLookupStartMs: number;
  domainLookupEndMs: number;
  connectStartMs: number;
  connectEndMs: number;
  requestStartMs: number;
  responseStartMs: number;
  responseEndMs: number;
  domContentLoadedMs: number;
  loadEventMs: number;
  totalDurationMs: number;
}

export interface HttpResponseMetadata {
  statusCode: number;
  statusText: string;
  url: string;
  mimeType: string;
  headers: Record<string, string>;
  protocol: string;
  remoteIPAddress?: string | undefined;
  securityDetails?:
    | {
        protocol?: string | undefined;
        issuer?: string | undefined;
        validTo?: number | undefined;
      }
    | undefined;
}

export interface ConsoleErrorItem {
  type: 'error' | 'warning' | 'pageerror';
  text: string;
  location?: string | undefined;
  timestampUtc: string;
}

export interface RedactionAuditRecord {
  target: 'url_param' | 'header' | 'dom_selector' | 'regex_pattern';
  identifier: string;
  matchesFound: number;
  actionTaken: 'REDACTED_TEXT' | 'REMOVED_ATTRIBUTE' | 'MASKED_QUERY_PARAM';
}

export interface StepArtifactReference {
  artifactType:
    'screenshot' | 'dom_snapshot' | 'text_subset' | 'extraction_payload' | 'console_logs';
  storageKey: string;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
  state: EvidenceState;
}

export interface StepEvidencePayload {
  runId: string;
  personaId: string;
  stepId: string;
  stepIndex: number;
  timestampUtc: string;
  monotonicDurationNs: string; // Serialized BigInt as string
  finalUrl: string;
  httpOutcome: {
    statusCode: number;
    ok: boolean;
    redirectChain: string[];
  };
  navigationTimings: NavigationTiming;
  responseMetadata: HttpResponseMetadata;
  consoleErrors: ConsoleErrorItem[];
  extractionPayload: Record<string, unknown>;
  artifacts: StepArtifactReference[];
  redactionAuditLogs: RedactionAuditRecord[];
  overallEvidenceState: EvidenceState;
}

export interface StepChecksumItem {
  stepIndex: number;
  stepId: string;
  personaId: string;
  overallState: EvidenceState;
  sha256: string;
}

export interface RunManifestPayload {
  schemaVersion: string;
  runId: string;
  totalSteps: number;
  completedSteps: number;
  completenessPercentage: number;
  stepChecksums: StepChecksumItem[];
  manifestSha256: string;
  generatedAtUtc: string;
}

/**
 * Runtime Validator for StepEvidencePayload
 */
export function validateStepEvidencePayload(payload: unknown): payload is StepEvidencePayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;

  if (typeof p.runId !== 'string' || typeof p.personaId !== 'string') return false;
  if (typeof p.stepId !== 'string' || typeof p.stepIndex !== 'number') return false;
  if (typeof p.timestampUtc !== 'string' || typeof p.monotonicDurationNs !== 'string') return false;
  if (typeof p.finalUrl !== 'string') return false;

  if (typeof p.httpOutcome !== 'object' || p.httpOutcome === null) return false;
  if (!Array.isArray((p.httpOutcome as Record<string, unknown>).redirectChain)) return false;

  if (!EVIDENCE_STATES.includes(p.overallEvidenceState as EvidenceState)) return false;
  if (!Array.isArray(p.artifacts) || !Array.isArray(p.redactionAuditLogs)) return false;

  return true;
}

/**
 * Runtime Validator for RunManifestPayload
 */
export function validateRunManifestPayload(manifest: unknown): manifest is RunManifestPayload {
  if (typeof manifest !== 'object' || manifest === null) return false;
  const m = manifest as Record<string, unknown>;

  if (typeof m.schemaVersion !== 'string' || typeof m.runId !== 'string') return false;
  if (typeof m.totalSteps !== 'number' || typeof m.completedSteps !== 'number') return false;
  if (typeof m.completenessPercentage !== 'number') return false;
  if (typeof m.manifestSha256 !== 'string' || m.manifestSha256.length !== 64) return false;
  if (!Array.isArray(m.stepChecksums)) return false;

  return true;
}
