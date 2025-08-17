import type { APIRoute } from 'astro';
import { createSupabaseServerInstance } from '../../../db/supabase.client.ts';
import { validateServerLogin, isRateLimited } from '../../../lib/server-validation.ts';

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Rate limiting
    const clientIP = clientAddress || 'unknown';
    if (isRateLimited(`login_${clientIP}`, 60000, 5)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Too many login attempts. Please try again later.' 
        }), 
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Server-side validation
    const validation = validateServerLogin(email, password);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Validation failed',
          errors: validation.errors 
        }), 
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase server client
    const supabase = createSupabaseServerInstance({ 
      cookies, 
      headers: request.headers 
    });

    // Use sanitized data from validation
    const { email: sanitizedEmail, password: sanitizedPassword } = validation.sanitizedData!;

    // Attempt to sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: sanitizedEmail,
      password: sanitizedPassword,
    });

    if (error) {
      console.error('Login error:', error);
      
      // Map Supabase errors to user-friendly messages
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link.';
      } else if (error.message.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please try again later.';
      }

      return new Response(
        JSON.stringify({ 
          success: false,
          error: errorMessage 
        }), 
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!data.user) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Login failed. No user data returned.' 
        }), 
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Successful login
    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        }
      }), 
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Login API error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error. Please try again.' 
      }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
