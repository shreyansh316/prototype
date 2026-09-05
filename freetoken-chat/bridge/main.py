"""
FreeToken Bridge — FastAPI Application Entry Point
Proxies requests to the FreeToken (or any OpenAI-compatible) backend,
adds session persistence, memory windowing, and retry routing.
"""
import os
from contextlib import asynccontextmanager
from pathlib import Path

import aiosqlite
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import chat, models, sessions

load_dotenv()

DB_PATH = Path(os.getenv("DB_PATH", "/data/chat.db"))


# ── Lifespan: init SQLite schema on startup ──────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    schema = (Path(__file__).parent / "db" / "schema.sql").read_text()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(schema)
        await db.commit()
    app.state.db_path = str(DB_PATH)
    yield


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="FreeToken Chat Bridge",
    description="OpenAI-compatible proxy with session history and streaming",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router,     prefix="/api")
app.include_router(models.router,   prefix="/api")
app.include_router(sessions.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
