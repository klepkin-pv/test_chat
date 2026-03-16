import { API_URL } from './api';

// Универсальный клиент для API запросов
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_URL}${endpoint}`;
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// Для обратной совместимости - экспортируем функцию получения URL
export function getApiEndpoint(path: string): string {
  return `${API_URL}${path}`;
}
