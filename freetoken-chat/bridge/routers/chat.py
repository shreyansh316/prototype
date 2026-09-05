"""
Chat router — streams SSE responses from FreeToken to the browser.
POST /api/chat
"""
import json
import time
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services import freetoken_client, history, windowing

router = APIRouter(tags=["chat"])

SYSTEM_PROMPT = (
    "You are a helpful, concise AI assistant. "
    "Use Markdown for formatting. "
    "For code, always specify the language in fenced blocks."
)


class ChatRequest(BaseModel):
    session_id: str
    message: str
    model: str = "default"
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    system_prompt: Optional[str] = None


@router.post("/chat")
async def chat(req: Request, body: ChatRequest):
    db_path = req.app.state.db_path

    # 1. Validate session exists
    session = await history.get_session(db_path, body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 2. Persist user message
    user_tokens = windowing.count_tokens(body.message)
    await history.add_message(
        db_path, body.session_id, "user", body.message, user_tokens
    )

    # 3. Auto-title session from first user message (first 60 chars)
    if session["title"] == "New Chat":
        title = body.message[:60].strip().rstrip(".,!?")
        await history.update_session_title(db_path, body.session_id, title)

    # 4. Load + window conversation history
    all_msgs = await history.get_messages(db_path, body.session_id)
    openai_msgs = [{"role": m["role"], "content": m["content"]} for m in all_msgs]
    sys_prompt = body.system_prompt or SYSTEM_PROMPT
    windowed_msgs = windowing.window_messages(openai_msgs, sys_prompt)

    # 5. Build upstream payload
    payload: dict = {
        "model": body.model,
        "messages": windowed_msgs,
        "temperature": body.temperature,
        "stream": True,
    }
    if body.max_tokens:
        payload["max_tokens"] = body.max_tokens

    # 6. Stream response, collect full content for persistence
    async def event_generator():
        full_content = []
        ttft_sent = False
        start_ts = time.perf_counter()

        async for chunk in freetoken_client.stream_complete(payload):
            # Forward raw SSE chunk to browser
            yield chunk

            # Capture content delta for persistence
            raw = chunk.strip()
            if raw.startswith("data:") and not raw.endswith("[DONE]"):
                try:
                    data = json.loads(raw[5:].strip())
                    delta = (
                        data.get("choices", [{}])[0]
                        .get("delta", {})
                        .get("content", "")
                    )
                    if delta:
                        full_content.append(delta)
                        if not ttft_sent:
                            ttft_ms = int((time.perf_counter() - start_ts) * 1000)
                            # Inject TTFT as a custom SSE event
                            yield f"event: ttft\ndata: {ttft_ms}\n\n"
                            ttft_sent = True
                except (json.JSONDecodeError, IndexError, KeyError):
                    pass

        # Persist complete assistant response
        if full_content:
            assistant_text = "".join(full_content)
            ai_tokens = windowing.count_tokens(assistant_text)
            await history.add_message(
                db_path,
                body.session_id,
                "assistant",
                assistant_text,
                ai_tokens,
            )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering
        },
    )
