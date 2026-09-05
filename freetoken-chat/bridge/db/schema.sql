-- SQLite schema for chat session persistence

CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,          -- UUID
    title       TEXT NOT NULL DEFAULT 'New Chat',
    model       TEXT NOT NULL DEFAULT '',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK(role IN ('system', 'user', 'assistant')),
    content     TEXT NOT NULL,
    token_count INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
