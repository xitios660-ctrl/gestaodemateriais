import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const location = useLocation();
  const needsSession = location.pathname.startsWith("/admin");
  const checkedSession = useRef(false);
  const [user, setUser] = useState(null); // null = unknown, false = anon, object = user
  const [loading, setLoading] = useState(false);

  const checkSession = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!needsSession) {
      setUser((current) => (current === null ? false : current));
      return;
    }
    if (checkedSession.current) return;
    checkedSession.current = true;
    checkSession();
    // A single session probe is enough for the lifetime of this SPA mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsSession]);

  useEffect(() => {
    const expireSession = () => setUser(false);
    window.addEventListener("auth:expired", expireSession);
    return () => window.removeEventListener("auth:expired", expireSession);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    checkedSession.current = true;
    setUser(data);
    return data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
