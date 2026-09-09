from fastapi import APIRouter, UploadFile, File, HTTPException
from utils.face_utils import load_image_bytes
from utils.validation import validate_image_bytes
import tempfile, uuid
from pathlib import Path

router = APIRouter(prefix="/api/emotion", tags=["emotion"])


@router.post("/detect")
async def detect_emotion(image: UploadFile = File(...)):
    data = await image.read()
    ok, err = validate_image_bytes(data, image.filename or "image")
    if not ok:
        raise HTTPException(status_code=422, detail=err)
    img = load_image_bytes(data)

    tmp = Path(tempfile.gettempdir()) / f"{uuid.uuid4().hex}.jpg"
    try:
        import cv2
        bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        cv2.imwrite(str(tmp), bgr)

        img_h, img_w = img.shape[:2]

        try:
            from deepface import DeepFace  # lazy: TensorFlow is heavy; skip at boot

            results = DeepFace.analyze(
                img_path=str(tmp),
                actions=["emotion"],
                enforce_detection=True,
                detector_backend="mtcnn",
                silent=True,
            )
        except (ValueError, Exception):
            results = []

        if not isinstance(results, list):
            results = [results]

        faces = []
        for r in results:
            emotions: dict = r.get("emotion", {})
            if not emotions:
                continue
            region = r.get("region", {})
            rx = int(region.get("x", 0))
            ry = int(region.get("y", 0))
            rw = int(region.get("w", 0))
            rh = int(region.get("h", 0))
            if rw <= 0 or rh <= 0:
                continue
            # Guard against whole-image fallback (detector failed)
            if rw >= img_w * 0.95 and rh >= img_h * 0.95:
                continue
            # Reject very small detections (false positives)
            if rw < 40 or rh < 40:
                continue
            total = sum(emotions.values()) or 1
            normalised = {k: round(v / total, 4) for k, v in emotions.items()}
            faces.append({
                "dominant_emotion": r.get("dominant_emotion", ""),
                "emotions": normalised,
                "region": {"x": rx, "y": ry, "w": rw, "h": rh},
            })

        if faces:
            dominant = faces[0]["dominant_emotion"]
            agg_emotions = faces[0]["emotions"]
        else:
            dominant = ""
            agg_emotions = {}

        return {
            "dominant_emotion": dominant,
            "emotions": agg_emotions,
            "face_detected": len(faces) > 0,
            "faces": faces,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        tmp.unlink(missing_ok=True)
