import axios from "axios";

const configuredBackend = (process.env.REACT_APP_BACKEND_URL || "").trim().replace(/\/$/, "");
const BACKEND_URL = configuredBackend || (typeof window !== "undefined" ? window.location.origin : "");
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
    const isAuthRoute = original?.url?.includes("/auth/login") || original?.url?.includes("/auth/refresh");

    if (status === 401 && original && !original._retried && !isAuthRoute) {
      original._retried = true;
      try {
        refreshing ||= api.post("/auth/refresh").finally(() => {
          refreshing = null;
        });
        await refreshing;
        return api(original);
      } catch {
        // Session really expired. The calling screen will handle the 401.
      }
    }

    return Promise.reject(error);
  },
);

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Algo deu errado. Tente novamente.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const ICON_OPTIONS = [
  "Laptop", "KeyRound", "CalendarCheck", "Building2", "PackagePlus",
  "Wrench", "Users", "FileText", "ShoppingCart", "Truck", "Headphones",
  "Shield", "Database", "Mail", "Phone", "Settings",
];
