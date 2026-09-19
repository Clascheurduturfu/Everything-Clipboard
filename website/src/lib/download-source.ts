/**
 * Download source resolution, kept free of Next.js imports so it can be tested.
 *
 * The failure this exists to prevent: private Vercel Blob URLs live on
 * *.private.blob.vercel-storage.com and answer an unauthenticated request with
 * `403 Forbidden` and the nine-byte body "Forbidden". When such a URL ends up
 * in CLIPSYNC_*_DOWNLOAD_URL, redirecting the user to it makes the browser
 * save those nine bytes as ClipSync.dmg - a download that looks like it
 * "returned nonsense" or weighed 0 MB.
 *
 * So a URL is never trusted because it parses; it has to prove it is currently
 * serving a real body before we hand a customer a redirect to it.
 */

export const HEAD_CHECK_TIMEOUT_MS = 4000;

/** Smallest plausible installer. Anything under this is an error page. */
export const MIN_PLAUSIBLE_BYTES = 1024;

export type SourceProbe = {
  ok: boolean;
  status?: number;
  size?: number;
  reason?: string;
};

export async function probeUrl(
  rawUrl: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<SourceProbe> {
  if (!rawUrl) return { ok: false, reason: "not-configured" };

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "not-a-url" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, reason: "bad-protocol" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEAD_CHECK_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      // This is the private-blob 403 case.
      return { ok: false, status: res.status, reason: "not-serving" };
    }

    const header = res.headers.get("content-length");
    if (header === null) {
      // Chunked or HEAD-less origin: allow it, we cannot do better cheaply.
      return { ok: true, status: res.status, reason: "no-content-length" };
    }

    const size = Number(header);
    if (!Number.isFinite(size) || size < MIN_PLAUSIBLE_BYTES) {
      return { ok: false, status: res.status, size, reason: "too-small" };
    }
    return { ok: true, status: res.status, size };
  } catch {
    return { ok: false, reason: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

export type Candidate = { url: string | undefined; source: string };

/** First candidate that is actually serving, in priority order. */
export async function pickServingSource(
  candidates: Candidate[],
  fetchImpl: typeof fetch = fetch,
): Promise<{ url: string; source: string } | null> {
  for (const candidate of candidates) {
    const probe = await probeUrl(candidate.url, fetchImpl);
    if (probe.ok && candidate.url) {
      return { url: candidate.url, source: candidate.source };
    }
  }
  return null;
}
