"""Input validation helpers (ported & adapted from PythonProject/utils.py)."""
from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
import io

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_FORMATS = {"JPEG", "JPG", "PNG", "WEBP"}
MIN_IMAGE_DIM = 50
MAX_IMAGE_DIM = 4000
MAX_VIDEO_DURATION_SEC = int(os.environ.get("MAX_VIDEO_DURATION_SEC", "600"))
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_VIDEO_BYTES = 100 * 1024 * 1024


def validate_image_bytes(data: bytes, filename: str = "image") -> tuple[bool, str]:
    """
    Validate image bytes for face / template matching.
    Returns (ok, error_message).
    """
    if not data:
        return False, "Empty image file."
    if len(data) > MAX_IMAGE_BYTES:
        return False, f"Image too large (max {MAX_IMAGE_BYTES // (1024 * 1024)} MB)."

    try:
        img = Image.open(io.BytesIO(data))
        img.verify()
        img = Image.open(io.BytesIO(data))  # re-open after verify
        fmt = (img.format or "").upper()
        if fmt == "JPG":
            fmt = "JPEG"
        if fmt not in ALLOWED_IMAGE_FORMATS:
            return False, f"Unsupported image format: {fmt or 'unknown'}. Use JPG, PNG, or WEBP."

        width, height = img.size
        if width < MIN_IMAGE_DIM or height < MIN_IMAGE_DIM:
            return False, f"Image too small ({width}x{height}). Minimum {MIN_IMAGE_DIM}px."
        if width > MAX_IMAGE_DIM or height > MAX_IMAGE_DIM:
            return False, f"Image too large ({width}x{height}). Maximum {MAX_IMAGE_DIM}px."

        arr = np.array(img.convert("RGB"))
        if arr is None or arr.size == 0:
            return False, "Could not decode image pixels."

        logger.info("Image validated: %s %sx%s %s", filename, width, height, fmt)
        return True, ""
    except Exception as e:
        logger.error("Image validation failed for %s: %s", filename, e)
        return False, f"Invalid image: {e}"


def validate_video_path(path: str | Path, filename: str = "video") -> tuple[bool, str, dict]:
    """
    Validate a video file on disk with OpenCV.
    Returns (ok, error_message, meta).
    """
    path = Path(path)
    meta: dict = {}
    if not path.exists():
        return False, "Video file not found.", meta

    size = path.stat().st_size
    if size > MAX_VIDEO_BYTES:
        return False, f"Video too large (max {MAX_VIDEO_BYTES // (1024 * 1024)} MB).", meta
    if size == 0:
        return False, "Empty video file.", meta

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        return False, "Cannot open video file. Use MP4, AVI, or MOV.", meta

    try:
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

        if fps <= 0 or frame_count <= 0:
            return False, "Invalid video metadata (no frames or FPS).", meta

        duration = frame_count / fps
        if duration > MAX_VIDEO_DURATION_SEC:
            return False, f"Video too long ({duration:.0f}s). Max {MAX_VIDEO_DURATION_SEC // 60} minutes.", meta

        meta = {
            "fps": round(fps, 2),
            "frame_count": frame_count,
            "duration_seconds": round(duration, 2),
            "width": width,
            "height": height,
        }
        logger.info(
            "Video validated: %s duration=%.1fs fps=%.1f frames=%d",
            filename, duration, fps, frame_count,
        )
        return True, "", meta
    finally:
        cap.release()


def write_temp_file(data: bytes, suffix: str) -> Path:
    """Write bytes to a named temp file and return its path."""
    fd, name = tempfile.mkstemp(suffix=suffix)
    try:
        os.write(fd, data)
    finally:
        os.close(fd)
    return Path(name)
