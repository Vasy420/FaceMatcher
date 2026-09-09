# FaceMatcher

Minimal AI face recognition workspace — video scanning, image-in-video search, live webcam matching, face database, and emotion detection.

**Stack:** FastAPI · face_recognition · OpenCV · DeepFace · React · Vite · TypeScript · Tailwind CSS · SQLite

---

## Features

| Module | Description |
|--------|-------------|
| **Video Match · Face** | Reference face + video → dlib encodings → matched frames with timestamps |
| **Video Match · Image** | Multi-scale OpenCV template matching — find any image in a video |
| **Live Camera** | Webcam → WebSocket → real-time face bbox overlay + match alerts |
| **Face Database** | Register named faces in SQLite → identify faces in photos |
| **Emotion** | Upload or webcam → DeepFace 7-class emotion + probability bars |

Image-in-video matching is ported from the original Streamlit prototype (`PythonProject/`) into this FastAPI + React app.

---

## Quick Start (Windows)

### 1. Backend (one-time setup)

Requires **Python 3.11** (the included dlib wheel is `cp311`).

```powershell
# From the project root
.\setup-backend.ps1
.\start-backend.ps1
```

API: **http://127.0.0.1:8000**

Manual equivalent:

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\pip install .\dlib-19.24.1-cp311-cp311-win_amd64.whl
.\.venv\Scripts\pip install -r requirements.txt
$env:TF_ENABLE_ONEDNN_OPTS="0"
.\.venv\Scripts\uvicorn main:app --reload --port 8000
```

### 2. Frontend

```powershell
# New terminal, from project root
.\start-frontend.ps1
```

UI: **http://127.0.0.1:5173**

Manual equivalent:

```powershell
cd frontend
npm install
npm run dev
```

---

## Architecture

```
browser ──REST/WS──► FastAPI (:8000)
                       ├── face_recognition (dlib)   face encoding + matching
                       ├── OpenCV template match     image-in-video
                       ├── DeepFace (TF/Keras)       emotion
                       ├── OpenCV                    frames
                       └── SQLite                    face registry
```

- Face encodings stored as `float64` BLOBs, cached in-memory on startup  
- Confidence = `1 − face_distance` (face mode) or `TM_CCOEFF_NORMED` (template mode)  
- Matches de-duplicated to ~1 per second  
- Images validated (format/size); videos capped at 10 minutes / 100 MB  
- Live WebSocket ~6 fps client-side  

---

## API

| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | Health + version |
| GET | `/api/stats` | Enrolled face count |
| POST | `/api/match/video` | `mode=face` or `mode=template` |
| WS | `/api/match/live` | Live face matching |
| POST | `/api/faces/register` | Enroll face |
| GET | `/api/faces/list` | List faces |
| DELETE | `/api/faces/{id}` | Remove face |
| POST | `/api/faces/identify` | Identify faces in image |
| POST | `/api/emotion/detect` | Emotion analysis |

---

## Project layout

```
├── backend/              FastAPI API + .venv
│   ├── routes/           video · live · faces · emotion
│   ├── utils/            face_utils · validation · template_match
│   └── static/           frames + enrolled faces
├── frontend/             React + Vite UI
├── PythonProject/        Original Streamlit prototype (reference)
├── setup-backend.ps1     One-time Windows setup
├── start-backend.ps1     Run API
└── start-frontend.ps1    Run UI
```

---

## Environment

| File | Variable | Value |
|------|----------|-------|
| `frontend/.env.development` | `VITE_API_URL` | `http://localhost:8000` |
| `frontend/.env.production` | `VITE_API_URL` | `https://facematcher.onrender.com` |
| `backend/.env.example` | `CORS_ORIGINS` | `*` or your Vercel origin |

Copy `frontend/.env.example` → `frontend/.env.development` for local UI.

---

## Deploy

Simplest: **one Render web service** (Docker at repo root) serves the UI and the API on the same URL. Vercel is optional.

### Render (required)

**New → Web Service** (not Blueprint). Connect `Vasy420/FaceMatcher`.

| Setting | Value |
|--------|--------|
| Runtime | Docker |
| Dockerfile path | `Dockerfile` (repo root — not `backend/Dockerfile`) |
| Docker context | empty / `.` |
| Instance | **Free** |
| Health check | `/health` |

Wait for the first build (dlib compile, 10–20 min). Then open `https://<service>.onrender.com` — you should see the FaceMatcher UI. JSON health: `/health`.

Free tier: 512 MB RAM, sleeps after 15 min idle, Emotion may OOM. Faces reset on sleep (no disk).

If you already created a service, change **Settings → Build** to the table above, then **Manual Deploy**.

### Vercel (optional extra UI)

1. Import the same repo.
2. Root Directory: **empty**. If you already set it to `frontend`, set Output Directory to `dist` and Install Command to `npm install`.
3. Env (Production + Preview):

   ```
   VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com
   ```

   No trailing slash. Use the URL that actually opens, not `facematcher-api` unless that is the name Render gave you.

Local production build check:

```bash
cd frontend
npm install
npm run build
```

