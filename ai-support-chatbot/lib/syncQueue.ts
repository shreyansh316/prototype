import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import {
  getPendingConversations,
  getPendingMessages,
  markConversationSynced,
  markMessageSynced,
} from './database';

let isSyncing = false;

/**
 * Background worker to flush locally saved records to Supabase when online.
 * Safe to call repeatedly (e.g. on every netinfo change or message send).
 */
export async function flushSyncQueue() {
  if (isSyncing) return;

  const state = await NetInfo.fetch();
  if (!state.isConnected) return;

  isSyncing = true;
  try {
    // 1. Sync pending conversations
    const pendingConvs = await getPendingConversations();
    for (const conv of pendingConvs) {
      const { error } = await supabase.from('conversations').upsert({
        id: conv.id,
        user_id: conv.user_id,
        title: conv.title,
        model: conv.model,
        created_at: conv.created_at,
      });
      if (!error) {
        await markConversationSynced(conv.id);
      } else {
        console.warn('[Sync] Failed to sync conv:', error.message);
      }
    }

    // 2. Sync pending messages
    const pendingMsgs = await getPendingMessages();
    for (const msg of pendingMsgs) {
      const { error } = await supabase.from('messages').upsert({
        id: msg.id,
        conversation_id: msg.conversation_id,
        role: msg.role,
        content: msg.content,
        tokens_used: msg.tokens_used,
        latency_ms: msg.latency_ms,
        created_at: msg.created_at,
      });
      if (!error) {
        await markMessageSynced(msg.id);
      } else {
        console.warn('[Sync] Failed to sync msg:', error.message);
      }
    }
  } catch (err) {
    console.error('[Sync] Queue flush error:', err);
  } finally {
    isSyncing = false;
  }
}

/**
 * Start observing network state changes to flush queue automatically.
 */
export function startNetworkObserver() {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      flushSyncQueue();
    }
  });
}
