import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminDb } from "@/lib/firebase-admin";
import { getStripe } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/entitlements";
import { recomputeAccess } from "@/lib/access";

export const runtime = "nodejs";

function getFirebaseUid(session: Stripe.Checkout.Session) {
  return session.client_reference_id ?? session.metadata?.firebaseUid ?? null;
}

async function grantPurchase(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  const uid = getFirebaseUid(session);
  if (!uid) throw new Error(`Checkout session ${session.id} has no Firebase user ID`);

  // The same verified, owner-bound transaction serves the webhook and return page.
  if (!await fulfillCheckoutSession(session.id, uid)) {
    // A completed Checkout event can arrive after a refund. Acknowledge that
    // obsolete event only after checking current Stripe state; retry API failures.
    const current = await getStripe().checkout.sessions.retrieve(session.id, { expand: ["payment_intent.latest_charge"] });
    const intent = current.payment_intent;
    const charge = intent && typeof intent !== "string" ? intent.latest_charge : null;
    if (charge && typeof charge !== "string" && (charge.refunded || charge.disputed)) return;
    throw new Error("Purchase fulfillment did not complete");
  }
}

async function handleRefund(charge: Stripe.Charge) {
  if (!charge.refunded || !charge.payment_intent) return;

  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent.id;
  const db = getAdminDb();
  const matches = await db.collection("orders").where("paymentIntentId", "==", paymentIntentId).limit(1).get();
  const order = matches.docs[0];
  if (!order) return;

  const uid = order.data().firebaseUid as string;
  await order.ref.set({
    status: "refunded",
    refundedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  // Access stays while another Stripe order, a Play purchase or a manual grant remains.
  await recomputeAccess(uid);
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    console.error("Invalid Stripe webhook signature:", error);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await grantPurchase(event.data.object as Stripe.Checkout.Session);
    } else if (event.type === "charge.refunded") {
      await handleRefund(event.data.object as Stripe.Charge);
    }
  } catch (error) {
    console.error(`Unable to process Stripe event ${event.id}:`, error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
