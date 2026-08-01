import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const AUTH_TOKEN_KEY = "rari_auth_token";
export const AUTH_REFRESH_KEY = "rari_auth_refresh_token";
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

export const api = axios.create({
  baseURL: API,
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
  const r = await api.post("/admin/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
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
