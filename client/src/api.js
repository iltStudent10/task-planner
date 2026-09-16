const AUTH_STORAGE_KEY = 'task-planner-session';

const readStoredSession = () => {
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

const getStoredToken = () => readStoredSession()?.token || '';

const saveStoredSession = (session) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

const createAuthHeaders = (token, headers = {}, body) => {
  const nextHeaders = { ...headers };

  if (body && !(body instanceof FormData) && !nextHeaders['Content-Type']) {
    nextHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    nextHeaders.Authorization = `Bearer ${token}`;
  }

  return nextHeaders;
};

const buildBearerToken = (token) => (token ? `Bearer ${token}` : '');

const requireToken = (token) => {
  if (!token) {
    throw new Error('Authentication required');
  }

  return token;
};

const resolveRequestToken = (token, auth) => {
  const explicitToken = String(token || '').trim();
  const storedToken = getStoredToken();
  const resolvedToken = explicitToken || storedToken;

  return auth ? requireToken(resolvedToken) : resolvedToken;
};

const requestJson = async (url, { token, auth = false, ...options } = {}) => {
  const headers = createAuthHeaders(resolveRequestToken(token, auth), options.headers, options.body);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
};

const parseJsonResponse = async (response) => {
  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export { AUTH_STORAGE_KEY, buildBearerToken, createAuthHeaders, getStoredToken, parseJsonResponse, readStoredSession, requestJson, requireToken, saveStoredSession };