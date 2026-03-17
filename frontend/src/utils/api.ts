const DEFAULT_PROTOCOL = process.env.NEXT_PUBLIC_APP_PROTOCOL || 'http';
const DEFAULT_HOST = process.env.NEXT_PUBLIC_APP_HOST || 'localhost';
const NGINX_PORT = process.env.NEXT_PUBLIC_NGINX_PORT || '5175';
const FRONTEND_PORT = process.env.NEXT_PUBLIC_FRONTEND_PORT || '5176';
const BACKEND_PORT = process.env.NEXT_PUBLIC_BACKEND_PORT || '4000';

function trimTrailingSlash(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.replace(/\/+$/, '');
}

function buildOrigin(protocol: string, host: string, port?: string | null): string {
  const normalizedProtocol = protocol.replace(/:$/, '') || DEFAULT_PROTOCOL;
  const normalizedHost = host || DEFAULT_HOST;
  const normalizedPort = port ? `:${port}` : '';

  return `${normalizedProtocol}://${normalizedHost}${normalizedPort}`;
}

function toAbsoluteUrl(value?: string | null): string | null {
  const normalizedValue = trimTrailingSlash(value);
  if (!normalizedValue) {
    return null;
  }

  try {
    return new URL(normalizedValue).toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function extractOrigin(value?: string | null): string | null {
  const absoluteUrl = toAbsoluteUrl(value);
  return absoluteUrl ? new URL(absoluteUrl).origin : null;
}

function stripSegment(value: string | null, segment: string): string | null {
  if (!value) {
    return null;
  }

  return value.endsWith(segment) ? value.slice(0, -segment.length) : value;
}

const LEGACY_CHAT_API_URL = trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL);
const LEGACY_SOCKET_URL = trimTrailingSlash(process.env.NEXT_PUBLIC_SOCKET_URL);
const DIRECT_FRONTEND_ORIGIN = buildOrigin(DEFAULT_PROTOCOL, DEFAULT_HOST, FRONTEND_PORT);
const DIRECT_BACKEND_ORIGIN = buildOrigin(DEFAULT_PROTOCOL, DEFAULT_HOST, BACKEND_PORT);
const PUBLIC_ORIGIN =
  trimTrailingSlash(process.env.NEXT_PUBLIC_PUBLIC_ORIGIN) ||
  extractOrigin(LEGACY_SOCKET_URL) ||
  extractOrigin(LEGACY_CHAT_API_URL);

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function isProxyMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const currentOrigin = trimTrailingSlash(window.location.origin);
  if (!currentOrigin) {
    return false;
  }

  if (currentOrigin === trimTrailingSlash(DIRECT_FRONTEND_ORIGIN) || currentOrigin === trimTrailingSlash(DIRECT_BACKEND_ORIGIN)) {
    return false;
  }

  if (PUBLIC_ORIGIN && currentOrigin === PUBLIC_ORIGIN) {
    return true;
  }

  return window.location.port === NGINX_PORT || currentOrigin !== trimTrailingSlash(DIRECT_FRONTEND_ORIGIN);
}

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const currentOrigin = trimTrailingSlash(window.location.origin);

    if (currentOrigin === trimTrailingSlash(DIRECT_FRONTEND_ORIGIN)) {
      return DIRECT_BACKEND_ORIGIN;
    }

    if (isProxyMode()) {
      return `${currentOrigin}/api`;
    }
  }

  const legacyApiBase = stripSegment(LEGACY_CHAT_API_URL, '/chat');
  if (legacyApiBase) {
    return legacyApiBase;
  }

  if (PUBLIC_ORIGIN) {
    return `${PUBLIC_ORIGIN}/api`;
  }

  return DIRECT_BACKEND_ORIGIN;
}

export function getServerRoot(): string {
  if (typeof window !== 'undefined') {
    const currentOrigin = trimTrailingSlash(window.location.origin);

    if (currentOrigin === trimTrailingSlash(DIRECT_FRONTEND_ORIGIN)) {
      return DIRECT_BACKEND_ORIGIN;
    }

    if (isProxyMode()) {
      return currentOrigin || window.location.origin;
    }
  }

  return PUBLIC_ORIGIN || extractOrigin(LEGACY_CHAT_API_URL) || DIRECT_BACKEND_ORIGIN;
}

export function buildAbsoluteUrl(path?: string | null): string | null {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${getServerRoot()}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildAvatarUrl(avatar?: string | null): string | null {
  return buildAbsoluteUrl(avatar);
}

export function getChatApiUrl(): string {
  return `${getApiBaseUrl()}/chat`;
}

export function getAuthApiUrl(): string {
  return `${getApiBaseUrl()}/auth`;
}

export function getFilesApiUrl(): string {
  return `${getApiBaseUrl()}/files`;
}

export function getDirectApiUrl(): string {
  return `${getApiBaseUrl()}/direct`;
}

export function getAdminApiUrl(): string {
  return `${getApiBaseUrl()}/admin`;
}

export function getUserApiUrl(): string {
  return `${getApiBaseUrl()}/user`;
}

export function getPushApiUrl(): string {
  return `${getApiBaseUrl()}/push`;
}

export function getSocketUrl(): string {
  if (typeof window !== 'undefined') {
    const currentOrigin = trimTrailingSlash(window.location.origin);

    if (currentOrigin === trimTrailingSlash(DIRECT_FRONTEND_ORIGIN)) {
      return DIRECT_BACKEND_ORIGIN;
    }

    if (isProxyMode()) {
      return currentOrigin || window.location.origin;
    }
  }

  return LEGACY_SOCKET_URL || PUBLIC_ORIGIN || DIRECT_BACKEND_ORIGIN;
}

export function createAuthHeaders(token?: string | null, headers?: HeadersInit): HeadersInit {
  return {
    ...(headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export const API_URL = getChatApiUrl();
export const AUTH_API_URL = getAuthApiUrl();
export const FILES_API_URL = getFilesApiUrl();
export const DIRECT_API_URL = getDirectApiUrl();
export const ADMIN_API_URL = getAdminApiUrl();
export const USER_API_URL = getUserApiUrl();
export const SOCKET_URL = getSocketUrl();
