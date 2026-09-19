/**
 * Security regression tests for the session-endpoint origin check.
 *
 * Compile + run:
 *   npx tsc src/lib/origin.ts src/lib/origin.test.ts --outDir .tmp-test \
 *     --module commonjs --target es2020 --skipLibCheck
 *   node .tmp-test/origin.test.js
 */

import { isAllowedOrigin } from "./origin";

const PROD_HOST = "everything-clipboard.online";

const cases: Array<[string, string | null, string, boolean]> = [
  // --- must be allowed -----------------------------------------------------
  ["no Origin header (same-origin form post)", null, PROD_HOST, true],
  ["production apex", `https://${PROD_HOST}`, PROD_HOST, true],
  ["production www subdomain", `https://www.${PROD_HOST}`, PROD_HOST, true],
  ["host header carries a port", `https://${PROD_HOST}`, `${PROD_HOST}:443`, true],
  ["vercel preview deployment", "https://website-git-abc123.vercel.app", PROD_HOST, true],
  ["local dev", "http://localhost:3000", "localhost:3000", true],
  ["local dev by IP", "http://127.0.0.1:3000", "127.0.0.1:3000", true],

  // --- the bypasses the old `includes()` check let through ------------------
  ["attacker host CONTAINING clipsync", "https://clipsync.evil.com", PROD_HOST, false],
  ["attacker host suffixed with clipsync", "https://evil-clipsync.net", PROD_HOST, false],
  ["attacker subdomain trick", "https://clipsync.attacker.co.uk", PROD_HOST, false],
  [
    "lookalike domain appending the real one",
    `https://${PROD_HOST}.evil.com`,
    PROD_HOST,
    false,
  ],
  ["wrong TLD that used to be allow-listed", "https://everything-clipboard.com", PROD_HOST, false],
  ["unrelated attacker origin", "https://evil.example", PROD_HOST, false],
  ["fake vercel host", "https://vercel.app.evil.com", PROD_HOST, false],
  ["malformed origin is rejected, not waved through", "not-a-url", PROD_HOST, false],
];

let failures = 0;
for (const [label, origin, host, expected] of cases) {
  const actual = isAllowedOrigin(origin, host);
  const ok = actual === expected;
  if (!ok) failures++;
  const verdict = ok ? "pass" : "FAIL";
  const shown = expected ? "allow" : "block";
  console.log(`  [${verdict}] ${shown.padEnd(5)} ${label}`);
  if (!ok) console.log(`         expected ${expected}, got ${actual}`);
}

console.log(
  `\n${cases.length - failures}/${cases.length} origin checks passed` +
    (failures ? ` — ${failures} FAILING` : ""),
);
process.exit(failures ? 1 : 0);
