"use client";

/**
 * Everything that needs the Firebase client SDK lives behind this module, and
 * components only ever load it with a dynamic `import()` from inside a click /
 * credential handler. That keeps `firebase/auth` out of the initial bundle of
 * every page: it is downloaded when someone actually signs in or out.
 *
 * Firebase is used purely as a way to turn a Google credential into an ID
 * token. The real session is the HttpOnly cookie minted by /api/auth/session,
 * so the Firebase user is kept in memory only and dropped straight away.
 */

import {
  GoogleAuthProvider,
  inMemoryPersistence,
  setPersistence,
  signInWithCredential,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { firebaseAuth, googleProvider } from "@/lib/firebase-client";

async function createServerSession(idToken: string) {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error("Unable to create session");
}

/** Fire and forget: nothing downstream depends on the Firebase user going away. */
function dropFirebaseUser(auth: ReturnType<typeof firebaseAuth>) {
  void signOut(auth).catch(() => {});
}

/** Google credential (from GIS / One Tap / FedCM) -> server session cookie. */
export async function exchangeGoogleCredential(googleCredential: string) {
  const auth = firebaseAuth();
  await setPersistence(auth, inMemoryPersistence).catch(() => {});
  const credential = GoogleAuthProvider.credential(googleCredential);
  const userCredential = await signInWithCredential(auth, credential);
  // The token was minted seconds ago; no need to force a refresh round trip.
  const idToken = await userCredential.user.getIdToken();
  await createServerSession(idToken);
  dropFirebaseUser(auth);
}

/** Popup fallback for browsers without GIS / FedCM. */
export async function exchangeGooglePopup() {
  const auth = firebaseAuth();
  await setPersistence(auth, inMemoryPersistence);
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  await createServerSession(idToken);
  dropFirebaseUser(auth);
}

/** Clears any Firebase user left over from older builds that persisted it. */
export async function clearFirebaseUser() {
  await signOut(firebaseAuth());
}
