import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { recomputeAccess } from "@/lib/access";
import { getRequestUid, playAccountRef } from "@/lib/app-session";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  acknowledgeProductPurchase,
  getProductPurchase,
  PLAY_LIFETIME_PRODUCT,
  purchaseTokenKey,
} from "@/lib/google-play";

export const runtime = "nodejs";

/**
 * The app sends every Play purchase it sees (new or restored). Google is the
 * source of truth: the token is looked up server-side, bound to the first
 * account that verifies it, then acknowledged. A lifetime unlock is never consumed.
 */
export async function POST(request: NextRequest) {
  const uid = await getRequestUid(request);
  if (!uid) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const body = await request.json().catch(() => null) as { purchaseToken?: unknown; productId?: unknown } | null;
  const token = typeof body?.purchaseToken === "string" ? body.purchaseToken : "";
  const productId = typeof body?.productId === "string" ? body.productId : "";
  if (!token || token.length > 2048 || productId !== PLAY_LIFETIME_PRODUCT) {
    return NextResponse.json({ error: "Unknown purchase" }, { status: 400 });
  }

  let purchase;
  try {
    purchase = await getProductPurchase(productId, token);
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status === 400 || status === 404 || status === 410) {
      return NextResponse.json({ error: "Google does not recognise this purchase" }, { status: 400 });
    }
    console.error("Play purchase lookup failed:", (error as Error).message);
    return NextResponse.json({ error: "Google Play is unavailable, try again later" }, { status: 503 });
  }

  if (purchase.purchaseState === 2) return NextResponse.json({ status: "pending", paid: false });
  if (purchase.purchaseState !== 0) return NextResponse.json({ status: "cancelled", paid: false });

  // Purchases started in the app carry our account reference; promo-code
  // redemptions made in the Play Store do not, and bind to whoever claims them first.
  const ref = purchase.obfuscatedExternalAccountId;
  if (ref && ref !== playAccountRef(uid)) {
    return NextResponse.json({ status: "other_account", paid: false,
      error: "This Google Play purchase belongs to another ClipSync account." }, { status: 409 });
  }

  const db = getAdminDb();
  const docRef = db.collection("playPurchases").doc(purchaseTokenKey(token));
  const outcome = await db.runTransaction(async (transaction) => {
    const existing = (await transaction.get(docRef)).data();
    if (existing && existing.uid !== uid) return "other_account";
    if (existing?.state === "voided") return "voided";
    transaction.set(docRef, {
      uid,
      productId,
      orderId: purchase.orderId ?? null,
      state: "active",
      test: purchase.purchaseType === 0,
      purchaseTimeMillis: purchase.purchaseTimeMillis ? Number(purchase.purchaseTimeMillis) : null,
      verifiedAt: FieldValue.serverTimestamp(),
      createdAt: existing?.createdAt ?? FieldValue.serverTimestamp(),
    }, { merge: true });
    return "active";
  });

  if (outcome === "other_account") {
    return NextResponse.json({ status: "other_account", paid: false,
      error: "This Google Play purchase belongs to another ClipSync account." }, { status: 409 });
  }
  if (outcome === "voided") return NextResponse.json({ status: "voided", paid: false });

  const paid = await recomputeAccess(uid);

  // Unacknowledged purchases are refunded by Google after 3 days. If this
  // fails, the app re-sends the purchase on its next start and we retry.
  if (purchase.acknowledgementState !== 1) {
    await acknowledgeProductPurchase(productId, token).catch((error) =>
      console.error("Play acknowledgement failed (will retry on next verify):", (error as Error).message));
  }

  return NextResponse.json({ status: "active", paid });
}
