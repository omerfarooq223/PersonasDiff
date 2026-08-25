const API_BASE = '/v1';

export interface ApiError {
  detail: string;
  requestId: string;
  status: number;
  title: string;
  type: string;
}

export interface PersonaVersion {
  id: string;
  name: string;
  version: string;
  settings: {
    viewport: { width: number; height: number };
    locale: string;
    timezoneId: string;
    userAgent: string;
    colorScheme: 'light' | 'dark' | 'no-preference';
    reducedMotion: 'reduce' | 'no-preference';
  };
}

export interface JourneyVersion {
  id: string;
  name: string;
  version: string;
  surfaceId: string;
  steps: Array<{
    id: string;
    type: string;
    description?: string;
  }>;
}

export interface Surface {
  id: string;
  name: string;
  hostname: string;
  origin: string;
  status: 'draft' | 'approved' | 'disabled';
}

export interface Run {
  id: string;
  status:
    'draft' | 'queued' | 'running' | 'completed' | 'partially_completed' | 'failed' | 'cancelled';
  createdAt: string;
  correlationId?: string;
  journeyVersionId?: string;
  personaVersionIds?: string[];
  surfaceId?: string;
  targetUrl?: string;
}

export interface CreateRunRequest {
  journeyVersionId?: string;
  personaVersionIds: string[];
  surfaceId?: string;
  customSurfaceUrl?: string;
  customSurfaceName?: string;
}

export interface PersonaCaptureResult {
  id: string;
  name: string;
  screenshot: string;
  title: string;
  textSnippet: string;
  elementCount: number;
  locale: string;
  timezoneId: string;
  viewport: { width: number; height: number };
  durationMs?: number;
  detectedPrice?: string;
  detectedCurrency?: string;
}

export interface PairwiseComparison {
  personaA: string;
  personaB: string;
  textSimilarity: number;
  domSimilarity: number;
  titleMatch: boolean;
  durationDeltaMs: number;
}

export interface AiPricingAnalysis {
  status: 'detected_divergence' | 'identical_pricing' | 'prices_hidden_or_gated' | 'not_applicable';
  summary: string;
  reasons: string[];
  observedPrices?: Record<string, string>;
}

export interface AiInsights {
  headline: string;
  keyDifferences: string[];
  notableItems: string[];
  noMeaningfulDifferences: boolean;
  confidence: 'high' | 'medium' | 'low';
  non_reproducible: true;
  pricingAnalysis?: AiPricingAnalysis;
}

export interface ComparisonResult {
  comparisonId: string;
  runId: string;
  status?: string;
  metricVersion: string;
  comparedPersonas: string[];
  timestampUtc: string;
  metrics: Array<{
    metricName: string;
    metricVersion: string;
    result: number | boolean | string;
    explanation: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    warnings: string[];
  }>;
  overallObservation: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  warnings: string[];
  aiInsights?: AiInsights | null;
  aiInsightsStatus?: 'available' | 'not_configured' | 'failed';
  aiInsightsMessage?: string;
  screenshots?: {
    personaA?: string;
    personaB?: string;
    personaAName?: string;
    personaBName?: string;
  };
  domSummary?: {
    personaATitle?: string;
    personaBTitle?: string;
    personaATextSnippet?: string;
    personaBTextSnippet?: string;
    personaAElementCount?: number;
    personaBElementCount?: number;
  };
  personaResults?: PersonaCaptureResult[];
  pairwiseComparisons?: PairwiseComparison[];
}

export interface StepEvidence {
  stepId: string;
  stepIndex: number;
  personaId: string;
  runId: string;
  finalUrl: string;
  httpOutcome: {
    statusCode: number;
    ok: boolean;
    redirectChain: string[];
  };
  domTextSnippet?: string;
  screenshotUrl?: string;
  overallEvidenceState: 'PRESENT' | 'EMPTY' | 'FAILED' | 'MUTATED';
  artifacts: Array<{
    artifactType: 'screenshot' | 'dom_snapshot' | 'har' | 'network_log';
    storageKey: string;
    sha256: string;
    state: 'PRESENT' | 'EMPTY' | 'FAILED' | 'MUTATED';
  }>;
  timestampUtc: string;
}

export interface ExportRecordResponse {
  id: string;
  runId: string;
  format: 'json' | 'csv';
  status: 'pending' | 'completed' | 'failed';
  downloadUrl?: string;
  createdAt: string;
}

export interface ExportDownloadResponse {
  id: string;
  runId: string;
  format: 'json' | 'csv';
  downloadUrl: string;
  expiresAtUtc: string;
}

export interface ScheduledJob {
  id: string;
  name: string;
  targetUrl: string;
  personaIds: string[];
  surfaceId: string;
  journeyVersionId: string;
  intervalMinutes: number;
  intervalLabel: string;
  enabled: boolean;
  createdAt: string;
  lastRunAt: string | null;
  lastRunId: string | null;
  nextRunAt: string;
  runCount: number;
}

export interface CreateScheduledJobRequest {
  name: string;
  targetUrl: string;
  personaIds: string[];
  surfaceId: string;
  journeyVersionId: string;
  intervalMinutes: number;
}

export const FX_RATES_TO_USD: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08,
  GBP: 1.28,
  TRY: 0.031,
  JPY: 0.0065,
  CAD: 0.74,
  AUD: 0.66,
  INR: 0.012,
  PKR: 0.0036,
  BRL: 0.18,
  AED: 0.272,
  SAR: 0.267,
  KRW: 0.00073,
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  TRY: '₺',
  JPY: '¥',
  PKR: '₨',
  CAD: 'CA$',
  AUD: 'AU$',
  INR: '₹',
  BRL: 'R$',
  AED: 'AED',
  SAR: 'SAR',
  KRW: '₩',
};

