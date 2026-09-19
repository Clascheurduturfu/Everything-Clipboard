import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "@/lib/firebase-admin";
import { isAllowedOrigin } from "@/lib/origin";

export const SESSION_COOKIE_NAME = "clipsync_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export async function getSessionUser(request?: NextRequest): Promise<DecodedIdToken | null> {
  const sessionCookie = request
    ? request.cookies.get(SESSION_COOKIE_NAME)?.value
    : (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    return await getAdminAuth().verifySessionCookie(sessionCookie, true);
  } catch {
    return null;
  }
}

export async function requireSessionUser(request: NextRequest) {
  const user = await getSessionUser(request);

  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }

  return user;
}

/**
 * Hosts allowed to POST to the session endpoints live in `@/lib/origin`, which
 * is kept free of Next.js imports so the CSRF rules can be unit-tested.
 */
export function isSameOrigin(request: NextRequest) {
  const requestHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.host;

  return isAllowedOrigin(request.headers.get("origin"), requestHost);
}
