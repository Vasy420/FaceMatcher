# Full-stack image: React UI + FastAPI on one origin (best for Render).
FROM node:20-alpine AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
ENV VITE_API_URL=
RUN npm run build

FROM python:3.11-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TF_CPP_MIN_LOG_LEVEL=2 \
    CUDA_VISIBLE_DEVICES=-1 \
    DEEPFACE_HOME=/app/.deepface \
    FRONTEND_DIST=/app/frontend_dist

RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake \
    build-essential \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libglib2.0-0 \
    libgomp1 \
    libgl1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=frontend /fe/dist /app/frontend_dist
RUN mkdir -p static/frames static/faces .deepface

EXPOSE 10000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
