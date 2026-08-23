import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminDb } from "@/lib/firebase-admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function getFirebaseUid(session: Stripe.Checkout.Session) {
  return session.client_reference_id ?? session.metadata?.firebaseUid ?? null;
}

async function grantPurchase(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  const uid = getFirebaseUid(session);
  if (!uid) throw new Error(`Checkout session ${session.id} has no Firebase user ID`);

  const db = getAdminDb();
  const orderRef = db.collection("orders").doc(session.id);
  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (transaction) => {
    const order = await transaction.get(orderRef);
    if (order.exists && order.data()?.status === "paid") return;

    transaction.set(orderRef, {
      firebaseUid: uid,
      stripeCheckoutSessionId: session.id,
      paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
      customerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
      customerEmail: session.customer_details?.email ?? null,
      amountTotal: session.amount_total ?? null,
      currency: session.currency ?? null,
      status: "paid",
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(userRef, {
      purchased: true,
      latestOrderId: session.id,
      purchasedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
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
  await db.runTransaction(async (transaction) => {
    transaction.set(order.ref, {
      status: "refunded",
      refundedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    const activeOrders = await transaction.get(
      db.collection("orders").where("firebaseUid", "==", uid).where("status", "==", "paid"),
    );
    const hasAnotherPurchase = activeOrders.docs.some((activeOrder) => activeOrder.id !== order.id);
    if (!hasAnotherPurchase) {
      transaction.set(db.collection("users").doc(uid), {
        purchased: false,
        latestOrderId: null,
        purchasedAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  });
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
