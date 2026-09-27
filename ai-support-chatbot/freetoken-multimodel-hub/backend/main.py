import os
import json
import logging
import asyncio
from typing import List, Dict, Optional
import httpx
import tiktoken
import chromadb
import requests
from pypdf import PdfReader
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("API-Gateway")

app = FastAPI(title="FreeToken Resilient API Gateway")

# Enable CORS for frontend interactions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core Gateway Config
FREETOKEN_URL = os.getenv("FREETOKEN_URL", "http://localhost:11434/v1")
ALTERNATIVE_UPSTREAM_URL = os.getenv("ALTERNATIVE_UPSTREAM_URL", "https://api.openai.com/v1")
UPSTREAM_API_KEY = os.getenv("UPSTREAM_API_KEY", "dummy")
TOKEN_LIMIT = 4096  # Limit conversation history segment

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")

# ChromaDB Setup
chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection("uploaded_docs")

class Message(BaseModel):
    role: str
    content: str

class ChatPayload(BaseModel):
    model: str
    messages: List[Message]
    stream: Optional[bool] = True

def count_tokens(text: str, model: str = "gpt-4") -> int:
    """Helper to estimate tokens using tiktoken (fallback to simple word split)."""
    try:
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))
    except Exception:
        return len(text.split())

def get_embedding(text: str) -> list[float]:
    """Generates embeddings using nomic-embed-text via Ollama."""
    try:
        res = requests.post(
            f"{OLLAMA_BASE_URL}/api/embeddings",
            json={"model": "nomic-embed-text", "prompt": text},
            timeout=10.0
        )
        res.raise_for_status()
        return res.json()["embedding"]
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        return []

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    """Extracts, chunks, embeds, and stores uploaded PDF files."""
    try:
        reader = PdfReader(file.file)
        extracted_text = "\n".join([page.extract_text() or "" for page in reader.pages])

        # Simple 500-word chunking strategy
        words = extracted_text.split()
        chunk_size, overlap = 500, 50
        chunks = [
            " ".join(words[i : i + chunk_size])
            for i in range(0, len(words), chunk_size - overlap)
        ]

        indexed = 0
        for idx, chunk in enumerate(chunks):
            if not chunk.strip():
                continue
            vector = get_embedding(chunk)
            if not vector: continue
            collection.add(
                ids=[f"{file.filename}_chunk_{idx}"],
                embeddings=[vector],
                documents=[chunk],
                metadatas=[{"source": file.filename}]
            )
            indexed += 1

        return {"status": "success", "chunks_indexed": indexed, "file": file.filename}
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to process document")

async def generate_summary(messages: List[Message]) -> str:
    """Invokes a fast local MoE model via FreeToken to condense chat history."""
    payload = {
        "model": "openai/deepseek-v4-flash",
        "messages": [
            {"role": "system", "content": "You are a context compression assistant. Summarize the key facts and outcomes of this conversation compactly."},
            {"role": "user", "content": "\n".join([f"{m.role}: {m.content}" for m in messages])}
        ],
        "max_tokens": 300
    }
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(f"{FREETOKEN_URL}/chat/completions", json=payload, timeout=15.0)
            if res.status_code == 200:
                return res.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"Failed to generate summary: {e}")
    return "Prior conversation context condensed."

async def manage_history_window(messages: List[Message]) -> List[Message]:
    """Prunes history if it exceeds token budget, inserting a summarized window context."""
    total_tokens = sum([count_tokens(m.content) for m in messages])
    if total_tokens <= TOKEN_LIMIT:
        return messages

    logger.info("Context threshold breached. Compacting conversation...")
    # Keep the final 3 turns untouched to maintain active context flow
    static_window = messages[-3:]
    to_summarize = messages[:-3]

    summary_text = await generate_summary(to_summarize)
    summarized_message = Message(
        role="system",
        content=f"[Context Summary]: {summary_text}"
    )
    return [summarized_message] + static_window

# ----------------- Fallback Router & Stream Handler -----------------

