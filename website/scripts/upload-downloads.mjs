import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { put } from "@vercel/blob";

const root = resolve(import.meta.dirname, "..");
process.loadEnvFile(resolve(root, ".env.local"));
const downloads = [
  ["windows", "downloads/clipsync-windows.zip", "../desktop-client/build-output/windows/ClipSync.zip"],
  ["macos", "downloads/clipsync-macos.dmg", "../desktop-client/build-output/macos/ClipSync.dmg"],
  ["android", "downloads/clipsync-android.apk", "../android-app/ClypSync.apk"],
  ["ios", "downloads/clipsync-ios.ipa", "../ios-app/build/ClipSync-unsigned.ipa"],
];

const requestedPlatforms = new Set(process.argv.slice(2));
const selectedDownloads = requestedPlatforms.size
  ? downloads.filter(([platform]) => requestedPlatforms.has(platform))
  : downloads;

if (selectedDownloads.length === 0) {
  throw new Error(`Unknown platform. Use one of: ${downloads.map(([platform]) => platform).join(", ")}`);
}

for (const [, pathname, source] of selectedDownloads) {
  const file = await readFile(resolve(root, source));
  const blob = await put(pathname, file, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  console.log(`${pathname} -> ${blob.url}`);
}
