from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import tempfile, uuid, cv2, face_recognition
from pathlib import Path
from utils.face_utils import (
    annotate_bgr,
    clamp_upload,
    distance_to_confidence,
    encode_face_from_bytes,
    resize_if_large,
)

router = APIRouter(prefix="/api/match", tags=["video"])

FRAMES_DIR = Path(__file__).parent.parent / "static" / "frames"
FRAMES_DIR.mkdir(parents=True, exist_ok=True)
MAX_IMAGE = 8 * 1024 * 1024
MAX_VIDEO = 120 * 1024 * 1024


@router.post("/video")
async def match_video(
    reference_image: UploadFile = File(...),
    video: UploadFile = File(...),
    threshold: float = Form(0.6),
    frame_skip: int = Form(5),
):
    threshold = min(0.95, max(0.2, float(threshold)))
    frame_skip = min(30, max(1, int(frame_skip)))

    ref_data = await reference_image.read()
    clamp_upload(ref_data, MAX_IMAGE, "Reference image")
    ref_encoding = encode_face_from_bytes(ref_data)
    if ref_encoding is None:
        raise HTTPException(status_code=422, detail="No face detected in reference image.")

    video_bytes = await video.read()
    clamp_upload(video_bytes, MAX_VIDEO, "Video")
    suffix = Path(video.filename or "video.mp4").suffix or ".mp4"
    tmp_path = Path(tempfile.gettempdir()) / f"{uuid.uuid4().hex}{suffix}"
    tmp_path.write_bytes(video_bytes)

    try:
        cap = cv2.VideoCapture(str(tmp_path))
        if not cap.isOpened():
            raise HTTPException(status_code=422, detail="Cannot open video file.")

        try:
            fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = total_frames / fps if fps > 0 else 0

            matches = []
            frame_number = 0

            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                frame_number += 1
                if frame_number % frame_skip != 0:
                    continue

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                work = resize_if_large(rgb, 960)
                locations = face_recognition.face_locations(work)
                if not locations:
                    continue
                encodings = face_recognition.face_encodings(work, locations)
                scale = rgb.shape[1] / work.shape[1]

                for loc, enc in zip(locations, encodings):
                    dist = face_recognition.face_distance([ref_encoding], enc)[0]
                    confidence = distance_to_confidence(dist)
                    if confidence >= threshold:
                        top, right, bottom, left = [int(v * scale) for v in loc]
                        timestamp = frame_number / fps
                        fname = f"{uuid.uuid4().hex}.jpg"
                        frame_path = FRAMES_DIR / fname
                        annotated = frame.copy()
                        annotate_bgr(
                            annotated,
                            (top, right, bottom, left),
                            f"{confidence * 100:.0f}%",
                            (80, 200, 120) if confidence >= 0.6 else (40, 180, 240),
                        )
                        cv2.imwrite(str(frame_path), annotated)
                        matches.append({
                            "timestamp_seconds": round(timestamp, 2),
                            "frame_number": frame_number,
                            "confidence": round(confidence, 3),
                            "bbox": [top, right, bottom, left],
                            "frame_url": f"/static/frames/{fname}",
                        })
        finally:
            cap.release()
    finally:
        tmp_path.unlink(missing_ok=True)

    return {
        "total_frames_scanned": frame_number // frame_skip,
        "video_duration_seconds": round(duration, 2),
        "fps": round(fps, 2),
        "matches": matches,
    }
