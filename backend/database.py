import sqlite3
import numpy as np
from datetime import datetime
from pathlib import Path
from config import DB_PATH, FACES_DIR, ensure_dirs

ensure_dirs()
UPLOADS_DIR = FACES_DIR

# id -> (name, encoding_np_array)
FACE_CACHE: dict[int, tuple[str, np.ndarray]] = {}


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS known_faces (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                encoding BLOB NOT NULL,
                image_path TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.commit()
    load_cache()


def load_cache():
    global FACE_CACHE
    FACE_CACHE.clear()
    with get_db() as conn:
        rows = conn.execute("SELECT id, name, encoding FROM known_faces").fetchall()
    for row in rows:
        enc = np.frombuffer(row["encoding"], dtype=np.float64)
        FACE_CACHE[row["id"]] = (row["name"], enc)


def insert_face(name: str, encoding: np.ndarray, image_path: str) -> int:
    blob = encoding.astype(np.float64).tobytes()
    created_at = datetime.utcnow().isoformat()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO known_faces (name, encoding, image_path, created_at) VALUES (?, ?, ?, ?)",
            (name, blob, image_path, created_at),
        )
        conn.commit()
        face_id = cur.lastrowid
    FACE_CACHE[face_id] = (name, encoding.astype(np.float64))
    return face_id


def delete_face(face_id: int) -> bool:
    with get_db() as conn:
        row = conn.execute("SELECT image_path FROM known_faces WHERE id = ?", (face_id,)).fetchone()
        if not row:
            return False
        conn.execute("DELETE FROM known_faces WHERE id = ?", (face_id,))
        conn.commit()
    FACE_CACHE.pop(face_id, None)
    try:
        img_path = FACES_DIR / Path(row["image_path"]).name
        if img_path.exists():
            img_path.unlink()
    except Exception:
        pass
    return True


def list_faces() -> list[dict]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, name, image_path, created_at FROM known_faces ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]
