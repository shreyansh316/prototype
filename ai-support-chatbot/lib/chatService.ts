import { supabase } from './supabase';
import type { SupabaseConversation, SupabaseMessage } from './supabase';
import type { MessageRole } from '../store/useChatStore';
import {
  getLocalConversation,
  getLocalConversations,
  saveLocalConversation,
  saveLocalMessage,
  getLocalMessages,
} from './database';
import { flushSyncQueue } from './syncQueue';
import * as Crypto from 'expo-crypto';

// ─── Conversation Management ──────────────────────────────────────────────────

export async function getOrCreateConversation(
  userId: string,
  model: string = 'default'
): Promise<string | null> {
  try {
    // 1. Check local SQLite first
    const localConvs = await getLocalConversations(userId);
    if (localConvs.length > 0) return localConvs[0].id;

    // 2. If not local, create fresh offline conversation
    const newId = Crypto.randomUUID();
    const newConv: SupabaseConversation = {
      id: newId,
      user_id: userId,
      title: 'New Conversation',
      model,
      created_at: new Date().toISOString(),
    };

    await saveLocalConversation({ ...newConv, sync_status: 'pending' });
    
    // Trigger sync attempt
    flushSyncQueue();

    return newId;
  } catch (err) {
    console.error('[chatService] getOrCreateConversation error:', err);
    return null;
  }
}

// ─── Message Sync ─────────────────────────────────────────────────────────────

export async function saveMessage(
  conversationId: string,
  role: MessageRole | 'system',
  content: string,
  latencyMs: number = 0
): Promise<void> {
  const newMsg: SupabaseMessage = {
    id: Crypto.randomUUID(),
    conversation_id: conversationId,
    role,
    content,
    tokens_used: 0,
    latency_ms: latencyMs,
    created_at: new Date().toISOString(),
  };

  await saveLocalMessage({ ...newMsg, sync_status: 'pending' });
  
  // Trigger sync attempt
  flushSyncQueue();
}

// ─── History Loader ───────────────────────────────────────────────────────────

export async function loadConversationMessages(
  conversationId: string,
  limit = 50,
  offset = 0
): Promise<SupabaseMessage[]> {
  try {
    // Load exclusively from local SSOT
    return await getLocalMessages(conversationId, limit, offset);
  } catch (err) {
    console.error('[chatService] loadConversationMessages error:', err);
    return [];
  }
}
