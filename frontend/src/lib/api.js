import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const AUTH_TOKEN_KEY = "rari_auth_token";
export const AUTH_REFRESH_KEY = "rari_auth_refresh_token";
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

export const api = axios.create({
  baseURL: API,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

// One identity, one token, for the whole app (customer and staff alike).
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

// Endpoints that issue or don't require a session -- a 401 here means bad
// credentials/an invalid one-time code, never an expired access token, so
// they're excluded from the refresh-and-retry flow below.
const AUTH_BOOTSTRAP_PATHS = [
  "/auth/login", "/auth/register", "/auth/verify-otp", "/auth/resend-otp",
  "/auth/refresh", "/auth/logout", "/auth/forgot-password", "/auth/reset-password",
  "/customer/google", "/customer/dev-login",
];

let refreshPromise = null;

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem(AUTH_REFRESH_KEY);
  if (!refreshToken) throw new Error("No refresh token available");
  const r = await axios.post(`${API}/auth/refresh`, { refresh_token: refreshToken });
  localStorage.setItem(AUTH_TOKEN_KEY, r.data.access_token);
  localStorage.setItem(AUTH_REFRESH_KEY, r.data.refresh_token);
  return r.data.access_token;
};

// Access tokens are short-lived; without this, any session outlasting the
// token's lifetime (e.g. a slow checkout, or an admin idle for a while) hit a
// bare 401 with no recovery -- the refresh endpoint already existed on the
// backend but nothing ever called it. On a 401 for an authenticated request,
// try exactly once to refresh and replay it; if that fails, clear the stored
// session and let the app's existing route guards redirect to /login.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isBootstrapPath = config && AUTH_BOOTSTRAP_PATHS.some((p) => config.url?.startsWith(p));
    if (response?.status === 401 && config && !config._retriedAfterRefresh && !isBootstrapPath && localStorage.getItem(AUTH_REFRESH_KEY)) {
      config._retriedAfterRefresh = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
        }
        const newToken = await refreshPromise;
        config.headers.Authorization = `Bearer ${newToken}`;
        return api(config);
      } catch (refreshError) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_REFRESH_KEY);
        window.dispatchEvent(new Event("rari:session-expired"));
      }
    }
    return Promise.reject(error);
  }
);

export const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

// Uploads a single image via the admin endpoint and returns a browser-usable URL.
export const uploadImage = async (file) => {
  const fd = new FormData();
  fd.append("file", file);
  // Overrides the shared 20s default -- a 10MB image on a slow connection can
  // legitimately take longer than that to upload.
  const r = await api.post("/admin/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });
  return r.data.url.startsWith("http")
    ? r.data.url
    : `${API}${r.data.url.replace(/^\/api/, "")}`;
};

export const WHATSAPP_NUMBER = "917600565117"; // no +
export const INSTAGRAM_URL = "https://www.instagram.com/rari.ethnic";

export const buildWaLink = (message) => {
  const text = encodeURIComponent(message || "Hi Rari Ethnic! I have a question.");
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
};
