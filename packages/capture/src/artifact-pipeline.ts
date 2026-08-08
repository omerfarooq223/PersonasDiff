import { createHash } from 'node:crypto';
import type { Page, Response } from 'playwright';
import type {
  ConsoleErrorItem,
  EvidenceState,
  HttpResponseMetadata,
  NavigationTiming,
  RedactionAuditRecord,
  StepArtifactReference,
  StepEvidencePayload,
} from '@ai-parallel-web/contracts';
import type { PutObjectInput, StorageObjectMetadata } from '@ai-parallel-web/storage';

import { RedactionEngine } from './redaction-engine.js';

export interface ExtendedStorageAdapter {
  putObject(input: PutObjectInput): Promise<StorageObjectMetadata>;
  deleteObject(key: string): Promise<void>;
  getSignedUrl?(key: string): Promise<string>;
  exists?(key: string): Promise<boolean>;
}

export class ArtifactCapturePipeline {
  constructor(
    private storage: ExtendedStorageAdapter,
    private redactionEngine: RedactionEngine = new RedactionEngine(),
  ) {}

  public async captureAndProcessStep(params: {
    tenantId: string;
    runId: string;
    personaId: string;
    stepId: string;
    stepIndex: number;
    page?: Page | undefined;
    response?: Response | null | undefined;
    consoleErrors?: ConsoleErrorItem[] | undefined;
    extractedData?: Record<string, unknown> | undefined;
    stepError?: Error | undefined;
  }): Promise<StepEvidencePayload> {
    const startTimeNs = process.hrtime.bigint();
    const timestampUtc = new Date().toISOString();
    const audits: RedactionAuditRecord[] = [];

    const rawUrl = params.page ? params.page.url() : 'about:blank';
    const { sanitizedUrl, audits: urlAudits } = this.redactionEngine.redactUrl(rawUrl);
    audits.push(...urlAudits);

    // 1. HTTP Outcome & Metadata
    let httpOutcome = { statusCode: 200, ok: true, redirectChain: [] as string[] };
    let responseMetadata: HttpResponseMetadata = {
      statusCode: 200,
      statusText: 'OK',
      url: sanitizedUrl,
      mimeType: 'text/html',
      headers: {},
      protocol: 'http/1.1',
    };

    if (params.response) {
      httpOutcome = {
        statusCode: params.response.status(),
        ok: params.response.ok(),
        redirectChain: [],
      };

      const rawHeaders = params.response.headers();
      const { sanitizedHeaders, audits: headerAudits } =
        this.redactionEngine.redactHeaders(rawHeaders);
      audits.push(...headerAudits);

      responseMetadata = {
        statusCode: params.response.status(),
        statusText: params.response.statusText(),
        url: sanitizedUrl,
        mimeType: rawHeaders['content-type'] || 'text/html',
        headers: sanitizedHeaders,
        protocol: 'http/1.1',
      };
    }

    // 2. Navigation Timings
    const timings = params.page
      ? await this.extractNavigationTimings(params.page, timestampUtc)
      : this.createEmptyNavigationTimings(timestampUtc);

    // 3. Artifact Captures
    const artifacts: StepArtifactReference[] = [];

    // Screenshot Capture
    if (params.page) {
      try {
        const screenshotBuf = await params.page.screenshot({ fullPage: true, type: 'png' });
        const artRef = await this.processAndUploadArtifact({
          tenantId: params.tenantId,
          runId: params.runId,
          personaId: params.personaId,
          stepIndex: params.stepIndex,
          artifactType: 'screenshot',
          buffer: screenshotBuf,
          mimeType: 'image/png',
        });
        artifacts.push(artRef);
      } catch {
        artifacts.push({
          artifactType: 'screenshot',
          storageKey: '',
          sha256: '0'.repeat(64),
          sizeBytes: 0,
          mimeType: 'image/png',
          state: 'MISSING_FAILURE',
        });
      }
    }

    // DOM & Text Snapshot Capture with Redaction
    if (params.page) {
      try {
        const rawDom = await params.page.content();
        const { sanitizedHtml, audits: domAudits } =
          this.redactionEngine.sanitizeDomContent(rawDom);
        audits.push(...domAudits);

        const domBuf = Buffer.from(sanitizedHtml, 'utf-8');
        const artRef = await this.processAndUploadArtifact({
          tenantId: params.tenantId,
          runId: params.runId,
          personaId: params.personaId,
          stepIndex: params.stepIndex,
          artifactType: 'dom_snapshot',
          buffer: domBuf,
          mimeType: 'text/html',
        });
        artifacts.push(artRef);
      } catch {
        artifacts.push({
          artifactType: 'dom_snapshot',
          storageKey: '',
          sha256: '0'.repeat(64),
          sizeBytes: 0,
          mimeType: 'text/html',
          state: 'MISSING_FAILURE',
        });
      }
    }

    const durationNs = process.hrtime.bigint() - startTimeNs;

    // Overall State Determination
    let overallEvidenceState: EvidenceState = 'PRESENT';
    if (params.stepError) {
      overallEvidenceState = 'MISSING_FAILURE';
    } else if (audits.length > 0) {
      overallEvidenceState = 'CENSOR_REDACTED';
    }

    return {
      runId: params.runId,
      personaId: params.personaId,
      stepId: params.stepId,
      stepIndex: params.stepIndex,
      timestampUtc,
      monotonicDurationNs: durationNs.toString(),
      finalUrl: sanitizedUrl,
      httpOutcome,
      navigationTimings: timings,
      responseMetadata,
      consoleErrors: params.consoleErrors || [],
      extractionPayload: params.extractedData || {},
      artifacts,
      redactionAuditLogs: audits,
      overallEvidenceState,
    };
  }

