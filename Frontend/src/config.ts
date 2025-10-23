export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

export const BYPASS_AUTH =
  (import.meta.env.VITE_BYPASS_AUTH ?? "true").toLowerCase() === "true";
