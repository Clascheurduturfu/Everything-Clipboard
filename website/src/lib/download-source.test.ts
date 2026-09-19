/**
 * Live regression test for the download source picker.
 *
 * Reproduces the exact production failure: a private Vercel Blob URL sitting in
 * CLIPSYNC_MACOS_DOWNLOAD_URL. Unauthenticated, that URL answers 403 with the
 * body "Forbidden", so the old route's bare redirect made browsers save nine
 * bytes as ClipSync.dmg.
 *
 * Compile + run:
 *   npx tsc src/lib/download-source.ts src/lib/download-source.test.ts \
 *     --outDir .tmp-test --module commonjs --target es2022 --skipLibCheck
 *   node .tmp-test/download-source.test.js
 */

import { pickServingSource, probeUrl } from "./download-source";

const ESIEE = "https://perso.esiee.fr/~jouanarb/clypsinc";
const PRIVATE_BLOB =
  "https://uoocnwtocm6rlpqz.private.blob.vercel-storage.com/downloads/clipsync-macos.dmg";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`  [${ok ? "pass" : "FAIL"}] ${label}`);
  if (!ok) console.log(`         expected ${String(expected)}, got ${String(actual)}`);
}

async function main() {
  console.log("Probing real endpoints:\n");

  // --- the bug ------------------------------------------------------------
  const blobProbe = await probeUrl(PRIVATE_BLOB);
  console.log(
    `  private blob -> status=${blobProbe.status} ok=${blobProbe.ok} reason=${blobProbe.reason}`,
  );
  check("private blob URL is rejected (this was the 'nonsense' download)", blobProbe.ok, false);

  // --- the mirror ---------------------------------------------------------
  const dmg = await probeUrl(`${ESIEE}/ClipSync.dmg`);
  console.log(`  esiee dmg    -> status=${dmg.status} size=${dmg.size} ok=${dmg.ok}`);
  check("ESIEE macOS dmg is serving", dmg.ok, true);

  const ipa = await probeUrl(`${ESIEE}/ClipSync.ipa`);
  console.log(`  esiee ipa    -> status=${ipa.status} size=${ipa.size} ok=${ipa.ok}`);
  check("ESIEE iOS ipa is serving", ipa.ok, true);

  const zip = await probeUrl(`${ESIEE}/ClipSync.zip`);
  console.log(`  esiee zip    -> status=${zip.status} size=${zip.size} ok=${zip.ok}`);
  check("ESIEE windows zip is serving", zip.ok, true);

  const apk = await probeUrl(`${ESIEE}/ClypSync.apk`);
  console.log(`  esiee apk    -> status=${apk.status} size=${apk.size} ok=${apk.ok}`);
  check("ESIEE android apk is serving", apk.ok, true);

  // --- junk inputs --------------------------------------------------------
  check("missing env var is rejected", (await probeUrl(undefined)).ok, false);
  check("garbage string is rejected", (await probeUrl("not a url")).ok, false);
  check("non-http protocol is rejected", (await probeUrl("file:///etc/passwd")).ok, false);
  check("404 path is rejected", (await probeUrl(`${ESIEE}/does-not-exist.dmg`)).ok, false);

  // --- the actual fix -----------------------------------------------------
  console.log("\nEnd-to-end: env var poisoned with the private blob URL\n");
  const picked = await pickServingSource([
    { url: PRIVATE_BLOB, source: "direct-url" },
    { url: `${ESIEE}/ClipSync.dmg`, source: "mirror" },
  ]);
  console.log(`  picked source: ${picked?.source}`);
  check("falls through the dead URL to the working mirror", picked?.source, "mirror");

  console.log("\nEnd-to-end: every source dead\n");
  const none = await pickServingSource([
    { url: PRIVATE_BLOB, source: "direct-url" },
    { url: `${ESIEE}/nope.dmg`, source: "mirror" },
  ]);
  check("returns null so the route can 404 honestly", none, null);

  console.log(failures ? `\n${failures} FAILING` : "\nAll download-source checks passed");
  process.exit(failures ? 1 : 0);
}

void main();
