import { NextRequest, NextResponse } from "next/server";
import { getAccountProfile } from "@/lib/entitlements";
import { getSessionUser } from "@/lib/session";

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
