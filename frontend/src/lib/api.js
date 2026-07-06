import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

export const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

export const WHATSAPP_NUMBER = "919316565117"; // no +
export const INSTAGRAM_URL = "https://www.instagram.com/rari.ethnic";

export const buildWaLink = (message) => {
  const text = encodeURIComponent(message || "Hi Rari Ethnic! I have a question.");
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
};
