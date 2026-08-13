# FaceMatcher

AI-powered face recognition workspace with four modules: video scanning, live webcam matching, a named face gallery, and emotion detection.

**Stack:** FastAPI · face_recognition · DeepFace · React · Vite · TypeScript · Tailwind CSS · Framer Motion · SQLite

---

## Features

| Module | Route | What it does |
|--------|-------|----------------|
| Video Match | `/video` | Upload a reference face + video. Every Nth frame is scanned. Hits come back as annotated thumbnails with timestamps and confidence. |
| Live Camera | `/live` | Webcam frames stream over WebSocket. Bounding boxes overlay in real time with a match alert. |
| Face Database | `/database` | Register named faces in SQLite, then identify people in any photo. |
| Emotion Detect | `/emotion` | Upload or use the webcam. DeepFace returns a dominant emotion plus a 7-class breakdown. |

**Workspace extras:** command palette (`⌘K` / `Ctrl+K`), `g` then `d/v/l/f/e` to jump modules, local activity log, mobile bottom nav.

---

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

> **Windows:** `face_recognition` needs dlib. Install the bundled wheel, then the rest:
> ```
> pip install dlib-19.24.1-cp311-cp311-win_amd64.whl
> pip install -r requirements.txt
> ```
> Or run inside WSL / Docker.

API: `http://localhost:8000` · health: `http://localhost:8000/health` · docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api`, `/health`, and `/static` to port 8000.  
`frontend/.env.development` sets `VITE_API_URL=http://localhost:8000` so the UI talks to the API directly.

---

## Architecture

```
browser ──REST / WebSocket──► FastAPI
                               ├── face_recognition (dlib HOG)   # encodings + match
                               ├── DeepFace (TF / Keras)         # emotion
                               ├── OpenCV                        # frames
                               └── SQLite                        # named gallery
```

- Encodings stored as `float64` BLOBs, cached in memory on startup
- Confidence = `1 − face_recognition_distance` (0–1, higher is better)
- Live frames capped at ~6 fps in the browser to keep the socket healthy
- Large images are downscaled before detection so video / live stay responsive

---

## Deploy

### One service (recommended) — Render + Docker

The root `Dockerfile` builds the React app and serves it from FastAPI on a single origin. No CORS, no `VITE_API_URL`.

1. Push this repo to GitHub
2. Render → **New Web Service** → Docker
3. It will pick up `render.yaml` (or set dockerfile path to `./Dockerfile`)
4. Health check: `/health`

```bash
# Local full stack
docker compose up --build
# App: http://localhost:8000
```

> **Memory:** DeepFace + TensorFlow need more than Render’s free 512 MB under load. Use **Hobby** (or larger) for production. First emotion request also downloads ~200 MB of model weights.

### Split — Render API + Vercel UI

1. **API:** Render Web Service, `backend/Dockerfile`, root directory `backend/`
2. **UI:** Vercel project, framework Vite, root `frontend/`
3. Env var: `VITE_API_URL=https://your-api.onrender.com`

`frontend/vercel.json` already rewrites SPA routes to `index.html`.

---

## Environment

| Where | Variable | Purpose |
|-------|----------|---------|
| `frontend/.env.development` | `VITE_API_URL` | Local API (`http://localhost:8000`) |
| `frontend/.env.production` | `VITE_API_URL` | Split-deploy API URL, or leave empty for same-origin |
| Backend | `PORT` | Listen port (default `10000` in Docker) |
| Backend | `CORS_ORIGINS` | Comma-separated origins, or `*` |
| Backend | `FRONTEND_DIST` | Built UI folder (set by the root Dockerfile) |
| Backend | `DATA_DIR` | Where `facematcher.db` is written |

---

## Keyboard

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Command palette |
| `g` then `d` | Dashboard |
| `g` then `v` | Video Match |
| `g` then `l` | Live Camera |
| `g` then `f` | Face Database |
| `g` then `e` | Emotion |

---

## Credits

Built by Vashishta, Vishnu, Srinesh
