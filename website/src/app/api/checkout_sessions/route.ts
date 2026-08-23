import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getAccountProfile } from '@/lib/entitlements';
import { getSessionUser, isSameOrigin } from '@/lib/session';

export const runtime = 'nodejs';

function getBaseUrl(request: Request) {
  const baseUrl = request.headers.get('origin')
    || process.env.NEXT_PUBLIC_BASE_URL
    || new URL(request.url).origin;

  return baseUrl.startsWith('http://') || baseUrl.startsWith('https://')
    ? baseUrl
    : `https://${baseUrl}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.redirect(new URL('/account?signin=required', getBaseUrl(request)), 303);
    }

    const account = await getAccountProfile(user.uid);

    if (account.purchased) {
      return NextResponse.redirect(new URL('/account', getBaseUrl(request)), 303);
    }

    const origin = getBaseUrl(request);
    const stripe = getStripe();
    const productImageUrl = new URL('/MacOs app.png', origin).toString();
    const successUrl = `${new URL('/account', origin).toString()}?purchase=success&session_id={CHECKOUT_SESSION_ID}`;

    // Create Checkout Sessions from body params.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Everything Clipboard - Full Access (MacOS, Windows, Android)',
              description: 'One-time purchase for full access to Everything Clipboard across all platforms.',
              images: [productImageUrl],
            },
            unit_amount: 300, // $3.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      allow_promotion_codes: true,
      customer_email: user.email,
      client_reference_id: user.uid,
      metadata: {
        firebaseUid: user.uid,
      },
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
