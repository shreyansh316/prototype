"""Models router — proxies /v1/models from FreeToken."""
from fastapi import APIRouter
from services import freetoken_client

router = APIRouter(tags=["models"])


@router.get("/models")
async def list_models():
    models = await freetoken_client.list_models()
    return {"models": models}
