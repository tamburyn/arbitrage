import type { APIRoute } from 'astro';
import { createSupabaseServerInstance } from '../../../db/supabase.client.ts';
import { validatePasswordResetForm, hasFormErrors } from '../../../lib/auth-validation.ts';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { email } = body;

    // Server-side validation
    const validationErrors = validatePasswordResetForm(email);
    if (hasFormErrors(validationErrors)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Validation failed',
          errors: validationErrors 
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

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${new URL(request.url).origin}/reset-password?token=true`,
      }
    );

    if (error) {
      console.error('Password reset error:', error);
      
      // For security reasons, we don't reveal if the email exists or not
      // Always return success to prevent email enumeration attacks
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'If an account with this email exists, you will receive a password reset link shortly.' 
        }), 
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Successful password reset request
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Password reset email sent successfully. Please check your inbox.' 
      }), 
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Password reset API error:', error);
    
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
