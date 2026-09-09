FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=120 \
    PORT=10000 \
    TF_CPP_MIN_LOG_LEVEL=2 \
    TF_ENABLE_ONEDNN_OPTS=0 \
    CUDA_VISIBLE_DEVICES=-1 \
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    NUMEXPR_NUM_THREADS=1 \
    DEEPFACE_HOME=/app/.deepface

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Accept either Docker context: repo root OR backend/
COPY . /src
RUN set -eux; \
    if [ -f /src/requirements.txt ]; then SRC=/src; \
    elif [ -f /src/backend/requirements.txt ]; then SRC=/src/backend; \
    else echo "requirements.txt not found"; ls -la /src; exit 1; fi; \
    pip install --no-cache-dir --upgrade pip; \
    pip install --no-cache-dir -r "$SRC/requirements.txt"; \
    cp -a "$SRC"/. /app/; \
    mkdir -p static/frames static/faces /app/.deepface; \
    rm -rf /src

EXPOSE 10000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1 --proxy-headers --forwarded-allow-ips='*' --timeout-keep-alive 75"]
