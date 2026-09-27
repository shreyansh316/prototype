import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Bot } from 'lucide-react-native';
import { ChatMessage } from '../store/useChatStore';
import { colors } from '../constants/theme';

interface MessageBubbleProps {
  message: ChatMessage;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
      {/* Bot avatar — only shown on the left for assistant messages */}
      {!isUser && (
        <View style={styles.avatar}>
          <Bot size={14} color={colors.primary} strokeWidth={2.5} />
        </View>
      )}

      <View style={styles.bubbleGroup}>
        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.aiBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.aiText,
            ]}
          >
            {message.content}
          </Text>
        </View>

        <Text style={[styles.timestamp, isUser ? styles.tsRight : styles.tsLeft]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 4,
    marginHorizontal: 12,
    alignItems: 'flex-end',
    gap: 8,
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },

  // Bot avatar circle
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${colors.primary}22`,
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14, // aligns with bottom of bubble above timestamp
  },

  bubbleGroup: {
    maxWidth: '78%',
    gap: 3,
  },

  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userText: {
    color: '#FFFFFF',
    fontWeight: '400',
  },
  aiText: {
    color: colors.textPrimary,
    fontWeight: '400',
  },

  timestamp: {
    fontSize: 11,
    color: colors.textDim,
  },
  tsRight: {
    textAlign: 'right',
  },
  tsLeft: {
    textAlign: 'left',
    marginLeft: 4,
  },
});