  public async processAndUploadArtifact(params: {
    tenantId: string;
    runId: string;
    personaId: string;
    stepIndex: number;
    artifactType:
      'screenshot' | 'dom_snapshot' | 'text_subset' | 'extraction_payload' | 'console_logs';
    buffer: Buffer;
    mimeType: string;
  }): Promise<StepArtifactReference> {
    const sha256 = createHash('sha256').update(params.buffer).digest('hex');
    const storageKey = `tenants/${params.tenantId}/runs/${params.runId}/personas/${params.personaId}/steps/${params.stepIndex}/${params.artifactType}-${sha256}`;

    // Idempotent Check if exists method available
    let alreadyExists = false;
    if (typeof this.storage.exists === 'function') {
      alreadyExists = await this.storage.exists(storageKey);
    }

    if (!alreadyExists) {
      await this.uploadWithRetry(storageKey, params.buffer, params.mimeType, sha256);
    }

    return {
      artifactType: params.artifactType,
      storageKey,
      sha256,
      sizeBytes: params.buffer.length,
      mimeType: params.mimeType,
      state: 'PRESENT',
    };
  }

  private async uploadWithRetry(
    storageKey: string,
    buffer: Buffer,
    mimeType: string,
    checksumSha256: string,
    retries = 3,
  ): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.storage.putObject({
          key: storageKey,
          body: buffer,
          contentType: mimeType,
          checksumSha256,
        });
        return;
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise((r) => setTimeout(r, attempt * 100));
      }
    }
  }

  private async extractNavigationTimings(
    page: Page,
    fallbackUtc: string,
  ): Promise<NavigationTiming> {
    try {
      const timingJson = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (!nav) return null;
        return {
          fetchStartMs: nav.fetchStart,
          domainLookupStartMs: nav.domainLookupStart,
          domainLookupEndMs: nav.domainLookupEnd,
          connectStartMs: nav.connectStart,
          connectEndMs: nav.connectEnd,
          requestStartMs: nav.requestStart,
          responseStartMs: nav.responseStart,
          responseEndMs: nav.responseEnd,
          domContentLoadedMs: nav.domContentLoadedEventEnd,
          loadEventMs: nav.loadEventEnd,
          totalDurationMs: nav.duration,
        };
      });

      if (timingJson) {
        return { startTimeUtc: fallbackUtc, ...timingJson };
      }
    } catch {
      // Fallback
    }

    return this.createEmptyNavigationTimings(fallbackUtc);
  }

  private createEmptyNavigationTimings(fallbackUtc: string): NavigationTiming {
    return {
      startTimeUtc: fallbackUtc,
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
      totalDurationMs: 0,
    };
  }
}
