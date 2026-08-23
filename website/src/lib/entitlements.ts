import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

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

  return {
    uid,
    displayName: data?.displayName ?? null,
    email: data?.email ?? null,
    purchased: data?.purchased === true,
    latestOrderId: data?.latestOrderId ?? null,
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
