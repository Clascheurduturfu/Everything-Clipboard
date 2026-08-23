import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { createOrRefreshAccount } from "@/lib/entitlements";
import {
  isSameOrigin,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  try {
    const { idToken } = await request.json();

    if (typeof idToken !== "string") {
      return NextResponse.json({ error: "Missing Firebase ID token" }, { status: 400 });
    }

    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken, true);
    const signedInRecently = typeof decodedToken.auth_time === "number"
      && Date.now() / 1000 - decodedToken.auth_time < 5 * 60;

    if (!signedInRecently) {
      return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
    }
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });

    await createOrRefreshAccount({
      uid: decodedToken.uid,
      displayName: decodedToken.name,
      email: decodedToken.email,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Unable to create ClipSync session:", error);
    return NextResponse.json({ error: "Unable to sign in" }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });
  return response;
}
