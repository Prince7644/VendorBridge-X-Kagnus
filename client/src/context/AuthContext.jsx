import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/authApi';
import { ensureCsrf, setCsrfToken, setUnauthorizedHandler } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const apply = useCallback((payload) => {
    setUser(payload.user);
    setPermissions(payload.permissions);
  }, []);

  const clear = useCallback(() => {
    setUser(null);
    setPermissions([]);
  }, []);

  // Restore the session (if the cookie is still valid) on first load.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await ensureCsrf();
        const res = await authApi.me();
        if (active) apply(res.data.data);
      } catch {
        /* not signed in - that is fine */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [apply]);

  useEffect(() => {
    setUnauthorizedHandler(() => { clear(); setSessionExpired(true); });
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    setCsrfToken(res.data.data.csrfToken);
    setSessionExpired(false);
    apply(res.data.data);
  }, [apply]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clear();
      setSessionExpired(false);
      setCsrfToken(null);
      ensureCsrf(true).catch(() => {});
    }
  }, [clear]);

  const value = useMemo(
    () => ({ user, loading, sessionExpired, login, logout, can: (p) => permissions.includes(p) }),
    [user, loading, sessionExpired, login, logout, permissions]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
