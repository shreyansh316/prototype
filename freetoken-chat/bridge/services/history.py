"""
SQLite-backed chat session and message persistence.
All functions accept a db_path string and open their own short-lived connections
to stay safe across concurrent async request handlers.
"""
import uuid
from datetime import datetime
from typing import Optional

import aiosqlite


# ── Sessions ──────────────────────────────────────────────────────────────────

async def create_session(db_path: str, model: str, title: str = "New Chat") -> dict:
    session_id = str(uuid.uuid4())
    async with aiosqlite.connect(db_path) as db:
        await db.execute(
            "INSERT INTO sessions (id, title, model) VALUES (?, ?, ?)",
            (session_id, title, model),
        )
        await db.commit()
    return {"id": session_id, "title": title, "model": model}


async def list_sessions(db_path: str) -> list[dict]:
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id, title, model, created_at, updated_at "
            "FROM sessions ORDER BY updated_at DESC"
        ) as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]


async def get_session(db_path: str, session_id: str) -> Optional[dict]:
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id, title, model, created_at, updated_at FROM sessions WHERE id = ?",
            (session_id,),
        ) as cur:
            row = await cur.fetchone()
    return dict(row) if row else None


async def update_session_title(db_path: str, session_id: str, title: str) -> None:
    async with aiosqlite.connect(db_path) as db:
        await db.execute(
            "UPDATE sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (title, session_id),
        )
        await db.commit()


async def delete_session(db_path: str, session_id: str) -> None:
    async with aiosqlite.connect(db_path) as db:
        await db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        await db.commit()


# ── Messages ──────────────────────────────────────────────────────────────────

async def add_message(
    db_path: str,
    session_id: str,
    role: str,
    content: str,
    token_count: int = 0,
) -> dict:
    async with aiosqlite.connect(db_path) as db:
        cur = await db.execute(
            "INSERT INTO messages (session_id, role, content, token_count) VALUES (?, ?, ?, ?)",
            (session_id, role, content, token_count),
        )
        await db.execute(
            "UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (session_id,),
        )
        await db.commit()
        msg_id = cur.lastrowid
    return {"id": msg_id, "session_id": session_id, "role": role, "content": content}


async def get_messages(db_path: str, session_id: str) -> list[dict]:
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id, role, content, token_count, created_at "
            "FROM messages WHERE session_id = ? ORDER BY created_at ASC",
            (session_id,),
        ) as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]


async def delete_messages(db_path: str, session_id: str) -> None:
    """Clear all messages in a session (reset conversation)."""
    async with aiosqlite.connect(db_path) as db:
        await db.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        await db.commit()
