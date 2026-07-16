import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Gracefully handle build time compilation when env variables might not be defined
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
      return {
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          setSession: async () => ({ data: { session: null }, error: null }),
          signOut: async () => ({ error: null }),
        },
      } as unknown as ReturnType<typeof createBrowserClient>;
    }
  }

  return createBrowserClient(supabaseUrl || '', supabaseAnonKey || '');
};
