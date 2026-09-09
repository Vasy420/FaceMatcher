from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import uuid
from config import FACES_DIR, ensure_dirs
from database import insert_face, delete_face, list_faces
from utils.face_utils import encode_face_from_bytes, load_image_bytes
from utils.validation import validate_image_bytes
import face_recognition
import numpy as np

router = APIRouter(prefix="/api/faces", tags=["faces"])
ensure_dirs()
STATIC_FACES = FACES_DIR


@router.post("/register")
async def register_face(name: str = Form(...), image: UploadFile = File(...)):
    clean_name = (name or "").strip()
    if not clean_name:
        raise HTTPException(status_code=422, detail="Name is required.")

    data = await image.read()
    ok, err = validate_image_bytes(data, image.filename or "image")
    if not ok:
        raise HTTPException(status_code=422, detail=err)
    encoding = encode_face_from_bytes(data)
    if encoding is None:
        raise HTTPException(status_code=422, detail="No face detected in the provided image.")

    filename = f"{uuid.uuid4().hex}.jpg"
    save_path = STATIC_FACES / filename
    # Normalize to JPEG for consistent serving
    try:
        from utils.face_utils import load_image_bytes
        import cv2
        rgb = load_image_bytes(data)
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        cv2.imwrite(str(save_path), bgr)
    except Exception:
        save_path.write_bytes(data)

    image_url = f"/static/faces/{filename}"
    face_id = insert_face(clean_name, encoding, image_url)
    return {"id": face_id, "name": clean_name, "image_url": image_url}


@router.get("/list")
async def list_all_faces():
    faces = list_faces()
    return {"faces": faces}


@router.delete("/{face_id}")
async def remove_face(face_id: int):
    deleted = delete_face(face_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Face not found.")
    return {"deleted": True, "id": face_id}


@router.post("/identify")
async def identify_faces(image: UploadFile = File(...)):
    from database import FACE_CACHE
    from utils.face_utils import distance_to_confidence

    data = await image.read()
    ok, err = validate_image_bytes(data, image.filename or "image")
    if not ok:
        raise HTTPException(status_code=422, detail=err)
    from utils.face_utils import resize_if_large
    original = load_image_bytes(data)
    orig_h, orig_w = original.shape[:2]
    img = resize_if_large(original, max_dim=1000)
    det_h, det_w = img.shape[:2]
    sx = orig_w / det_w if det_w else 1.0
    sy = orig_h / det_h if det_h else 1.0

    locations = face_recognition.face_locations(img, model="hog")
    encodings = face_recognition.face_encodings(img, locations) if locations else []

    if not FACE_CACHE:
        return {"results": [], "face_count": len(locations)}

    known_ids = list(FACE_CACHE.keys())
    known_names = [FACE_CACHE[i][0] for i in known_ids]
    known_encs = np.array([FACE_CACHE[i][1] for i in known_ids])

    results = []
    for loc, enc in zip(locations, encodings):
        top, right, bottom, left = loc
        # Map detection coords back onto the original image (frontend draws on original)
        top = int(top * sy)
        right = int(right * sx)
        bottom = int(bottom * sy)
        left = int(left * sx)
        distances = face_recognition.face_distance(known_encs, enc)
        best_idx = int(np.argmin(distances))
        best_dist = float(distances[best_idx])
        confidence = distance_to_confidence(best_dist)
        matched = confidence >= 0.4  # soft threshold for identification

        results.append({
            "bbox": [top, right, bottom, left],
            "name": known_names[best_idx] if matched else "Unknown",
            "confidence": round(confidence, 3),
            "face_id": known_ids[best_idx] if matched else None,
        })

    return {"results": results, "face_count": len(locations)}
