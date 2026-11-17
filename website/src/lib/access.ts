import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * `users/{uid}.purchased` is the single access flag every client reads. It is
 * true while ANY of these remains: a paid Stripe order, an active Google Play
 * purchase, or a manual grant (`users/{uid}.manualGrant === true`, set by hand
 * for reviewers, testers and goodwill). A refund on one source never removes
 * access granted by another.
 */
export async function recomputeAccess(uid: string) {
  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);
  return db.runTransaction(async (transaction) => {
    const [user, stripeOrders, playPurchases] = await Promise.all([
      transaction.get(userRef),
      transaction.get(db.collection("orders").where("firebaseUid", "==", uid).where("status", "==", "paid").limit(1)),
      transaction.get(db.collection("playPurchases").where("uid", "==", uid).where("state", "==", "active").limit(1)),
    ]);
    const data = user.data();
    const purchased = data?.manualGrant === true || !stripeOrders.empty || !playPurchases.empty;
    if (purchased) {
      transaction.set(userRef, {
        purchased: true,
        purchasedAt: data?.purchasedAt ?? FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      transaction.set(userRef, {
        purchased: false,
        latestOrderId: null,
        purchasedAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    return purchased;
  });
}
