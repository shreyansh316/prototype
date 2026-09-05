import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { ArrowUp, Square } from 'lucide-react-native';
import { colors } from '../constants/theme';

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, onStop, disabled = false }: ChatInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const canSend = text.trim().length > 0 && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    const trimmed = text.trim();
    setText('');
    onSend(trimmed);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputRow, disabled && styles.inputRowDisabled]}>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder="Message Support Bot..."
          placeholderTextColor={colors.textDim}
          style={styles.input}
          multiline
          maxLength={2000}
          numberOfLines={1}
          // Android: grow up to 4 lines, then scroll inside
          onSubmitEditing={Platform.OS === 'android' ? undefined : handleSend}
          blurOnSubmit={false}
          returnKeyType="default"
          editable={!disabled}
          selectionColor={colors.primary}
        />

        {disabled ? (
          <TouchableOpacity
            onPress={onStop}
            style={[styles.sendButton, styles.stopActive]}
            accessibilityLabel="Stop streaming"
            activeOpacity={0.75}
          >
            <Square
              size={16}
              color="#FFFFFF"
              strokeWidth={3}
              fill="#FFFFFF"
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.sendButton, canSend ? styles.sendActive : styles.sendInactive]}
            accessibilityLabel="Send message"
            activeOpacity={0.75}
          >
            <ArrowUp
              size={18}
              color={canSend ? '#FFFFFF' : colors.textDim}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'android' ? 10 : 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: colors.bg,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inputRowDisabled: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
    // Grow up to 4 lines worth of height
    maxHeight: 21 * 4 + 8, // lineHeight * 4 + padding
    paddingTop: Platform.OS === 'android' ? 4 : 6,
    paddingBottom: Platform.OS === 'android' ? 4 : 6,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  sendActive: {
    backgroundColor: colors.primary,
  },
  sendInactive: {
    backgroundColor: colors.surfaceHigh,
  },
  stopActive: {
    backgroundColor: colors.error,
  },
});
