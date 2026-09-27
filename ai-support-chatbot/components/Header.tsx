import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { Bot, Trash2, LogOut } from 'lucide-react-native';
import { colors } from '../constants/theme';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';

interface HeaderProps {
  ttft?: number | null;
  onClearPress?: () => void;
}

export default function Header({ ttft, onClearPress }: HeaderProps) {
  const clearChat = useChatStore((s) => s.clearChat);
  const { signOut, user } = useAuthStore();

  // Derive display name from user email (e.g. "john" from "john@example.com")
  const displayName = user?.email?.split('@')[0] ?? 'You';

  // Pulsating animation for the green "Active" dot
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.6,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handleClear = () => {
    Alert.alert(
      'Clear Chat',
      'Delete all messages? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearChat();
            onClearPress?.();
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          clearChat(); // Clear local messages on logout
          signOut();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Left: Avatar + Bot info */}
      <View style={styles.leftSection}>
        <View style={styles.avatarWrapper}>
          <Bot size={20} color={colors.primary} strokeWidth={2} />
        </View>

        <View style={styles.textBlock}>
          <View style={styles.nameRow}>
            <Text style={styles.botName}>Support Bot</Text>
            {ttft !== null && ttft !== undefined && (
              <View style={styles.ttftBadge}>
                <Text style={styles.ttftText}>TTFT: {ttft}ms</Text>
              </View>
            )}
          </View>
          <View style={styles.statusRow}>
            <Animated.View
              style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]}
            />
            <View style={styles.onlineDot} />
            <Text style={styles.statusText}>Active</Text>
            <Text style={styles.userBadge}>· {displayName}</Text>
          </View>
        </View>
      </View>

      {/* Right: Clear + Logout buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleClear}
          style={styles.iconButton}
          accessibilityLabel="Clear chat history"
          activeOpacity={0.7}
        >
          <Trash2 size={16} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.iconButton, styles.logoutButton]}
          accessibilityLabel="Sign out"
          activeOpacity={0.7}
        >
          <LogOut size={16} color={colors.error} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}22`,
    borderWidth: 1,
    borderColor: `${colors.primary}55`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { gap: 2, flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  botName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  ttftBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  ttftText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pulseRing: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: `${colors.online}44`,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.online,
  },
  statusText: {
    fontSize: 12,
    color: colors.online,
    fontWeight: '500',
    marginLeft: 4,
  },
  userBadge: {
    fontSize: 12,
    color: colors.textDim,
    fontWeight: '400',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    borderColor: `${colors.error}44`,
    backgroundColor: `${colors.error}12`,
  },
});
