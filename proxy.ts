import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://claude.dj',
  'https://www.claude.dj',
  'https://dj-claude.vercel.app',
];

export function proxy(request: NextRequest) {
  // Only guard API routes — let the public site through
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow in local development
  const origin = request.headers.get('origin');
  if (!origin) {
    // No origin = server-side or same-origin navigation; check referer as fallback
    const referer = request.headers.get('referer');
    if (referer && ALLOWED_ORIGINS.some((o) => referer.startsWith(o))) {
      return NextResponse.next();
    }
    // Block bare API calls with no origin or referer (e.g. curl)
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.next();
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost')) {
    return NextResponse.next();
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export const config = {
  matcher: ['/api/:path*'],
};
