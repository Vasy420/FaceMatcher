# Full-stack image: React UI + FastAPI on one origin (Render default).
# dlib = prebuilt wheel (no C++ compile). OpenCV 4.9 needs NumPy 1.x.
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
    CUDA_VISIBLE_DEVICES=-1 \
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    FRONTEND_DIST=/app/frontend_dist

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

# CACHEBUST: change this to force Render to ignore stale pip layers.
ARG CACHEBUST=numpy126-20260909
COPY backend/requirements-docker.txt backend/constraints-docker.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir "numpy==1.26.4" \
    && pip install --no-cache-dir \
      https://github.com/comethrusws/Dlib_linux_python_3.x/releases/download/v2.0.0/dlib-20.0.99-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.whl \
    && pip install --no-cache-dir -c constraints-docker.txt -r requirements-docker.txt \
    && pip install --no-cache-dir --force-reinstall "numpy==1.26.4" \
    && python -c "import numpy, cv2, dlib, face_recognition; assert numpy.__version__.startswith('1.'), numpy.__version__; print('imports-ok', numpy.__version__, cv2.__version__)" \
    && rm -rf /root/.cache/pip /tmp/*

COPY backend/ ./
COPY --from=frontend /fe/dist /app/frontend_dist
RUN mkdir -p static/frames static/faces

EXPOSE 10000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1 --proxy-headers --forwarded-allow-ips='*' --timeout-keep-alive 75"]
