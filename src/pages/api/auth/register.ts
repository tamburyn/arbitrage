import type { APIRoute } from 'astro';
import { createSupabaseServerInstance } from '../../../db/supabase.client.ts';
import { validateServerRegistration, isRateLimited } from '../../../lib/server-validation.ts';

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  try {
    const body = await request.json();
    const { email, password, confirmPassword } = body;

    // Rate limiting
    const clientIP = clientAddress || 'unknown';
    if (isRateLimited(`register_${clientIP}`, 60000, 3)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Too many registration attempts. Please try again later.' 
        }), 
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Server-side validation
    const validation = validateServerRegistration(email, password, confirmPassword);
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

    // Attempt to register with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password: sanitizedPassword,
      options: {
        data: {
          // Initial user metadata
          created_at: new Date().toISOString(),
        }
      }
    });

    if (error) {
      console.error('Registration error:', error);
      
      // Map Supabase errors to user-friendly messages
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.message.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (error.message.includes('Password should be')) {
        errorMessage = 'Password does not meet security requirements.';
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message.includes('Signup is disabled')) {
        errorMessage = 'Account registration is currently disabled.';
      }

      return new Response(
        JSON.stringify({ 
          success: false,
          error: errorMessage 
        }), 
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!data.user) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Registration failed. Please try again.' 
        }), 
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if email confirmation is required
    if (!data.session && data.user && !data.user.email_confirmed_at) {
      return new Response(
        JSON.stringify({ 
          success: true,
          requiresConfirmation: true,
          message: 'Registration successful! Please check your email for a confirmation link.',
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
    }

    // Successful registration with immediate session
    return new Response(
      JSON.stringify({ 
        success: true,
        requiresConfirmation: false,
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
    console.error('Registration API error:', error);
    
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
