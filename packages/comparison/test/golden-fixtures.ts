/**
 * Golden Fixtures for Comparison Metrics Testing
 * 
 * Contains test cases for identical, reordered, substituted, price-changed,
 * redirected, and partially missing experiences.
 */

import type { StepEvidencePayload } from '@ai-parallel-web/contracts';

export const IDENTICAL_FIXTURE: {
  personaA: StepEvidencePayload;
  personaB: StepEvidencePayload;
  expected: {
    elementPresenceSimilarity: number;
    textSimilarity: number;
    hasRedirectDifference: boolean;
    timingDeltaSmall: boolean;
  };
} = {
  personaA: {
    runId: 'test-run-1',
    personaId: 'persona-a',
    stepId: 'step-1',
    stepIndex: 0,
    timestampUtc: '2026-08-06T00:00:00.000Z',
    monotonicDurationNs: '1000000000',
    finalUrl: 'https://example.com/page',
    httpOutcome: {
      statusCode: 200,
      ok: true,
      redirectChain: [],
    },
    navigationTimings: {
      startTimeUtc: '2026-08-06T00:00:00.000Z',
      fetchStartMs: 0,
      domainLookupStartMs: 0,
      domainLookupEndMs: 0,
      connectStartMs: 0,
      connectEndMs: 0,
      requestStartMs: 0,
      responseStartMs: 0,
      responseEndMs: 0,
      domContentLoadedMs: 0,
      loadEventMs: 0,
      totalDurationMs: 1000,
    },
    responseMetadata: {
      statusCode: 200,
      statusText: 'OK',
      url: 'https://example.com/page',
      mimeType: 'text/html',
      headers: {},
      protocol: 'http/1.1',
    },
    consoleErrors: [],
    extractionPayload: {
      title: 'Test Page',
      price: 99.99,
      items: ['item1', 'item2', 'item3'],
    },
    artifacts: [
      {
        artifactType: 'screenshot',
        storageKey: 'test-key',
        sha256: 'a'.repeat(64),
        sizeBytes: 1024,
        mimeType: 'image/png',
        state: 'PRESENT',
      },
      {
        artifactType: 'dom_snapshot',
        storageKey: 'test-key-2',
        sha256: 'b'.repeat(64),
        sizeBytes: 2048,
        mimeType: 'text/html',
        state: 'PRESENT',
      },
    ],
    redactionAuditLogs: [],
    overallEvidenceState: 'PRESENT',
  },
  personaB: {
    runId: 'test-run-1',
    personaId: 'persona-b',
    stepId: 'step-1',
    stepIndex: 0,
    timestampUtc: '2026-08-06T00:00:01.000Z',
    monotonicDurationNs: '1000000000',
    finalUrl: 'https://example.com/page',
    httpOutcome: {
      statusCode: 200,
      ok: true,
      redirectChain: [],
    },
    navigationTimings: {
      startTimeUtc: '2026-08-06T00:00:01.000Z',
      fetchStartMs: 0,
      domainLookupStartMs: 0,
      domainLookupEndMs: 0,
      connectStartMs: 0,
      connectEndMs: 0,
      requestStartMs: 0,
      responseStartMs: 0,
      responseEndMs: 0,
      domContentLoadedMs: 0,
      loadEventMs: 0,
      totalDurationMs: 1000,
    },
    responseMetadata: {
      statusCode: 200,
      statusText: 'OK',
      url: 'https://example.com/page',
      mimeType: 'text/html',
      headers: {},
      protocol: 'http/1.1',
    },
    consoleErrors: [],
    extractionPayload: {
      title: 'Test Page',
      price: 99.99,
      items: ['item1', 'item2', 'item3'],
    },
    artifacts: [
      {
        artifactType: 'screenshot',
        storageKey: 'test-key',
        sha256: 'a'.repeat(64),
        sizeBytes: 1024,
        mimeType: 'image/png',
        state: 'PRESENT',
      },
      {
        artifactType: 'dom_snapshot',
        storageKey: 'test-key-2',
        sha256: 'b'.repeat(64),
        sizeBytes: 2048,
        mimeType: 'text/html',
        state: 'PRESENT',
      },
    ],
    redactionAuditLogs: [],
    overallEvidenceState: 'PRESENT',
  },
  expected: {
    elementPresenceSimilarity: 1.0,
    textSimilarity: 1.0,
    hasRedirectDifference: false,
    timingDeltaSmall: true,
  },
};

