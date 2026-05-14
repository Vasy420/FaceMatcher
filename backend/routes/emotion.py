from fastapi import APIRouter, UploadFile, File, HTTPException
from deepface import DeepFace
from utils.face_utils import load_image_bytes
import tempfile, uuid
from pathlib import Path

router = APIRouter(prefix="/api/emotion", tags=["emotion"])


@router.post("/detect")
async def detect_emotion(image: UploadFile = File(...)):
    data = await image.read()
    img = load_image_bytes(data)

    tmp = Path(tempfile.gettempdir()) / f"{uuid.uuid4().hex}.jpg"
    try:
        import cv2
        bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        cv2.imwrite(str(tmp), bgr)

        results = DeepFace.analyze(
            img_path=str(tmp),
            actions=["emotion"],
            enforce_detection=False,
            detector_backend="mtcnn",
            silent=True,
        )
        if not isinstance(results, list):
            results = [results]

        faces = []
        for r in results:
            emotions: dict = r.get("emotion", {})
            if not emotions:
                continue
            total = sum(emotions.values()) or 1
            normalised = {k: round(v / total, 4) for k, v in emotions.items()}
            region = r.get("region", {})
            faces.append({
                "dominant_emotion": r.get("dominant_emotion", ""),
                "emotions": normalised,
                "region": {
                    "x": int(region.get("x", 0)),
                    "y": int(region.get("y", 0)),
                    "w": int(region.get("w", 0)),
                    "h": int(region.get("h", 0)),
                },
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
