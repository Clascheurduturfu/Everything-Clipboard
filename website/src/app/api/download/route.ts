import { NextRequest, NextResponse } from "next/server";
import { getAccountProfile } from "@/lib/entitlements";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";

const downloads = {
  windows: {
    url: process.env.CLIPSYNC_WINDOWS_DOWNLOAD_URL || "https://perso.esiee.fr/~jouanarb/clypsinc/ClipSync.zip",
    filename: "ClipSync-windows.zip",
  },
  macos: {
    url: process.env.CLIPSYNC_MACOS_DOWNLOAD_URL || "https://perso.esiee.fr/~jouanarb/clypsinc/ClipSync.dmg",
    filename: "ClipSync-macos.dmg",
  },
  android: {
    url: process.env.CLIPSYNC_ANDROID_DOWNLOAD_URL || "https://perso.esiee.fr/~jouanarb/clypsinc/ClypSync.apk",
    filename: "ClipSync-android.apk",
  },
  ios: {
    url: process.env.CLIPSYNC_IOS_DOWNLOAD_URL || "https://perso.esiee.fr/~jouanarb/clypsinc/ClipSync.ipa",
    filename: "ClipSync-ios.ipa",
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

  const downloadUrl = downloads[os].url;
  if (!downloadUrl) {
    return NextResponse.json({ error: "This download is not available yet" }, { status: 404 });
  }

  return NextResponse.redirect(downloadUrl, 302);
}
