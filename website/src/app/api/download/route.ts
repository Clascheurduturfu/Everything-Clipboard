import { get } from "@vercel/blob";
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
const ROUTE_VERSION = "1.0.3";

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
  //    Content-Type always comes from our own map, never from blob metadata -
  //    see the note on tiers 2/3 below for why an origin's own idea of its
  //    content type is not trusted here.
  if (target.blobPath) {
    try {
      const result = await get(target.blobPath, { access: "private" });
      if (result && result.statusCode === 200 && result.stream && result.blob.size > 0) {
        const headers = attachmentHeaders(target, "blob");
        headers.set("Content-Type", target.contentType);
        // Without Content-Length the browser shows an unknown-size download and
        // some clients report 0 bytes. The blob metadata has it, so send it.
        headers.set("Content-Length", String(result.blob.size));
        return new NextResponse(bodyWanted ? result.stream : null, { headers });
      }
    } catch (error) {
      console.error(`Blob fetch failed for ${os} (${target.blobPath}):`, error);
    }
  }

  // 2. Environment override, then 3. the ESIEE mirror - proxied through this
  //    route, never redirected to.
  //
  //    A redirect hands control of Content-Type, and the address bar, to the
  //    origin. ESIEE's Apache has no MIME mapping for .ipa and sends no
  //    Content-Type at all; combined with the nosniff header it also sends,
  //    that left Safari nothing to go on, so opening the link rendered the
  //    raw bytes as text instead of downloading them, while the address bar
  //    revealed perso.esiee.fr. .dmg/.zip/.apk happen to be mapped correctly
  //    there today, but this route no longer depends on that being true for
  //    any of them: fetching the bytes ourselves means our own
  //    Content-Type/Content-Disposition always win, and the mirror's raw URL
  //    never reaches the user.
  const candidates = [
    { url: target.directUrl, source: "direct-url" },
    { url: target.mirrorUrl, source: "mirror" },
  ];

  if (!bodyWanted) {
    // HEAD: confirm a source is currently serving without transferring it.
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
