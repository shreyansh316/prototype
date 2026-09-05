import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ─── Environment Variables ────────────────────────────────────────────────────
// These are set in .env and exposed via Expo's EXPO_PUBLIC_ prefix.
// NEVER hardcode keys directly — always read from env.

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// If credentials are missing, we log an error but STILL return a client (or throw safely inside a function).
// This prevents Hermes from fatally crashing on module evaluation before the ErrorBoundary mounts.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] CRITICAL: Missing environment variables.\n' +
    'Check your .env file for EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

// ─── Supabase Client Singleton ────────────────────────────────────────────────
// Uses AsyncStorage as the session persistence adapter so auth tokens
// survive app kills and restarts on Android without requiring re-login.

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Not a web app — disable URL detection
      },
    })
  : null as any; // Cast as any so type inferences don't break throughout the app, but accesses will be caught safely at runtime.

// ─── Database Type Helpers ────────────────────────────────────────────────────

export type SupabaseMessage = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used: number;
  latency_ms: number;
  created_at: string;
};

export type SupabaseConversation = {
  id: string;
  user_id: string;
  title: string;
  model: string;
  created_at: string;
};

export type SupabaseProfile = {
  id: string;
  username: string | null;
  created_at: string;
};
