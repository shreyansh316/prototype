# FreeToken Chat — Build Tasks

## Project Scaffold
- [/] Bootstrap Next.js frontend (create-next-app)
- [ ] Create bridge/ directory structure (FastAPI)

## Bridge (FastAPI)
- [ ] requirements.txt
- [ ] Dockerfile (bridge)
- [ ] main.py
- [ ] routers/chat.py (SSE streaming)
- [ ] routers/models.py
- [ ] services/freetoken_client.py (retry router)
- [ ] services/history.py (SQLite CRUD)
- [ ] services/windowing.py (token windowing)
- [ ] db/schema.sql

## Frontend (Next.js)
- [ ] tailwind.config.ts + globals.css
- [ ] lib/api.ts
- [ ] lib/exportChat.ts
- [ ] hooks/useChat.ts (SSE + AbortController)
- [ ] hooks/useModels.ts
- [ ] components/Sidebar.tsx
- [ ] components/ModelSelector.tsx
- [ ] components/TokenCounter.tsx
- [ ] components/MessageBubble.tsx (markdown+LaTeX+code)
- [ ] components/ChatInput.tsx
- [ ] components/ChatWindow.tsx
- [ ] app/layout.tsx
- [ ] app/page.tsx

## Infra
- [ ] docker-compose.yml
- [ ] .env.example
- [ ] Dockerfile (frontend)
- [ ] start.ps1 (non-Docker Windows start script)

## Verify
- [ ] Bridge starts: uvicorn bridge.main:app
- [ ] Frontend starts: npm run dev
