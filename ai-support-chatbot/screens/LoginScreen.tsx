import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bot, Eye, EyeOff, Mail, Lock, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../store/useAuthStore';

// Premium Deep Obsidian Palette
const theme = {
  bg: '#090A0F',
  surface: 'rgba(255, 255, 255, 0.04)',
  surfaceBorder: 'rgba(255, 255, 255, 0.08)',
  primary: '#6366F1',
  primaryGradient: ['#6366F1', '#4F46E5', '#06B6D4'] as const,
  textWhite: '#FFFFFF',
  textMuted: '#94A3B8',
  textLabel: '#64748B',
  error: '#EF4444',
};

export default function LoginScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const { signIn, signUp, isLoading, error, clearError } = useAuthStore();

  // ── Animations ───────────────────────────────────────────────────────────────
  const floatAnim = useRef(new Animated.Value(0)).current;
  const errorAnim = useRef(new Animated.Value(-60)).current;
  const errorOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Subtle float for hero icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 2400, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ])
    ).start();
  }, [floatAnim]);

  useEffect(() => {
    if (error) {
      Animated.parallel([
        Animated.spring(errorAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(errorOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Animated.parallel([
        Animated.timing(errorAnim, { toValue: -60, duration: 200, useNativeDriver: true }),
        Animated.timing(errorOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [error, errorAnim, errorOpacity]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      if (!email || !password || isLoading) return;
      clearError();
      
      console.log(`[LoginScreen] Button clicked: ${mode} for email ${email}`);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const success = mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password);

      if (success) {
        console.log(`[LoginScreen] Auth success, routing to chat...`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        console.log(`[LoginScreen] Auth failed`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        setTimeout(() => {
          const currentError = useAuthStore.getState().error;
          if (currentError) {
            Alert.alert('Authentication Error', currentError);
          } else {
            Alert.alert('Authentication Error', 'An unexpected error occurred. Please try again.');
          }
        }, 100);
      }
    } catch (err: any) {
      console.error('[LoginScreen] Unhandled UI Exception:', err);
      Alert.alert("Debug Error", String(err));
    }
  };

  const toggleMode = () => {
    try {
      clearError();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    } catch (err: any) {
      Alert.alert("Debug Error", String(err));
    }
  };

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
    }).start();
  };

  const canSubmit = email.trim().length > 0 && password.length >= 6 && !isLoading;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Top Error Banner ─────────────────────────────────────────────── */}
          <Animated.View
            style={[
              styles.errorBanner,
              { transform: [{ translateY: errorAnim }], opacity: errorOpacity },
            ]}
          >
            <AlertCircle size={16} color={theme.error} strokeWidth={2.5} />
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>

          {/* ── Ambient Radial Glow (Absolute) ───────────────────────────────── */}
          <View style={styles.ambientGlowContainer} pointerEvents="none">
            <LinearGradient
              colors={['rgba(99, 102, 241, 0.15)', 'rgba(99, 102, 241, 0)']}
              style={styles.ambientGlow}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </View>

          {/* ── Hero Header ──────────────────────────────────────────────────── */}
          <View style={styles.heroSection}>
            <Animated.View style={[styles.logoContainer, { transform: [{ translateY: floatAnim }] }]}>
              <View style={styles.logoGlass}>
                <Bot size={34} color="#FFFFFF" strokeWidth={1.5} />
              </View>
            </Animated.View>

            <Text style={styles.title}>
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'signin'
                ? 'Sign in to sync your intelligent support context'
                : 'Enter your details to initialize your workspace'}
            </Text>
          </View>

          {/* ── Glass Input Form ─────────────────────────────────────────────── */}
          <View style={styles.formContainer}>
            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <View style={[styles.inputGlass, emailFocused && styles.inputGlassFocused]}>
                <Mail
                  size={18}
                  color={emailFocused ? theme.primary : theme.textLabel}
                  strokeWidth={2}
                />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={theme.textLabel}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  editable={!isLoading}
                  selectionColor={theme.primary}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={[styles.inputGlass, passwordFocused && styles.inputGlassFocused]}>
                <Lock
                  size={18}
                  color={passwordFocused ? theme.primary : theme.textLabel}
                  strokeWidth={2}
                />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={theme.textLabel}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  editable={!isLoading}
                  selectionColor={theme.primary}
                />
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowPassword((v) => !v);
                  }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={theme.textLabel} strokeWidth={2} />
                  ) : (
                     <Eye size={18} color={theme.textLabel} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary CTA Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: 12 }}>
              <Pressable
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                <LinearGradient
                  colors={canSubmit ? [theme.primaryGradient[0], theme.primaryGradient[1]] : [theme.surfaceBorder, theme.surfaceBorder]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.ctaButton, !canSubmit && styles.ctaButtonDisabled]}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={[styles.ctaText, !canSubmit && { color: theme.textLabel }]}>
                      {mode === 'signin' ? 'Sign In' : 'Continue'}
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Mode Switcher */}
            <TouchableOpacity
              onPress={toggleMode}
              style={styles.toggleRow}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Text style={styles.toggleText}>
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.toggleLink}>
                  {mode === 'signin' ? 'Create one' : 'Sign in'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }} />

          {/* ── Bottom Trust Badge ───────────────────────────────────────────── */}
          <View style={styles.trustBadge}>
            <ShieldCheck size={14} color={theme.textLabel} strokeWidth={2} />
            <Text style={styles.trustBadgeText}>
              256-Bit Encrypted • Powered by Supabase
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  
  // Ambient Glow
  ambientGlowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
    alignItems: 'center',
    zIndex: 0,
  },
  ambientGlow: {
    width: 600,
    height: 400,
    borderRadius: 300,
    transform: [{ scaleX: 2 }],
  },

  // Error Banner
  errorBanner: {
    position: 'absolute',
    top: 16,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 100,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: theme.error,
    fontWeight: '500',
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 48,
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoGlass: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.textWhite,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textMuted,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: '80%',
  },

  // Form
  formContainer: {
    gap: 24,
    zIndex: 1,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textLabel,
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  inputGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputGlassFocused: {
    borderColor: theme.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.textWhite,
    height: '100%',
  },

  // CTA
  ctaButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textWhite,
    letterSpacing: 0.2,
  },

  // Toggle
  toggleRow: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 14,
    color: theme.textMuted,
  },
  toggleLink: {
    color: theme.textWhite,
    fontWeight: '600',
  },

  // Trust Badge
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 40,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    alignSelf: 'center',
  },
  trustBadgeText: {
    fontSize: 11,
    color: theme.textLabel,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
