from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pathlib import Path
import uuid
from database import insert_face, delete_face, list_faces, UPLOADS_DIR
from utils.face_utils import encode_face_from_bytes, encode_frame_jpeg, load_image_bytes
import face_recognition
import numpy as np

router = APIRouter(prefix="/api/faces", tags=["faces"])

STATIC_FACES = Path(__file__).parent.parent / "static" / "faces"
STATIC_FACES.mkdir(parents=True, exist_ok=True)


@router.post("/register")
async def register_face(name: str = Form(...), image: UploadFile = File(...)):
    data = await image.read()
    encoding = encode_face_from_bytes(data)
    if encoding is None:
        raise HTTPException(status_code=422, detail="No face detected in the provided image.")

    filename = f"{uuid.uuid4().hex}.jpg"
    save_path = STATIC_FACES / filename
    save_path.write_bytes(data)

    image_url = f"/static/faces/{filename}"
    face_id = insert_face(name, encoding, image_url)
    return {"id": face_id, "name": name, "image_url": image_url}


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
    img = load_image_bytes(data)

    locations = face_recognition.face_locations(img)
    encodings = face_recognition.face_encodings(img, locations)

    if not FACE_CACHE:
        return {"results": [], "face_count": len(locations)}

    known_ids = list(FACE_CACHE.keys())
    known_names = [FACE_CACHE[i][0] for i in known_ids]
    known_encs = np.array([FACE_CACHE[i][1] for i in known_ids])

    results = []
    for loc, enc in zip(locations, encodings):
        top, right, bottom, left = loc
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
