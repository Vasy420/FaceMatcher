FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=120 \
    PORT=10000 \
    CUDA_VISIBLE_DEVICES=-1 \
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    libopenblas0-pthread \
    liblapack3 \
    libx11-6 \
    libxext6 \
    libxrender1 \
    libsm6 \
    libice6 \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Accept Docker context = repo root OR backend/
COPY . /src
RUN set -eux; \
    if [ -f /src/requirements-docker.txt ]; then SRC=/src; \
    elif [ -f /src/backend/requirements-docker.txt ]; then SRC=/src/backend; \
    elif [ -f /src/requirements.txt ]; then SRC=/src; \
    elif [ -f /src/backend/requirements.txt ]; then SRC=/src/backend; \
    else echo "requirements not found"; ls -la /src; exit 1; fi; \
    REQ="$SRC/requirements-docker.txt"; \
    if [ ! -f "$REQ" ]; then REQ="$SRC/requirements.txt"; fi; \
    pip install --no-cache-dir --upgrade pip; \
    pip install --no-cache-dir \
      https://github.com/comethrusws/Dlib_linux_python_3.x/releases/download/v2.0.0/dlib-20.0.99-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.whl; \
    pip install --no-cache-dir -r "$REQ"; \
    cp -a "$SRC"/. /app/; \
    mkdir -p static/frames static/faces; \
    rm -rf /src /root/.cache/pip /tmp/*

EXPOSE 10000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1 --proxy-headers --forwarded-allow-ips='*' --timeout-keep-alive 75"]
