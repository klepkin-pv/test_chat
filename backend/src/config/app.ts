import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const DEFAULT_PROTOCOL = 'http';
const DEFAULT_HOST = 'localhost';
const DEFAULT_NGINX_PORT = '5176';
const DEFAULT_FRONTEND_PORT = '5175';
const DEFAULT_BACKEND_PORT = '4000';
const DEFAULT_MONGODB_PORT = '27018';
const DEFAULT_REDIS_PORT = '6380';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });

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

export function getAppProtocol(): string {
  return process.env.APP_PROTOCOL || DEFAULT_PROTOCOL;
}

export function getAppHost(): string {
  return process.env.APP_HOST || DEFAULT_HOST;
}

export function getNginxPort(): string {
  return process.env.NGINX_PORT || DEFAULT_NGINX_PORT;
}

export function getFrontendPort(): string {
  return process.env.FRONTEND_PORT || DEFAULT_FRONTEND_PORT;
}

export function getBackendPort(): string {
  return process.env.PORT || process.env.BACKEND_PORT || DEFAULT_BACKEND_PORT;
}

export function getMongodbPort(): string {
  return process.env.MONGODB_PORT || DEFAULT_MONGODB_PORT;
}

export function getRedisPort(): string {
  return process.env.REDIS_PORT || DEFAULT_REDIS_PORT;
}

export function getPublicOrigin(): string | null {
  return trimTrailingSlash(process.env.PUBLIC_ORIGIN);
}

export function getDirectFrontendOrigin(): string {
  return buildOrigin(getAppProtocol(), getAppHost(), getFrontendPort());
}

export function getDirectBackendOrigin(): string {
  return buildOrigin(getAppProtocol(), getAppHost(), getBackendPort());
}

export function getNginxOrigin(): string {
  return getPublicOrigin() || buildOrigin(getAppProtocol(), getAppHost(), getNginxPort());
}

export function getAllowedOrigins(): string[] {
  const allowed = new Set<string>();
  const envOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? [];
  const localNginxOrigin = buildOrigin(getAppProtocol(), getAppHost(), getNginxPort());

  [
    process.env.CLIENT_URL,
    process.env.PUBLIC_ORIGIN,
    ...envOrigins,
    getDirectFrontendOrigin(),
    localNginxOrigin,
    getNginxOrigin(),
  ].forEach((origin) => {
    const normalizedOrigin = trimTrailingSlash(origin?.trim());
    if (normalizedOrigin) {
      allowed.add(normalizedOrigin);
    }
  });

  return Array.from(allowed);
}

export function getDefaultMongoUri(): string {
  return `mongodb://${DEFAULT_HOST}:${getMongodbPort()}/chatreal`;
}

export function getDefaultRedisUrl(): string {
  return `redis://${DEFAULT_HOST}:${getRedisPort()}`;
}
