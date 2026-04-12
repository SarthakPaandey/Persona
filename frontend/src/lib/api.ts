import {
  AvailabilityResponse,
  BookingRequest,
  BookingResponse,
  ChatRequest,
  ChatResponse,
  PersonaResponse,
} from './types';

/**
 * Base URL for the FastAPI backend.
 * - In local browser dev, prefer talking to FastAPI directly to avoid occasional
 *   Next.js dev proxy socket resets on long-running chat requests.
 * - Set `NEXT_PUBLIC_API_URL` to force a specific browser URL.
 * - On the server (SSR/tests), use `BACKEND_URL` or `NEXT_PUBLIC_API_URL` or localhost.
 * - In production browser usage, default to same-origin so deployed rewrites still work.
 */
function getLocalBrowserBackendUrl(): string {
  if (typeof window === 'undefined') return '';

  const hostname = window.location.hostname;
  if (!['localhost', '127.0.0.1'].includes(hostname)) return '';

  const frontendPort = window.location.port;
  const backendPort = frontendPort === '3001' ? '8001' : '8000';
  return `http://${hostname}:${backendPort}`;
}

function getApiBase(): string {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (typeof window !== 'undefined') {
    if (publicUrl) return publicUrl;
    if (process.env.NODE_ENV === 'development') {
      const localBackend = getLocalBrowserBackendUrl();
      if (localBackend) return localBackend;
    }
    return '';
  }
  return publicUrl || process.env.BACKEND_URL?.trim() || 'http://127.0.0.1:8000';
}

function getBrowserTimezone(): string {
  if (typeof window === 'undefined') return '';
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

async function fetchJSON<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

const CHAT_TIMEOUT_MS = 120_000;

export async function sendChatMessage(
  payload: ChatRequest
): Promise<ChatResponse> {
  return fetchJSON<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
  });
}

export async function getAvailability(): Promise<AvailabilityResponse> {
  const timezone = getBrowserTimezone();
  const query = timezone ? `?timezone=${encodeURIComponent(timezone)}` : '';
  return fetchJSON<AvailabilityResponse>(`/api/calendar/availability${query}`);
}

export async function bookMeeting(
  payload: BookingRequest
): Promise<BookingResponse> {
  const timezone = payload.timezone || getBrowserTimezone();
  return fetchJSON<BookingResponse>('/api/calendar/book', {
    method: 'POST',
    body: JSON.stringify({ ...payload, timezone: timezone || undefined }),
  });
}

export async function healthCheck(): Promise<{ status: string }> {
  return fetchJSON<{ status: string }>('/health');
}

export async function getPersona(): Promise<PersonaResponse> {
  return fetchJSON<PersonaResponse>('/api/persona');
}
