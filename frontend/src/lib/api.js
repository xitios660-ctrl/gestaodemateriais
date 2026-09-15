import axios from "axios";

const configuredBackend = (process.env.REACT_APP_BACKEND_URL || "")
  .trim()
  .replace(/\/$/, "");
const BACKEND_URL =
  configuredBackend ||
  (typeof window !== "undefined" ? window.location.origin : "");
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

let refreshing = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthRoute =
      original?.url?.includes("/auth/login") ||
      original?.url?.includes("/auth/refresh");

    if (status === 401 && original && !original._retried && !isAuthRoute) {
      original._retried = true;
      try {
        refreshing ||= api.post("/auth/refresh").finally(() => {
          refreshing = null;
        });
        await refreshing;
        return api(original);
      } catch {
        // The provider owns initial session probes and ignores obsolete results.
        // A slow anonymous probe must not expire a subsequent successful login.
        if (typeof window !== "undefined" && !original._sessionProbe) {
          window.dispatchEvent(new Event("auth:expired"));
        }
      }
    }

    return Promise.reject(error);
  },
);

export function formatApiErrorDetail(detail) {
  const fallback = "Não foi possível concluir a ação. Tente novamente.";
  if (detail == null) return fallback;
  if (typeof detail === "string") {
    const clean = detail.trim();
    return clean && clean.length <= 280 ? clean : fallback;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        item && typeof item.msg === "string" ? item.msg.trim() : "",
      )
      .filter(Boolean)
      .slice(0, 3);
    return messages.length ? messages.join(" ") : fallback;
  }
  if (detail && typeof detail.msg === "string") {
    const clean = detail.msg.trim();
    return clean && clean.length <= 280 ? clean : fallback;
  }
  return fallback;
}

export const ICON_OPTIONS = [
  "Laptop",
  "KeyRound",
  "CalendarCheck",
  "Building2",
  "PackagePlus",
  "Wrench",
  "Users",
  "FileText",
  "ShoppingCart",
  "Truck",
  "Headphones",
  "Shield",
  "Database",
  "Mail",
  "Phone",
  "Settings",
];
