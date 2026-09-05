"""
Memory windowing: trims conversation history to stay within the upstream
model's context limit before sending to FreeToken.

Token counting uses tiktoken (cl100k_base) as a universal approximation
that works for GPT, Llama, DeepSeek, and most other models.
"""
import os
from typing import Optional
import tiktoken

MAX_CONTEXT_TOKENS = int(os.getenv("MAX_CONTEXT_TOKENS", "8192"))
# Reserve some budget for the model's response
RESPONSE_RESERVE = int(os.getenv("RESPONSE_RESERVE", "1024"))
EFFECTIVE_LIMIT = MAX_CONTEXT_TOKENS - RESPONSE_RESERVE

_enc = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    """Estimate token count using cl100k_base tokenizer."""
    return len(_enc.encode(text))


def count_message_tokens(message: dict) -> int:
    """Count tokens for a single message dict (role + content overhead ~4 tokens)."""
    return count_tokens(message.get("content", "")) + 4


def window_messages(
    messages: list[dict],
    system_prompt: Optional[str] = None,
) -> list[dict]:
    """
    Given a full message history, return a trimmed list that fits within
    EFFECTIVE_LIMIT tokens.

    Strategy:
    1. Always include the system prompt (if any).
    2. Always include the last user message.
    3. Fill remaining budget with the most recent messages (newest first).
    4. Drop the oldest messages first.
    """
    windowed: list[dict] = []
    budget = EFFECTIVE_LIMIT

    # Reserve budget for system prompt
    system_messages: list[dict] = []
    if system_prompt:
        sys_msg = {"role": "system", "content": system_prompt}
        sys_tokens = count_message_tokens(sys_msg)
        if sys_tokens <= budget:
            system_messages = [sys_msg]
            budget -= sys_tokens

    # Work backwards through history to fill the remaining budget
    non_system = [m for m in messages if m.get("role") != "system"]
    for msg in reversed(non_system):
        tokens = count_message_tokens(msg)
        if tokens <= budget:
            windowed.insert(0, msg)
            budget -= tokens
        else:
            # If we hit the limit and the very last user message isn't yet
            # included, truncate its content to fit
            if not windowed or windowed[0].get("role") != "user":
                truncated = msg["content"][: max(0, budget * 4)]  # ~4 chars/token
                windowed.insert(0, {**msg, "content": truncated})
            break

    return system_messages + windowed
