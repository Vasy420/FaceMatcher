import face_recognition
import numpy as np
from PIL import Image
import io
import base64
import cv2


def load_image_bytes(data: bytes) -> np.ndarray:
    """Decode raw bytes to RGB numpy array."""
    img = Image.open(io.BytesIO(data)).convert("RGB")
    return np.array(img)


def encode_face_from_bytes(data: bytes) -> np.ndarray | None:
    """Return 128-dim encoding for the first face found in image bytes, or None."""
    img = load_image_bytes(data)
    encs = face_recognition.face_encodings(img)
    return encs[0] if encs else None


def distance_to_confidence(distance: float) -> float:
    """Map face_recognition distance [0,1+] → confidence [0,1] (higher = more likely match)."""
    return float(max(0.0, 1.0 - distance))


def is_match(distance: float, threshold: float = 0.6) -> bool:
    """threshold is confidence-space (e.g. 0.6 means distance < 0.4)."""
    return distance_to_confidence(distance) >= threshold


def decode_base64_image(b64: str) -> np.ndarray:
    """Decode base64 JPEG/PNG string to RGB numpy array."""
    raw = base64.b64decode(b64)
    return load_image_bytes(raw)


def resize_if_large(img_array: np.ndarray, max_dim: int = 800) -> np.ndarray:
    h, w = img_array.shape[:2]
    if max(h, w) <= max_dim:
        return img_array
    scale = max_dim / max(h, w)
    new_w, new_h = int(w * scale), int(h * scale)
    img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    img_bgr = cv2.resize(img_bgr, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)


def encode_frame_jpeg(frame_bgr: np.ndarray, quality: int = 80) -> bytes:
    """Encode OpenCV BGR frame to JPEG bytes."""
    _, buf = cv2.imencode(".jpg", frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return buf.tobytes()


def save_rgb_jpeg(path, rgb: np.ndarray, quality: int = 90) -> None:
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    cv2.imwrite(str(path), bgr, [int(cv2.IMWRITE_JPEG_QUALITY), quality])


def annotate_bgr(frame_bgr: np.ndarray, loc, label: str, color=(80, 200, 120)) -> None:
    top, right, bottom, left = [int(v) for v in loc]
    cv2.rectangle(frame_bgr, (left, top), (right, bottom), color, 2)
    text = str(label)
    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
    y = top - 8 if top > th + 12 else bottom + th + 8
    cv2.rectangle(frame_bgr, (left, y - th - 6), (left + tw + 8, y + 4), color, -1)
    cv2.putText(frame_bgr, text, (left + 4, y - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (20, 20, 20), 1, cv2.LINE_AA)


def clamp_upload(data: bytes, limit: int, label: str) -> None:
    from fastapi import HTTPException
    if len(data) > limit:
        mb = limit / (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"{label} exceeds {mb:.0f} MB limit.")
    if not data:
        raise HTTPException(status_code=422, detail=f"{label} is empty.")