async def sse_stream_generator(url: str, headers: Dict, payload: Dict):
    """Executes the streaming connection with automated failover handling."""
    client = httpx.AsyncClient()
    try:
        # Request stream from primary engine
        async with client.stream("POST", f"{url}/chat/completions", json=payload, headers=headers, timeout=10.0) as response:
            if response.status_code != 200:
                raise httpx.HTTPStatusError("Primary Engine Unhealthy", request=response.request, response=response)

            async for line in response.iter_lines():
                if line:
                    yield f"{line}\n\n"

    except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPStatusError) as primary_err:
        logger.warning(f"Primary server stalled/failed: {primary_err}. Initiating automatic fallback...")

        # Automatic Fallback to alternate cloud model / standard OpenAI proxy
        fallback_headers = {"Authorization": f"Bearer {UPSTREAM_API_KEY}"} if UPSTREAM_API_KEY != "dummy" else {}
        fallback_payload = {**payload, "model": "gpt-4o-mini"} # Safe fallback option

        try:
            async with client.stream("POST", f"{ALTERNATIVE_UPSTREAM_URL}/chat/completions", json=fallback_payload, headers=fallback_headers, timeout=20.0) as fallback_res:
                async for line in fallback_res.iter_lines():
                    if line:
                        yield f"{line}\n\n"
        except Exception as fb_err:
            logger.error(f"Fallback path failed: {fb_err}")
            yield f"data: {json.dumps({'error': 'All active inference pipelines have stalled. Please check your GPU serving logs.'})}\n\n"
            yield "data: [DONE]\n\n"
    finally:
        await client.aclose()

@app.post("/api/chat")
async def chat_api(payload: ChatPayload):
    # Apply context management windowing
    payload.messages = await manage_history_window(payload.messages)

    headers = {"Content-Type": "application/json"}
    
    # RAG & Ollama Routing
    is_ollama_model = payload.model in ["openthinker:7b", "openchat:7b", "openhermes:v2.5"]
    
    if is_ollama_model:
        target_url = OLLAMA_BASE_URL
        # If user asks a question, retrieve context
        last_message = payload.messages[-1].content
        query_vector = get_embedding(last_message)
        
        if query_vector:
            results = collection.query(query_embeddings=[query_vector], n_results=3)
            if results and results["documents"] and len(results["documents"][0]) > 0:
                retrieved_context = "\n\n---\n\n".join(results["documents"][0])
                system_prompt = (
                    "You are an enterprise-grade document intelligence assistant. Your role is to examine user queries against supplied document excerpts with strict factual integrity.\n"
                    "Instructions:\n"
                    "1. Answer based only on the facts present in the provided document context.\n"
                    "2. Cite specific sections, tables, or page references whenever available in the retrieved fragments.\n"
                    "3. If the retrieved context contains insufficient information to fully answer the query, clearly state what information is missing rather than speculating.\n"
                    "4. Structure analytical answers with clear bullet points, code blocks, or markdown tables for readability.\n\n"
                    f"Context:\n{retrieved_context}"
                )
                # Inject system prompt at the beginning
                payload.messages.insert(0, Message(role="system", content=system_prompt))
    else:
        target_url = FREETOKEN_URL

    formatted_payload = {
        "model": payload.model,
        "messages": [m.model_dump() for m in payload.messages],
        "stream": payload.stream
    }

    return StreamingResponse(
        sse_stream_generator(target_url, headers, formatted_payload),
        media_type="text/event-stream"
    )

@app.get("/api/models")
async def list_models_gateway():
    """Fetches list of active models served by local FreeToken GPU."""
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(f"{FREETOKEN_URL}/models", timeout=5.0)
            if res.status_code == 200:
                return res.json()
        except Exception:
            logger.warning("Local engine offline. Returning fallback model list.")

    # Default fallback models
    return {
        "data": [
            {"id": "openai/deepseek-v4-flash", "object": "model"},
            {"id": "openai/qwen3.6-35b-a3b", "object": "model"},
            {"id": "openai/gpt-4o", "object": "model"},
            {"id": "openthinker:7b", "object": "model"},
            {"id": "openchat:7b", "object": "model"},
            {"id": "openhermes:v2.5", "object": "model"}
        ]
    }

@app.get("/api/health")
async def health_check():
    """Validates connectivity of both the Gateway and local GPU MoE engine."""
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(f"{FREETOKEN_URL}/models", timeout=2.0)
            freetoken_status = "Online" if res.status_code == 200 else "Degraded"
        except Exception:
            freetoken_status = "Offline"

    return {
        "gateway_status": "Healthy",
        "gpu_moe_engine": freetoken_status,
        "primary_url": FREETOKEN_URL
    }
