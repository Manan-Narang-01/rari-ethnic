import { createContext, useContext, useEffect, useState } from "react";
import { api, AUTH_TOKEN_KEY, AUTH_REFRESH_KEY } from "@/lib/api";

export const STAFF_ROLES = ["admin", "super_admin"];
export const isStaffRole = (role) => STAFF_ROLES.includes(role);

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY));
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
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_REFRESH_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Fired by lib/api.js when a 401 survives a refresh attempt (refresh token
  // missing/expired/revoked) -- clears session state so isAuthenticated flips
  // to false and the existing per-page guards (AdminLayout, Account, etc.)
  // redirect to /login on their own, same as any other logged-out visit.
  useEffect(() => {
    const onSessionExpired = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener("rari:session-expired", onSessionExpired);
    return () => window.removeEventListener("rari:session-expired", onSessionExpired);
  }, []);

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem(AUTH_TOKEN_KEY, r.data.access_token);
    localStorage.setItem(AUTH_REFRESH_KEY, r.data.refresh_token);
    setToken(r.data.access_token);
    setUser(r.data.user);
    return r.data.user;
  };

  // Registration no longer logs the user in directly -- the backend creates
  // an unverified account and emails an OTP; sign-in only happens once
  // verifyOtp() succeeds. Returns {message, email}.
  const register = async (name, email, password, phone) => {
    const r = await api.post("/auth/register", { name, email, password, phone });
    return r.data;
  };

  const verifyOtp = async (email, code) => {
    const r = await api.post("/auth/verify-otp", { email, code });
    localStorage.setItem(AUTH_TOKEN_KEY, r.data.access_token);
    localStorage.setItem(AUTH_REFRESH_KEY, r.data.refresh_token);
    setToken(r.data.access_token);
    setUser(r.data.user);
    return r.data.user;
  };

  const resendOtp = async (email) => {
    const r = await api.post("/auth/resend-otp", { email });
    return r.data.message;
  };

  // credential = Google Identity Services ID token. Always resolves to
  // role="customer" for brand-new signups; an existing admin/super_admin
  // signing in with their Google-linked email keeps their existing role.
  const loginWithGoogle = async (credential) => {
    const r = await api.post("/customer/google", { credential });
    localStorage.setItem(AUTH_TOKEN_KEY, r.data.access_token);
    localStorage.setItem(AUTH_REFRESH_KEY, r.data.refresh_token);
    setToken(r.data.access_token);
    setUser(r.data.customer);
    return r.data.customer;
  };

  // Passwordless test login — only works when Google isn't configured yet.
  const devLogin = async (email, name) => {
    const r = await api.post("/customer/dev-login", { email, name });
    localStorage.setItem(AUTH_TOKEN_KEY, r.data.access_token);
    localStorage.setItem(AUTH_REFRESH_KEY, r.data.refresh_token);
    setToken(r.data.access_token);
    setUser(r.data.customer);
    return r.data.customer;
  };

  const forgotPassword = async (email) => {
    const r = await api.post("/auth/forgot-password", { email });
    return r.data.message;
  };

  const resetPassword = async (token_, newPassword) => {
    await api.post("/auth/reset-password", { token: token_, new_password: newPassword });
  };

  const logout = () => {
    const refreshToken = localStorage.getItem(AUTH_REFRESH_KEY);
    if (refreshToken) {
      api.post("/auth/logout", { refresh_token: refreshToken }).catch(() => {});
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!user,
        login,
        register,
        verifyOtp,
        resendOtp,
        loginWithGoogle,
        devLogin,
        forgotPassword,
        resetPassword,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
