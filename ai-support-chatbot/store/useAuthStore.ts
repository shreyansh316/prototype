import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSession: (session: Session | null) => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  user: null,
  isLoading: false,
  error: null,

  setSession: (session) =>
    set({ session, user: session?.user ?? null }),

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      console.log(`[AuthStore] Attempting sign in for ${email}`);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      console.log(`[AuthStore] signIn response:`, { data: !!data.user, error: error?.message });

      if (error) {
        set({ error: error.message });
        return false;
      }
      set({ session: data.session, user: data.user });
      return true;
    } catch (err: any) {
      console.error('[AuthStore] signIn exception:', err);
      set({ error: err.message || 'An unexpected error occurred during sign in.' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      console.log(`[AuthStore] Attempting sign up for ${email}`);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      
      console.log(`[AuthStore] signUp response:`, { data: !!data.user, error: error?.message });

      if (error) {
        set({ error: error.message });
        return false;
      }

      // Insert profile row after successful signup
      if (data.user) {
        const username = email.trim().split('@')[0]; // e.g. "john" from "john@example.com"
        await supabase
          .from('profiles')
          .upsert({ id: data.user.id, username })
          .then(({ error: profileError }: any) => {
            if (profileError) {
              console.warn('[AuthStore] Profile insert failed:', profileError.message);
            }
          });
      }

      set({
        session: data.session,
        user: data.user,
      });
      return true;
    } catch (err: any) {
      console.error('[AuthStore] signUp exception:', err);
      set({ error: err.message || 'An unexpected error occurred during sign up.' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({ isLoading: false, session: null, user: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
