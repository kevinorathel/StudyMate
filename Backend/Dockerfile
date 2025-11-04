FROM python:3.11-slim as builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

FROM python:3.11-slim

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .

CMD ["gunicorn", "main:app", "--bind", "0.0.0.0:$PORT", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker"]

EXPOSE 8000
