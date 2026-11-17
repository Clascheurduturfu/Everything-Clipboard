import { NextRequest, NextResponse } from "next/server";
import { getRequestUid, playAccountRef } from "@/lib/app-session";
import { getAccountProfile } from "@/lib/entitlements";

export const runtime = "nodejs";

/** Access status for the native apps (bearer session) and the website (cookie). */
export async function GET(request: NextRequest) {
  const uid = await getRequestUid(request);
  if (!uid) return NextResponse.json({ signedIn: false, paid: false }, { status: 401 });

  const account = await getAccountProfile(uid);
  return NextResponse.json({
    signedIn: true,
    email: account.email,
    displayName: account.displayName,
    paid: account.purchased,
    accountRef: playAccountRef(uid),
  });
}
