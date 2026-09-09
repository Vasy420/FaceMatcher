from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import uuid, cv2, face_recognition
from pathlib import Path
from config import FRAMES_DIR, ensure_dirs
from utils.face_utils import encode_face_from_bytes, distance_to_confidence
from utils.validation import validate_image_bytes, validate_video_path, write_temp_file
from utils.template_match import detect_image_in_video

router = APIRouter(prefix="/api/match", tags=["video"])
ensure_dirs()


def _dedup_matches(matches: list[dict], min_interval: float = 1.0) -> list[dict]:
    """Keep highest-confidence match per time bucket."""
    if not matches:
        return matches
    ordered = sorted(matches, key=lambda m: m["timestamp_seconds"])
    kept: list[dict] = []
    for m in ordered:
        if not kept:
            kept.append(m)
            continue
        if m["timestamp_seconds"] - kept[-1]["timestamp_seconds"] >= min_interval:
            kept.append(m)
        elif m["confidence"] > kept[-1]["confidence"]:
            kept[-1] = m
    return kept


@router.post("/video")
async def match_video(
    reference_image: UploadFile = File(...),
    video: UploadFile = File(...),
    threshold: float = Form(0.6),
    frame_skip: int = Form(5),
    mode: str = Form("face"),  # "face" | "template"
):
    """
    Scan a video for a reference image.
    - mode=face: dlib face encodings (face recognition)
    - mode=template: multi-scale OpenCV template matching (any image, from v1)
    """
    mode = (mode or "face").lower().strip()
    if mode not in ("face", "template"):
        raise HTTPException(status_code=422, detail="mode must be 'face' or 'template'.")

    ref_data = await reference_image.read()
    ok, err = validate_image_bytes(ref_data, reference_image.filename or "image")
    if not ok:
        raise HTTPException(status_code=422, detail=err)

    vid_suffix = Path(video.filename or "video.mp4").suffix or ".mp4"
    if vid_suffix.lower() not in (".mp4", ".avi", ".mov", ".mkv", ".webm"):
        raise HTTPException(status_code=422, detail="Unsupported video format. Use MP4, AVI, or MOV.")

    vid_data = await video.read()
    if not vid_data:
        raise HTTPException(status_code=422, detail="Empty video file.")

    tmp_path = write_temp_file(vid_data, vid_suffix)
    try:
        ok, err, meta = validate_video_path(tmp_path, video.filename or "video")
        if not ok:
            raise HTTPException(status_code=422, detail=err)

        if mode == "template":
            ref_path = write_temp_file(ref_data, ".jpg")
            try:
                result = detect_image_in_video(
                    image_path=ref_path,
                    video_path=tmp_path,
                    frames_dir=FRAMES_DIR,
                    match_threshold=threshold,
                    frame_skip=max(1, int(frame_skip)),
                    min_interval_sec=1.0,
                )
                return result
            finally:
                ref_path.unlink(missing_ok=True)

        # --- Face recognition mode ---
        ref_encoding = encode_face_from_bytes(ref_data)
        if ref_encoding is None:
            raise HTTPException(status_code=422, detail="No face detected in reference image.")

        cap = cv2.VideoCapture(str(tmp_path))
        if not cap.isOpened():
            raise HTTPException(status_code=422, detail="Cannot open video file.")

        try:
            fps = float(cap.get(cv2.CAP_PROP_FPS) or 25.0)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            duration = total_frames / fps if fps > 0 else 0.0

            matches: list[dict] = []
            frame_number = 0
            scanned = 0
            skip = max(1, int(frame_skip))

            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                frame_number += 1
                if frame_number % skip != 0:
                    continue

                scanned += 1
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                # Downscale large frames for faster HOG detection; scale bboxes back
                orig_h, orig_w = rgb.shape[:2]
                max_dim = 800
                scale = 1.0
                if max(orig_h, orig_w) > max_dim:
                    scale = max_dim / max(orig_h, orig_w)
                    small = cv2.resize(
                        rgb,
                        (int(orig_w * scale), int(orig_h * scale)),
                        interpolation=cv2.INTER_AREA,
                    )
                else:
                    small = rgb

                locations = face_recognition.face_locations(small, model="hog")
                if not locations:
                    continue
                encodings = face_recognition.face_encodings(small, locations)

                for loc, enc in zip(locations, encodings):
                    dist = face_recognition.face_distance([ref_encoding], enc)[0]
                    confidence = distance_to_confidence(dist)
                    if confidence >= threshold:
                        top, right, bottom, left = loc
                        # Map back to original frame coords
                        inv = 1.0 / scale if scale else 1.0
                        top = int(top * inv)
                        right = int(right * inv)
                        bottom = int(bottom * inv)
                        left = int(left * inv)
                        timestamp = frame_number / fps
                        fname = f"{uuid.uuid4().hex}.jpg"
                        frame_path = FRAMES_DIR / fname
                        # Annotate match box
                        annotated = frame.copy()
                        cv2.rectangle(annotated, (left, top), (right, bottom), (34, 197, 94), 2)
                        cv2.imwrite(str(frame_path), annotated)
                        matches.append({
                            "timestamp_seconds": round(timestamp, 2),
                            "frame_number": frame_number,
                            "confidence": round(float(confidence), 3),
                            "bbox": [top, right, bottom, left],
                            "frame_url": f"/static/frames/{fname}",
                        })
        finally:
            cap.release()

        matches = _dedup_matches(matches, min_interval=1.0)

        return {
            "total_frames_scanned": scanned,
            "video_duration_seconds": round(duration, 2),
            "fps": round(fps, 2),
            "matches": matches,
            "mode": "face",
        }
    finally:
        tmp_path.unlink(missing_ok=True)
