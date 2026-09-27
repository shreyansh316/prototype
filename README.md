# AI Chat Prototypes Workspace

Welcome to the AI Chat Prototypes monorepo! This workspace contains a collection of connected applications built to test offline-first mobile AI experiences and performant backend proxies.

## Projects included in this Workspace

### 1. `ai-support-chatbot` (React Native / Expo)
A premium, "Dark Luxury" mobile interface designed with edge-to-edge layouts and smooth micro-interactions.
- **Offline First**: Utilizes local SQLite databases with a background Sync Queue architecture to operate without an internet connection.
- **Resilient Auth**: Powered by Supabase with hardened native error boundaries and robust Async Storage persistence.
- **Hermes Optimized**: Native crash-protection mechanisms tailored for the new Hermes Bridgeless architecture.

### 2. `freetoken-chat` (Python / FastAPI)
A resilient FreeToken API proxy gateway designed for LLM integration.
- **OpenAI Compatible**: Exposes standard `/v1/chat/completions` endpoints.
- **Token Pooling**: Intelligent rotation of tokens to bypass rate limits and exhaustions.
- **SSE Streaming**: Supports seamless Server-Sent Events for real-time text generation in the UI.

### 3. `my-chat-app` (Expo)
A fresh Expo boilerplate for future chat experimentations.

---

## Security Notice
This repository handles authentication via Supabase. Make sure to populate the respective `.env` files in each sub-directory before starting the development servers. Do **not** commit actual environment variables.
