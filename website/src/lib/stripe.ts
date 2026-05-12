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
    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    return session.payment_status === 'paid' ? session : null;
  } catch (error) {
    console.error('Unable to verify Stripe checkout session:', error);
    return null;
  }
}
