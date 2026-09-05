"""Sessions router — CRUD for chat session management."""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from services import history

router = APIRouter(tags=["sessions"])


class CreateSessionBody(BaseModel):
    model: str = "default"


class UpdateTitleBody(BaseModel):
    title: str


@router.post("/sessions")
async def create_session(req: Request, body: CreateSessionBody):
    return await history.create_session(req.app.state.db_path, body.model)


@router.get("/sessions")
async def list_sessions(req: Request):
    return await history.list_sessions(req.app.state.db_path)


@router.get("/sessions/{session_id}")
async def get_session(req: Request, session_id: str):
    s = await history.get_session(req.app.state.db_path, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return s


@router.get("/sessions/{session_id}/messages")
async def get_messages(req: Request, session_id: str):
    return await history.get_messages(req.app.state.db_path, session_id)


@router.patch("/sessions/{session_id}/title")
async def update_title(req: Request, session_id: str, body: UpdateTitleBody):
    await history.update_session_title(req.app.state.db_path, session_id, body.title)
    return {"ok": True}


@router.delete("/sessions/{session_id}")
async def delete_session(req: Request, session_id: str):
    await history.delete_session(req.app.state.db_path, session_id)
    return {"ok": True}


@router.delete("/sessions/{session_id}/messages")
async def clear_messages(req: Request, session_id: str):
    await history.delete_messages(req.app.state.db_path, session_id)
    return {"ok": True}
