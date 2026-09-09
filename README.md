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
| `frontend/.env.production` | `VITE_API_URL` | Render API origin (no trailing slash) |
| `backend/.env.example` | `CORS_ORIGINS` | `*` or your Vercel origin |

Copy `frontend/.env.example` → `frontend/.env.development` for local UI.

---

## Deploy

Split: **backend → Render**, **frontend → Vercel**. Deploy the API first so you have a URL for `VITE_API_URL`.

### 1. Backend → Render

1. Push this repo to GitHub.
2. [Render](https://dashboard.render.com) → **New** → **Blueprint** and select the repo (`render.yaml`), **or** **New Web Service** with:
   - Runtime: **Docker**
   - Dockerfile path: `backend/Dockerfile`
   - Context: `backend`
3. Plan: **Starter** (512 MB) may boot face/video/live. **Standard (2 GB)** if Emotion OOMs. Free (512 MB) will almost certainly OOM.
4. After first deploy, copy the service URL (`https://facematcher-api.onrender.com` or the URL Render assigned).
5. Optional: set `CORS_ORIGINS=https://your-app.vercel.app` (comma-separate preview origins if needed).
6. Optional persistent disk (paid): mount `/data`, then set `DATA_DIR=/data`, `DB_PATH=/data/facematcher.db`, `STATIC_DIR=/data/static`. Without a disk, SQLite + uploaded faces/frames reset on every deploy and spin-down.

Health check: `GET /health` (also `/`).

Render HTTP timeout is ~100s — production video length is capped via `MAX_VIDEO_DURATION_SEC=90`. First Emotion request downloads DeepFace weights (~200 MB).

### 2. Frontend → Vercel

1. [Vercel](https://vercel.com/new) → import the same GitHub repo.
2. Leave Root Directory empty (repo-root `vercel.json` builds `frontend/`). **Or** set Root Directory to `frontend`.
3. Environment variable (Production + Preview):

   ```
   VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com
   ```

   No trailing slash. Vite inlines this at **build** time — change it → redeploy the frontend.
4. Deploy. `https://` frontend talks to `https://` API; live match uses `wss://` automatically.

Local production build check:

```bash
cd frontend
npm install
npm run build
```

