import * as SQLite from 'expo-sqlite';
import { SupabaseMessage, SupabaseConversation } from './supabase';

const DB_NAME = 'ai_support_chat.db';

export async function getDb() {
  return await SQLite.openDatabaseAsync(DB_NAME);
}

export async function initDatabase() {
  const db = await getDb();
  
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS local_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT DEFAULT 'New Conversation',
      model TEXT NOT NULL DEFAULT 'default',
      created_at TEXT NOT NULL,
      sync_status TEXT DEFAULT 'synced' -- 'synced' | 'pending'
    );

    CREATE TABLE IF NOT EXISTS local_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tokens_used INTEGER DEFAULT 0,
      latency_ms INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      sync_status TEXT DEFAULT 'synced', -- 'synced' | 'pending'
      FOREIGN KEY (conversation_id) REFERENCES local_conversations (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conv ON local_messages (conversation_id, created_at);
  `);
}

// ─── Local Conversations ──────────────────────────────────────────────────────

export async function saveLocalConversation(conv: SupabaseConversation & { sync_status?: 'synced' | 'pending' }) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO local_conversations (id, user_id, title, model, created_at, sync_status) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [conv.id, conv.user_id, conv.title, conv.model, conv.created_at, conv.sync_status || 'synced']
  );
}

export async function getLocalConversations(userId: string): Promise<SupabaseConversation[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SupabaseConversation>(
    `SELECT * FROM local_conversations WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getLocalConversation(id: string): Promise<SupabaseConversation | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<SupabaseConversation>(
    `SELECT * FROM local_conversations WHERE id = ?`,
    [id]
  );
  return row;
}

// ─── Local Messages ───────────────────────────────────────────────────────────

export async function saveLocalMessage(msg: SupabaseMessage & { sync_status?: 'synced' | 'pending' }) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO local_messages (id, conversation_id, role, content, tokens_used, latency_ms, created_at, sync_status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [msg.id, msg.conversation_id, msg.role, msg.content, msg.tokens_used, msg.latency_ms, msg.created_at, msg.sync_status || 'synced']
  );
}

export async function getLocalMessages(conversationId: string, limit = 50, offset = 0): Promise<SupabaseMessage[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SupabaseMessage>(
    `SELECT * FROM local_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [conversationId, limit, offset]
  );
  // Return in chronological order for UI
  return rows.reverse();
}

// ─── Sync Queries ─────────────────────────────────────────────────────────────

export async function getPendingConversations() {
  const db = await getDb();
  return await db.getAllAsync<SupabaseConversation>(`SELECT * FROM local_conversations WHERE sync_status = 'pending'`);
}

export async function getPendingMessages() {
  const db = await getDb();
  return await db.getAllAsync<SupabaseMessage>(`SELECT * FROM local_messages WHERE sync_status = 'pending'`);
}

export async function markConversationSynced(id: string) {
  const db = await getDb();
  await db.runAsync(`UPDATE local_conversations SET sync_status = 'synced' WHERE id = ?`, [id]);
}

export async function markMessageSynced(id: string) {
  const db = await getDb();
  await db.runAsync(`UPDATE local_messages SET sync_status = 'synced' WHERE id = ?`, [id]);
}

export async function clearLocalDatabase() {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM local_messages;
    DELETE FROM local_conversations;
  `);
}
