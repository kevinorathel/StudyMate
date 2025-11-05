FROM python:3.11-slim as builder

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        default-libmysqlclient-dev \
        libpq-dev \
        libcairo2-dev \
        pkg-config \
        gcc \
        python3-dev \
        build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# 2. Run pip install
RUN pip install --no-cache-dir --upgrade -r requirements.txt

FROM python:3.11-slim

WORKDIR /app

# Install only the web server and worker in the final stage
RUN pip install --no-cache-dir gunicorn uvicorn

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .

CMD gunicorn main:app --bind 0.0.0.0:$PORT --workers 4 --worker-class uvicorn.workers.UvicornWorker

EXPOSE 8000
