import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getAccountProfile } from "@/lib/entitlements";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";

// Bumped on every fix so a deployed build can be identified from the response
// headers (X-ClipSync-Download-Version) without guessing.
const ROUTE_VERSION = "1.0.2";

const HEAD_CHECK_TIMEOUT_MS = 4000;

type DownloadTarget = {
  filename: string;
  contentType: string;
  /** Private Vercel Blob path, streamed through this route when present. */
  blobPath?: string;
  /** Explicit override, set per environment in the Vercel dashboard. */
  directUrl?: string;
  /** Always-on mirror, verified live before it is ever used. */
  mirrorUrl: string;
};

const ESIEE_MIRROR = "https://perso.esiee.fr/~jouanarb/clypsinc";

const downloads: Record<string, DownloadTarget> = {
  windows: {
    filename: "ClipSync-windows.zip",
    contentType: "application/zip",
    blobPath: process.env.CLIPSYNC_WINDOWS_BLOB_PATH ?? "downloads/clipsync-windows.zip",
    directUrl: process.env.CLIPSYNC_WINDOWS_DOWNLOAD_URL,
    mirrorUrl: `${ESIEE_MIRROR}/ClipSync.zip`,
  },
  macos: {
    filename: "ClipSync-macos.dmg",
    contentType: "application/x-apple-diskimage",
    blobPath: process.env.CLIPSYNC_MACOS_BLOB_PATH ?? "downloads/clipsync-macos.dmg",
    directUrl: process.env.CLIPSYNC_MACOS_DOWNLOAD_URL,
    mirrorUrl: `${ESIEE_MIRROR}/ClipSync.dmg`,
  },
  android: {
    filename: "ClipSync-android.apk",
    contentType: "application/vnd.android.package-archive",
    blobPath: process.env.CLIPSYNC_ANDROID_BLOB_PATH ?? "downloads/clipsync-android.apk",
    directUrl: process.env.CLIPSYNC_ANDROID_DOWNLOAD_URL,
    mirrorUrl: `${ESIEE_MIRROR}/ClypSync.apk`,
  },
  ios: {
    filename: "ClipSync-ios.ipa",
    contentType: "application/octet-stream",
    blobPath: process.env.CLIPSYNC_IOS_BLOB_PATH ?? "downloads/clipsync-ios.ipa",
    directUrl: process.env.CLIPSYNC_IOS_DOWNLOAD_URL,
    mirrorUrl: `${ESIEE_MIRROR}/ClipSync.ipa`,
  },
};

type DownloadOs = keyof typeof downloads;

function isDownloadOs(os: string | null): os is DownloadOs {
  return os !== null && Object.prototype.hasOwnProperty.call(downloads, os);
}

/**
 * A URL is only usable if it is absolute http(s) AND currently serves a
 * non-empty body. An expired or rotated blob URL left behind in an env var
 * looks fine as a string but 302s the user onto a zero-byte download, which is
 * exactly how the macOS installer broke.
 */
async function isServing(rawUrl: string | undefined): Promise<boolean> {
  if (!rawUrl) return false;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEAD_CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const length = Number(res.headers.get("content-length") ?? "0");
    // Treat "no content-length" as usable (chunked), but never a declared zero.
    return !res.headers.has("content-length") || length > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function attachmentHeaders(target: DownloadTarget, source: string) {
  const headers = new Headers();
  headers.set("Content-Disposition", `attachment; filename="${target.filename}"`);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-ClipSync-Download-Version", ROUTE_VERSION);
  headers.set("X-ClipSync-Download-Source", source);
  return headers;
}

async function resolveDownload(os: DownloadOs, bodyWanted: boolean) {
  const target = downloads[os];

  // 1. Private blob, streamed through this route so the URL stays protected.
  if (target.blobPath) {
    try {
      const result = await get(target.blobPath, { access: "private" });
      if (result && result.statusCode === 200 && result.stream && result.blob.size > 0) {
        const headers = attachmentHeaders(target, "blob");
        headers.set("Content-Type", result.blob.contentType || target.contentType);
        // Without Content-Length the browser shows an unknown-size download and
        // some clients report 0 bytes. The blob metadata has it, so send it.
        headers.set("Content-Length", String(result.blob.size));
        return new NextResponse(bodyWanted ? result.stream : null, { headers });
      }
    } catch (error) {
      console.error(`Blob fetch failed for ${os} (${target.blobPath}):`, error);
    }
  }

  // 2. Environment override, then 3. the ESIEE mirror. Both are verified live
  //    before we hand the user a redirect.
  for (const [candidate, source] of [
    [target.directUrl, "direct-url"],
    [target.mirrorUrl, "mirror"],
  ] as const) {
    if (await isServing(candidate)) {
      const headers = attachmentHeaders(target, source);
      headers.set("Location", candidate as string);
      return new NextResponse(null, { status: 302, headers });
    }
  }

  console.error(`No working download source for ${os}`);
  return NextResponse.json(
    { error: "This download is not available yet" },
    { status: 404, headers: { "X-ClipSync-Download-Version": ROUTE_VERSION } },
  );
}

async function handle(request: NextRequest, bodyWanted: boolean) {
  const os = request.nextUrl.searchParams.get("os");
  if (!isDownloadOs(os)) {
    return NextResponse.json({ error: "Unknown download platform" }, { status: 400 });
  }

  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in to download ClipSync" }, { status: 401 });
  }

  const account = await getAccountProfile(user.uid);
  if (!account.purchased) {
    return NextResponse.json({ error: "Purchase required" }, { status: 403 });
  }

  return resolveDownload(os, bodyWanted);
}

export async function GET(request: NextRequest) {
  return handle(request, true);
}

export async function HEAD(request: NextRequest) {
  return handle(request, false);
}
