import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "@/lib/firebase-admin";

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

export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    const originHost = new URL(origin).host.toLowerCase();
    const host = (
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      request.nextUrl.host
    ).toLowerCase();

    if (originHost === host) return true;
    if (
      originHost.endsWith(".vercel.app") ||
      originHost.includes("everything-clipboard.com") ||
      originHost.includes("clipsync") ||
      originHost.startsWith("localhost") ||
      originHost.startsWith("127.0.0.1")
    ) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}
