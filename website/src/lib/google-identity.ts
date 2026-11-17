import { randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { getAdminAuth } from "@/lib/firebase-admin";

export type GoogleIdentity = { uid: string; email: string | null; displayName: string | null };

function webClientId() {
  const id = (process.env.GOOGLE_WEB_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "")
    .replace(/[﻿\r\n\t ]/g, "");
  if (!id) throw new Error("GOOGLE_WEB_CLIENT_ID is not configured");
  return id;
}

let client: OAuth2Client | null = null;

/**
 * Verifies a Google ID token from Android Credential Manager (audience = the
 * website's web OAuth client) and resolves the SAME Firebase UID the website
 * uses for that Google account, creating the Firebase user when it is new.
 */
export async function resolveGoogleIdentity(idToken: string): Promise<GoogleIdentity> {
  client ??= new OAuth2Client();
  const ticket = await client.verifyIdToken({ idToken, audience: webClientId() });
  const payload = ticket.getPayload();
  if (!payload?.sub) throw new Error("INVALID_TOKEN");
  const email = payload.email_verified ? payload.email ?? null : null;
  const displayName = payload.name ?? null;
  const auth = getAdminAuth();

  try {
    const user = await auth.getUserByProviderUid("google.com", payload.sub);
    return { uid: user.uid, email: user.email ?? email, displayName: user.displayName ?? displayName };
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
  }

  // Importing with google.com provider data makes a later website sign-in with
  // the same Google account land on this exact user.
  const uid = randomBytes(14).toString("hex");
  const result = await auth.importUsers([{
    uid,
    email: email ?? undefined,
    emailVerified: Boolean(email),
    displayName: displayName ?? undefined,
    providerData: [{ uid: payload.sub, providerId: "google.com", email: email ?? undefined, displayName: displayName ?? undefined }],
  }]);
  if (result.failureCount > 0) {
    // A concurrent sign-in may have created it first.
    const user = await auth.getUserByProviderUid("google.com", payload.sub);
    return { uid: user.uid, email: user.email ?? email, displayName: user.displayName ?? displayName };
  }
  return { uid, email, displayName };
}
