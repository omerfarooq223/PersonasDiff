export const contractVersions = {
  event: '1.0.0',
  exportManifest: '1.0.0',
  openapi: '0.1.0',
  evidenceSchema: '1.0.0',
} as const;

export * from './worker-contracts.js';
export * from './evidence-schema.js';
