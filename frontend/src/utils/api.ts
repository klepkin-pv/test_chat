// Базовый URL для API
function getBaseApiUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // Если это zrok.io домен или localhost:5175 (через nginx), используем /api прокси
    if (hostname.includes('zrok.io') || port === '5175') {
      const baseUrl = `${protocol}//${hostname}${port ? ':' + port : ''}`;
      return `${baseUrl}/api`;
    }
    
    // Fallback на прямое подключение к бэкенду
    return 'http://localhost:4000';
  }
  
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
}

// URL для чата (комнаты, сообщения)
export function getChatApiUrl(): string {
  const base = getBaseApiUrl();
  return base.includes('/api') ? `${base}/chat` : `${base}/chat`;
}

// URL для аутентификации
export function getAuthApiUrl(): string {
  const base = getBaseApiUrl();
  return base.includes('/api') ? `${base}/auth` : `${base}/auth`;
}

// URL для файлов
export function getFilesApiUrl(): string {
  const base = getBaseApiUrl();
  return base.includes('/api') ? `${base}/files` : `${base}/files`;
}

// URL для директов
export function getDirectApiUrl(): string {
  const base = getBaseApiUrl();
  return base.includes('/api') ? `${base}/direct` : `${base}/direct`;
}

// URL для админки
export function getAdminApiUrl(): string {
  const base = getBaseApiUrl();
  return base.includes('/api') ? `${base}/admin` : `${base}/admin`;
}

// URL для пользователей (избранное, блокировка)
export function getUserApiUrl(): string {
  const base = getBaseApiUrl();
  return base.includes('/api') ? `${base}/user` : `${base}/user`;
}

// URL для push-уведомлений
export function getPushApiUrl(): string {
  const base = getBaseApiUrl();
  return base.includes('/api') ? `${base}/push` : `${base}/push`;
}

export function getSocketUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // Если это zrok.io домен или localhost:5175 (через nginx)
    if (hostname.includes('zrok.io') || port === '5175') {
      const baseUrl = `${protocol}//${hostname}${port ? ':' + port : ''}`;
      return baseUrl;
    }
    
    // Fallback на прямое подключение к бэкенду
    return 'http://localhost:4000';
  }
  
  return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
}

// Для удобства экспортируем готовые URL
export const API_URL = getChatApiUrl();
export const AUTH_API_URL = getAuthApiUrl();
export const FILES_API_URL = getFilesApiUrl();
export const DIRECT_API_URL = getDirectApiUrl();
export const ADMIN_API_URL = getAdminApiUrl();
export const USER_API_URL = getUserApiUrl();
export const SOCKET_URL = getSocketUrl();
