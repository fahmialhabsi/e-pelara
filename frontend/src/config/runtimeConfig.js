const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");

const normalizeApiBaseUrl = () => {
  const raw =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "/api";

  return trimTrailingSlash(raw) || "/api";
};

const deriveSocketUrl = (apiBaseUrl) => {
  const explicitSocketUrl =
    import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_ORIGIN;

  if (explicitSocketUrl) {
    return trimTrailingSlash(explicitSocketUrl);
  }

  if (/^https?:\/\//i.test(apiBaseUrl)) {
    return trimTrailingSlash(apiBaseUrl.replace(/\/api$/i, ""));
  }

  if (import.meta.env.VITE_PROXY_TARGET) {
    return trimTrailingSlash(
      String(import.meta.env.VITE_PROXY_TARGET).replace(/\/api$/i, ""),
    );
  }

  if (typeof window !== "undefined") {
    return trimTrailingSlash(window.location.origin);
  }

  return "";
};

export const API_BASE_URL = normalizeApiBaseUrl();
export const SOCKET_URL = deriveSocketUrl(API_BASE_URL);
