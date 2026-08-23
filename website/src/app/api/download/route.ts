import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getAccountProfile } from "@/lib/entitlements";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";

const downloads = {
  windows: { pathname: process.env.CLIPSYNC_WINDOWS_BLOB_PATH ?? "downloads/clipsync-windows.zip", filename: "ClipSync-windows.zip" },
  macos: { pathname: process.env.CLIPSYNC_MACOS_BLOB_PATH ?? "downloads/clipsync-macos.dmg", filename: "ClipSync-macos.dmg" },
  android: { pathname: process.env.CLIPSYNC_ANDROID_BLOB_PATH ?? "downloads/clipsync-android.apk", filename: "ClipSync-android.apk" },
  ios: { pathname: process.env.CLIPSYNC_IOS_BLOB_PATH ?? "downloads/clipsync-ios.ipa", filename: "ClipSync-ios.ipa" },
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

  const result = await get(downloads[os].pathname, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json({ error: "This download is not available yet" }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Content-Length": String(result.blob.size),
      "Content-Disposition": `attachment; filename="${downloads[os].filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
