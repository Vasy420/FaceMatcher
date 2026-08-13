import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database import FACE_CACHE, init_db
from routes.emotion import router as emotion_router
from routes.face_db import router as db_router
from routes.face_live import router as live_router
from routes.face_video import router as video_router

STATIC_DIR = Path(__file__).parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
(STATIC_DIR / "frames").mkdir(exist_ok=True)
(STATIC_DIR / "faces").mkdir(exist_ok=True)

_frontend_raw = os.environ.get("FRONTEND_DIST", "").strip()
FRONTEND_DIST = Path(_frontend_raw).expanduser() if _frontend_raw else None
APP_VERSION = "1.1.0"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="FaceMatcher API", version=APP_VERSION, lifespan=lifespan)

_raw_origins = os.environ.get("CORS_ORIGINS", "*").strip()
_origins = ["*"] if _raw_origins == "*" else [o.strip() for o in _raw_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.include_router(video_router)
app.include_router(live_router)
app.include_router(db_router)
app.include_router(emotion_router)


@app.get("/health")
def health():
    return {"status": "ok", "version": APP_VERSION}


@app.get("/")
def root():
    if FRONTEND_DIST:
        index = FRONTEND_DIST / "index.html"
        if FRONTEND_DIST.is_dir() and index.is_file():
            return FileResponse(index)
    return {"status": "ok", "version": APP_VERSION}


@app.get("/api/status")
def status():
    return {
        "status": "ok",
        "version": APP_VERSION,
        "faces": len(FACE_CACHE),
        "engines": [
            {"name": "face_recognition", "detail": "dlib · ResNet · 128-D"},
            {"name": "DeepFace + MTCNN", "detail": "7-class emotion"},
            {"name": "OpenCV", "detail": "Frame extraction · BGR"},
        ],
    }


if FRONTEND_DIST and FRONTEND_DIST.is_dir():
    @app.get("/{full_path:path}")
    def spa(full_path: str):
        reserved = ("api", "static", "health", "docs", "redoc", "openapi.json")
        first = full_path.split("/", 1)[0]
        if first in reserved:
            return {"detail": "Not found"}
        target = (FRONTEND_DIST / full_path).resolve()
        root = FRONTEND_DIST.resolve()
        if str(target).startswith(str(root)) and target.is_file():
            return FileResponse(target)
        return FileResponse(FRONTEND_DIST / "index.html")
