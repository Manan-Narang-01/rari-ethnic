import { createContext, useContext, useEffect, useState } from "react";
import { api, ADMIN_TOKEN_KEY } from "@/lib/api";

const AuthContext = createContext(null);
const REFRESH_KEY = "rari_admin_refresh_token";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem(ADMIN_TOKEN_KEY, r.data.access_token);
    localStorage.setItem(REFRESH_KEY, r.data.refresh_token);
    setToken(r.data.access_token);
    setUser(r.data.user);
    return r.data;
  };

  const logout = () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      api.post("/auth/logout", { refresh_token: refreshToken }).catch(() => {});
    }
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
