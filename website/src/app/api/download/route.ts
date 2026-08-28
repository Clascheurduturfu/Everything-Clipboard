import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getAccountProfile } from "@/lib/entitlements";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";

const downloads = {
  windows: {
    pathname: process.env.CLIPSYNC_WINDOWS_BLOB_PATH ?? "downloads/clipsync-windows.zip",
    filename: "ClipSync-windows.zip",
    contentType: "application/zip",
  },
  macos: {
    pathname: process.env.CLIPSYNC_MACOS_BLOB_PATH ?? "downloads/clipsync-macos.dmg",
    filename: "ClipSync-macos.dmg",
    contentType: "application/x-apple-diskimage",
  },
  android: {
    pathname: process.env.CLIPSYNC_ANDROID_BLOB_PATH ?? "downloads/clipsync-android.apk",
    filename: "ClipSync-android.apk",
    contentType: "application/vnd.android.package-archive",
  },
  ios: {
    pathname: process.env.CLIPSYNC_IOS_BLOB_PATH ?? "downloads/clipsync-ios.ipa",
    filename: "ClipSync-ios.ipa",
    contentType: "application/octet-stream",
  },
} as const;

type DownloadOs = keyof typeof downloads;

function isDownloadOs(os: string | null): os is DownloadOs {
  return os === "windows" || os === "macos" || os === "android" || os === "ios";
}

export async function GET(request: NextRequest) {
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

  const target = downloads[os];
  const result = await get(target.pathname, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json({ error: "This download is not available yet" }, { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", result.blob.contentType || target.contentType);
  headers.set("Content-Disposition", `attachment; filename="${target.filename}"`);
  headers.set("Cache-Control", "private, no-store");

  // Only set Content-Length if a valid non-zero size was returned by the storage provider
  if (result.blob.size && result.blob.size > 0) {
    headers.set("Content-Length", String(result.blob.size));
  }

  return new NextResponse(result.stream, { headers });
}
