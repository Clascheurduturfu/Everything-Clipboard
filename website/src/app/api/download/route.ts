import { get, head } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getAccountProfile } from "@/lib/entitlements";
import { fetchServingSource, pickServingSource } from "@/lib/download-source";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
// Proxying a mirror's bytes (up to ~45MB for Windows) through this function
// can take longer than the platform default on a slow origin. Vercel caps
// this to whatever the project's plan actually allows either way.
export const maxDuration = 60;

// Bumped on every fix so a deployed build can be identified from the response
// headers (X-ClipSync-Download-Version) without guessing.
const ROUTE_VERSION = "1.0.6";

type DownloadTarget = {
  filename: string;
  contentType: string;
  /** Tier 1: Private Vercel Blob path, streamed through this route when present. */
  blobPath: string;
  /** Tier 2: Always-on ESIEE mirror fallback, proxied through this route. */
  mirrorUrl: string;
};

const ESIEE_MIRROR = "https://perso.esiee.fr/~jouanarb/clypsinc";

const downloads: Record<string, DownloadTarget> = {
  windows: {
    filename: "ClipSync-windows.zip",
    contentType: "application/zip",
    blobPath: "downloads/clipsync-windows.zip",
    mirrorUrl: `${ESIEE_MIRROR}/ClipSync.zip`,
  },
  macos: {
    filename: "ClipSync-macos.dmg",
    contentType: "application/x-apple-diskimage",
    blobPath: "downloads/clipsync-macos.dmg",
    mirrorUrl: `${ESIEE_MIRROR}/ClipSync.dmg`,
  },
  android: {
    filename: "ClipSync-android.apk",
    contentType: "application/vnd.android.package-archive",
    blobPath: "downloads/clipsync-android.apk",
    mirrorUrl: `${ESIEE_MIRROR}/ClypSync.apk`,
  },
  ios: {
    filename: "ClipSync-ios.ipa",
    contentType: "application/octet-stream",
    blobPath: "downloads/clipsync-ios.ipa",
    mirrorUrl: `${ESIEE_MIRROR}/ClipSync.ipa`,
  },
};

type DownloadOs = keyof typeof downloads;

function isDownloadOs(os: string | null): os is DownloadOs {
  return os !== null && Object.prototype.hasOwnProperty.call(downloads, os);
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

  // Tier 1: Private Vercel Blob, streamed through this route so the URL stays protected.
  // Note: For application/octet-stream blobs (.dmg and .ipa), Vercel's CDN uses chunked
  // transfer on GET and omits Content-Length, so `result.blob.size` is reported as 0
  // even when the stream contains the full file. We resolve the real size via `head()`.
  if (target.blobPath) {
    try {
      const result = await get(target.blobPath, { access: "private" });
      if (result && result.statusCode === 200 && result.stream) {
        let blobSize = result.blob.size;
        if (!blobSize || blobSize <= 0) {
          try {
            const meta = await head(target.blobPath);
            blobSize = meta.size;
          } catch {
            // If head() fails, still stream the valid body if present.
          }
        }
        const headers = attachmentHeaders(target, "blob");
        headers.set("Content-Type", target.contentType);
        if (blobSize > 0) {
          headers.set("Content-Length", String(blobSize));
        }
        if (!bodyWanted) {
          await result.stream.cancel();
          return new NextResponse(null, { headers });
        }
        return new NextResponse(result.stream, { headers });
      }
    } catch (error) {
      console.error(`Blob fetch failed for ${os} (${target.blobPath}):`, error);
    }
  }

  // Tier 2: ESIEE mirror fallback when private Blob is unavailable.
  const candidates = [
    { url: target.mirrorUrl, source: "mirror" },
  ];

  if (!bodyWanted) {
    const serving = await pickServingSource(candidates);
    if (serving) {
      const headers = attachmentHeaders(target, serving.source);
      headers.set("Content-Type", target.contentType);
      return new NextResponse(null, { headers });
    }
  } else {
    const fetched = await fetchServingSource(candidates);
    if (fetched) {
      const headers = attachmentHeaders(target, fetched.source);
      headers.set("Content-Type", target.contentType);
      if (fetched.contentLength !== null) {
        headers.set("Content-Length", String(fetched.contentLength));
      }
      return new NextResponse(fetched.body, { headers });
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
