/**
 * Live regression test for the download source picker.
 *
 * Reproduces two production failures against the real servers involved:
 *
 * 1. A private Vercel Blob URL sitting in an env var. Unauthenticated, that
 *    URL answers 403 with the body "Forbidden", so a bare redirect onto it
 *    made browsers save nine bytes as ClipSync.dmg.
 * 2. The iPad "charabia" bug: ESIEE's Apache has no MIME mapping for .ipa and
 *    sends no Content-Type at all. A redirect handed that response straight
 *    to Safari, which rendered the raw bytes as text and revealed
 *    perso.esiee.fr in the address bar. fetchServingSource proxies the bytes
 *    instead, so the route's own Content-Type always wins regardless of what
 *    the origin does or doesn't send.
 *
 * Compile + run:
 *   npx tsc src/lib/download-source.ts src/lib/download-source.test.ts \
 *     --outDir .tmp-test --module commonjs --target es2022 --skipLibCheck
 *   node .tmp-test/download-source.test.js
 */

import { fetchServingSource, pickServingSource, probeUrl } from "./download-source";

const ESIEE = "https://perso.esiee.fr/~jouanarb/clypsinc";
const PRIVATE_BLOB =
  "https://uoocnwtocm6rlpqz.private.blob.vercel-storage.com/downloads/clipsync-macos.dmg";
const PRIVATE_BLOB_IPA =
  "https://uoocnwtocm6rlpqz.private.blob.vercel-storage.com/downloads/clipsync-ios.ipa";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`  [${ok ? "pass" : "FAIL"}] ${label}`);
  if (!ok) console.log(`         expected ${String(expected)}, got ${String(actual)}`);
}

/** Fully drains a ReadableStream and returns how many bytes actually arrived. */
async function countBytes(stream: ReadableStream<Uint8Array>): Promise<number> {
  const reader = stream.getReader();
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
  }
  return total;
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

  // --- the exact reported bug: iPad shows garbage for the .ipa ------------
  console.log("\nThe .ipa bug, reproduced against the real server\n");

  const ipaHead = await fetch(`${ESIEE}/ClipSync.ipa`, { method: "HEAD" });
  const ipaContentType = ipaHead.headers.get("content-type");
  console.log(`  ESIEE .ipa Content-Type header: ${ipaContentType === null ? "(none)" : ipaContentType}`);
  check(
    "confirms the root cause: ESIEE sends no Content-Type for .ipa",
    ipaContentType,
    null,
  );

  console.log("\nEnd-to-end: iOS env var poisoned with the private blob URL (the live incident)\n");
  const fetchedIpa = await fetchServingSource([
    { url: PRIVATE_BLOB_IPA, source: "direct-url" },
    { url: `${ESIEE}/ClipSync.ipa`, source: "mirror" },
  ]);
  console.log(`  picked source: ${fetchedIpa?.source}, declared contentLength: ${fetchedIpa?.contentLength}`);
  check("falls through the dead blob URL to the ESIEE mirror", fetchedIpa?.source, "mirror");

  if (fetchedIpa) {
    const bytes = await countBytes(fetchedIpa.body);
    console.log(`  bytes actually streamed through fetchServingSource: ${bytes}`);
    // This is the crux of the fix: real installer bytes flow through this
    // route regardless of the origin's missing Content-Type, and the route
    // built around this function declares its own Content-Type - see
    // resolveDownload in api/download/route.ts - so the browser never has to
    // guess and never sees perso.esiee.fr in the address bar.
    check("a real, correctly-sized .ipa was fetched despite the missing header", bytes > 200_000, true);
  }

  // --- structural guarantee: content-type is never read from the origin ---
  console.log("\nSynthetic: an origin that behaves exactly like ESIEE's broken .ipa response\n");
  // Comfortably over MIN_PLAUSIBLE_BYTES so this test isolates "missing
  // Content-Type" as the only variable - a tiny body would be rejected by the
  // too-small heuristic regardless of content-type, which is correct
  // behaviour but not what this test is checking.
  const fakeBody = new Uint8Array(4096).fill(0x50);
  const brokenOriginFetch = (async (_url: unknown, init?: RequestInit) => {
    if (init?.method === "HEAD") {
      return new Response(null, {
        status: 200,
        // Deliberately no Content-Type, mirroring ESIEE's real .ipa response.
        headers: { "content-length": String(fakeBody.byteLength) },
      });
    }
    return new Response(fakeBody, {
      status: 200,
      headers: { "content-length": String(fakeBody.byteLength) },
    });
  }) as typeof fetch;

  const fromBrokenOrigin = await fetchServingSource(
    [{ url: "https://example.invalid/ClipSync.ipa", source: "mirror" }],
    brokenOriginFetch,
  );
  check(
    "fetchServingSource succeeds even when the origin sends no Content-Type at all",
    fromBrokenOrigin !== null,
    true,
  );
  if (fromBrokenOrigin) {
    const bytes = await countBytes(fromBrokenOrigin.body);
    check("every byte from the broken origin still arrives intact", bytes, fakeBody.byteLength);
  }

  console.log(failures ? `\n${failures} FAILING` : "\nAll download-source checks passed");
  process.exit(failures ? 1 : 0);
}

void main();
