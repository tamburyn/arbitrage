import type { APIRoute } from 'astro';
import { createSupabaseServerInstance } from '../../../db/supabase.client.ts';
import { validateServerFavourites } from '../../../lib/server-validation.ts';

// GET - Fetch user favourites
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createSupabaseServerInstance({ 
      cookies, 
      headers: request.headers 
    });

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Please log in to access your favourites',
          requiresAuth: true 
        }), 
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('favourite_exchanges, favourite_assets')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user favourites:', error);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to fetch favourites' 
        }), 
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        favourites: {
          exchanges: profile?.favourite_exchanges || [],
          assets: profile?.favourite_assets || []
        }
      }), 
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Favourites GET API error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error' 
      }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// PUT - Update user favourites
export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { exchanges, assets } = body;

    // Server-side validation
    const validation = validateServerFavourites(exchanges, assets);
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

    const supabase = createSupabaseServerInstance({ 
      cookies, 
      headers: request.headers 
    });

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Please log in to access your favourites',
          requiresAuth: true 
        }), 
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Use sanitized data from validation
    const { exchanges: sanitizedExchanges, assets: sanitizedAssets } = validation.sanitizedData!;

    // Update user profile
    const { error } = await supabase
      .from('user_profiles')
      .update({
        favourite_exchanges: sanitizedExchanges,
        favourite_assets: sanitizedAssets
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating user favourites:', error);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to update favourites' 
        }), 
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Favourites updated successfully',
        favourites: {
          exchanges: sanitizedExchanges,
          assets: sanitizedAssets
        }
      }), 
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Favourites PUT API error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error' 
      }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
