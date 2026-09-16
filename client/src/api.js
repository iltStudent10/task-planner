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

const parseJsonResponse = async (response) => {
  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export { AUTH_STORAGE_KEY, createAuthHeaders, parseJsonResponse, readStoredSession, saveStoredSession };