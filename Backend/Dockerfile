FROM python:3.10-slim AS builder

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        # Compilation Tools and Python Headers
        build-essential \
        gcc \
        python3-dev \
        pkg-config \
        libpq-dev \
        libcairo2-dev \
        libjpeg-dev \
        zlib1g-dev \
        tesseract-ocr \
        libpoppler-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade -r requirements.txt && \
    # Cleanup paths adjusted for Debian
    find /usr/local -type f -name '*.a' -delete && \
    rm -rf /usr/local/lib/python3.10/site-packages/pip \
           /usr/local/lib/python3.10/site-packages/setuptools

FROM python:3.10-slim AS runner

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        tesseract-ocr \
        libpoppler-dev \
        libpango-1.0-0 \
        libfontconfig1 \
        libxml2 \
        libxslt1-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .

CMD gunicorn main:app --bind 0.0.0.0:$PORT --workers 1 --worker-class uvicorn.workers.UvicornWorker

EXPOSE 8000
