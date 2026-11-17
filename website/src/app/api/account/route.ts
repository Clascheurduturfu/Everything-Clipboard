import { NextRequest, NextResponse } from "next/server";
import { deleteAllAppSessions, getAppSessionUid } from "@/lib/app-session";
import { getAccountProfile } from "@/lib/entitlements";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser, isSameOrigin } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ signedIn: false });
  }

  const account = await getAccountProfile(user.uid);
  return NextResponse.json({
    signedIn: true,
    displayName: account.displayName ?? user.name ?? null,
    email: account.email ?? user.email ?? null,
    purchased: account.purchased,
    latestOrderId: account.latestOrderId,
  });
}

/**
 * Deletes the ClipSync account (required by Google Play for apps that create
 * accounts). Stripe order records are kept for accounting; Play purchase
 * bindings are removed so the same Play purchase can be restored on a new account.
 */
export async function DELETE(request: NextRequest) {
  let uid = await getAppSessionUid(request);
  if (!uid && !request.headers.get("authorization")) {
    if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    uid = (await getSessionUser(request))?.uid ?? null;
  }
  if (!uid) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const db = getAdminDb();
  await deleteAllAppSessions(uid);
  const play = await db.collection("playPurchases").where("uid", "==", uid).get();
  await Promise.all(play.docs.map((doc) => doc.ref.delete()));
  await db.collection("users").doc(uid).delete();
  await getAdminAuth().deleteUser(uid).catch((error) => {
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
  });

  const response = NextResponse.json({ deleted: true });
  response.cookies.delete("clipsync_session");
  return response;
}
