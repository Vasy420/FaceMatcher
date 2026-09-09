# Full-stack image: React UI + FastAPI on one origin (Render default).
# dlib comes from a prebuilt manylinux wheel so the 8GB builder does not compile C++.
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
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=120 \
    TF_CPP_MIN_LOG_LEVEL=2 \
    CUDA_VISIBLE_DEVICES=-1 \
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    FRONTEND_DIST=/app/frontend_dist

# Runtime libs only — no cmake/g++ (dlib is a wheel).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libopenblas0-pthread \
    liblapack3 \
    libx11-6 \
    libxext6 \
    libxrender1 \
    libsm6 \
    libice6 \
    libglib2.0-0 \
    libgomp1 \
    libgl1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements-docker.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir \
      https://github.com/comethrusws/Dlib_linux_python_3.x/releases/download/v2.0.0/dlib-20.0.99-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.whl \
    && pip install --no-cache-dir -r requirements-docker.txt \
    && rm -rf /root/.cache/pip /tmp/*

COPY backend/ ./
COPY --from=frontend /fe/dist /app/frontend_dist
RUN mkdir -p static/frames static/faces

EXPOSE 10000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1 --proxy-headers --forwarded-allow-ips='*' --timeout-keep-alive 75"]
