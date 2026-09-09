"""Runtime paths and deploy settings. Override with env vars on Render."""
from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Persistent disk mount on Render (optional). Default: app dir (ephemeral).
DATA_DIR = Path(os.environ.get("DATA_DIR", str(BASE_DIR)))

STATIC_DIR = Path(os.environ.get("STATIC_DIR", str(DATA_DIR / "static")))
FRAMES_DIR = STATIC_DIR / "frames"
FACES_DIR = STATIC_DIR / "faces"
DB_PATH = Path(os.environ.get("DB_PATH", str(DATA_DIR / "facematcher.db")))

CORS_ORIGINS_RAW = os.environ.get("CORS_ORIGINS", "*").strip() or "*"


def cors_origins() -> list[str]:
    if CORS_ORIGINS_RAW == "*":
        return ["*"]
    return [o.strip().rstrip("/") for o in CORS_ORIGINS_RAW.split(",") if o.strip()]


def ensure_dirs() -> None:
    FRAMES_DIR.mkdir(parents=True, exist_ok=True)
    FACES_DIR.mkdir(parents=True, exist_ok=True)
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
