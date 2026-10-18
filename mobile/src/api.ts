/**
 * Talks to CivicSign. The app never decides whether a chip is genuine — it
 * sends what it read and the server runs passive authentication.
 */

export interface ChipRead {
  sod: string; // base64 security object
  dg1: string; // base64 data page
}

export interface VerificationStatus {
  status: 'pending' | 'verified' | 'failed' | 'expired' | 'not_started';
  failure_reason?: string | null;
  checks?: Record<string, string>;
  attempts_remaining?: number | null;
}

export class CivicSignApi {
  constructor(private baseUrl: string, private token: string) {}

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}/api/sign/${this.token}${path}`;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(this.url(path), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.detail ?? `Request failed (${response.status})`);
    }
    return body as T;
  }

  start() {
    return this.request<{ status: string; required_checks: string[] }>('/idv/start', {
      method: 'POST',
    });
  }

  submitChip(read: ChipRead) {
    return this.request<VerificationStatus>('/idv/chip', {
      method: 'POST',
      body: JSON.stringify(read),
    });
  }

  status() {
    return this.request<VerificationStatus>('/idv/status');
  }
}
