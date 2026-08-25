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
};

export async function getAccountProfile(uid: string): Promise<AccountProfile> {
  const snapshot = await getAdminDb().collection("users").doc(uid).get();
  const data = snapshot.data();

  let purchased = data?.purchased === true;
  let latestOrderId = data?.latestOrderId ?? null;
  const email = data?.email ?? null;

  // Self-healing check: If not marked purchased in DB, check recent completed Stripe sessions
  if (!purchased) {
    try {
      const stripe = getStripe();
      const sessions = await stripe.checkout.sessions.list({ limit: 15 });
      const matchingSession = sessions.data.find(
        (s) => (s.client_reference_id === uid || (email && s.customer_details?.email?.toLowerCase() === email.toLowerCase())) && s.payment_status === "paid"
      );

      if (matchingSession) {
        purchased = true;
        latestOrderId = matchingSession.id;
        await getAdminDb().collection("users").doc(uid).set(
          {
            purchased: true,
            latestOrderId: matchingSession.id,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.error("Error auto-verifying Stripe purchase:", err);
    }
  }

  return {
    uid,
    displayName: data?.displayName ?? null,
    email: email,
    purchased,
    latestOrderId,
    purchasedAt: data?.purchasedAt?.toDate?.() ?? null,
  };
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
