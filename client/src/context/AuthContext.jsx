import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { parseJsonResponse, readStoredSession, requestJson, saveStoredSession } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const logout = () => {
    setUser(null);
    setToken('');
    saveStoredSession(null);
  };

  const login = (session) => {
    setUser(session?.user || null);
    setToken(session?.token || '');
    saveStoredSession(session?.token && session?.user ? session : null);
  };

  useEffect(() => {
    const bootstrap = async () => {
      const storedSession = readStoredSession();

      if (!storedSession?.token) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const response = await requestJson('/api/auth/me', {
          method: 'GET',
          token: storedSession.token,
          auth: true,
        });

        if (!response.ok) {
          throw new Error('Authentication failed');
        }

        const body = await parseJsonResponse(response);
        login({ token: storedSession.token, user: body.user });
      } catch {
        logout();
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrap();
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      isBootstrapping,
      login,
      logout,
    }),
    [user, token, isBootstrapping],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};