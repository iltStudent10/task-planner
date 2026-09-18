import axios, { AxiosHeaders, type AxiosInstance } from 'axios';
import type { AuthSession } from './types';

const AUTH_STORAGE_KEY = 'task-planner-session';

const api: AxiosInstance = axios.create({
  baseURL: '/api',
});

const readStoredSession = (): Partial<AuthSession> | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

api.interceptors.request.use((config) => {
  const session = readStoredSession();
  const token = session?.token;

  if (token) {
    const headers = config.headers instanceof AxiosHeaders ? config.headers : new AxiosHeaders(config.headers ?? {});
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export const saveStoredSession = (session: AuthSession | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

export const getStoredSession = () => readStoredSession();

export default api;
