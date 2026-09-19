/**
 * Pure origin allow-listing, kept free of Next.js imports so it can be tested
 * directly.
 *
 * History: the previous check used `originHost.includes("clipsync")`, so any
 * attacker-controlled host containing that substring (clipsync.evil.com,
 * evil-clipsync.net) passed the CSRF gate. It also allow-listed
 * `everything-clipboard.com`, which is not the product's domain - the real one
 * is `everything-clipboard.online`.
 */

export const ALLOWED_ORIGIN_HOSTS = [
  "everything-clipboard.online",
  "clipsync.vercel.app",
  "localhost",
  "127.0.0.1",
] as const;

/** Exact host, or a genuine subdomain of it. Never a substring match. */
export function hostMatches(originHost: string, allowed: string): boolean {
  return originHost === allowed || originHost.endsWith(`.${allowed}`);
}

/** Strip the port so a bare `origin` hostname is comparable to a `Host` header. */
export function normalizeHost(rawHost: string): string {
  return rawHost.toLowerCase().replace(/:\d+$/, "");
}

export function isAllowedOrigin(origin: string | null, requestHost: string): boolean {
  // Same-origin form posts and server-to-server calls send no Origin header.
  if (!origin) return true;

  let originHost: string;
  try {
    originHost = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }

  if (originHost === normalizeHost(requestHost)) return true;

  // Vercel preview deployments get a generated *.vercel.app hostname.
  if (originHost.endsWith(".vercel.app")) return true;

  return ALLOWED_ORIGIN_HOSTS.some((allowed) => hostMatches(originHost, allowed));
}
