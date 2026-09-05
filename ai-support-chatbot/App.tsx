import 'react-native-url-polyfill/auto'; // Must be first import in entry point
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { supabase } from './lib/supabase';
import { useAuthStore } from './store/useAuthStore';
import ChatScreen from './screens/ChatScreen';
import LoginScreen from './screens/LoginScreen';
import { colors } from './constants/theme';
import { initDatabase } from './lib/database';
import { startNetworkObserver } from './lib/syncQueue';

import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const { session, setSession } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [dbReady, setDbReady] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    let isSubscribed = true;

    // 1. Initialize SQLite database and start sync observer
    initDatabase().then(() => {
      if (isSubscribed) {
        setDbReady(true);
        startNetworkObserver();
      }
    }).catch(err => {
      console.error('[App] Database init failed:', err);
      if (isSubscribed) setDbReady(true); 
    });

    // 2. Restore any persisted session from AsyncStorage on app launch
    if (supabase) {
      supabase.auth.getSession().then(({ data }: any) => {
        if (isSubscribed) {
          setSession(data?.session ?? null);
          setIsInitializing(false);
        }
      }).catch((err: any) => {
        console.error('[App] getSession failed:', err);
        if (isSubscribed) setIsInitializing(false);
      });

      // 3. Subscribe to future auth state changes
      const subscription = supabase.auth.onAuthStateChange(
        (_event: any, s: any) => {
          if (isSubscribed) {
            setSession(s);
          }
        }
      ).data?.subscription;

      return () => {
        isSubscribed = false;
        subscription?.unsubscribe();
      };
    } else {
      setIsInitializing(false);
      return () => { isSubscribed = false; };
    }
  }, [setSession]);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        {!isMounted || isInitializing || !dbReady ? (
          <View style={styles.splash}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : session ? (
          <ChatScreen />
        ) : (
          <LoginScreen />
        )}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