export function parsePriceToNumber(rawPrice?: string): { amount: number; currency: string } | null {
  if (!rawPrice) return null;
  const clean = rawPrice.trim();

  let currency = 'USD';
  if (clean.includes('€') || clean.toLowerCase().includes('eur')) currency = 'EUR';
  else if (clean.includes('£') || clean.toLowerCase().includes('gbp')) currency = 'GBP';
  else if (
    clean.includes('₺') ||
    clean.toLowerCase().includes('tl') ||
    clean.toLowerCase().includes('try')
  )
    currency = 'TRY';
  else if (
    clean.includes('¥') ||
    clean.toLowerCase().includes('jpy') ||
    clean.toLowerCase().includes('yen')
  )
    currency = 'JPY';
  else if (
    clean.includes('₨') ||
    clean.toLowerCase().includes('pkr') ||
    clean.toLowerCase().includes('rs')
  )
    currency = 'PKR';
  else if (clean.includes('₹') || clean.toLowerCase().includes('inr')) currency = 'INR';
  else if (clean.includes('R$') || clean.toLowerCase().includes('brl')) currency = 'BRL';
  else if (clean.includes('AED') || clean.includes('د.إ')) currency = 'AED';
  else if (clean.includes('₩') || clean.toLowerCase().includes('krw')) currency = 'KRW';
  else if (clean.includes('$')) currency = 'USD';

  const numMatches = clean.match(/[\d.,]+/g);
  if (!numMatches || numMatches.length === 0) return null;

  let numStr = numMatches[0]!;
  if (numStr.includes(',') && !numStr.includes('.')) {
    numStr = numStr.replace(',', '.');
  } else if (numStr.includes(',') && numStr.includes('.')) {
    if (numStr.indexOf(',') < numStr.indexOf('.')) {
      numStr = numStr.replace(/,/g, '');
    } else {
      numStr = numStr.replace(/\./g, '').replace(',', '.');
    }
  }

  const val = parseFloat(numStr);
  if (isNaN(val) || val <= 0) return null;
  return { amount: val, currency };
}

export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  const fromRate = FX_RATES_TO_USD[fromCurrency.toUpperCase()] || 1.0;
  const toRate = FX_RATES_TO_USD[toCurrency.toUpperCase()] || 1.0;
  const amountInUSD = amount * fromRate;
  return amountInUSD / toRate;
}

class ApiClient {
  private baseUrl =
    (typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL) ||
    API_BASE;

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token =
      (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null) ||
      'pw-admin-token-dev-only-0001';
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      return await response.json();
    } catch (err) {
      console.warn(`[ApiClient] Request to ${endpoint} failed.`, err);
      throw err;
    }
  }

  async getPersonas(): Promise<PersonaVersion[]> {
    return this.request<PersonaVersion[]>('/admin/personas');
  }

  async createPersona(data: {
    name: string;
    settings: {
      locale: string;
      timezoneId?: string;
      userAgent?: string;
      viewport?: { width: number; height: number };
    };
  }): Promise<PersonaVersion> {
    return this.request<PersonaVersion>('/admin/personas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePersona(id: string): Promise<void> {
    return this.request<void>(`/admin/personas/${id}`, {
      method: 'DELETE',
    });
  }

  async getJourneys(): Promise<JourneyVersion[]> {
    return this.request<JourneyVersion[]>('/admin/journeys');
  }

  async getSurfaces(): Promise<Surface[]> {
    return this.request<Surface[]>('/admin/surfaces');
  }

  async createRun(data: CreateRunRequest, idempotencyKey: string): Promise<Run> {
    return this.request<Run>('/runs', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(data),
    });
  }

  async getRun(id: string): Promise<Run> {
    return this.request<Run>(`/runs/${id}`);
  }

  async listRuns(
    limit = 20,
    offset = 0,
  ): Promise<{ items: Run[]; total: number; limit: number; offset: number }> {
    return this.request(`/runs?limit=${limit}&offset=${offset}`);
  }

  async cancelRun(id: string): Promise<Run> {
    return this.request<Run>(`/runs/${id}/cancel`, {
      method: 'POST',
    });
  }

  async getComparison(runId: string): Promise<ComparisonResult> {
    return this.request<ComparisonResult>(`/runs/${runId}/comparison`);
  }

  async getReplay(runId: string): Promise<{ steps: StepEvidence[] }> {
    return this.request<{ steps: StepEvidence[] }>(`/runs/${runId}/replay`);
  }

  async createExport(
    runId: string,
    format: 'json' | 'csv' = 'json',
  ): Promise<ExportRecordResponse> {
    return this.request<ExportRecordResponse>(`/runs/${runId}/exports`, {
      method: 'POST',
      body: JSON.stringify({ format }),
    });
  }

  async getExportDownload(exportId: string): Promise<ExportDownloadResponse> {
    return this.request<ExportDownloadResponse>(`/exports/${exportId}/download`);
  }

  async getScheduledJobs(): Promise<ScheduledJob[]> {
    return this.request<ScheduledJob[]>('/scheduled-jobs');
  }

  async createScheduledJob(data: CreateScheduledJobRequest): Promise<ScheduledJob> {
    return this.request<ScheduledJob>('/scheduled-jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteScheduledJob(id: string): Promise<void> {
    return this.request<void>(`/scheduled-jobs/${id}`, { method: 'DELETE' });
  }

  async toggleScheduledJob(id: string): Promise<ScheduledJob> {
    return this.request<ScheduledJob>(`/scheduled-jobs/${id}/toggle`, { method: 'PATCH' });
  }
}

export const api = new ApiClient();
