import os

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import STATIC_DIR, cors_origins, ensure_dirs
from database import init_db, list_faces
from routes.face_video import router as video_router
from routes.face_live import router as live_router
from routes.face_db import router as db_router
from routes.emotion import router as emotion_router

ensure_dirs()

try:
    import cv2
    cv2.setNumThreads(1)
except Exception:
    pass

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


@app.get("/")
def health():
    return _health_payload()


@app.get("/health", include_in_schema=False)
def health_check():
    return _health_payload()


@app.get("/api/stats")
def stats():
    """Lightweight stats for the dashboard."""
    faces = list_faces()
    return {
        "enrolled_faces": len(faces),
        "status": "ok",
    }
