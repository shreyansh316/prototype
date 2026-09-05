"""
FreeToken upstream client with retry/fallback routing.
Handles SSE stream parsing and passes raw chunks upstream to the caller.
"""
import asyncio
import json
import os
import time
from typing import AsyncIterator

import httpx

FREETOKEN_BASE_URL = os.getenv("FREETOKEN_BASE_URL", "http://localhost:8000").rstrip("/")
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
REQUEST_TIMEOUT = float(os.getenv("REQUEST_TIMEOUT", "120.0"))
RETRY_BACKOFF = 2.0   # seconds between retries


# ── Non-streaming completion ──────────────────────────────────────────────────
async def complete(payload: dict) -> dict:
    """Send a non-streaming chat completion and return the full response."""
    payload = {**payload, "stream": False}
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                resp = await client.post(
                    f"{FREETOKEN_BASE_URL}/v1/chat/completions",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                resp.raise_for_status()
                return resp.json()
            except (httpx.HTTPStatusError, httpx.RequestError) as exc:
                if attempt == MAX_RETRIES:
                    raise
                status = getattr(exc.response, "status_code", 0) if hasattr(exc, "response") else 0
                if status in (429, 503):
                    await asyncio.sleep(RETRY_BACKOFF * attempt)
                else:
                    raise


# ── Streaming completion ──────────────────────────────────────────────────────
async def stream_complete(
    payload: dict,
) -> AsyncIterator[str]:
    """
    Yield raw SSE lines from FreeToken.
    Each yielded value is a complete `data: {...}` line (or `data: [DONE]`).
    Retries up to MAX_RETRIES on 429/503 before propagating the error.
    """
    payload = {**payload, "stream": True}

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
                async with client.stream(
                    "POST",
                    f"{FREETOKEN_BASE_URL}/v1/chat/completions",
                    json=payload,
                    headers={"Content-Type": "application/json", "Accept": "text/event-stream"},
                ) as resp:
                    if resp.status_code in (429, 503) and attempt < MAX_RETRIES:
                        await asyncio.sleep(RETRY_BACKOFF * attempt)
                        continue
                    resp.raise_for_status()

                    buffer = ""
                    async for chunk in resp.aiter_text():
                        buffer += chunk
                        while "\n" in buffer:
                            line, buffer = buffer.split("\n", 1)
                            line = line.strip()
                            if line.startswith("data:"):
                                payload_str = line[len("data:"):].strip()
                                if payload_str == "[DONE]":
                                    yield "data: [DONE]\n\n"
                                    return
                                # Validate JSON before forwarding
                                try:
                                    json.loads(payload_str)
                                    yield f"data: {payload_str}\n\n"
                                except json.JSONDecodeError:
                                    pass   # skip malformed chunks
            return  # success — exit retry loop

        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            if attempt == MAX_RETRIES:
                # Surface a structured error chunk so the UI can display it
                err = {"error": {"message": str(exc), "type": "upstream_error"}}
                yield f"data: {json.dumps(err)}\n\n"
                yield "data: [DONE]\n\n"
                return
            await asyncio.sleep(RETRY_BACKOFF * attempt)


# ── Available models ──────────────────────────────────────────────────────────
async def list_models() -> list[dict]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                resp = await client.get(f"{FREETOKEN_BASE_URL}/v1/models")
                resp.raise_for_status()
                data = resp.json()
                return data.get("data", data) if isinstance(data, dict) else data
            except Exception:
                if attempt == MAX_RETRIES:
                    return []
                await asyncio.sleep(RETRY_BACKOFF)
