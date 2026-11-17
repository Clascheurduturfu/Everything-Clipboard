import { NextRequest, NextResponse } from "next/server";
import { createAppSession, deleteAppSession, playAccountRef } from "@/lib/app-session";
import { createOrRefreshAccount, getAccountProfile } from "@/lib/entitlements";
import { resolveGoogleIdentity } from "@/lib/google-identity";

export const runtime = "nodejs";

/** Exchanges a Google ID token from Android Credential Manager for an app session. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { idToken?: unknown } | null;
  const idToken = typeof body?.idToken === "string" ? body.idToken : "";
  if (!idToken || idToken.length > 4096) {
    return NextResponse.json({ error: "idToken is required" }, { status: 400 });
  }

  let identity;
  try {
    identity = await resolveGoogleIdentity(idToken);
  } catch (error) {
    console.error("Android sign-in rejected:", (error as Error).message);
    return NextResponse.json({ error: "Google sign-in could not be verified" }, { status: 401 });
  }

  await createOrRefreshAccount(identity);
  const account = await getAccountProfile(identity.uid);
  const sessionToken = await createAppSession(identity.uid, "android");
  return NextResponse.json({
    sessionToken,
    email: account.email ?? identity.email,
    displayName: account.displayName ?? identity.displayName,
    paid: account.purchased,
    accountRef: playAccountRef(identity.uid),
  });
}

/** Signs this device out. */
export async function DELETE(request: NextRequest) {
  await deleteAppSession(request);
  return NextResponse.json({ signedOut: true });
}
