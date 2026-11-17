import { createHash } from "node:crypto";
import { JWT } from "google-auth-library";

export const PLAY_PACKAGE = "com.clipsync";
export const PLAY_LIFETIME_PRODUCT = "clipsync_lifetime";
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PLAY_PACKAGE}`;

/** Firestore key for a purchase token; the token itself is never stored. */
export function purchaseTokenKey(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

let jwt: JWT | null = null;

function client() {
  // A dedicated Play service account, or the Firebase Admin one once it is
  // granted "View financial data / Manage orders" in Play Console.
  const email = process.env.GOOGLE_PLAY_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const key = (process.env.GOOGLE_PLAY_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY)?.replace(/\\n/g, "\n");
  if (!email || !key) throw new Error("Google Play API credentials are not configured");
  jwt ??= new JWT({ email, key, scopes: ["https://www.googleapis.com/auth/androidpublisher"] });
  return jwt;
}

async function call<T>(path: string, method: "GET" | "POST" = "GET"): Promise<T> {
  const response = await client().request<T>({ url: `${API}${path}`, method });
  return response.data;
}

/** https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products */
export type ProductPurchase = {
  purchaseState?: number; // 0 purchased, 1 cancelled, 2 pending
  acknowledgementState?: number; // 0 not yet, 1 acknowledged
  orderId?: string;
  purchaseTimeMillis?: string;
  obfuscatedExternalAccountId?: string;
  quantity?: number;
  regionCode?: string;
  purchaseType?: number; // 0 test (license tester), 1 promo, 2 rewarded
};

export function getProductPurchase(productId: string, token: string) {
  return call<ProductPurchase>(`/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}`);
}

export function acknowledgeProductPurchase(productId: string, token: string) {
  return call<void>(`/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:acknowledge`, "POST");
}

type VoidedPage = {
  voidedPurchases?: { purchaseToken: string; orderId?: string; voidedTimeMillis?: string; voidedReason?: number }[];
  tokenPagination?: { nextPageToken?: string };
};

/** Refunded, cancelled or charged-back purchases voided since `sinceMillis` (max 30 days back). */
export async function listVoidedPurchases(sinceMillis: number) {
  const voided: NonNullable<VoidedPage["voidedPurchases"]> = [];
  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams({ startTime: String(sinceMillis), maxResults: "1000" });
    if (pageToken) query.set("token", pageToken);
    const page = await call<VoidedPage>(`/purchases/voidedpurchases?${query}`);
    voided.push(...(page.voidedPurchases ?? []));
    pageToken = page.tokenPagination?.nextPageToken;
  } while (pageToken);
  return voided;
}
