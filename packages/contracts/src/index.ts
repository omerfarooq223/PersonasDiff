export const contractVersions = {
  event: '1.0.0',
  exportManifest: '1.0.0',
  openapi: '0.1.0',
  evidenceSchema: '1.0.0',
  comparisonSchema: '1.0.0',
} as const;

export * from './worker-contracts.js';
export * from './evidence-schema.js';
export * from './comparison-schema.js';

// Re-export commonly used types for convenience
export type {
  StepEvidencePayload,
  RunManifestPayload,
  NavigationTiming,
  HttpResponseMetadata,
  ConsoleErrorItem,
  RedactionAuditRecord,
  StepArtifactReference,
  EvidenceState,
} from './evidence-schema.js';

export type {
  ComparisonResult,
  MetricResult,
  ComparisonConfidence,
} from './comparison-schema.js';
