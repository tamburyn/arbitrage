import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerInstance } from '../db/supabase.client.ts';

// Pages that are accessible to everyone (authenticated and unauthenticated)
const PUBLIC_PATHS = [
  // Public pages
  '/',
  '/login', 
  '/register',
  '/reset-password',
  // Auth API endpoints
  '/api/auth/login',
  '/api/auth/register', 
  '/api/auth/reset-password',
  '/api/auth/logout',
  // Static assets
  '/favicon.png',
];

// Pages that require authentication (will redirect to login if not authenticated)
const AUTH_REQUIRED_PATHS = [
  '/preferences', // User preferences/favourites management requires login
];

// Check if path is public or matches public pattern
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || 
         pathname.startsWith('/api/') || 
         pathname.startsWith('/_astro/') ||
         pathname.includes('.');
}

// Check if path requires authentication
function requiresAuth(pathname: string): boolean {
  return AUTH_REQUIRED_PATHS.includes(pathname);
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, request, redirect, locals } = context;
  
  try {
    // Create server-side Supabase client
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });
    
    // Add supabase to locals for use in pages/API routes
    locals.supabase = supabase;
    
    // Always try to get user session (for both public and protected routes)
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    
    if (error) {
      console.warn('Auth error in middleware:', error.message);
    }
    
    if (user) {
      // User is authenticated, add to locals
      locals.user = {
        id: user.id,
        email: user.email,
      };
    }
    
    // Check if this route requires authentication
    if (requiresAuth(url.pathname) && !user) {
      // Only redirect to login for routes that explicitly require auth
      console.log(`Redirecting unauthenticated user from ${url.pathname} to /login`);
      return redirect('/login');
    }
    
  } catch (error) {
    console.warn('Middleware error:', error);
    // On error, redirect to login only for routes that require auth
    if (requiresAuth(url.pathname)) {
      return redirect('/login');
    }
  }
  
  return next();
}); 