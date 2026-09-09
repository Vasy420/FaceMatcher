import os
from pathlib import Path

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from config import STATIC_DIR, cors_origins, ensure_dirs
from database import FACE_CACHE, init_db, list_faces
from routes.emotion import router as emotion_router
from routes.face_db import router as db_router
from routes.face_live import router as live_router
from routes.face_video import router as video_router

ensure_dirs()

try:
    import cv2
    cv2.setNumThreads(1)
except Exception:
    pass

_frontend_raw = os.environ.get("FRONTEND_DIST", "").strip()
FRONTEND_DIST = Path(_frontend_raw).expanduser() if _frontend_raw else None

app = FastAPI(
    title="FaceMatcher API",
    version="2.0.0",
    description="Face recognition + image-in-video matching, live webcam, face DB, emotion detection.",
)

_origins = cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.include_router(video_router)
app.include_router(live_router)
app.include_router(db_router)
app.include_router(emotion_router)


@app.on_event("startup")
def startup():
    ensure_dirs()
    init_db()


def _health_payload():
    return {
        "status": "ok",
        "version": "2.0.0",
        "modules": ["video", "live", "faces", "emotion", "template"],
    }


@app.get("/health")
def health_check():
    return _health_payload()


@app.get("/")
def root():
    if FRONTEND_DIST:
        index = FRONTEND_DIST / "index.html"
        if index.is_file():
            return FileResponse(index)
    return _health_payload()


@app.get("/api/stats")
def stats():
    faces = list_faces()
    return {"enrolled_faces": len(faces), "status": "ok"}


@app.get("/api/status")
def api_status():
    return {
        "status": "ok",
        "version": "2.0.0",
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
            return JSONResponse({"detail": "Not found"}, status_code=404)
        index = FRONTEND_DIST / "index.html"
        target = (FRONTEND_DIST / full_path).resolve()
        root = FRONTEND_DIST.resolve()
        try:
            target.relative_to(root)
        except ValueError:
            return FileResponse(index)
        if target.is_file():
            return FileResponse(target)
        return FileResponse(index)
