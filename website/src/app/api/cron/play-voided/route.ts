import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { recomputeAccess } from "@/lib/access";
import { getAdminDb } from "@/lib/firebase-admin";
import { listVoidedPurchases, purchaseTokenKey } from "@/lib/google-play";

export const runtime = "nodejs";

/**
 * Daily Vercel Cron (see vercel.json): revokes Play purchases that Google
 * refunded or charged back. Looks 3 days back so one missed run is harmless.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const voided = await listVoidedPurchases(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const affected = new Set<string>();
  for (const item of voided) {
    const ref = db.collection("playPurchases").doc(purchaseTokenKey(item.purchaseToken));
    const snapshot = await ref.get();
    const data = snapshot.data();
    if (!data || data.state === "voided") continue;
    await ref.set({
      state: "voided",
      voidedReason: item.voidedReason ?? null,
      voidedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    affected.add(data.uid as string);
  }
  for (const uid of affected) await recomputeAccess(uid);

  return NextResponse.json({ checked: voided.length, revokedAccounts: affected.size });
}
