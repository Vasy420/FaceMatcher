from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import face_recognition
import numpy as np
import time
from utils.face_utils import decode_base64_image, distance_to_confidence

router = APIRouter(tags=["live"])

# per-connection state: websocket_id -> reference encoding
_sessions: dict[int, np.ndarray] = {}


@router.websocket("/api/match/live")
async def live_match(websocket: WebSocket):
    await websocket.accept()
    conn_id = id(websocket)
    _sessions[conn_id] = None

    try:
        while True:
            msg = await websocket.receive_json()
            msg_type = msg.get("type")

            if msg_type == "init":
                b64 = msg.get("reference_image", "")
                try:
                    img = decode_base64_image(b64)
                    encs = face_recognition.face_encodings(img)
                    if not encs:
                        await websocket.send_json({"error": "No face in reference image."})
                        continue
                    _sessions[conn_id] = encs[0]
                    await websocket.send_json({"status": "ready"})
                except Exception as e:
                    await websocket.send_json({"error": str(e)})

            elif msg_type == "frame":
                ref_enc = _sessions.get(conn_id)
                if ref_enc is None:
                    await websocket.send_json({"error": "Send init first."})
                    continue

                t0 = time.monotonic()
                b64 = msg.get("data", "")
                try:
                    img = decode_base64_image(b64)
                except Exception:
                    await websocket.send_json({"error": "Bad frame data."})
                    continue

                locations = face_recognition.face_locations(img)
                encodings = face_recognition.face_encodings(img, locations)
                processing_ms = int((time.monotonic() - t0) * 1000)

                results = []
                for loc, enc in zip(locations, encodings):
                    dist = float(face_recognition.face_distance([ref_enc], enc)[0])
                    confidence = distance_to_confidence(dist)
                    top, right, bottom, left = loc
                    results.append({
                        "bbox": [top, right, bottom, left],
                        "confidence": round(confidence, 3),
                        "is_match": confidence >= 0.45,
                    })

                await websocket.send_json({
                    "matches": results,
                    "face_count": len(locations),
                    "processing_ms": processing_ms,
                })

    except WebSocketDisconnect:
        pass
    finally:
        _sessions.pop(conn_id, None)
