import type { APIRoute } from 'astro';
import { createSupabaseServerInstance } from '../../../db/supabase.client.ts';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Create Supabase server client
    const supabase = createSupabaseServerInstance({ 
      cookies, 
      headers: request.headers 
    });

    // Sign out the user
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Logout failed. Please try again.' 
        }), 
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Successful logout
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Successfully logged out.' 
      }), 
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Logout API error:', error);
    
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
