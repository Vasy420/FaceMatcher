from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from database import init_db
from routes.face_video import router as video_router
from routes.face_live import router as live_router
from routes.face_db import router as db_router
from routes.emotion import router as emotion_router

STATIC_DIR = Path(__file__).parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
(STATIC_DIR / "frames").mkdir(exist_ok=True)
(STATIC_DIR / "faces").mkdir(exist_ok=True)

app = FastAPI(title="FaceMatcher API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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
    init_db()


@app.get("/")
def health():
    return {"status": "ok"}
