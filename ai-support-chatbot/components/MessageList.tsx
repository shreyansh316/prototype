import React, { useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Animated,
  type ListRenderItemInfo,
} from 'react-native';
import MessageBubble from './MessageBubble';
import { ChatMessage } from '../store/useChatStore';
import { colors } from '../constants/theme';

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

// Three-dot typing indicator shown while the AI is generating a response
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const makeDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );

    const anim = Animated.parallel([
      makeDot(dot1, 0),
      makeDot(dot2, 200),
      makeDot(dot3, 400),
    ]);
    anim.start();
    return () => anim.stop();
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingRow}>
      <View style={styles.typingAvatar} />
      <View style={styles.typingBubble}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
        ))}
      </View>
    </View>
  );
}

export default function MessageList({ messages, isStreaming }: MessageListProps) {
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Auto-scroll to bottom whenever messages change or streaming state changes
  useEffect(() => {
    if (messages.length > 0 || isStreaming) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [messages, isStreaming]);

  return (
    <FlatList<ChatMessage>
      ref={listRef}
      data={messages}
      keyExtractor={(item: ChatMessage) => item.id}
      renderItem={({ item }: ListRenderItemInfo<ChatMessage>) => <MessageBubble message={item} />}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      initialNumToRender={15}
      maxToRenderPerBatch={10}
      windowSize={10}
      removeClippedSubviews={true}
      onContentSizeChange={() =>
        listRef.current?.scrollToEnd({ animated: true })
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Animated.Text style={styles.emptyEmoji}>💬</Animated.Text>
          </View>
        </View>
      }
      ListFooterComponent={
        isStreaming ? <TypingIndicator /> : null
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingTop: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 28,
  },

  // Typing indicator
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginHorizontal: 12,
    marginVertical: 4,
  },
  typingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${colors.primary}22`,
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
    marginBottom: 2,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.textSecondary,
  },
});
