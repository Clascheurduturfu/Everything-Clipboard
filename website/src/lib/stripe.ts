import Stripe from 'stripe';

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }

  return new Stripe(secretKey, {
    apiVersion: '2026-04-22.dahlia',
  });
}

export async function getPaidCheckoutSession(sessionId: string) {
  if (!sessionId.startsWith('cs_')) {
    return null;
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent.latest_charge'],
    });
    if (session.payment_status !== 'paid') return null;
    const intent = session.payment_intent;
    if (!intent || typeof intent === 'string' || intent.status !== 'succeeded') return null;
    const charge = intent.latest_charge;
    if (!charge || typeof charge === 'string' || charge.refunded || charge.disputed) return null;
    return session;
  } catch (error) {
    console.error('Unable to verify Stripe checkout session:', error);
    return null;
  }
}