export const REORDERED_FIXTURE: {
  personaA: StepEvidencePayload;
  personaB: StepEvidencePayload;
  expected: {
    elementPresenceSimilarity: number;
    textSimilarity: number;
    hasRankShift: boolean;
  };
} = {
  personaA: {
    ...IDENTICAL_FIXTURE.personaA,
    extractionPayload: {
      title: 'Test Page',
      items: ['item1', 'item2', 'item3'],
    },
  },
  personaB: {
    ...IDENTICAL_FIXTURE.personaB,
    extractionPayload: {
      title: 'Test Page',
      items: ['item3', 'item1', 'item2'],
    },
  },
  expected: {
    elementPresenceSimilarity: 1.0,
    textSimilarity: 1.0,
    hasRankShift: true,
  },
};

export const PRICE_CHANGED_FIXTURE: {
  personaA: StepEvidencePayload;
  personaB: StepEvidencePayload;
  expected: {
    hasNumericDelta: boolean;
    deltaPercentage: number;
  };
} = {
  personaA: {
    ...IDENTICAL_FIXTURE.personaA,
    extractionPayload: {
      title: 'Test Page',
      price: 99.99,
    },
  },
  personaB: {
    ...IDENTICAL_FIXTURE.personaB,
    extractionPayload: {
      title: 'Test Page',
      price: 109.99,
    },
  },
  expected: {
    hasNumericDelta: true,
    deltaPercentage: 10.0,
  },
};

export const REDIRECTED_FIXTURE: {
  personaA: StepEvidencePayload;
  personaB: StepEvidencePayload;
  expected: {
    hasRedirectDifference: boolean;
  };
} = {
  personaA: {
    ...IDENTICAL_FIXTURE.personaA,
    finalUrl: 'https://example.com/page-a',
  },
  personaB: {
    ...IDENTICAL_FIXTURE.personaB,
    finalUrl: 'https://example.com/page-b',
  },
  expected: {
    hasRedirectDifference: true,
  },
};

export const PARTIALLY_MISSING_FIXTURE: {
  personaA: StepEvidencePayload;
  personaB: StepEvidencePayload;
  expected: {
    elementPresenceSimilarity: number;
    hasMissingArtifacts: boolean;
  };
} = {
  personaA: {
    ...IDENTICAL_FIXTURE.personaA,
    artifacts: [
      {
        artifactType: 'screenshot',
        storageKey: 'test-key',
        sha256: 'a'.repeat(64),
        sizeBytes: 1024,
        mimeType: 'image/png',
        state: 'PRESENT',
      },
      {
        artifactType: 'dom_snapshot',
        storageKey: 'test-key-2',
        sha256: 'b'.repeat(64),
        sizeBytes: 2048,
        mimeType: 'text/html',
        state: 'PRESENT',
      },
    ],
  },
  personaB: {
    ...IDENTICAL_FIXTURE.personaB,
    artifacts: [
      {
        artifactType: 'screenshot',
        storageKey: 'test-key',
        sha256: 'a'.repeat(64),
        sizeBytes: 1024,
        mimeType: 'image/png',
        state: 'PRESENT',
      },
      {
        artifactType: 'dom_snapshot',
        storageKey: '',
        sha256: '0'.repeat(64),
        sizeBytes: 0,
        mimeType: 'text/html',
        state: 'MISSING_FAILURE',
      },
    ],
  },
  expected: {
    elementPresenceSimilarity: 1.0,
    hasMissingArtifacts: true,
  },
};

export const SUBSTITUTED_FIXTURE: {
  personaA: StepEvidencePayload;
  personaB: StepEvidencePayload;
  expected: {
    textSimilarity: number;
    hasContentDifference: boolean;
  };
} = {
  personaA: {
    ...IDENTICAL_FIXTURE.personaA,
    extractionPayload: {
      title: 'Premium Product',
      description: 'This is a premium product',
    },
  },
  personaB: {
    ...IDENTICAL_FIXTURE.personaB,
    extractionPayload: {
      title: 'Standard Product',
      description: 'This is a standard product',
    },
  },
  expected: {
    textSimilarity: 0.8,
    hasContentDifference: true,
  },
};
