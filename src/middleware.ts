import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

// Define auth routes (should redirect to dashboard if authenticated)
const authRoutes = [
  '/login',
  '/register',
  '/forgot-password',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookies or localStorage (via header)
  // Note: In production, use httpOnly cookies for better security
  const token = request.cookies.get('token')?.value;

  // Check if the current route is a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Check if the current route is an auth route
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // For the root path, redirect to login or dashboard
  if (pathname === '/') {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user is not authenticated and trying to access protected route
  // Note: Client-side auth check is more reliable with zustand persist
  // This middleware provides an additional layer of protection

  // For now, we'll rely on client-side auth checks since we're using
  // localStorage for token storage. In production, consider using
  // httpOnly cookies for better security.

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
