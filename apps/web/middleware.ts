import { NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth/auth-config';

/**
 * Middleware authentication handler.
 * Uses minimal NextAuth config (no adapter, no providers) to stay Edge Runtime compatible.
 * Session validation is handled by the main auth instance.
 */
const { auth } = NextAuth({
  ...authConfig,
  providers: [], // Edge Runtime compatible - no providers with Node.js dependencies
});

export default auth((request) => {
  const nextRequest = request as unknown as NextRequest;
  const { pathname } = nextRequest.nextUrl;

  // Redirect unauthenticated users
  if (!request.auth?.user) {
    // Return 401 for API routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // Redirect to sign-in page for regular routes
    const signInUrl = new URL('/auth/sign-in', nextRequest.nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', nextRequest.nextUrl.href);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

/**
 * Matcher configuration for protected routes.
 * Add new protected routes here.
 */
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/upload-url/:path*',
  ],
};