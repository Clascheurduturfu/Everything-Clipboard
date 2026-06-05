import { NextResponse } from 'next/server';
import { getPaidCheckoutSession } from '@/lib/stripe';

const downloads = {
  windows: {
    env: 'CLIPSYNC_WINDOWS_DOWNLOAD_URL',
    label: 'Windows',
  },
  macos: {
    env: 'CLIPSYNC_MACOS_DOWNLOAD_URL',
    label: 'macOS',
  },
  android: {
    env: 'CLIPSYNC_ANDROID_DOWNLOAD_URL',
    label: 'Android',
  },
  ios: {
    env: 'CLIPSYNC_IOS_DOWNLOAD_URL',
    label: 'iOS',
  },
} as const;

type DownloadOs = keyof typeof downloads;

function isDownloadOs(os: string | null): os is DownloadOs {
  return os === 'windows' || os === 'macos' || os === 'android' || os === 'ios';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const os = searchParams.get('os');
  const sessionId = searchParams.get('session_id');

  if (!isDownloadOs(os)) {
    return NextResponse.json({ error: 'Unknown download platform' }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing checkout session' }, { status: 401 });
  }

  const session = await getPaidCheckoutSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 403 });
  }

  const downloadUrl = process.env[downloads[os].env];

  if (!downloadUrl) {
    return NextResponse.json(
      { error: `${downloads[os].label} download is not configured yet` },
      { status: 503 },
    );
  }

  return NextResponse.redirect(downloadUrl);
}
