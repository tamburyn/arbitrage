import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  favourite_exchanges?: string[];
  favourite_assets?: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateFavourites: (exchanges: string[], assets: string[]) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if user is already authenticated via server session
      // Try to fetch current user favourites if authenticated
      const favouritesResponse = await fetch('/api/user/favourites');
      
      if (favouritesResponse.ok) {
        const favouritesData = await favouritesResponse.json();
        if (favouritesData.success) {
          // User is authenticated and has favourites data
          // We don't have user info here, so we'll set a basic user object
          // The actual user data should come from server-side rendering
          setIsLoading(false);
          return;
        }
      }
      
      // User not authenticated - this is fine, they can still use the dashboard
      setUser(null);
    } catch (error) {
      console.error('Error checking auth status:', error);
      // Even on error, user can access dashboard without authentication
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        // Fetch user favourites
        const favouritesResponse = await fetch('/api/user/favourites');
        const favouritesData = await favouritesResponse.json();
        
        const userData: User = {
          id: data.user.id,
          email: data.user.email,
          favourite_exchanges: favouritesData.success ? favouritesData.favourites.exchanges : [],
          favourite_assets: favouritesData.success ? favouritesData.favourites.assets : []
        };
        
        setUser(userData);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string, 
    password: string, 
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, confirmPassword }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (data.requiresConfirmation) {
          return { 
            success: true, 
            error: data.message || 'Please check your email for confirmation.' 
          };
        } else if (data.user) {
          // User registered and logged in immediately
          const userData: User = {
            id: data.user.id,
            email: data.user.email,
            favourite_exchanges: [],
            favourite_assets: []
          };
          
          setUser(userData);
          return { success: true };
        }
      }
      
      return { success: false, error: data.error || 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      setUser(null);
      
      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API call fails, clear local state and redirect
      setUser(null);
      window.location.href = '/';
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Password reset failed' };
      }
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Password reset failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const updateFavourites = async (
    exchanges: string[], 
    assets: string[]
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
        return { 
          success: false, 
          error: 'Please log in to save your favourites. You can still view the dashboard without an account.' 
        };
      }
      
      const response = await fetch('/api/user/favourites', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ exchanges, assets }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local user state
        const updatedUser = {
          ...user,
          favourite_exchanges: exchanges,
          favourite_assets: assets
        };
        
        setUser(updatedUser);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to update favourites' };
      }
    } catch (error) {
      console.error('Update favourites error:', error);
      return { success: false, error: 'Failed to update favourites' };
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    resetPassword,
    updateFavourites
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
