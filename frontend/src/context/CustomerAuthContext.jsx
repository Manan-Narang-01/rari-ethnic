import { createContext, useContext, useEffect, useState } from "react";
import { api, CUSTOMER_TOKEN_KEY } from "@/lib/api";

const CustomerAuthContext = createContext(null);

export const CustomerAuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(CUSTOMER_TOKEN_KEY));
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/customer/me")
      .then((r) => setCustomer(r.data))
      .catch(() => {
        localStorage.removeItem(CUSTOMER_TOKEN_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  // credential = Google Identity Services ID token
  const loginWithGoogle = async (credential) => {
    const r = await api.post("/customer/google", { credential });
    localStorage.setItem(CUSTOMER_TOKEN_KEY, r.data.access_token);
    setToken(r.data.access_token);
    setCustomer(r.data.customer);
    return r.data.customer;
  };

  // Passwordless test login — only works when Google isn't configured yet.
  const devLogin = async (email, name) => {
    const r = await api.post("/customer/dev-login", { email, name });
    localStorage.setItem(CUSTOMER_TOKEN_KEY, r.data.access_token);
    setToken(r.data.access_token);
    setCustomer(r.data.customer);
    return r.data.customer;
  };

  const logout = () => {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    setToken(null);
    setCustomer(null);
  };

  return (
    <CustomerAuthContext.Provider
      value={{ token, customer, isAuthenticated: !!customer, loginWithGoogle, devLogin, logout, loading }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be inside CustomerAuthProvider");
  return ctx;
};
