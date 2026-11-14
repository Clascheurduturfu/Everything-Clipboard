import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getStripe, getPaidCheckoutSession } from "@/lib/stripe";

export type AccountProfile = {
  uid: string;
  displayName: string | null;
  email: string | null;
  purchased: boolean;
  latestOrderId: string | null;
  purchasedAt: Date | null;
  /** When the explicit Stripe recovery lookup last ran for this user. */
  recoveryCheckedAt: Date | null;
};

/**
 * One Firestore read. This sits on the hot path (every /api/account call and
 * every download), so it must not call out to anything else. The Stripe
 * webhook and `fulfillCheckoutSession` are what grant access.
 */
export async function getAccountProfile(uid: string): Promise<AccountProfile> {
  const snapshot = await getAdminDb().collection("users").doc(uid).get();
  const data = snapshot.data();

  return {
    uid,
    displayName: data?.displayName ?? null,
    email: data?.email ?? null,
    purchased: data?.purchased === true,
    latestOrderId: data?.latestOrderId ?? null,
    purchasedAt: data?.purchasedAt?.toDate?.() ?? null,
    recoveryCheckedAt: data?.recoveryCheckedAt?.toDate?.() ?? null,
  };
}

const RECOVERY_COOLDOWN_MS = 10 * 60 * 1000;

/**
 * Explicit, rare recovery path for "I paid but my account says unlicensed",
 * e.g. the webhook was delayed or misconfigured. Only the /account page calls
 * this, and only for a user who is not marked as purchased.
 *
 * It looks up Checkout Sessions by the customer's email (a server-side filter,
 * so it does not depend on how recent the payment is) and only accepts a paid
 * session that was created for this exact Firebase uid. Runs at most once per
 * cooldown window per user. Returns the updated profile.
 */
export async function recoverPurchaseFromStripe(profile: AccountProfile): Promise<AccountProfile> {
  if (profile.purchased || !profile.email) return profile;

  const now = Date.now();
  if (profile.recoveryCheckedAt && now - profile.recoveryCheckedAt.getTime() < RECOVERY_COOLDOWN_MS) {
    return profile;
  }

  const userRef = getAdminDb().collection("users").doc(profile.uid);
  try {
    // Record the attempt first so a slow or failing Stripe call is not retried
    // on every page view.
    await userRef.set({ recoveryCheckedAt: FieldValue.serverTimestamp() }, { merge: true });

    const sessions = await getStripe().checkout.sessions.list({
      customer_details: { email: profile.email },
      limit: 20,
    });
    const match = sessions.data.find(
      (s) =>
        s.payment_status === "paid" &&
        (s.client_reference_id === profile.uid || s.metadata?.firebaseUid === profile.uid),
    );
    if (!match) return profile;

    await userRef.set(
      {
        purchased: true,
        latestOrderId: match.id,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { ...profile, purchased: true, latestOrderId: match.id };
  } catch (err) {
    console.error("Stripe purchase recovery failed:", err);
    return profile;
  }
}

export async function createOrRefreshAccount(input: {
  uid: string;
  displayName?: string | null;
  email?: string | null;
}) {
  await getAdminDb().collection("users").doc(input.uid).set(
    {
      displayName: input.displayName ?? null,
      email: input.email ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function fulfillCheckoutSession(sessionId: string, uid: string) {
  try {
    const session = await getPaidCheckoutSession(sessionId);
    if (!session) return false;

    // Only the user the session was created for may claim it.
    const owner = session.client_reference_id ?? session.metadata?.firebaseUid ?? null;
    if (owner !== uid) return false;

    await getAdminDb().collection("users").doc(uid).set(
      {
        purchased: true,
        latestOrderId: session.id,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return true;
  } catch (err) {
    console.error("Error fulfilling checkout session:", err);
    return false;
  }
}
