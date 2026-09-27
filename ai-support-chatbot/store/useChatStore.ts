import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number; // Unix ms
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentConversationId: string | null;  // Phase 3: Supabase conversation ID
  ttft: number | null;

  // Actions
  addMessage: (role: MessageRole, content: string) => string;
  appendToLastMessage: (chunk: string) => void;
  setStreaming: (value: boolean) => void;
  setConversationId: (id: string | null) => void;
  setTtft: (ms: number | null) => void;
  loadMessages: (messages: ChatMessage[]) => void;
  clearChat: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      isStreaming: false,
      currentConversationId: null,
      ttft: null,

      addMessage: (role, content) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const newMessage: ChatMessage = {
          id,
          role,
          content,
          timestamp: Date.now(),
        };
        set((state) => ({ messages: [...state.messages, newMessage] }));
        return id;
      },

      appendToLastMessage: (chunk) => {
        set((state) => {
          const msgs = [...state.messages];
          if (msgs.length === 0) return state;
          const last = { ...msgs[msgs.length - 1] };
          last.content += chunk;
          msgs[msgs.length - 1] = last;
          return { messages: msgs };
        });
      },

      setStreaming: (value) => set({ isStreaming: value }),

      setConversationId: (id) => set({ currentConversationId: id }),

      setTtft: (ms) => set({ ttft: ms }),

      // Replaces the local cache with messages loaded from Supabase on login
      loadMessages: (messages) => set({ messages }),

      clearChat: () => set({ messages: [], isStreaming: false, currentConversationId: null, ttft: null }),
    }),
    {
      name: 'ai-support-chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist messages and conversationId; streaming state is ephemeral
      partialize: (state) => ({
        messages: state.messages,
        currentConversationId: state.currentConversationId,
      }),
    }
  )
);
