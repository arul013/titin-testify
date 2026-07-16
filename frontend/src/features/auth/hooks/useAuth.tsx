'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, LoginRequest } from '../../../types';
import { api } from '../../../lib/api';
import { createClient } from '../../../lib/supabase';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isLoggingOut: boolean;
  login: (credentials: LoginRequest) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const supabase = createClient();

  // Load initial session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('cbt_access_token');
        const storedUser = localStorage.getItem('cbt_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Verify and refresh with backend if possible
          try {
            const profile = await api.get<UserProfile>('/api/auth/me', { token: storedToken });
            setUser(profile);
            localStorage.setItem('cbt_user', JSON.stringify(profile));
          } catch (e) {
            // Token might be expired, let's try to get Supabase session
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              const accessToken = data.session.access_token;
              setToken(accessToken);
              localStorage.setItem('cbt_access_token', accessToken);
              const profile = await api.get<UserProfile>('/api/auth/me', { token: accessToken });
              setUser(profile);
              localStorage.setItem('cbt_user', JSON.stringify(profile));
            } else {
              // Clear everything
              clearAuth();
            }
          }
        } else {
          // Check if supabase has a session
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            const accessToken = data.session.access_token;
            setToken(accessToken);
            localStorage.setItem('cbt_access_token', accessToken);
            try {
              const profile = await api.get<UserProfile>('/api/auth/me', { token: accessToken });
              setUser(profile);
              localStorage.setItem('cbt_user', JSON.stringify(profile));
            } catch (err) {
              clearAuth();
            }
          }
        }
      } catch (error) {
        console.error('Initial auth setup error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (event === 'SIGNED_IN' && session) {
        setToken(session.access_token);
        localStorage.setItem('cbt_access_token', session.access_token);
        try {
          const profile = await api.get<UserProfile>('/api/auth/me', { token: session.access_token });
          setUser(profile);
          localStorage.setItem('cbt_user', JSON.stringify(profile));
        } catch (err) {
          console.error('Error fetching profile after sign in:', err);
        }
      } else if (event === 'SIGNED_OUT') {
        clearAuth();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const clearAuth = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('cbt_access_token');
    localStorage.removeItem('cbt_user');
  };

  const login = async (credentials: LoginRequest): Promise<UserProfile> => {
    try {
      const response = await api.post<{ access_token: string; refresh_token: string; user: UserProfile }>(
        '/api/auth/login',
        credentials
      );
      
      // Set session in Supabase client to sync
      await supabase.auth.setSession({
        access_token: response.access_token,
        refresh_token: response.refresh_token,
      });

      setToken(response.access_token);
      setUser(response.user);
      localStorage.setItem('cbt_access_token', response.access_token);
      localStorage.setItem('cbt_user', JSON.stringify(response.user));
      return response.user;
    } catch (error) {
      clearAuth();
      throw error;
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      if (token) {
        await api.post('/api/auth/logout', {}, { token });
      }
    } catch (e) {
      console.warn('Logout request failed on server:', e);
    } finally {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase client signOut failed:', err);
      }
      clearAuth();
      setIsLoggingOut(false);
      
      // Paksa browser melakukan redirect penuh ke halaman login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const profile = await api.get<UserProfile>('/api/auth/me', { token });
      setUser(profile);
      localStorage.setItem('cbt_user', JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to refresh user profile:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isLoggingOut, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
