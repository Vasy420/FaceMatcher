"""
Multi-scale template matching for finding a reference image inside video frames.
Ported from PythonProject/image_detector.py and adapted for the FastAPI app.
"""
from __future__ import annotations

import logging
import uuid
from pathlib import Path

import cv2

logger = logging.getLogger(__name__)

DEFAULT_SCALES = (0.5, 0.75, 1.0, 1.25, 1.5)


def detect_image_in_video(
    image_path: str | Path,
    video_path: str | Path,
    frames_dir: Path,
    match_threshold: float = 0.6,
    frame_skip: int = 5,
    min_interval_sec: float = 1.0,
    scales: tuple[float, ...] = DEFAULT_SCALES,
) -> dict:
    """
    Scan video for occurrences of a reference image via multi-scale template matching.

    Returns a dict compatible with the face video match response shape:
    {
      total_frames_scanned, video_duration_seconds, fps, matches: [...]
    }
    """
    reference = cv2.imread(str(image_path))
    if reference is None:
        raise ValueError("Could not load reference image.")

    ref_gray = cv2.cvtColor(reference, cv2.COLOR_BGR2GRAY)
    ref_h, ref_w = ref_gray.shape[:2]
    logger.info("Template loaded: %sx%s", ref_w, ref_h)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError("Could not open video file.")

    try:
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 25.0)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        duration = total_frames / fps if fps > 0 else 0.0

        matches: list[dict] = []
        frame_number = 0
        scanned = 0
        last_saved_time = -min_interval_sec
        frames_dir.mkdir(parents=True, exist_ok=True)

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_number += 1
            if frame_number % max(frame_skip, 1) != 0:
                continue

            scanned += 1
            current_time = frame_number / fps
            frame_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            best_val = -1.0
            best_loc = None
            best_scale = 1.0

            for scale in scales:
                scaled = cv2.resize(
                    ref_gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA
                )
                sh, sw = scaled.shape[:2]
                if sh > frame_gray.shape[0] or sw > frame_gray.shape[1] or sh < 8 or sw < 8:
                    continue
                result = cv2.matchTemplate(frame_gray, scaled, cv2.TM_CCOEFF_NORMED)
                _, max_val, _, max_loc = cv2.minMaxLoc(result)
                if max_val > best_val:
                    best_val = float(max_val)
                    best_loc = max_loc
                    best_scale = scale

            if best_val < match_threshold or best_loc is None:
                continue

            # Dedup: at most one save per min_interval_sec
            if current_time < last_saved_time + min_interval_sec:
                continue

            scaled_w = int(ref_w * best_scale)
            scaled_h = int(ref_h * best_scale)
            left, top = int(best_loc[0]), int(best_loc[1])
            right, bottom = left + scaled_w, top + scaled_h

            # Clamp to frame
            fh, fw = frame.shape[:2]
            left = max(0, left)
            top = max(0, top)
            right = min(fw, right)
            bottom = min(fh, bottom)

            # Draw rectangle on full frame for result thumbnail
            annotated = frame.copy()
            cv2.rectangle(annotated, (left, top), (right, bottom), (0, 200, 255), 2)

            fname = f"{uuid.uuid4().hex}.jpg"
            out_path = frames_dir / fname
            cv2.imwrite(str(out_path), annotated)

            matches.append({
                "timestamp_seconds": round(current_time, 2),
                "frame_number": frame_number,
                "confidence": round(best_val, 3),
                "bbox": [top, right, bottom, left],  # top,right,bottom,left (face_recognition order)
                "frame_url": f"/static/frames/{fname}",
                "scale": round(best_scale, 2),
            })
            last_saved_time = current_time
            logger.info(
                "Template match at %.2fs val=%.3f scale=%.2f",
                current_time, best_val, best_scale,
            )

        return {
            "total_frames_scanned": scanned,
            "video_duration_seconds": round(duration, 2),
            "fps": round(fps, 2),
            "matches": matches,
            "mode": "template",
        }
    finally:
        cap.release()
