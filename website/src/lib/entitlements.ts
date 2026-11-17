import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getPaidCheckoutSession } from "@/lib/stripe";

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

  const purchased = data?.purchased === true;
  const latestOrderId = data?.latestOrderId ?? null;
  const email = data?.email ?? null;

  // Account reads must never resurrect a revoked entitlement by looking at
  // historical Checkout payment_status, which alone does not prove current access.

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
    const owner = session.client_reference_id ?? session.metadata?.firebaseUid;
    if (owner !== uid) return false;

    const db = getAdminDb();
    const orderRef = db.collection("orders").doc(session.id);
    return await db.runTransaction(async (transaction) => {
      const order = await transaction.get(orderRef);
      if (order.data()?.status === "refunded" || order.data()?.status === "disputed") return false;
      transaction.set(orderRef, {
        firebaseUid: uid,
        stripeCheckoutSessionId: session.id,
        paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
        customerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
        customerEmail: session.customer_details?.email ?? null,
        amountTotal: session.amount_total ?? null,
        currency: session.currency ?? null,
        status: "paid",
        paidAt: order.data()?.paidAt ?? FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(db.collection("users").doc(uid), {
        purchased: true,
        latestOrderId: session.id,
        purchasedAt: order.data()?.paidAt ?? FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return true;
    });
  } catch (err) {
    console.error("Error fulfilling checkout session:", err);
    return false;
  }
}
