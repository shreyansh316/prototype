import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import Header from '../components/Header';
import MessageList from '../components/MessageList';
import ChatInput from '../components/ChatInput';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../constants/theme';
import { getOrCreateConversation, saveMessage, loadConversationMessages } from '../lib/chatService';
import { streamChatCompletion } from '../services/freetokenService';

export default function ChatScreen() {
  const {
    messages,
    isStreaming,
    currentConversationId,
    ttft,
    addMessage,
    appendToLastMessage,
    setStreaming,
    setConversationId,
    setTtft,
    loadMessages,
  } = useChatStore();

  const { user } = useAuthStore();

  // Keep a ref to the abort controller for canceling streams
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Session Initialization ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    (async () => {
      // Re-use persisted session if we already have one
      let conversationId = currentConversationId;

      if (!conversationId) {
        conversationId = await getOrCreateConversation(user.id);
        if (conversationId && !cancelled) setConversationId(conversationId);
      }

      if (!conversationId || cancelled) return;

      // Load last 50 messages from Supabase to hydrate local cache
      const cloudMessages = await loadConversationMessages(conversationId);
      if (cancelled || cloudMessages.length === 0) return;

      // Convert Supabase rows → local ChatMessage shape
      loadMessages(
        cloudMessages.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.created_at).getTime(),
        }))
      );
    })();

    return () => { cancelled = true; };
    // Only run on mount / user change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // ── Send Handler ───────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      // 1. Haptic on send
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // 2. Immediately append user message to local store
      addMessage('user', text.trim());
      
      // 3. Set streaming state and reset TTFT
      setStreaming(true);
      setTtft(null);
      
      // Add a blank assistant message — filled via stream
      addMessage('assistant', '');

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        // We only pass the new context to the LLM (or full history if you prefer)
        // For simplicity, passing the history of the conversation
        const conversationHistory = [...messages, { id: 'new', role: 'user' as const, content: text.trim(), timestamp: Date.now() }];
        
        // Remove local-only properties to send to FreeToken
        const apiMessages = conversationHistory.map(m => ({
          role: m.role,
          content: m.content
        }));

        const result = await streamChatCompletion({
          messages: apiMessages,
          signal: controller.signal,
          onChunk: (delta) => {
            appendToLastMessage(delta);
          },
        });

        // Streaming complete successfully
        setTtft(result.ttft);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Save to Supabase (fire and forget)
        if (currentConversationId) {
          saveMessage(currentConversationId, 'user', text.trim());
          
          // Get the newly completed assistant message from store state
          // Note: Zustand appendToLastMessage already updated it in the store,
          // but we can't reliably read the latest state from this closure easily
          // unless we use useChatStore.getState()
          const latestMessages = useChatStore.getState().messages;
          const assistantReply = latestMessages[latestMessages.length - 1].content;
          
          saveMessage(currentConversationId, 'assistant', assistantReply, result.totalDuration);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // Swallow AbortError - user cancelled
          console.log('[ChatScreen] Stream aborted by user');
        } else {
          console.error('[ChatScreen] Stream error:', err);
          // Graceful fallback if FreeToken is down or fails
          appendToLastMessage('\n\n*(Error connecting to AI backend)*');
        }
      } finally {
        setStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [messages, isStreaming, addMessage, appendToLastMessage, setStreaming, setTtft, currentConversationId]
  );

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.surface}
        translucent={false}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'android' ? 'padding' : 'padding'}
        keyboardVerticalOffset={0}
      >
        <Header ttft={ttft} />

        <View style={styles.messageArea}>
          <MessageList messages={messages} isStreaming={isStreaming} />
        </View>

        <ChatInput onSend={handleSend} onStop={handleStop} disabled={isStreaming} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  messageArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
