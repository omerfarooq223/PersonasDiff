export const evidenceSchemaVersion = '1.0.0';

export { ArtifactCapturePipeline, type ExtendedStorageAdapter } from './artifact-pipeline.js';
export { ManifestGenerator } from './manifest-generator.js';
export {
  DEFAULT_REDACTION_CONFIG,
  RedactionEngine,
  type RedactionConfig,
} from './redaction-engine.js';
export {
  RetentionDeletionWorkflow,
  type DatabaseDeletionAdapter,
  type StorageDeletionAdapter,
} from './retention-deletion-workflow.js';
