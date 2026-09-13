// Only ever redirect to a path inside this site. Anything else (full URLs,
// protocol-relative //evil.com, backslash tricks, or the auth routes
// themselves) falls back to a safe default. Used by the login page, the
// server actions, and the auth callback.
export function sanitizeNextPath(value: unknown, fallback: string = "/account"): string {
  if (typeof value !== "string" || value.length === 0) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.includes("\\")) return fallback;
  if (value.startsWith("/auth") || value === "/login" || value === "/signup") return fallback;
  return value;
}
