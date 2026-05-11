import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }

  return new Stripe(secretKey, {
    apiVersion: '2026-04-22.dahlia',
  });
}

function getBaseUrl(request: Request) {
  const baseUrl = request.headers.get('origin')
    || process.env.NEXT_PUBLIC_BASE_URL
    || new URL(request.url).origin;

  return baseUrl.startsWith('http://') || baseUrl.startsWith('https://')
    ? baseUrl
    : `https://${baseUrl}`;
}

export async function POST(request: Request) {
  try {
    const origin = getBaseUrl(request);
    const stripe = getStripe();
    const productImageUrl = new URL('/Windows app.png', origin).toString();
    const successUrl = `${new URL('/success', origin).toString()}?session_id={CHECKOUT_SESSION_ID}`;

    // Create Checkout Sessions from body params.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'ClipSync - Full Access (MacOS, Windows, Android)',
              description: 'One-time purchase for full access to ClipSync across all platforms.',
              images: [productImageUrl],
            },
            unit_amount: 300, // $3.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: new URL('/', origin).toString(),
    });

    return NextResponse.redirect(session.url!, 303);
  } catch (err: unknown) {
    console.error('Error creating Stripe session:', err);

    const message = err instanceof Error ? err.message : 'Unable to create Stripe session';
    const status = typeof err === 'object' && err !== null && 'statusCode' in err && typeof err.statusCode === 'number'
      ? err.statusCode
      : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
