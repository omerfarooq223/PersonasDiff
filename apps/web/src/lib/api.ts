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
  status: 'approved' | 'pending' | 'rejected';
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
}

export interface CreateRunRequest {
  journeyVersionId: string;
  personaVersionIds: string[];
  surfaceId: string;
}

export interface ComparisonResult {
  comparisonId: string;
  runId: string;
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
}

export interface StepEvidence {
  runId: string;
  personaId: string;
  stepId: string;
  stepIndex: number;
  timestampUtc: string;
  finalUrl: string;
  httpOutcome: {
    statusCode: number;
    ok: boolean;
    redirectChain: string[];
  };
  artifacts: Array<{
    artifactType:
      'screenshot' | 'dom_snapshot' | 'text_subset' | 'extraction_payload' | 'console_logs';
    storageKey: string;
    sha256: string;
    state: 'PRESENT' | 'CENSOR_REDACTED' | 'BLOCKED' | 'MISSING_FAILURE';
  }>;
  overallEvidenceState: 'PRESENT' | 'CENSOR_REDACTED' | 'BLOCKED' | 'MISSING_FAILURE';
}

export interface ExportRecordResponse {
  id: string;
  runId: string;
  format: 'json' | 'csv';
  schemaVersion: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  manifestHash: string;
  createdAt: string;
}

export interface ExportDownloadResponse {
  exportId: string;
  runId: string;
  format: 'json' | 'csv';
  downloadUrl: string;
  expiresInSeconds: number;
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: 'An unknown error occurred',
        requestId: '',
        status: response.status,
        title: 'Error',
        type: 'unknown',
      }));
      throw error as ApiError;
    }

    return response.json();
  }

  async getPersonas(): Promise<PersonaVersion[]> {
    return this.request<PersonaVersion[]>('/admin/personas');
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
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/v1/runs/${runId}/exports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ format }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: 'Failed to create export',
        status: response.status,
      }));
      throw error;
    }

    return response.json();
  }

  async getExportDownload(exportId: string): Promise<ExportDownloadResponse> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/v1/exports/${exportId}/download`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: 'Failed to get export download link',
        status: response.status,
      }));
      throw error;
    }

    return response.json();
  }
}

export const api = new ApiClient();
