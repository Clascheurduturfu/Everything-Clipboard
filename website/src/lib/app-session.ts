import { createHash, randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";

/**
 * Long-lived opaque sessions for the native apps. The Android app exchanges a
 * Google ID token once (POST /api/auth/android) and then sends
 * `Authorization: Bearer <token>`. Only a SHA-256 of the token is stored.
 */
const COLLECTION = "appSessions";
const TOKEN_PREFIX = "cs1_";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAppSession(uid: string, platform: string) {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  await getAdminDb().collection(COLLECTION).doc(hashToken(token)).set({
    uid,
    platform,
    createdAt: FieldValue.serverTimestamp(),
    lastSeenAt: FieldValue.serverTimestamp(),
  });
  return token;
}

function bearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(cs1_[A-Za-z0-9_-]{20,})$/.exec(header.trim());
  return match?.[1] ?? null;
}

export async function getAppSessionUid(request: NextRequest): Promise<string | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const ref = getAdminDb().collection(COLLECTION).doc(hashToken(token));
  const snapshot = await ref.get();
  const uid = snapshot.data()?.uid;
  if (typeof uid !== "string") return null;
  // Best effort; a failed timestamp update must not fail the request.
  ref.update({ lastSeenAt: FieldValue.serverTimestamp() }).catch(() => {});
  return uid;
}

export async function deleteAppSession(request: NextRequest) {
  const token = bearerToken(request);
  if (token) await getAdminDb().collection(COLLECTION).doc(hashToken(token)).delete();
}

export async function deleteAllAppSessions(uid: string) {
  const db = getAdminDb();
  const sessions = await db.collection(COLLECTION).where("uid", "==", uid).get();
  await Promise.all(sessions.docs.map((doc) => doc.ref.delete()));
}

/** UID from an app bearer session, falling back to the website session cookie. */
export async function getRequestUid(request: NextRequest): Promise<string | null> {
  const appUid = await getAppSessionUid(request);
  if (appUid) return appUid;
  if (request.headers.get("authorization")) return null;
  return (await getSessionUser(request))?.uid ?? null;
}

/**
 * Opaque per-user reference passed to Play Billing as obfuscatedAccountId, so a
 * purchase token can be tied back to the account that started the purchase.
 */
export function playAccountRef(uid: string) {
  return createHash("sha256").update(`clipsync-play:${uid}`).digest("hex");
}
